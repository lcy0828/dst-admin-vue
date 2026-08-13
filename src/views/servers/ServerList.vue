<template>
  <div class="server-list-page">
    <header class="page-header">
      <div>
        <h1>{{ $t('servers.list.title') }}</h1>
        <p>{{ $t('servers.list.subtitle') }}</p>
      </div>
      <UiButton size="sm" variant="outline" :disabled="loading" @click="refreshData">
        <Spinner v-if="loading" data-icon="inline-start" />
        <RefreshCw v-else data-icon="inline-start" />
        {{ $t('common.actions.refresh') }}
      </UiButton>
    </header>

    <Card class="filter-container">
      <CardHeader>
        <CardTitle>{{ $t('servers.list.filters.title') }}</CardTitle>
        <CardDescription>{{ $t('servers.list.filters.description') }}</CardDescription>
      </CardHeader>
      <CardContent class="filter-content">
        <Tabs v-model="activeTab">
          <TabsList>
            <TabsTrigger value="all">{{ $t('servers.list.filters.allShards') }}</TabsTrigger>
            <TabsTrigger value="running">{{ $t('servers.list.filters.running') }}</TabsTrigger>
            <TabsTrigger value="stopped">{{ $t('servers.list.filters.stopped') }}</TabsTrigger>
            <TabsTrigger value="failed">{{ $t('servers.list.filters.failed') }}</TabsTrigger>
          </TabsList>
        </Tabs>

        <div class="filter-options">
          <UiSelect v-model="roomFilter"><SelectTrigger><SelectValue :placeholder="$t('servers.list.filters.roomPlaceholder')" /></SelectTrigger><SelectContent><SelectGroup>
            <SelectItem value="all">{{ $t('servers.list.filters.allRooms') }}</SelectItem><SelectItem v-for="room in roomList" :key="room.id" :value="room.id">{{ room.name }}</SelectItem>
          </SelectGroup></SelectContent></UiSelect>
          <UiSelect v-model="typeFilter"><SelectTrigger><SelectValue :placeholder="$t('servers.list.filters.typePlaceholder')" /></SelectTrigger><SelectContent><SelectGroup>
            <SelectItem value="all">{{ $t('servers.list.filters.allTypes') }}</SelectItem><SelectItem value="forest">{{ $t('servers.list.filters.forest') }}</SelectItem><SelectItem value="cave">{{ $t('servers.list.filters.cave') }}</SelectItem>
          </SelectGroup></SelectContent></UiSelect>
        </div>
      </CardContent>
    </Card>

    <Card class="server-table-container">
      <CardHeader>
        <CardTitle>{{ $t('servers.list.shards.title') }}</CardTitle>
        <CardDescription>{{ $t('servers.list.shards.description') }}</CardDescription>
      </CardHeader>
      <CardContent class="table-content">
        <Alert v-if="loadError" variant="destructive" class="server-feedback">
          <CircleAlert />
          <AlertTitle>{{ $t('servers.list.shards.loadFailed') }}</AlertTitle>
          <AlertDescription>{{ loadError }}</AlertDescription>
          <AlertAction><UiButton size="sm" variant="outline" @click="refreshData">{{ $t('common.actions.retry') }}</UiButton></AlertAction>
        </Alert>
        <div v-if="loading && !serverList.length" class="table-skeleton" aria-busy="true" :aria-label="$t('servers.list.shards.loadingAria')">
          <Skeleton v-for="row in 5" :key="row" class="h-12 w-full" />
        </div>
        <div v-else-if="filteredServerList.length" class="table-scroll">
        <ShadcnTable>
          <TableHeader><TableRow>
            <TableHead>{{ $t('servers.list.shards.columns.name') }}</TableHead><TableHead>{{ $t('servers.list.shards.columns.day') }}</TableHead><TableHead>{{ $t('servers.list.shards.columns.season') }}</TableHead>
            <TableHead>{{ $t('servers.list.shards.columns.target') }}</TableHead><TableHead>{{ $t('servers.list.shards.columns.actions') }}</TableHead>
          </TableRow></TableHeader>
          <TableBody><TableRow v-for="server in filteredServerList" :key="server.session_name">
            <TableCell>
            <div class="server-name-container">
              <Badge :variant="serverStatusVariant(server)">
                {{ serverStatusLabel(server.status) }}
              </Badge>
              <Badge variant="outline">{{ getWorldTypeName(server.world_type, server.world_name) }}</Badge>
              <div>
                <div class="server-world">{{ server.world_name }}</div>
                <div class="server-room">{{ server.archive_name }}</div>
                <div v-if="serverStatusMessage(server)" class="server-failure">{{ serverStatusMessage(server) }}</div>
              </div>
            </div>
            </TableCell>
            <TableCell>{{ server.day ?? '-' }}</TableCell>
            <TableCell><Badge v-if="server.season" variant="secondary">{{ seasonLabel(server.season) }}</Badge><span v-else>-</span></TableCell>
            <TableCell><Badge variant="secondary">{{ runtimeTargetLabel }}</Badge></TableCell>
            <TableCell><div class="operation-buttons">
              <UiButton
                size="xs"
                :variant="serverPrimaryAction(server).variant"
                :disabled="!canControlServer(server) || serverActionId === serverKey(server)"
                :title="!canControlServer(server) ? (serverStatusMessage(server) || $t('servers.list.shards.unavailable')) : ''"
                @click="handleServerAction(server)"
              >
                <Spinner v-if="serverActionId === serverKey(server) || isServerStarting(server)" data-icon="inline-start" />
                <Square v-else-if="server.status === 'running'" data-icon="inline-start" />
                <Play v-else-if="serverPrimaryAction(server).kind === 'start'" data-icon="inline-start" />
                {{ serverPrimaryAction(server).label }}
              </UiButton>
              <UiButton v-if="server.status === 'failed'" size="xs" variant="outline" :disabled="!canCleanFailedServer(server) || serverActionId === serverKey(server)" @click="handleCleanupFailedServer(server)"><Square data-icon="inline-start" />{{ $t('servers.list.shards.cleanup') }}</UiButton>
              <UiButton size="xs" variant="outline" :disabled="!canConfigureServer(server)" :title="!canConfigureServer(server) ? $t('servers.list.shards.configureDisabled') : ''" @click="handleConfigure(server)">{{ $t('servers.list.shards.configure') }}</UiButton>
            </div></TableCell>
          </TableRow></TableBody>
        </ShadcnTable>
        </div>
        <Empty v-else-if="!loadError">
          <EmptyHeader><EmptyMedia variant="icon"><ServerOff /></EmptyMedia><EmptyTitle>{{ $t('servers.list.shards.empty') }}</EmptyTitle><EmptyDescription>{{ $t('servers.list.shards.emptyDescription') }}</EmptyDescription></EmptyHeader>
          <EmptyContent class="empty-actions"><UiButton @click="navigateToRoomCreation">{{ $t('servers.list.shards.createRoom') }}</UiButton><UiButton variant="outline" @click="showStartRoomDialog">{{ $t('servers.list.shards.startRoom') }}</UiButton></EmptyContent>
        </Empty>
      </CardContent>
    </Card>

    <UiDialog v-model:open="startRoomDialogVisible">
      <DialogScrollContent>
        <DialogHeader><DialogTitle>{{ $t('servers.list.startDialog.title') }}</DialogTitle><DialogDescription>{{ $t('servers.list.startDialog.description') }}</DialogDescription></DialogHeader>
        <FieldGroup>
          <Field><FieldLabel>{{ $t('servers.list.startDialog.room') }}</FieldLabel><UiSelect :model-value="startRoomForm.roomIndex" @update:model-value="selectStartRoom"><SelectTrigger class="w-full"><SelectValue :placeholder="$t('servers.list.startDialog.roomPlaceholder')" /></SelectTrigger><SelectContent><SelectGroup>
            <SelectItem v-for="(room, index) in roomList" :key="room.id" :value="String(index)">{{ room.name }}</SelectItem>
          </SelectGroup></SelectContent></UiSelect></Field>
          <FieldSet v-if="startRoomForm.roomIndex !== ''">
            <FieldLegend variant="label">{{ $t('servers.list.startDialog.worlds') }}</FieldLegend>
            <FieldDescription>{{ $t('servers.list.startDialog.worldsDescription') }}</FieldDescription>
            <FieldGroup>
              <Field
                v-for="world in selectedStartRoomWorlds"
                :key="world.id"
                orientation="horizontal"
                :data-disabled="!canStartWorld(world) || undefined"
              >
                <UiCheckbox
                  :id="`server-world-${world.id}`"
                  :model-value="startRoomForm.worldIds.includes(world.id)"
                  :disabled="!canStartWorld(world) || startRoomLoading"
                  @update:model-value="toggleWorld(world.id, $event)"
                />
                <FieldLabel :for="`server-world-${world.id}`" class="font-normal">
                  {{ world.name }}
                  <Badge variant="outline">{{ getWorldTypeName(world.type, world.name) }}</Badge>
                  <Badge :variant="serverStatusVariant(world)">{{ serverStatusLabel(world.status) }}</Badge>
                  <span v-if="serverStatusMessage(world)" class="server-failure basis-full">{{ serverStatusMessage(world) }}</span>
                </FieldLabel>
              </Field>
            </FieldGroup>
          </FieldSet>
        </FieldGroup>
        <DialogFooter><UiButton variant="outline" :disabled="startRoomLoading" @click="startRoomDialogVisible = false">{{ $t('common.actions.cancel') }}</UiButton><UiButton :disabled="startRoomLoading || !startRoomForm.worldIds.length" @click="handleStartRoomFrom"><Spinner v-if="startRoomLoading" data-icon="inline-start" /><Play v-else data-icon="inline-start" />{{ $t('servers.list.startDialog.submit') }}</UiButton></DialogFooter>
      </DialogScrollContent>
    </UiDialog>
  </div>
