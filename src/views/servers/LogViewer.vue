<template>
  <div class="log-viewer-container">
    <div class="log-header">
      <div class="log-title">
        <h3>{{ displayTitle }}</h3>
        <span class="log-subtitle">{{ subtitle }}</span>
      </div>
      <div class="log-actions">
        <UiButton size="sm" :disabled="loading" @click="refreshLogs">
          <Spinner v-if="loading" data-icon="inline-start" />
          <RefreshCw v-else data-icon="inline-start" />
          {{ $t('common.actions.refresh') }}
        </UiButton>
        <UiButton size="sm" variant="outline" @click="downloadLogs">
          <Download data-icon="inline-start" />
          {{ $t('servers.liveLogs.actions.download') }}
        </UiButton>
        <UiButton size="sm" variant="ghost" @click="$emit('close')">
          <X data-icon="inline-start" />
          {{ $t('servers.liveLogs.actions.close') }}
        </UiButton>
      </div>
    </div>
    
    <div class="log-content-wrapper">
      <div class="log-filter">
        <UiSelect v-model="selectedWorld" @update:model-value="refreshLogs">
          <SelectTrigger class="world-select"><SelectValue :placeholder="$t('servers.liveLogs.fields.selectWorld')" /></SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem v-for="world in worlds" :key="world.name" :value="world.name">
                {{ world.name + (world.type ? ' (' + formatWorldType(world.type) + ')' : '') }}
              </SelectItem>
            </SelectGroup>
          </SelectContent>
        </UiSelect>
        <InputGroup class="search-wrapper">
          <InputGroupAddon><Search /></InputGroupAddon>
          <InputGroupInput v-model="searchQuery" :placeholder="$t('servers.liveLogs.fields.search')" :aria-label="$t('servers.liveLogs.fields.search')" />
        </InputGroup>
      </div>

      <Alert v-if="streamError" variant="destructive">
        <CircleAlert />
        <AlertTitle>{{ $t('servers.liveLogs.viewer.streamFailed') }}</AlertTitle>
        <AlertDescription>{{ streamError }}</AlertDescription>
        <AlertAction><UiButton size="sm" variant="outline" @click="refreshLogs">{{ $t('servers.liveLogs.actions.reconnect') }}</UiButton></AlertAction>
      </Alert>

      <Empty v-if="logs.length === 0 && !loading && !streamError" class="log-empty">
        <EmptyHeader>
          <EmptyMedia variant="icon"><Info /></EmptyMedia>
          <EmptyTitle>{{ $t('servers.liveLogs.viewer.empty') }}</EmptyTitle>
          <EmptyDescription>{{ $t('servers.liveLogs.viewer.emptyDescription') }}</EmptyDescription>
        </EmptyHeader>
      </Empty>
      
      <div v-else class="log-content" ref="logContent">
        <div v-if="loading && logs.length === 0" class="log-loading">
          <Spinner />
          <span>{{ $t('servers.liveLogs.viewer.connecting') }}</span>
        </div>
        <div v-else-if="logs.length > 0">
          <div class="log-info-row">{{ $t('servers.liveLogs.viewer.loadedLines', { count: logs.length }) }}</div>
          <pre><code v-for="(line, index) in filteredLogs" :key="index" 
            :class="{ 'log-info': line.includes('[INFO]'),
                      'log-warning': line.includes('[WARNING]'),
                      'log-error': line.includes('[ERROR]') || line.includes('[FATAL]'),
                      'log-debug': line.includes('[DEBUG]') }">{{ line }}</code></pre>
        </div>
      </div>
      
      <div class="log-actions-bottom">
        <Field orientation="horizontal" class="auto-scroll-control">
          <UiCheckbox id="log-auto-scroll" v-model="autoScroll" />
          <FieldLabel for="log-auto-scroll">{{ $t('servers.liveLogs.fields.autoScrollLatest') }}</FieldLabel>
        </Field>
        <UiButton size="sm" variant="ghost" @click="clearLogs">{{ $t('servers.liveLogs.actions.clear') }}</UiButton>
      </div>
    </div>
  </div>
