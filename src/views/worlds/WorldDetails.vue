<template>
  <div class="world-details-page">
    <header class="page-header">
      <div>
        <h1>{{ $t('worlds.details.title') }}</h1>
        <p>{{ $t('worlds.details.subtitle') }}</p>
      </div>
      <div class="header-actions">
        <UiButton variant="outline" @click="goBack"><ArrowLeft data-icon="inline-start" />{{ $t('worlds.details.back') }}</UiButton>
        <UiButton :disabled="!canConfigureWorld(world)" :title="!canConfigureWorld(world) ? $t('worlds.list.configureDisabled') : ''" @click="editWorld"><Pencil data-icon="inline-start" />{{ $t('worlds.details.edit') }}</UiButton>
      </div>
    </header>

    <div v-if="loading && !world.id" class="details-skeleton" aria-busy="true" :aria-label="$t('worlds.details.loadingAria')">
      <Skeleton class="h-52 w-full" />
      <Skeleton class="h-40 w-full" />
    </div>

    <Alert v-else-if="loadError" variant="destructive">
      <CircleAlert />
      <AlertTitle>{{ $t('worlds.details.loadFailed') }}</AlertTitle>
      <AlertDescription>{{ loadError }}</AlertDescription>
      <AlertAction><UiButton size="sm" variant="outline" @click="loadWorldData">{{ $t('common.actions.retry') }}</UiButton></AlertAction>
    </Alert>

    <div v-else-if="world.id" class="details-layout">
      <div class="main-column">
        <Alert v-if="getWorldStatusMessage(world)" :variant="world.status === 'failed' ? 'destructive' : 'default'">
          <CircleAlert />
          <AlertTitle>{{ $t(world.status === 'failed' ? 'worlds.details.startFailed' : 'worlds.details.runtimeNotice') }}</AlertTitle>
          <AlertDescription>{{ getWorldStatusMessage(world) }}</AlertDescription>
        </Alert>
        <Card>
          <CardHeader>
            <CardTitle>{{ $t('worlds.details.info') }}</CardTitle>
            <CardDescription>{{ world.roomName ? $t('worlds.details.roomDescription', { room: world.roomName }) : $t('worlds.details.basicDescription') }}</CardDescription>
            <CardAction><Badge :variant="getStatusTag(world)">{{ getStatusName(world) }}</Badge></CardAction>
          </CardHeader>
          <CardContent>
            <dl class="world-info">
              <div class="info-item"><dt>{{ $t('worlds.details.fields.name') }}</dt><dd>{{ world.name || '--' }}</dd></div>
              <div class="info-item"><dt>{{ $t('worlds.details.fields.type') }}</dt><dd><Badge :variant="getTypeTag(world.type)">{{ getTypeName(world.type) }}</Badge></dd></div>
              <div class="info-item"><dt>{{ $t('worlds.details.fields.season') }}</dt><dd>{{ world.season || '--' }}</dd></div>
              <div class="info-item"><dt>{{ $t('worlds.details.fields.day') }}</dt><dd>{{ world.day ?? '--' }}</dd></div>
              <div class="info-item"><dt>{{ $t('worlds.details.fields.description') }}</dt><dd class="description">{{ world.description || '--' }}</dd></div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{{ $t('worlds.details.stats') }}</CardTitle><CardDescription>{{ $t('worlds.details.statsDescription') }}</CardDescription></CardHeader>
          <CardContent class="stats-grid">
            <div class="stat-item"><strong>{{ world.day ?? '--' }}</strong><span>{{ $t('worlds.details.totalDays') }}</span></div>
            <Alert>
              <Activity />
              <AlertTitle>{{ $t('worlds.details.moreStatsUnavailable') }}</AlertTitle>
              <AlertDescription>{{ $t('worlds.details.moreStatsDescription') }}</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>

      <div class="side-column">
        <Card>
          <CardHeader><CardTitle>{{ $t('worlds.details.quickActions') }}</CardTitle><CardDescription>{{ $t('worlds.details.quickActionsDescription') }}</CardDescription></CardHeader>
          <CardContent class="action-list">
            <UiButton
              :variant="getWorldPrimaryAction(world).variant"
              :disabled="getWorldPrimaryAction(world).disabled || loading"
              @click="toggleWorldStatus"
            >
              <Spinner v-if="loading" data-icon="inline-start" />
              <Square v-else-if="getWorldPrimaryAction(world).kind === 'stop'" data-icon="inline-start" />
              <Play v-else-if="getWorldPrimaryAction(world).kind === 'start'" data-icon="inline-start" />
              {{ getWorldPrimaryAction(world).label }}
            </UiButton>
            <UiButton v-if="world.status === 'failed'" variant="outline" :disabled="loading || !canCleanFailedWorld(world)" @click="cleanupFailedWorld"><Square data-icon="inline-start" />{{ $t('worlds.actions.cleanupSession') }}</UiButton>
            <UiButton variant="outline" :disabled="loading || !canStopWorld(world)" @click="regenerateWorld"><RefreshCw data-icon="inline-start" />{{ $t('worlds.actions.regenerate') }}</UiButton>
            <UiButton variant="outline" :disabled="loading" @click="backupWorld"><Archive data-icon="inline-start" />{{ $t('worlds.actions.backup') }}</UiButton>
            <UiButton variant="destructive" :disabled="loading || !canDeleteWorld(world)" @click="deleteWorld"><Trash2 data-icon="inline-start" />{{ $t('worlds.actions.delete') }}</UiButton>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{{ $t('worlds.details.recentActivity') }}</CardTitle><CardDescription>{{ $t('worlds.details.recentActivityDescription') }}</CardDescription></CardHeader>
          <CardContent>
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon"><Activity /></EmptyMedia>
                <EmptyTitle>{{ $t('worlds.details.noActivity') }}</EmptyTitle>
                <EmptyDescription>{{ $t('worlds.details.noActivityDescription') }}</EmptyDescription>
              </EmptyHeader>
            </Empty>
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
</template>