</template>

<script>
import { CircleAlert, Play, RefreshCw, ServerOff, Square } from '@lucide/vue';
import { toast } from 'vue-sonner';
import { systemApi, roomApi } from '@/api/index';
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button as UiButton } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox as UiCheckbox } from '@/components/ui/checkbox';
import { Dialog as UiDialog, DialogDescription, DialogFooter, DialogHeader, DialogScrollContent, DialogTitle } from '@/components/ui/dialog';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field';
import { Select as UiSelect, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Skeleton } from '@/components/ui/skeleton';
import { Table as ShadcnTable, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { confirmAction } from '@/lib/feedback';
import {
  canCleanFailedWorld,
  canConfigureWorld,
  canStartWorld as canStartRuntimeWorld,
  isWorldStarting,
  worldPrimaryAction,
  worldStatusLabel,
  worldStatusMessage,
  worldStatusVariant
} from '@/lib/worldRuntimeStatus.mjs';
import { getActiveRuntimeTarget, RUNTIME_TARGET_CHANGED_EVENT } from '@/utils/runtimeTarget';

export default {
  name: 'ServerList',
  components: {
    Alert, AlertAction, AlertDescription, AlertTitle, Badge, Card, CardContent, CardDescription,
    CardHeader, CardTitle, CircleAlert, DialogDescription, DialogFooter, DialogHeader,
    DialogScrollContent, DialogTitle, Empty, EmptyContent,
    EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle, Field, FieldDescription, FieldGroup,
    FieldLabel, FieldLegend, FieldSet, Play, RefreshCw, SelectContent, SelectGroup, SelectItem,
    SelectTrigger, SelectValue, ServerOff, ShadcnTable, Skeleton, Spinner, Square, TableBody,
    TableCell, TableHead, TableHeader, TableRow, Tabs, TabsList, TabsTrigger, UiButton, UiCheckbox,
    UiDialog, UiSelect
  },
  data() {
    return {
      loading: false,
      activeTab: 'all',
      roomFilter: '',
      typeFilter: '',
      serverList: [],
      roomList: [],
      loadError: '',
      runtimeTarget: getActiveRuntimeTarget(),
      serverActionId: '',
      refreshSequence: 0,
      startRoomDialogVisible: false,
      startRoomForm: {
        roomIndex: '',
        worldIds: []
      },
      startRoomLoading: false
    };
  },
  computed: {
    filteredServerList() {
      let result = this.serverList;

      if (this.roomFilter && this.roomFilter !== 'all') {
        result = result.filter(server => server.room_id === this.roomFilter || server.archive_name === this.roomFilter);
      }

      if (this.activeTab !== 'all') result = result.filter(server => server.status === this.activeTab);

      // 根据服务器类型筛选
      if (this.typeFilter && this.typeFilter !== 'all') {
        result = result.filter(server => {
          if (server.world_type) return server.world_type === this.typeFilter;
          return (server.world_name || '').toLowerCase().includes(this.typeFilter);
        });
      }

      return result;
    },
    selectedStartRoom() {
      if (this.startRoomForm.roomIndex === '') return null;
      return this.roomList[Number(this.startRoomForm.roomIndex)] || null;
    },
    selectedStartRoomWorlds() {
      return this.selectedStartRoom?.worlds || [];
    },
    runtimeTargetLabel() {
      if (this.runtimeTarget?.kind === 'local') return this.$t('servers.list.targets.local');
      return this.$t('servers.list.targets.remote', {
        name: this.runtimeTarget?.name || this.runtimeTarget?.id || this.$t('common.states.unknown')
      });
    }
  },
  created() {
    this.fetchData();
  },
  mounted() {
    window.addEventListener(RUNTIME_TARGET_CHANGED_EVENT, this.handleRuntimeTargetChange);
  },
  beforeUnmount() {
    window.removeEventListener(RUNTIME_TARGET_CHANGED_EVENT, this.handleRuntimeTargetChange);
  },
  methods: {
    async fetchData({ notify = false } = {}) {
      const requestSequence = ++this.refreshSequence;
      this.loading = true;
      this.loadError = '';
      try {
        const [serversResponse, roomsResponse] = await Promise.all([
          systemApi.getTmuxServers(),
          roomApi.getRoomList()
        ]);
        if (requestSequence !== this.refreshSequence) return;
        this.serverList = Array.isArray(serversResponse?.data) ? serversResponse.data : [];
        this.roomList = Array.isArray(roomsResponse?.data) ? roomsResponse.data : [];
        if (notify) toast.success(this.$t('servers.list.feedback.refreshed'));
      } catch (error) {
        if (requestSequence !== this.refreshSequence) return;
        this.serverList = [];
        this.roomList = [];
        this.loadError = error.message || this.$t('servers.list.feedback.loadFailed');
        if (notify) toast.error(this.loadError);
      } finally {
        if (requestSequence === this.refreshSequence) this.loading = false;
      }
    },
    refreshData() {
      return this.fetchData({ notify: true });
    },
    handleRuntimeTargetChange(event) {
      this.runtimeTarget = event.detail || getActiveRuntimeTarget();
      this.roomFilter = '';
      this.startRoomDialogVisible = false;
      this.fetchData();
    },
    navigateToRoomCreation() {
      this.$router.push('/rooms/settings');
    },
    getWorldTypeName(worldType, worldName = '') {
      if (worldType === 'forest') return this.$t('servers.list.worldTypes.forest');
      if (worldType === 'cave') return this.$t('servers.list.worldTypes.cave');
      const lowerName = worldName.toLowerCase();
      if (lowerName.includes('forest')) return this.$t('servers.list.worldTypes.forest');
      if (lowerName.includes('cave')) return this.$t('servers.list.worldTypes.cave');
      return worldType || this.$t('servers.list.worldTypes.custom');
    },
    seasonLabel(season) {
      const normalized = String(season || '').trim().toLowerCase();
      const key = ['autumn', 'winter', 'spring', 'summer'].includes(normalized)
        ? `servers.list.seasons.${normalized}`
        : '';
      return key ? this.$t(key) : season;
    },
    showStartRoomDialog() {
      this.startRoomForm = { roomIndex: '', worldIds: [] };
      this.startRoomDialogVisible = true;
    },
    selectStartRoom(roomIndex) {
      this.startRoomForm.roomIndex = roomIndex;
      const room = this.roomList[Number(roomIndex)];
      this.startRoomForm.worldIds = (room?.worlds || [])
        .filter(world => this.canStartWorld(world))
        .map(world => world.id);
    },
    canStartWorld(world) {
      return canStartRuntimeWorld(world);
    },
    toggleWorld(worldId, checked) {
      if (checked) {
        if (!this.startRoomForm.worldIds.includes(worldId)) this.startRoomForm.worldIds.push(worldId);
        return;
      }
      this.startRoomForm.worldIds = this.startRoomForm.worldIds.filter(id => id !== worldId);
    },
    async handleStartRoomFrom() {
      if (!this.selectedStartRoom || this.startRoomForm.worldIds.length === 0) {
        toast.warning(this.$t(this.startRoomForm.roomIndex === ''
          ? 'servers.list.feedback.selectRoom'
          : 'servers.list.feedback.selectWorld'));
        return;
      }
      const worldIds = this.selectedStartRoomWorlds
        .filter(world => this.canStartWorld(world) && this.startRoomForm.worldIds.includes(world.id))
        .map(world => world.id);
      if (!worldIds.length) {
        toast.warning(this.$t('servers.list.feedback.selectedWorldUnavailable'));
        return;
      }

      this.startRoomLoading = true;
      try {
        await roomApi.startRoom({
          room_id: this.selectedStartRoom.id,
          world_ids: worldIds
        });
        await this.fetchData();
        this.startRoomDialogVisible = false;
        toast.success(this.$t('servers.list.feedback.roomStarted'));
      } catch (error) {
        toast.error(this.$t('servers.list.feedback.roomStartFailed', {
          error: error.message || this.$t('common.errors.unknown')
        }));
      } finally {
        this.startRoomLoading = false;
      }
    },
    async handleServerAction(server) {
      if (!this.canControlServer(server)) {
        toast.warning(this.serverStatusMessage(server) || this.$t('servers.list.shards.unavailable'));
        return;
      }
      const isRunning = server.status === 'running';
      const action = this.$t(`worldRuntime.actions.${isRunning ? 'stop' : 'start'}`);
      try {
        await confirmAction(this.$t('servers.list.feedback.actionConfirm', {
          action,
          room: server.archive_name,
          world: server.world_name
        }), this.$t('servers.list.feedback.actionTitle', { action }), {
          confirmButtonText: this.$t('servers.list.feedback.actionButton', { action }),
          type: isRunning ? 'warning' : 'info'
        });
      } catch {
        toast.info(this.$t('servers.list.feedback.actionCanceled', { action }));
        return;
      }

      this.serverActionId = this.serverKey(server);
      try {
        const request = { room_id: server.room_id, world_id: server.world_id };
        await (isRunning ? roomApi.stopRoom(request) : roomApi.startRoom(request));
        await this.fetchData();
        toast.success(this.$t('servers.list.feedback.actionCompleted', { action }));
      } catch (error) {
        toast.error(this.$t('servers.list.feedback.actionFailed', {
          action,
          error: error.message || this.$t('common.errors.unknown')
        }));
      } finally {
        this.serverActionId = '';
      }
    },
    async handleCleanupFailedServer(server) {
      if (!canCleanFailedWorld(server)) {
        toast.warning(this.serverStatusMessage(server) || this.$t('servers.list.feedback.cleanupUnavailable'));
        return;
      }
      try {
        await confirmAction(this.$t('servers.list.feedback.cleanupConfirm', {
          room: server.archive_name,
          world: server.world_name
        }), this.$t('servers.list.feedback.cleanupTitle'), {
          confirmButtonText: this.$t('servers.list.feedback.cleanupButton'),
          type: 'warning'
        });
      } catch {
        return;
      }

      this.serverActionId = this.serverKey(server);
      try {
        await roomApi.cleanupRoom({ room_id: server.room_id, world_id: server.world_id });
        await this.fetchData();
        toast.success(this.$t('servers.list.feedback.cleanupSucceeded'));
      } catch (error) {
        toast.error(this.$t('servers.list.feedback.cleanupFailed', {
          error: error.message || this.$t('common.errors.unknown')
        }));
      } finally {
        this.serverActionId = '';
      }
    },
    serverKey(server) {
      return `${server.room_id}:${server.world_id}`;
    },
    canControlServer(server) {
      return !this.serverPrimaryAction(server).disabled;
    },
    canCleanFailedServer(server) {
      return canCleanFailedWorld(server);
    },
    canConfigureServer(server) {
      return canConfigureWorld(server);
    },
    serverStatusLabel(status) {
      return worldStatusLabel(status, key => this.$t(key));
    },
    serverStatusVariant(server) {
      return worldStatusVariant(server);
    },
    serverStatusMessage(server) {
      return worldStatusMessage(server);
    },
    serverPrimaryAction(server) {
      return worldPrimaryAction(server, key => this.$t(key));
    },
    isServerStarting(server) {
      return isWorldStarting(server);
    },
    handleConfigure(server) {
      this.$router.push({
        path: '/worlds/settings',
        query: {
          roomName: server.archive_name,
          worldName: server.world_name,
          roomId: server.room_id,
          worldId: server.world_id,
          worldType: server.world_type
        }
      });
    }
  }
};
</script>

<style scoped>
.server-list-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
  width: 100%;
  min-width: 0;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
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

.filter-container {
  margin: 0;
}

.filter-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 16px;
}

