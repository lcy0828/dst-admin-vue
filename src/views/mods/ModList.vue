<template>
  <div class="page-container">
    <header class="page-heading">
      <div><h1>{{ $t('mods.installed.title') }}</h1><p>{{ $t('mods.installed.subtitle') }}</p></div>
      <div class="header-actions">
        <UiButton size="sm" variant="outline" @click="refreshModList" :disabled="loading || !selectedRoomId"><RefreshCw data-icon="inline-start" />{{ $t('mods.actions.refresh') }}</UiButton>
        <UiButton size="sm" @click="goToSearch"><Plus data-icon="inline-start" />{{ $t('mods.actions.add') }}</UiButton>
        <UiButton size="sm" variant="outline" @click="getModConfigFile" :disabled="loadingConfig || !selectedWorldId"><FileCode2 data-icon="inline-start" />{{ $t('mods.actions.getConfigFile') }}</UiButton>
      </div>
    </header>

    <Card class="filter-panel">
      <CardHeader><div><CardTitle>{{ $t('mods.installed.filters.title') }}</CardTitle><CardDescription>{{ $t('mods.installed.filters.description') }}</CardDescription></div></CardHeader>
      <CardContent>
        <FieldGroup class="filter-form">
          <Field>
            <FieldLabel for="installed-mod-room">{{ $t('mods.installed.filters.room') }}</FieldLabel>
            <UiSelect v-model="selectedRoomId" :disabled="loadingRooms" @update:model-value="handleRoomChange">
              <SelectTrigger id="installed-mod-room"><SelectValue :placeholder="$t('mods.installed.filters.selectRoom')" /></SelectTrigger>
              <SelectContent><SelectGroup><SelectItem v-for="room in roomOptions" :key="room.id" :value="room.id">{{ room.name }}</SelectItem></SelectGroup></SelectContent>
            </UiSelect>
          </Field>
          <Field>
            <FieldLabel for="installed-mod-world">{{ $t('mods.installed.filters.world') }}</FieldLabel>
            <UiSelect v-model="selectedWorldId" :disabled="!selectedRoomId" @update:model-value="handleWorldChange">
              <SelectTrigger id="installed-mod-world"><SelectValue :placeholder="$t('mods.installed.filters.selectWorld')" /></SelectTrigger>
              <SelectContent><SelectGroup><SelectItem v-for="world in selectedRoomWorlds" :key="world.id" :value="world.id">{{ world.name }}</SelectItem></SelectGroup></SelectContent>
            </UiSelect>
          </Field>
          <Field>
            <FieldLabel for="installed-mod-status">{{ $t('mods.installed.filters.status') }}</FieldLabel>
            <UiSelect v-model="filterForm.status">
              <SelectTrigger id="installed-mod-status"><SelectValue /></SelectTrigger>
              <SelectContent><SelectGroup><SelectItem value="all">{{ $t('mods.installed.filters.statuses.all') }}</SelectItem><SelectItem value="enabled">{{ $t('mods.installed.filters.statuses.enabled') }}</SelectItem><SelectItem value="disabled">{{ $t('mods.installed.filters.statuses.disabled') }}</SelectItem></SelectGroup></SelectContent>
            </UiSelect>
          </Field>
          <Field>
            <FieldLabel for="installed-mod-sort">{{ $t('mods.installed.filters.sort') }}</FieldLabel>
            <UiSelect v-model="filterForm.sortBy">
              <SelectTrigger id="installed-mod-sort"><SelectValue /></SelectTrigger>
              <SelectContent><SelectGroup>
                <SelectItem value="name">{{ $t('mods.installed.filters.sorts.name') }}</SelectItem><SelectItem value="author">{{ $t('mods.installed.filters.sorts.author') }}</SelectItem><SelectItem value="update_time">{{ $t('mods.installed.filters.sorts.updatedAt') }}</SelectItem><SelectItem value="subscribers">{{ $t('mods.installed.filters.sorts.subscribers') }}</SelectItem><SelectItem value="rating">{{ $t('mods.installed.filters.sorts.rating') }}</SelectItem>
              </SelectGroup></SelectContent>
            </UiSelect>
          </Field>
          <Field>
            <FieldLabel for="installed-mod-search">{{ $t('mods.installed.filters.keyword') }}</FieldLabel>
            <InputGroup><InputGroupAddon><Search /></InputGroupAddon><InputGroupInput id="installed-mod-search" v-model="filterForm.keyword" :placeholder="$t('mods.installed.filters.keywordPlaceholder')" /></InputGroup>
          </Field>
          <div class="filter-actions"><UiButton @click="applyFilter">{{ $t('mods.actions.filter') }}</UiButton><UiButton variant="outline" @click="resetFilter">{{ $t('mods.actions.reset') }}</UiButton></div>
        </FieldGroup>
      </CardContent>
    </Card>

    <Alert v-if="loadError" variant="destructive">
      <TriangleAlert />
      <AlertTitle>{{ $t('mods.installed.loadFailedTitle') }}</AlertTitle>
      <AlertDescription>{{ loadError }}</AlertDescription>
      <AlertAction><UiButton size="sm" variant="outline" @click="retryLoad">{{ $t('mods.actions.retry') }}</UiButton></AlertAction>
    </Alert>

    <div v-if="loading" class="loading-state"><Spinner /><span>{{ $t('mods.installed.loading') }}</span></div>

    <div v-else-if="!loadError && filteredMods.length > 0" class="mod-grid">
          <Card v-for="mod in filteredMods" :key="mod.id" class="mod-card">
            <div class="mod-image"><ImageIcon /><img v-if="mod.image || defaultIcon" :src="mod.image || defaultIcon" :alt="mod.name" loading="lazy" @error="handleImageError" /></div>
            <CardHeader>
              <div class="mod-title-row">
                <CardTitle class="truncate" :title="mod.name">{{ mod.name }}</CardTitle>
                <div class="mod-world-state">
                  <Badge :variant="isConfiguredInSelectedWorld(mod) ? (isEnabledInSelectedWorld(mod) ? 'default' : 'secondary') : 'outline'">
                    {{ selectedWorldStateLabel(mod) }}
                  </Badge>
                  <UiSwitch
                    :model-value="isEnabledInSelectedWorld(mod)"
                    :disabled="isModBusy(mod) || !isConfiguredInSelectedWorld(mod)"
                    :aria-label="$t('mods.installed.aria.toggle', { name: mod.name })"
                    @update:model-value="value => toggleModStatus(mod, value)"
                  />
                </div>
              </div>
              <CardDescription>{{ mod.author || $t('mods.values.unknownAuthor') }}</CardDescription>
            </CardHeader>
            <CardContent>
              <div class="mod-meta">
                <span v-if="mod.version"><Tag />{{ mod.version }}</span>
                <span v-if="mod.update_time"><Clock />{{ formatDate(mod.update_time) }}</span>
                <span v-if="mod.subscribers"><Users />{{ mod.subscribers }} {{ $t('mods.values.subscriptions') }}</span>
                <span v-if="mod.rating !== null"><Star />{{ formatRating(mod.rating) }}</span>
              </div>
              <div v-if="displayTags(mod).length" class="mod-tags"><Badge v-for="tag in displayTags(mod)" :key="tag" variant="secondary">{{ tagLabel(tag) }}</Badge></div>
            </CardContent>
            <CardFooter class="mod-actions">
              <UiButton size="sm" :disabled="!isConfiguredInSelectedWorld(mod) || isModBusy(mod)" @click="openConfigDialog(mod)"><Settings2 data-icon="inline-start" />{{ $t('mods.actions.configure') }}</UiButton>
              <DropdownMenu>
                <DropdownMenuTrigger as-child><UiButton variant="ghost" size="icon-sm" :aria-label="$t('mods.installed.aria.openMenu', { name: mod.name })" :title="$t('mods.installed.aria.menuTitle')"><MoreHorizontal /></UiButton></DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuGroup>
                    <DropdownMenuItem @select="showModDetails(mod)">{{ $t('mods.actions.details') }}</DropdownMenuItem>
                    <DropdownMenuItem v-if="mod.updateAvailable" :disabled="isModBusy(mod)" @select="updateMod(mod)">{{ $t('mods.actions.updateMod') }}</DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup><DropdownMenuItem variant="destructive" :disabled="isModBusy(mod)" @select="uninstallMod(mod)">{{ $t('mods.actions.removeFromRoom') }}</DropdownMenuItem></DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardFooter>
          </Card>
    </div>

    <Empty v-else-if="!loadError">
      <EmptyHeader><EmptyMedia variant="icon"><PackageOpen /></EmptyMedia><EmptyTitle>{{ $t(selectedRoomId ? 'mods.installed.empty.noMods' : 'mods.installed.empty.noRooms') }}</EmptyTitle><EmptyDescription>{{ $t(selectedRoomId ? 'mods.installed.empty.noModsDescription' : 'mods.installed.empty.noRoomsDescription') }}</EmptyDescription></EmptyHeader>
      <EmptyContent v-if="selectedRoomId"><UiButton @click="goToSearch"><Plus data-icon="inline-start" />{{ $t('mods.actions.add') }}</UiButton></EmptyContent>
    </Empty>

    <mod-config-dialog v-model="configDialogVisible" :mod-id="currentModId" :mod-info="currentModInfo" :room-id="selectedRoomId" :world-id="selectedWorldId" :is-new-mod="false" @config-updated="handleConfigUpdated" />

    <ModDetailsDialog v-model:open="detailsDialogVisible" :mod="currentModInfo" :loading="detailsLoading" :actions="false">
      <template #actions="{ mod }">
        <UiButton :disabled="!selectedWorldId" @click="openConfigDialog(mod)"><Settings2 data-icon="inline-start" />{{ $t('mods.actions.configure') }}</UiButton>
      </template>
    </ModDetailsDialog>

    <UiDialog v-model:open="uninstallDialogVisible">
      <DialogContent>
        <DialogHeader><DialogTitle>{{ $t('mods.installed.uninstall.title') }}</DialogTitle><DialogDescription>{{ $t('mods.installed.uninstall.description') }}</DialogDescription></DialogHeader>
        <Alert variant="destructive"><TriangleAlert /><AlertTitle>{{ currentModInfo ? currentModInfo.name : '' }}</AlertTitle><AlertDescription>{{ $t('mods.installed.uninstall.confirmationDescription') }}</AlertDescription></Alert>
        <FieldGroup><Field><FieldLabel for="uninstall-confirmation">{{ $t('mods.installed.uninstall.roomName') }}</FieldLabel><UiInput id="uninstall-confirmation" v-model="uninstallConfirmation" :placeholder="currentRoom ? $t('mods.installed.uninstall.placeholder', { name: currentRoom.name }) : $t('mods.installed.uninstall.fallbackPlaceholder')" /></Field></FieldGroup>
        <DialogFooter><UiButton variant="outline" @click="uninstallDialogVisible = false">{{ $t('mods.actions.cancel') }}</UiButton><UiButton variant="destructive" @click="confirmUninstall" :disabled="uninstalling"><Spinner v-if="uninstalling" data-icon="inline-start" />{{ $t('mods.actions.confirmRemoveFromRoom') }}</UiButton></DialogFooter>
      </DialogContent>
    </UiDialog>

    <UiDialog v-model:open="configFileDialogVisible">
      <DialogContent class="max-w-4xl">
        <DialogHeader><DialogTitle>{{ $t('mods.installed.configFile.title') }}</DialogTitle><DialogDescription>modoverrides.lua</DialogDescription></DialogHeader>
        <div v-if="loadingConfig" class="loading-state"><Spinner /><span>{{ $t('mods.installed.configFile.loading') }}</span></div>
        <pre v-else class="lua-code">{{ configFileContent }}</pre>
        <DialogFooter><UiButton variant="outline" @click="configFileDialogVisible = false">{{ $t('mods.actions.close') }}</UiButton><UiButton @click="downloadConfigFile"><Download data-icon="inline-start" />{{ $t('mods.actions.downloadConfigFile') }}</UiButton></DialogFooter>
      </DialogContent>
    </UiDialog>
  </div>