<script>
import { Activity, Archive, ArrowLeft, CircleAlert, Pencil, Play, RefreshCw, Square, Trash2 } from '@lucide/vue';
import { toast } from 'vue-sonner';
import { roomApi } from '../../api/index';
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button as UiButton } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { confirmAction, promptText } from '@/lib/feedback';
import {
  canCleanFailedWorld as canCleanFailedRuntimeWorld,
  canConfigureWorld as canConfigureRuntimeWorld,
  canDeleteWorld as canDeleteRuntimeWorld,
  canStopWorld,
  worldPrimaryAction,
  worldStatusLabel,
  worldStatusMessage,
  worldStatusVariant
} from '@/lib/worldRuntimeStatus.mjs';

export default {
  name: 'WorldDetails',
  components: {
    Activity,
    Alert,
    AlertAction,
    AlertDescription,
    AlertTitle,
    Archive,
    ArrowLeft,
    Badge,
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    CircleAlert,
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
    Pencil,
    Play,
    RefreshCw,
    Skeleton,
    Spinner,
    Square,
    Trash2,
    UiButton
  },
  data() {
    return {
      loading: false,
      loadError: '',
      roomId: null,
      worldId: null,
      world: {
        id: null,
        name: '',
        type: 'unknown',
        season: null,
        day: null,
        status: 'unknown',
        description: '',
        controlAvailable: false,
        statusMessage: ''
      }
    }
  },
  methods: {
    goBack() {
      this.$router.push('/worlds/list');
    },
    editWorld() {
      this.$router.push({
        path: '/worlds/settings',
        query: { id: this.worldId, roomId: this.roomId, worldId: this.worldId }
      });
    },
    getStatusName(status) {
      return worldStatusLabel(status, this.$t);
    },
    getStatusTag(status) {
      return worldStatusVariant(status);
    },
    getWorldStatusMessage(world) {
      return worldStatusMessage(world);
    },
    getWorldPrimaryAction(world) {
      return worldPrimaryAction(world, this.$t);
    },
    canStopWorld(world) {
      return canStopWorld(world);
    },
    canCleanFailedWorld(world) {
      return canCleanFailedRuntimeWorld(world);
    },
    canConfigureWorld(world) {
      return canConfigureRuntimeWorld(world);
    },
    canDeleteWorld(world) {
      return canDeleteRuntimeWorld(world);
    },
    getTypeName(type) {
      if (type === 'forest' || type === 'master') return this.$t('worlds.types.master');
      if (type === 'cave') return this.$t('worlds.types.cave');
      return this.$t('worlds.types.other');
    },
    getTypeTag(type) {
      if (type === 'cave') return 'secondary';
      return 'outline';
    },
    toggleWorldStatus() {
      const primaryAction = worldPrimaryAction(this.world, this.$t);
      if (primaryAction.disabled || !primaryAction.kind) {
        toast.warning(worldStatusMessage(this.world) || this.$t('worlds.feedback.actionUnavailable'));
        return;
      }
      const action = primaryAction.label;
      confirmAction(this.$t('worlds.feedback.actionConfirm', { action, world: this.world.name }), this.$t('worlds.feedback.actionTitle', { action }), {
        confirmButtonText: this.$t('common.actions.confirm'),
        cancelButtonText: this.$t('common.actions.cancel'),
        type: 'warning'
      }).then(() => {
        this.loading = true;
        const request = { room_id: this.roomId, world_id: this.worldId };
        const operation = primaryAction.kind === 'stop'
          ? roomApi.stopRoom(request)
          : roomApi.startRoom(request);
        operation
          .then(async () => {
            await this.loadWorldData();
            toast.success(this.$t('worlds.feedback.actionCompleted', { action }));
          })
          .catch(error => toast.error(this.$t('worlds.feedback.actionFailed', {
            action,
            error: error.message || this.$t('common.errors.unknown')
          })))
          .finally(() => { this.loading = false; });
      }).catch(() => {
        toast.info(this.$t('worlds.feedback.canceled'));
      });
    },
    async cleanupFailedWorld() {
      if (!canCleanFailedRuntimeWorld(this.world)) {
        toast.warning(worldStatusMessage(this.world) || this.$t('worlds.feedback.cleanupUnavailable'));
        return;
      }
      try {
        await confirmAction(this.$t('worlds.feedback.cleanupConfirm', { world: this.world.name }), this.$t('worlds.feedback.cleanupTitle'), {
          confirmButtonText: this.$t('worlds.feedback.cleanupButton'),
          type: 'warning'
        });
      } catch {
        return;
      }

      this.loading = true;
      try {
        await roomApi.cleanupRoom({ room_id: this.roomId, world_id: this.worldId });
        await this.loadWorldData();
        toast.success(this.$t('worlds.feedback.cleanupSucceeded'));
      } catch (error) {
        toast.error(this.$t('worlds.feedback.cleanupFailed', {
          error: error.message || this.$t('common.errors.unknown')
        }));
      } finally {
        this.loading = false;
      }
    },
    async regenerateWorld() {
      if (!canStopWorld(this.world) && this.world.status === 'running') {
        toast.error(this.$t('worlds.feedback.unmanagedRegenerate'));
        return;
      }
      if (!canStopWorld(this.world)) {
        toast.warning(this.$t('worlds.feedback.regenerateNeedsRunning'));
        return;
      }
      let confirmation;
      try {
        const result = await promptText(
          this.$t('worlds.feedback.regeneratePrompt', { world: this.world.name, room: this.world.roomName }),
          this.$t('worlds.feedback.regenerateTitle'),
          {
            confirmButtonText: this.$t('worlds.feedback.regenerateButton'),
            cancelButtonText: this.$t('common.actions.cancel'),
            inputValidator: value => value === this.world.roomName || this.$t('worlds.feedback.roomNameMismatch')
          }
        );
        confirmation = result.value;
      } catch {
        return;
      }

      this.loading = true;
      try {
        await roomApi.regenerateWorld({
          room_id: this.roomId,
          world_id: this.worldId,
          confirmation
        });
        await this.loadWorldData();
        toast.success(this.$t('worlds.feedback.regenerated'));
      } catch (error) {
        toast.error(this.$t('worlds.feedback.regenerateFailed', {
          error: error.message || this.$t('common.errors.unknown')
        }));
      } finally {
        this.loading = false;
      }
    },
    backupWorld() {
      confirmAction(this.$t('worlds.feedback.backupConfirm', { world: this.world.name, room: this.world.roomName }), this.$t('worlds.feedback.backupTitle'), {
        confirmButtonText: this.$t('common.actions.confirm'),
        cancelButtonText: this.$t('common.actions.cancel'),
        type: 'info'
      }).then(() => {
        this.loading = true;
        roomApi.backupRoom(this.roomId, `world ${this.world.name}`)
          .then(() => toast.success(this.$t('worlds.feedback.backupCreated')))
          .catch(error => toast.error(this.$t('worlds.feedback.backupFailed', {
            error: error.message || this.$t('common.errors.unknown')
          })))
          .finally(() => { this.loading = false; });
      }).catch(() => {
        toast.info(this.$t('worlds.feedback.canceled'));
      });
    },
    async deleteWorld() {
      if (!canDeleteRuntimeWorld(this.world)) {
        toast.warning(this.$t(this.world.status === 'failed' ? 'worlds.feedback.deleteNeedsCleanup' : 'worlds.feedback.deleteNeedsStop'));
        return;
      }
      let confirmation;
      try {
        const result = await promptText(
          this.$t('worlds.feedback.deletePrompt', { world: this.world.name, room: this.world.roomName }),
          this.$t('worlds.feedback.deleteTitle'),
          {
            confirmButtonText: this.$t('worlds.feedback.moveToRecovery'),
            cancelButtonText: this.$t('common.actions.cancel'),
            inputValidator: value => value === this.world.roomName || this.$t('worlds.feedback.roomNameMismatch')
          }
        );
        confirmation = result.value;
      } catch {
        return;
      }

      this.loading = true;
      try {
        await roomApi.deleteWorld({
          room_id: this.roomId,
          world_id: this.worldId,
          confirmation
        });
        toast.success(this.$t('worlds.feedback.deleteSucceeded'));
        await this.$router.replace('/worlds/list');
      } catch (error) {
        toast.error(this.$t('worlds.feedback.deleteFailed', {
          error: error.message || this.$t('common.errors.unknown')
        }));
      } finally {
        this.loading = false;
      }
    },
    loadWorldData() {
      if (!this.roomId || !this.worldId) return;
      this.loading = true;
      this.loadError = '';
      return Promise.all([
        roomApi.getRoomDetail(this.roomId),
        roomApi.getRoomWorlds(this.roomId)
      ])
        .then(([roomResponse, worlds]) => {
          const world = worlds.find(item => item.id === this.worldId);
          if (!world) throw new Error(this.$t('worlds.details.notFound'));
          this.world = {
            ...world,
            roomName: roomResponse.data.name,
            description: world.description || ''
          };
        })
        .catch(error => {
          this.loadError = error.message || this.$t('worlds.details.readFailed');
          toast.error(this.$t('worlds.details.fetchFailed', {
            error: error.message || this.$t('common.errors.unknown')
          }));
        })
        .finally(() => { this.loading = false; });
    }
  },
  created() {
    const { id, roomId, worldId } = this.$route.query;
    if (roomId && (worldId || id)) {
      this.roomId = roomId;
      this.worldId = worldId || id;
      this.loadWorldData();
    } else {
      toast.error(this.$t('worlds.details.missingId'));
      this.goBack();
    }
  }
}
</script>