.filter-options {
  display: flex;
  gap: 8px;
  margin-top: 10px;
  flex-wrap: wrap;
}

.filter-options > * {
  width: 160px;
}

.server-table-container {
  min-width: 0;
  overflow: hidden;
}

.table-content {
  padding: 0;
}

.table-skeleton {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
}

.server-name-container {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.server-world {
  font-weight: 600;
  word-break: break-all;
}

.server-room {
  font-size: 12px;
  color: var(--muted-foreground);
}

.server-failure {
  color: var(--destructive);
  font-size: 12px;
  line-height: 1.4;
  overflow-wrap: anywhere;
}

.operation-buttons {
  display: flex;
  gap: 6px;
  justify-content: flex-start;
  flex-wrap: wrap;
}

.empty-actions {
  display: flex;
  gap: 8px;
  justify-content: center;
  margin-top: 16px;
}

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 220px;
  color: var(--muted-foreground);
}

.server-feedback {
  margin: 16px;
}

.table-scroll {
  width: 100%;
  overflow-x: auto;
}

@media (max-width: 768px) {
  .page-header {
    align-items: flex-start;
  }

  .filter-options {
    display: grid;
    grid-template-columns: 1fr;
  }

  .filter-options > * {
    width: 100% !important;
  }

  .empty-actions {
    align-items: stretch;
    flex-direction: column;
  }
}

</style>