</template>

<script>
import { CircleAlert, Download, Info, RefreshCw, Search, X } from '@lucide/vue';
import { toast } from 'vue-sonner';
import { worldLogsV2API } from '@/api/v2';
import { getScopedRuntimeOverview } from '@/api/v2LegacyAdapters';
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button as UiButton } from '@/components/ui/button';
import { Checkbox as UiCheckbox } from '@/components/ui/checkbox';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Field, FieldLabel } from '@/components/ui/field';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Select as UiSelect, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import {
  getManagementScope,
  MANAGEMENT_SCOPE_CHANGED_EVENT,
  managementScopeTargetId
} from '@/lib/managementScope.mjs';

export default {
  name: 'LogViewer',
  components: {
    Alert, AlertAction, AlertDescription, AlertTitle, CircleAlert, Download, Empty, EmptyDescription,
    EmptyHeader, EmptyMedia, EmptyTitle, Field, FieldLabel, Info, InputGroup, InputGroupAddon,
    InputGroupInput, RefreshCw, Search, SelectContent, SelectGroup, SelectItem, SelectTrigger,
    SelectValue, Spinner, UiButton, UiCheckbox, UiSelect, X
  },
  props: {
    archiveName: {
      type: String,
      required: true
    },
    title: {
      type: String,
      default: ''
    },
    subtitle: {
      type: String,
      default: ''
    },
    worlds: {
      type: Array,
      default: () => []
    },
    defaultWorld: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      logs: [],
      loading: false,
      streamError: '',
      selectedWorld: this.defaultWorld || (this.worlds.length > 0 ? this.worlds[0].name : ''),
      searchQuery: '',
      managementScope: getManagementScope(),
      autoScroll: true,
      eventSource: null,
      resolvedRoomId: '',
      resolvedWorldId: '',
      displayedTargetKey: '',
      requestSequence: 0
    };
  },
  computed: {
    displayTitle() {
      return this.title || this.$t('servers.liveLogs.viewer.defaultTitle');
    },
    filteredLogs() {
      if (!this.searchQuery) {
        return this.logs;
      }
      
      const query = this.searchQuery.toLowerCase();
      return this.logs.filter(line => line.toLowerCase().includes(query));
    }
  },
  methods: {
    handleManagementScopeChange(event) {
      this.managementScope = event?.detail || getManagementScope();
      this.requestSequence += 1;
      this.closeEventSource();
      this.loading = false;
      this.logs = [];
      this.displayedTargetKey = '';
      this.refreshLogs();
    },
    formatWorldType(type) {
      if (type === 'forest') return this.$t('servers.list.worldTypes.forest');
      if (type === 'cave' || type === 'caves') return this.$t('servers.list.worldTypes.cave');
      return type || this.$t('servers.list.worldTypes.custom');
    },
    async resolveLogTarget() {
      const overview = await getScopedRuntimeOverview(managementScopeTargetId(this.managementScope));
      const room = (overview.rooms || []).find(item =>
        item.id === this.archiveName || item.name === this.archiveName || item.directoryName === this.archiveName
      );
      if (!room) throw new Error(this.$t('servers.liveLogs.feedback.roomNotFound', { room: this.archiveName }));

      const providedWorld = this.worlds.find(item =>
        item.id === this.selectedWorld || item.name === this.selectedWorld
      );
      const worldReference = providedWorld?.id || this.selectedWorld;
      const world = (room.worlds || []).find(item =>
        item.id === worldReference || item.name === worldReference || item.directoryName === worldReference
      );
      if (!world) throw new Error(this.$t('servers.liveLogs.feedback.worldNotFound', { world: this.selectedWorld }));

      this.resolvedRoomId = room.id;
      this.resolvedWorldId = world.id;
      return { roomId: room.id, worldId: world.id };
    },
    async refreshLogs() {
      if (!this.archiveName || !this.selectedWorld) {
        toast.warning(this.$t('servers.liveLogs.feedback.targetRequired'));
        return;
      }

      const requestSequence = ++this.requestSequence;
      const requestedTargetKey = `${this.archiveName}:${this.selectedWorld}`;
      const targetChanged = requestedTargetKey !== this.displayedTargetKey;
      this.loading = true;
      this.streamError = '';
      if (targetChanged) {
        this.logs = [];
        this.resolvedRoomId = '';
        this.resolvedWorldId = '';
      }
      this.closeEventSource();

      try {
        const target = await this.resolveLogTarget();
        const snapshot = await worldLogsV2API.snapshot(target.roomId, target.worldId, { limit: 300 });
        if (requestSequence !== this.requestSequence) return;
        this.displayedTargetKey = requestedTargetKey;
        this.renderSnapshot(snapshot);
        this.connectEventSource(target.roomId, target.worldId, requestSequence);
      } catch (error) {
        if (requestSequence !== this.requestSequence) return;
        this.streamError = error.message || this.$t('servers.liveLogs.feedback.streamUnavailable');
        toast.error(this.$t('servers.liveLogs.feedback.readFailed', { error: this.streamError }));
      } finally {
        if (requestSequence === this.requestSequence) this.loading = false;
      }
    },
    connectEventSource(roomId, worldId, requestSequence) {
      const eventSource = new EventSource(worldLogsV2API.eventURL(roomId, worldId, 300), {
        withCredentials: true
      });
      this.eventSource = eventSource;

      eventSource.addEventListener('connected', event => {
        if (requestSequence !== this.requestSequence) return;
        const payload = this.parseEvent(event);
        this.streamError = '';
        if (payload?.snapshot) this.renderSnapshot(payload.snapshot);
      });
      eventSource.addEventListener('line', event => {
        if (requestSequence !== this.requestSequence) return;
        const payload = this.parseEvent(event);
        if (payload?.line?.text !== undefined) this.appendLogLine(payload.line.text);
      });
      eventSource.addEventListener('reset', event => {
        if (requestSequence !== this.requestSequence) return;
        const payload = this.parseEvent(event);
        this.renderSnapshot(payload?.snapshot || { lines: [] });
      });
      eventSource.addEventListener('heartbeat', () => {
        if (requestSequence === this.requestSequence) this.streamError = '';
      });
      eventSource.addEventListener('error', event => {
        if (requestSequence !== this.requestSequence || this.eventSource !== eventSource) return;
        const payload = this.parseEvent(event);
        if (payload?.message) {
          this.streamError = payload.message;
          this.closeEventSource();
          return;
        }
        this.streamError = this.$t('servers.liveLogs.feedback.reconnecting');
      });
    },
    parseEvent(event) {
      if (!event?.data) return null;
      try {
        return JSON.parse(event.data);
      } catch {
        return { message: event.data };
      }
    },
    renderSnapshot(snapshot) {
      this.logs = (snapshot?.lines || []).map(line =>
        typeof line === 'string' ? line : String(line?.text ?? '')
      );
      this.scrollAfterUpdate();
    },
    appendLogLine(line) {
      this.logs.push(String(line ?? ''));
      if (this.logs.length > 5000) this.logs.splice(0, this.logs.length - 5000);
      this.scrollAfterUpdate();
    },
    scrollAfterUpdate() {
      if (this.autoScroll) this.$nextTick(() => this.scrollToBottom());
    },
    closeEventSource() {
      if (this.eventSource) {
        this.eventSource.close();
        this.eventSource = null;
      }
    },
    scrollToBottom() {
      const logContent = this.$refs.logContent;
      if (logContent) {
        logContent.scrollTop = logContent.scrollHeight;
      }
    },
    async downloadLogs() {
      try {
        if (!this.resolvedRoomId || !this.resolvedWorldId) await this.resolveLogTarget();
        const blob = await worldLogsV2API.downloadBlob(this.resolvedRoomId, this.resolvedWorldId);
        const objectURL = URL.createObjectURL(blob);
        const link = document.createElement('a');
        try {
          link.href = objectURL;
          link.download = `${this.archiveName}_${this.selectedWorld}.log`;
          document.body.appendChild(link);
          link.click();
        } finally {
          link.remove();
          URL.revokeObjectURL(objectURL);
        }
        toast.success(this.$t('servers.liveLogs.feedback.downloadStarted'));
      } catch (error) {
        toast.error(this.$t('servers.liveLogs.feedback.downloadFailed', {
          error: error.message || this.$t('common.errors.unknown')
        }));
      }
    },
    clearLogs() {
      this.logs = [];
    }
  },
  mounted() {
    window.addEventListener(MANAGEMENT_SCOPE_CHANGED_EVENT, this.handleManagementScopeChange);
    this.refreshLogs();
  },
  beforeUnmount() {
    window.removeEventListener(MANAGEMENT_SCOPE_CHANGED_EVENT, this.handleManagementScopeChange);
    this.requestSequence += 1;
    this.closeEventSource();
  },
  watch: {
    archiveName() {
      this.closeEventSource();
      this.refreshLogs();
    },
    defaultWorld(newVal) {
      if (newVal && newVal !== this.selectedWorld) {
        this.selectedWorld = newVal;
        this.closeEventSource();
        this.refreshLogs();
      }
    },
    worlds: {
      handler(newWorlds) {
        const selectedStillExists = newWorlds.some(world =>
          world.name === this.selectedWorld || world.id === this.selectedWorld
        );
        if (newWorlds.length > 0 && !selectedStillExists) {
          const preferred = newWorlds.find(world => world.name === this.defaultWorld || world.id === this.defaultWorld);
          this.selectedWorld = (preferred || newWorlds[0]).name;
          this.closeEventSource();
          this.refreshLogs();
        }
      }
    }
  }
};
</script>