</template>

<script>
import { Clock, Download, FileCode2, ImageIcon, MoreHorizontal, PackageOpen, Plus, RefreshCw, Search, Settings2, Star, Tag, TriangleAlert, Users } from '@lucide/vue';
import { toast } from 'vue-sonner';
import ModConfigDialog from './ModConfigDialog.vue';
import ModDetailsDialog from './ModDetailsDialog.vue';
import { modApi } from '@/api';
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button as UiButton } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog as UiDialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input as UiInput } from '@/components/ui/input';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Select as UiSelect, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Switch as UiSwitch } from '@/components/ui/switch';
import { createModFailure, formatModDate, formatModFailure } from '@/i18n/modMessages';

const MOD_TAG_KEYS = Object.freeze({
  character: 'character', item: 'item', pet: 'pet', creature: 'creature', environment: 'environment',
  interface: 'interface', utility: 'utility', art: 'art', worldgen: 'worldgen', tweak: 'tweak',
  scenario: 'scenario', language: 'language', other: 'other', tutorial: 'tutorial',
  client_only_mod: 'clientOnly', server_only_mod: 'serverOnly',
  all_clients_require_mod: 'allClientsRequire', server_admin: 'serverAdmin'
});

export default {
  name: 'ModList',
  components: {
    Alert,
    AlertAction,
    AlertDescription,
    AlertTitle,
    Badge,
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
    Clock,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    Download,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
    Field,
    FieldGroup,
    FieldLabel,
    FileCode2,
    ImageIcon,
    InputGroup,
    InputGroupAddon,
    InputGroupInput,
    ModConfigDialog,
    ModDetailsDialog,
    MoreHorizontal,
    PackageOpen,
    Plus,
    RefreshCw,
    Search,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
    Settings2,
    Spinner,
    Star,
    Tag,
    TriangleAlert,
    UiButton,
    UiDialog,
    UiInput,
    UiSelect,
    UiSwitch,
    Users
  },
  data() {
    return {
      // 模组列表
      modsList: [],
      // 加载状态
      loading: false,
      loadFailure: null,
      loadingRooms: false,
      roomOptions: [],
      selectedRoomId: '',
      selectedRoomWorlds: [],
      selectedWorldId: '',
      // 筛选
      filterForm: {
        status: 'all',
        sortBy: 'name',
        keyword: ''
      },
      // 配置对话框
      configDialogVisible: false,
      currentModId: null,
      currentModInfo: null,
      // 详情对话框
      detailsDialogVisible: false,
      detailsLoading: false,
      detailsRequestId: 0,
      // 卸载对话框
      uninstallDialogVisible: false,
      uninstalling: false,
      uninstallConfirmation: '',
      // 默认图标
      defaultIcon: '',
      // 配置文件查看相关
      configFileDialogVisible: false,
      configFileContent: '',
      loadingConfig: false,
      modActionState: {},
    };
  },
  computed: {
    loadError() {
      return this.localizedFailure(this.loadFailure);
    },
    currentRoom() {
      return this.roomOptions.find(room => room.id === this.selectedRoomId) || null;
    },
    // 筛选后的模组列表
    filteredMods() {
      let result = [...this.modsList];
      if (this.filterForm.status && this.filterForm.status !== 'all') {
        const isEnabled = this.filterForm.status === 'enabled';
        result = result.filter(mod => mod.enabled === isEnabled);
      }
      if (this.filterForm.keyword) {
        const keyword = this.filterForm.keyword.toLowerCase();
        result = result.filter(mod => 
          (mod.name || '').toLowerCase().includes(keyword) ||
          (mod.author || '').toLowerCase().includes(keyword) ||
          (mod.description && mod.description.toLowerCase().includes(keyword))
        );
      }
      result.sort((a, b) => {
        switch (this.filterForm.sortBy) {
          case 'name':
            return (a.name || '').localeCompare(b.name || '');
          case 'author':
            return (a.author || '').localeCompare(b.author || '');
          case 'update_time': {
            // 处理各种可能的日期格式
            const timeA = a.update_time || a.updatedAt || '';
            const timeB = b.update_time || b.updatedAt || '';
            return timeB.localeCompare(timeA); // 简单字符串比较，新的日期通常字符串比较结果更大
          }
          case 'subscribers': {
            // 移除逗号并转为数字
            const subsA = parseInt((a.subscribers || '0').replace(/,/g, '')) || 0;
            const subsB = parseInt((b.subscribers || '0').replace(/,/g, '')) || 0;
            return subsB - subsA;
          }
          case 'rating': {
            // 确保评分是数字
            const ratingA = parseFloat(a.rating || 0);
            const ratingB = parseFloat(b.rating || 0);
            return ratingB - ratingA;
          }
          default:
            return 0;
        }
      });
      return result;
    }
  },
  async created() {
    await this.initializeContext();
  },
  methods: {
    handleImageError(event) {
      event.currentTarget.hidden = true;
    },
    async initializeContext() {
      this.loadingRooms = true;
      this.loadFailure = null;
      try {
        const context = await modApi.getContext({
          roomId: this.$route.query.roomId || '',
          worldId: this.$route.query.worldId || ''
        });
        this.roomOptions = context.rooms;
        this.selectedRoomId = context.room?.id || '';
        this.selectedRoomWorlds = context.worlds;
        this.selectedWorldId = context.world?.id || '';
        if (this.selectedRoomId) await this.fetchModsList();
      } catch (error) {
        this.loadFailure = this.failure('mods.errors.context', error);
        toast.error(this.loadError);
      } finally {
        this.loadingRooms = false;
      }
    },

    async handleRoomChange(roomId) {
      this.loadFailure = null;
      try {
        const context = await modApi.getContext({ roomId });
        this.selectedRoomWorlds = context.worlds;
        this.selectedWorldId = context.world?.id || '';
        await this.syncRouteContext();
        await this.fetchModsList();
      } catch (error) {
        this.loadFailure = this.failure('mods.errors.roomSwitch', error);
        toast.error(this.loadError);
      }
    },

    async handleWorldChange() {
      await this.syncRouteContext();
    },

    async syncRouteContext() {
      await this.$router.replace({
        path: this.$route.path,
        query: {
          ...this.$route.query,
          roomId: this.selectedRoomId || undefined,
          worldId: this.selectedWorldId || undefined
        }
      });
    },

    // 获取模组列表
    async fetchModsList(silent = false) {
      if (!this.selectedRoomId) {
        this.modsList = [];
        return;
      }
      if (!silent) this.loading = true;
      this.loadFailure = null;
      try {
        this.modsList = await modApi.getServerList({ roomId: this.selectedRoomId });
      } catch (error) {
        this.modsList = [];
        this.loadFailure = this.failure('mods.errors.list', error);
        toast.error(this.loadError);
      } finally {
        if (!silent) this.loading = false;
      }
    },

    isModBusy(mod) {
      return Boolean(this.modActionState[mod?.modid]);
    },

    isConfiguredInSelectedWorld(mod) {
      return Boolean(this.selectedWorldId && mod?.configuredWorlds?.includes(this.selectedWorldId));
    },

    isEnabledInSelectedWorld(mod) {
      return Boolean(this.selectedWorldId && mod?.enabledWorlds?.includes(this.selectedWorldId));
    },

    selectedWorldStateLabel(mod) {
      if (!this.selectedWorldId) return this.$t('mods.installed.worldState.selectWorld');
      if (!this.isConfiguredInSelectedWorld(mod)) return this.$t('mods.installed.worldState.notConfigured');
      return this.$t(this.isEnabledInSelectedWorld(mod) ? 'mods.values.enabled' : 'mods.values.disabled');
    },

    setModBusy(mod, busy) {
      if (!mod?.modid) return;
      this.modActionState = { ...this.modActionState, [mod.modid]: busy };
    },

    failure(key, error) {
      return createModFailure(key, error);
    },

    localizedFailure(failure) {
      return formatModFailure(this.$t, failure);
    },

    formatDate(value, fallback = '--') {
      if (!value) return fallback;
      return formatModDate(value, this.$i18n.locale);
    },

    formatRating(value) {
      const score = Number(value);
      return `${(score <= 1 ? score * 5 : score).toFixed(1)} / 5`;
    },

    displayTags(mod) {
      return (mod.tags || []).filter(tag => !String(tag).toLowerCase().startsWith('version:'));
    },

    tagLabel(value) {
      const key = MOD_TAG_KEYS[String(value).trim().toLowerCase()];
      return key ? this.$t(`mods.workshop.categories.${key}`) : value;
    },
    
    // 应用筛选
    applyFilter() {
      // 已通过计算属性实现
    },
    
    // 重置筛选
    resetFilter() {
      this.filterForm = {
        status: 'all',
        sortBy: 'name',
        keyword: ''
      };
    },
    
    // 刷新模组列表
    refreshModList() {
      this.fetchModsList();
    },

    retryLoad() {
      if (this.selectedRoomId) this.fetchModsList();
      else this.initializeContext();
    },
    
    // 打开配置对话框
    openConfigDialog(mod) {
      if (!this.selectedWorldId) {
        toast.warning(this.$t('mods.installed.feedback.selectConfigWorld'));
        return;
      }
      this.detailsDialogVisible = false;
      // 先重置当前模组信息
      this.currentModInfo = null;
      this.loading = true;
      
      // 先获取模组配置数据
      modApi.getModConfig({
        roomId: this.selectedRoomId,
        worldId: this.selectedWorldId,
        modid: mod.modid,
        mod
      }).then(res => {
        this.currentModId = mod.modid;
        this.currentModInfo = res.modinfo;
        // 获取数据成功后再显示对话框
        this.$nextTick(() => {
          this.configDialogVisible = true;
        });
      }).catch(err => {
        console.error(err);
        toast.error(this.localizedFailure(this.failure('mods.errors.config', err)));
      }).finally(() => {
        this.loading = false;
      });
    },
    
    // 配置更新回调
    handleConfigUpdated(data) {
      toast.success(this.$t('mods.installed.feedback.configUpdated', { id: data.modId }));
      this.fetchModsList();
    },
    
    // 切换模组状态
    async toggleModStatus(mod, status) {
      if (this.isModBusy(mod)) return;
      if (!this.isConfiguredInSelectedWorld(mod)) {
        toast.warning(this.$t('mods.installed.feedback.selectConfiguredWorld'));
        return;
      }
      this.setModBusy(mod, true);
      try {
        await modApi.toggleMod({
          roomId: this.selectedRoomId,
          modid: mod.modid,
          worldIds: [this.selectedWorldId],
          enabled: status
        });
        await this.fetchModsList(true);
        toast.success(this.$t(status ? 'mods.installed.feedback.enabled' : 'mods.installed.feedback.disabled', { name: mod.name }));
      } catch (err) {
        console.error(err);
        toast.error(this.localizedFailure(this.failure(status ? 'mods.errors.toggleEnable' : 'mods.errors.toggleDisable', err)));
      } finally {
        this.setModBusy(mod, false);
      }
    },
    
    // 下拉菜单命令处理
    handleCommand(command) {
      switch(command.type) {
        case 'details':
          this.showModDetails(command.mod);
          break;
        case 'update':
          this.updateMod(command.mod);
          break;
        case 'uninstall':
          this.uninstallMod(command.mod);
          break;
      }
    },
    
    // 显示模组详情
    async showModDetails(mod) {
      const requestId = ++this.detailsRequestId;
      this.currentModInfo = mod;
      this.detailsDialogVisible = true;
      this.detailsLoading = true;
      try {
        const details = await modApi.getModDetails(mod);
        if (requestId === this.detailsRequestId) this.currentModInfo = details;
      } catch (error) {
        if (requestId === this.detailsRequestId) {
          toast.error(this.localizedFailure(this.failure('mods.errors.details', error)));
        }
      } finally {
        if (requestId === this.detailsRequestId) this.detailsLoading = false;
      }
    },
    
    // 更新模组
    async updateMod(mod) {
      if (this.isModBusy(mod)) return;
      this.setModBusy(mod, true);
      try {
        await modApi.updateMod({ modid: mod.modid });
        await this.fetchModsList(true);
        toast.success(this.$t('mods.installed.feedback.updated', { name: mod.name }));
      } catch (error) {
        toast.error(this.localizedFailure(this.failure('mods.errors.update', error)));
      } finally {
        this.setModBusy(mod, false);
      }
    },
    
    // 卸载模组
    uninstallMod(mod) {
      this.currentModInfo = mod;
      this.uninstallConfirmation = '';
      this.uninstallDialogVisible = true;
    },
    
    // 确认卸载
    async confirmUninstall() {
      if (!this.currentModInfo) return;
      if (!this.currentRoom || this.uninstallConfirmation !== this.currentRoom.name) {
        toast.warning(this.$t('mods.installed.feedback.confirmRoomName'));
        return;
      }
      
      this.uninstalling = true;
      
      // 使用新的接口卸载模组
      const modName = this.currentModInfo.name;
      try {
        await modApi.removeModFromRoom({
          roomId: this.selectedRoomId,
          modid: this.currentModInfo.modid,
          worldIds: this.selectedRoomWorlds.map(world => world.id),
          confirmation: this.uninstallConfirmation
        });
        await this.fetchModsList(true);
        toast.success(this.$t('mods.installed.feedback.uninstalled', { name: modName }));
        this.uninstallDialogVisible = false;
        this.uninstallConfirmation = '';
        this.currentModInfo = null;
      } catch (err) {
        console.error('卸载模组失败:', err);
        toast.error(this.localizedFailure(this.failure('mods.errors.uninstall', err)));
      } finally {
        this.uninstalling = false;
      }
    },
    
    // 导航到搜索页面
    goToSearch() {
      this.$router.push('/mods/search');
    },

    // 获取配置文件
    getModConfigFile() {
      if (!this.selectedWorldId) {
        toast.warning(this.$t('mods.installed.feedback.selectViewWorld'));
        return;
      }
      this.loadingConfig = true;
      modApi.getAllModConfigFile({
        roomId: this.selectedRoomId,
        worldId: this.selectedWorldId
      })
        .then(res => {
          if (res && res.file?.exists) {
            // 保存配置文件内容并显示对话框
            this.configFileContent = res.modinfo;
            this.configFileDialogVisible = true;
          } else {
            toast.warning(this.$t('mods.installed.feedback.configFileMissing'));
          }
        })
        .catch(err => {
          console.error('获取配置文件失败:', err);
          toast.error(this.localizedFailure(this.failure('mods.errors.configFile', err)));
        })
        .finally(() => {
          this.loadingConfig = false;
        });
    },
    
    // 下载配置文件
    downloadConfigFile() {
      if (!this.configFileContent) {
        toast.error(this.$t('mods.installed.feedback.noDownloadContent'));
        return;
      }
      
      // 创建一个可下载的 Lua 文件
      const blob = new Blob([this.configFileContent], { type: 'text/plain' });
      
      // 创建临时下载链接
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = 'modoverrides.lua';
      
      // 点击下载
      document.body.appendChild(link);
      link.click();
      
      // 清理
      window.URL.revokeObjectURL(link.href);
      document.body.removeChild(link);
      
      toast.success(this.$t('mods.installed.feedback.configFileDownloaded'));
    }
  }
};
</script>

