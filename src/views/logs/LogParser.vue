<template>
  <div class="app-container">
    <header class="page-heading">
      <div><h1>{{ $t('logTools.parser.title') }}</h1><p>{{ $t('logTools.parser.subtitle') }}</p></div>
      <UiButton size="sm" variant="outline" :disabled="loading" @click="getActiveParsers(true)">
        <Spinner v-if="loading" data-icon="inline-start" />
        <RefreshCw v-else data-icon="inline-start" />
        {{ $t('logTools.parser.actions.refresh') }}
      </UiButton>
    </header>

    <Alert v-if="loadError" variant="destructive">
      <FileWarning />
      <AlertTitle>{{ $t('logTools.parser.loadFailedTitle') }}</AlertTitle>
      <AlertDescription>{{ loadError }}</AlertDescription>
      <AlertAction><UiButton size="sm" variant="outline" :disabled="loading" @click="getActiveParsers(true)">{{ $t('logTools.parser.actions.retry') }}</UiButton></AlertAction>
    </Alert>

    <div v-if="loading && activeParsers.length === 0" class="loading-state">
      <Spinner />
      <span>{{ $t('logTools.parser.loading') }}</span>
    </div>
    <Empty v-else-if="!loadError && activeParsers.length === 0">
      <EmptyHeader>
        <EmptyMedia variant="icon"><FileWarning /></EmptyMedia>
        <EmptyTitle>{{ $t('logTools.parser.emptyTitle') }}</EmptyTitle>
        <EmptyDescription>{{ $t('logTools.parser.emptyDescription') }}</EmptyDescription>
      </EmptyHeader>
    </Empty>
    <div v-else-if="!loadError" class="parsers-container">
          <Card v-for="parser in activeParsers" :key="parser.id" class="parser-card">
            <CardHeader class="parser-header">
              <div class="parser-title">
                <div class="type-indicator" aria-hidden="true">
                  <Sun v-if="parser.server_type === 'Forest'" />
                  <Moon v-else />
                </div>
                <div class="parser-identity">
                  <CardTitle>{{ parser.archive_name }} / {{ parser.world_name }}</CardTitle>
                  <CardDescription>{{ getServerTypeLabel(parser.server_type) }}</CardDescription>
                  <div class="parser-subtitle">
                    <Badge :variant="getStatusVariant(parser.status)">{{ getStatusLabel(parser.status) }}</Badge>
                  </div>
                </div>
              </div>
              <Badge variant="secondary">ID: {{ formatParserId(parser.id) }}</Badge>
            </CardHeader>
            <CardContent>
              <dl class="parser-info">
                <div class="info-item path-item"><dt>{{ $t('logTools.parser.runtimeControl') }}</dt><dd>{{ getControlLabel(parser) }}</dd></div>
              </dl>
            </CardContent>
            <CardFooter class="parser-actions">
              <UiButton size="sm" @click="viewLogs(parser)">
                <Eye data-icon="inline-start" />
                {{ $t('logTools.parser.actions.viewLogs') }}
              </UiButton>
              <UiButton
                variant="outline"
                size="sm"
                :disabled="parser.control_available === false || restartingParserId === parser.id"
                @click="restartWorld(parser)"
              >
                <Spinner v-if="restartingParserId === parser.id" data-icon="inline-start" />
                <RotateCw v-else data-icon="inline-start" />
                {{ $t('logTools.parser.actions.restartWorld') }}
              </UiButton>
            </CardFooter>
          </Card>
    </div>
  </div>
</template>

<script>
import { Eye, FileWarning, Moon, RefreshCw, RotateCw, Sun } from '@lucide/vue';
import { toast } from 'vue-sonner';
import { logApi } from '@/api/index';
import { jobsV2API, roomsV2API } from '@/api/v2';
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button as UiButton } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Spinner } from '@/components/ui/spinner';
import {
  logParserLoadFailure,
  logParserServerTypeLabel,
  logParserStatusMeta
} from '@/i18n/logToolsMessages.js';
import { confirmAction } from '@/lib/feedback';
import { RUNTIME_TARGET_CHANGED_EVENT } from '@/utils/runtimeTarget';

const TERMINAL_JOB_STATES = new Set(['succeeded', 'failed', 'canceled']);