<style scoped>
.log-viewer-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-width: 0;
  background-color: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background-color: var(--muted);
  border-bottom: 1px solid var(--border);
}

.log-title {
  display: flex;
  flex-direction: column;
}

.log-title h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.log-subtitle {
  font-size: 12px;
  color: var(--muted-foreground);
}

.log-content-wrapper {
  display: flex;
  flex-direction: column;
  flex: 1;
  gap: 10px;
  padding: 12px 14px 14px;
  overflow: hidden;
}

.log-filter {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
}

.world-select {
  width: 180px;
}

.search-wrapper {
  width: 220px;
}

.log-content {
  flex: 1;
  padding: 10px;
  background-color: #1e1e1e;
  color: #d4d4d4;
  border-radius: 4px;
  font-family: Consolas, Monaco, 'Andale Mono', monospace;
  font-size: 13px;
  line-height: 1.5;
  overflow-y: auto;
  min-height: 200px;
  max-height: calc(100vh - 200px);
  white-space: pre-wrap;
  word-wrap: break-word;
}

.log-content > div {
  height: 100%;
}

.log-content pre {
  margin: 0;
  overflow-y: auto;
  height: calc(100% - 30px);
}

.log-content code {
  display: block;
  width: 100%;
  padding: 2px 5px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  white-space: pre-wrap;
  word-break: break-all;
}

.log-info {
  color: #9cdcfe;
}

.log-warning {
  color: #f9d649;
}

.log-error {
  color: #f14c4c;
  font-weight: bold;
}

.log-debug {
  color: #6a9955;
}

.log-actions-bottom {
  display: flex;
  justify-content: space-between;
  margin-top: 10px;
}

.log-empty {
  min-height: 240px;
  border: 1px dashed var(--border);
}

.log-loading {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  color: #d4d4d4;
}

.auto-scroll-control {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--foreground);
  font-size: 13px;
  cursor: pointer;
}

.log-info-row {
  padding: 5px;
  background-color: #2b2b2b;
  color: #ffffff;
  font-size: 12px;
  border-radius: 3px 3px 0 0;
  text-align: center;
}

@media (max-width: 640px) {
  .log-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .log-actions,
  .log-filter {
    width: 100%;
    flex-wrap: wrap;
  }

  .world-select,
  .search-wrapper {
    width: 100%;
  }

  .log-content {
    max-height: 60vh;
  }
}
</style>