<style scoped>
.page-container {
  width: 100%;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.page-heading,
.header-actions,
.mod-title-row,
.mod-actions,
.filter-actions,
.loading-state,
.mod-meta span {
  display: flex;
  align-items: center;
}

.page-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
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

.header-actions,
.filter-actions,
.mod-actions {
  min-width: 0;
  gap: 8px;
}

.header-actions {
  flex-wrap: wrap;
}

.filter-form {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 180px), 1fr));
  align-items: end;
  gap: 12px;
}

.filter-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.loading-state {
  min-height: 260px;
  justify-content: center;
  gap: 8px;
  color: var(--muted-foreground);
}

.mod-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 250px), 1fr));
  gap: 16px;
}

.mod-card {
  min-width: 0;
  overflow: hidden;
}

.mod-image {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: var(--muted);
  color: var(--muted-foreground);
}

.mod-image {
  width: 100%;
  aspect-ratio: 16 / 9;
  border-bottom: 1px solid var(--border);
}

.mod-image > svg {
  width: 28px;
  height: 28px;
}

.mod-image img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.mod-title-row {
  justify-content: space-between;
  gap: 8px;
}

.mod-world-state {
  display: flex;
  align-items: center;
  flex: none;
  gap: 8px;
}

.mod-meta {
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: var(--muted-foreground);
  font-size: 12px;
}

.mod-meta span {
  gap: 5px;
}

.mod-meta svg {
  width: 14px;
  height: 14px;
}

.mod-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}

.mod-actions {
  justify-content: space-between;
  margin-top: auto;
}

.lua-code {
  max-height: 60vh;
  margin: 0;
  padding: 12px;
  overflow: auto;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--muted);
  color: var(--foreground);
  font-size: 12px;
  white-space: pre-wrap;
  word-break: break-word;
}

@media (max-width: 760px) {
  .page-heading {
    align-items: stretch;
    flex-direction: column;
  }

  .filter-form {
    grid-template-columns: 1fr;
  }
}
</style>