<style scoped>
.world-details-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
  width: 100%;
  min-width: 0;
}

.page-header,
.header-actions {
  display: flex;
  align-items: center;
}

.page-header {
  justify-content: space-between;
  gap: 12px;
}

.page-header h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
}

.page-header p {
  margin: 4px 0 0;
  color: var(--muted-foreground);
  font-size: 14px;
}

.header-actions {
  gap: 8px;
}

.details-skeleton {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(260px, 1fr);
  gap: 24px;
}

.details-layout {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(260px, 1fr);
  gap: 24px;
}

.main-column,
.side-column {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 24px;
}

.world-info {
  margin: 0;
}

.info-item {
  display: grid;
  grid-template-columns: 110px minmax(0, 1fr);
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid var(--border);
}

.info-item:last-child {
  border-bottom: 0;
}

.info-item dt {
  color: var(--muted-foreground);
  font-size: 13px;
}

.info-item dd {
  min-width: 0;
  margin: 0;
}

.description {
  white-space: pre-line;
}

.stats-grid {
  display: grid;
  grid-template-columns: minmax(140px, 0.5fr) minmax(0, 1.5fr);
  gap: 12px;
}

.stat-item {
  display: flex;
  align-items: flex-start;
  flex-direction: column;
  gap: 4px;
  justify-content: center;
  padding-right: 12px;
  border-right: 1px solid var(--border);
}

.stat-item strong {
  font-size: 20px;
}

.stat-item span {
  color: var(--muted-foreground);
  font-size: 12px;
}

.action-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.action-list > * {
  width: 100%;
}

@media (max-width: 860px) {
  .details-skeleton,
  .details-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .page-header {
    align-items: stretch;
    flex-direction: column;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .stat-item {
    padding: 0 0 12px;
    border-right: 0;
    border-bottom: 1px solid var(--border);
  }

  .header-actions > * {
    flex: 1;
  }
}
</style>