export default {
  name: 'LogParser',
  components: {
    Alert, AlertAction, AlertDescription, AlertTitle, Badge, UiButton, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,
    Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle, Eye,
    FileWarning, Moon, RefreshCw, RotateCw, Spinner, Sun
  },
  data() {
    return {
      activeParsers: [],
      loading: false,
      loadFailure: null,
      restartingParserId: '',
      refreshSequence: 0
    };
  },
  created() {
    this.getActiveParsers();
  },
  mounted() {
    window.addEventListener(RUNTIME_TARGET_CHANGED_EVENT, this.handleRuntimeTargetChange);
  },
  beforeUnmount() {
    window.removeEventListener(RUNTIME_TARGET_CHANGED_EVENT, this.handleRuntimeTargetChange);
  },
  computed: {
    loadError() {
      return logParserLoadFailure(this.loadFailure, this.$t);
    }
  },
  methods: {
    handleRuntimeTargetChange() {
      this.activeParsers = [];
      this.getActiveParsers();
    },
    async getActiveParsers(notify = false) {
      const requestSequence = ++this.refreshSequence;
      this.loading = true;
      this.loadFailure = null;
      try {
        const response = await logApi.getActiveLogParsers();
        if (requestSequence !== this.refreshSequence) return;
        if (response?.status === 200 && Array.isArray(response.data)) {
          this.activeParsers = response.data;
          if (notify) toast.success(this.$t('logTools.parser.feedback.refreshed'));
        } else {
          this.loadFailure = { kind: 'invalidResponse', detail: response?.msg || '' };
          toast.error(this.loadError);
          this.activeParsers = [];
        }
      } catch (error) {
        if (requestSequence !== this.refreshSequence) return;
        this.loadFailure = { kind: 'request', detail: this.errorDetail(error) };
        toast.error(this.loadError);
        this.activeParsers = [];
      } finally {
        if (requestSequence === this.refreshSequence) this.loading = false;
      }
    },
    viewLogs(parser) {
      this.$router.push({
        name: 'LogQuery',
        query: { archive: parser.archive_name, world: parser.world_name }
      });
    },
    async waitForJob(job) {
      let current = job;
      for (let attempt = 0; attempt < 120; attempt += 1) {
        current = await jobsV2API.get(current.id);
        if (TERMINAL_JOB_STATES.has(current.status)) break;
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      if (!TERMINAL_JOB_STATES.has(current.status)) throw new Error(this.$t('logTools.parser.feedback.restartTimeout'));
      if (current.status !== 'succeeded') {
        const failed = (current.targets || []).find(item => item.status === 'failed');
        throw new Error(failed?.error?.message || current.error?.message || this.$t('logTools.parser.feedback.restartJobFailed'));
      }
      return current;
    },
    async restartWorld(parser) {
      if (parser.control_available === false) return;
      try {
        await confirmAction(
          this.$t('logTools.parser.feedback.restartConfirm', { world: `${parser.archive_name} / ${parser.world_name}` }),
          this.$t('logTools.parser.feedback.restartTitle'),
          {
            confirmButtonText: this.$t('logTools.parser.feedback.confirmRestart'),
            cancelButtonText: this.$t('logTools.parser.feedback.cancel'),
            type: 'warning'
          }
        );
      } catch (error) {
        if (error === 'cancel' || error === 'close') return;
        toast.error(this.$t('logTools.parser.feedback.confirmFailed', { error: this.errorDetail(error) }));
        return;
      }
      this.restartingParserId = parser.id;
      try {
        const job = await roomsV2API.action(parser.room_id, 'restart', [parser.world_id]);
        await this.waitForJob(job);
        await this.getActiveParsers();
        toast.success(this.$t('logTools.parser.feedback.restartSucceeded', {
          world: `${parser.archive_name} / ${parser.world_name}`
        }));
      } catch (error) {
        toast.error(this.$t('logTools.parser.feedback.restartFailed', { error: this.errorDetail(error) }));
      } finally {
        this.restartingParserId = '';
      }
    },
    getStatusVariant(status) {
      return logParserStatusMeta(status, this.$t).variant;
    },
    getStatusLabel(status) {
      return logParserStatusMeta(status, this.$t).label;
    },
    getServerTypeLabel(type) {
      return logParserServerTypeLabel(type, this.$t);
    },
    getControlLabel(parser) {
      if (parser.control_available) return this.$t('logTools.parser.controlAvailable');
      return parser.status_message || this.$t('logTools.parser.controlUnavailable');
    },
    errorDetail(error) {
      if (error?.message) return error.message;
      if (typeof error === 'string' && error) return error;
      return this.$t('logTools.values.unknownError');
    },
    formatParserId(id) {
      return String(id || '-').split('_').pop();
    }
  }
};
</script>

<style scoped>
.app-container {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 24px;
}

.page-heading,
.parser-header,
.parser-title,
.parser-actions,
.loading-state {
  display: flex;
  align-items: center;
}

.page-heading,
.parser-header {
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}

.parser-title,
.parser-subtitle,
.parser-actions,
.loading-state {
  gap: 8px;
}

.page-heading {
  align-items: flex-start;
}

.page-heading h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  line-height: 32px;
}

.page-heading p {
  margin: 4px 0 0;
  color: var(--muted-foreground);
  font-size: 14px;
}

.parsers-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 360px), 1fr));
  gap: 12px;
}

.parser-card {
  min-width: 0;
}

.type-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 36px;
  width: 36px;
  height: 36px;
  border-radius: var(--radius);
  background: var(--muted);
  color: var(--foreground);
}

.parser-subtitle {
  display: flex;
  margin-top: 6px;
}

.parser-identity {
  min-width: 0;
}

.parser-identity :deep([data-slot='card-title']) {
  overflow-wrap: anywhere;
}

.parser-info {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin: 0;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.info-item {
  min-width: 0;
  padding: 10px 12px;
  border-bottom: 1px solid var(--border);
}

.info-item:first-child {
  border-right: 1px solid var(--border);
}

.info-item dt {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 3px;
  color: var(--muted-foreground);
  font-size: 12px;
}

.info-item dd {
  min-width: 0;
  margin: 0;
  overflow-wrap: anywhere;
}

.path-item {
  grid-column: 1 / -1;
  border-bottom: 0;
}

.path-value {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
}

.parser-actions {
  justify-content: flex-end;
  flex-wrap: wrap;
}

.loading-state {
  justify-content: center;
  min-height: 180px;
  color: var(--muted-foreground);
  font-size: 13px;
}

@media (max-width: 640px) {
  .page-heading {
    align-items: flex-start;
    flex-direction: column;
  }

  .parser-actions {
    width: 100%;
  }
}
</style>
