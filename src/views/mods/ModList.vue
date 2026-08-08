<template>
  <div class="page-container">
    <header class="page-heading">
      <div><h1>已下载模组</h1><p>管理房间内已安装模组及各世界配置。</p></div>
      <div class="header-actions">
        <UiButton size="sm" variant="outline" @click="refreshModList" :disabled="loading || !selectedRoomId"><RefreshCw data-icon="inline-start" />刷新</UiButton>
        <UiButton size="sm" @click="goToSearch"><Plus data-icon="inline-start" />添加模组</UiButton>
        <UiButton size="sm" variant="outline" @click="getModConfigFile" :disabled="loadingConfig || !selectedWorldId"><FileCode2 data-icon="inline-start" />获取配置文件</UiButton>
      </div>
    </header>

    <Card size="sm" class="filter-panel">
      <CardContent>
        <FieldGroup class="filter-form">
          <Field>
            <FieldLabel for="installed-mod-room">房间</FieldLabel>
            <UiSelect v-model="selectedRoomId" :disabled="loadingRooms" @update:model-value="handleRoomChange">
              <SelectTrigger id="installed-mod-room"><SelectValue placeholder="请选择房间" /></SelectTrigger>
              <SelectContent><SelectGroup><SelectItem v-for="room in roomOptions" :key="room.id" :value="room.id">{{ room.name }}</SelectItem></SelectGroup></SelectContent>
            </UiSelect>
          </Field>
          <Field>
            <FieldLabel for="installed-mod-world">世界</FieldLabel>
            <UiSelect v-model="selectedWorldId" :disabled="!selectedRoomId" @update:model-value="handleWorldChange">
              <SelectTrigger id="installed-mod-world"><SelectValue placeholder="配置与文件查看目标" /></SelectTrigger>
              <SelectContent><SelectGroup><SelectItem v-for="world in selectedRoomWorlds" :key="world.id" :value="world.id">{{ world.name }}</SelectItem></SelectGroup></SelectContent>
            </UiSelect>
          </Field>
          <Field>
            <FieldLabel for="installed-mod-status">状态</FieldLabel>
            <UiSelect v-model="filterForm.status">
              <SelectTrigger id="installed-mod-status"><SelectValue /></SelectTrigger>
              <SelectContent><SelectGroup><SelectItem value="all">全部</SelectItem><SelectItem value="enabled">已启用</SelectItem><SelectItem value="disabled">已禁用</SelectItem></SelectGroup></SelectContent>
            </UiSelect>
          </Field>
          <Field>
            <FieldLabel for="installed-mod-sort">排序方式</FieldLabel>
            <UiSelect v-model="filterForm.sortBy">
              <SelectTrigger id="installed-mod-sort"><SelectValue /></SelectTrigger>
              <SelectContent><SelectGroup>
                <SelectItem value="name">名称</SelectItem><SelectItem value="author">作者</SelectItem><SelectItem value="update_time">更新时间</SelectItem><SelectItem value="subscribers">订阅数</SelectItem><SelectItem value="rating">评分</SelectItem>
              </SelectGroup></SelectContent>
            </UiSelect>
          </Field>
          <Field>
            <FieldLabel for="installed-mod-search">关键词</FieldLabel>
            <InputGroup><InputGroupAddon><Search /></InputGroupAddon><InputGroupInput id="installed-mod-search" v-model="filterForm.keyword" placeholder="搜索模组" /></InputGroup>
          </Field>
          <div class="filter-actions"><UiButton @click="applyFilter">筛选</UiButton><UiButton variant="outline" @click="resetFilter">重置</UiButton></div>
        </FieldGroup>
      </CardContent>
    </Card>

    <Alert v-if="loadError" variant="destructive">
      <TriangleAlert />
      <AlertTitle>模组列表加载失败</AlertTitle>
      <AlertDescription>{{ loadError }}</AlertDescription>
      <AlertAction><UiButton size="sm" variant="outline" @click="retryLoad">重试</UiButton></AlertAction>
    </Alert>

    <div v-if="loading" class="loading-state"><Spinner /><span>正在加载模组列表</span></div>

    <div v-else-if="!loadError && filteredMods.length > 0" class="mod-grid">
          <Card v-for="mod in filteredMods" :key="mod.id" class="mod-card">
            <div class="mod-image"><ImageIcon /><img v-if="mod.image || defaultIcon" :src="mod.image || defaultIcon" :alt="mod.name" loading="lazy" @error="handleImageError" /></div>
            <CardHeader>
              <div class="mod-title-row"><CardTitle class="truncate" :title="mod.name">{{ mod.name }}</CardTitle><UiSwitch v-model="mod.enabled" :aria-label="`切换 ${mod.name}`" @update:model-value="value => toggleModStatus(mod, value)" /></div>
              <CardDescription>{{ mod.author || '未知作者' }}</CardDescription>
            </CardHeader>
            <CardContent>
              <div class="mod-meta">
                <span v-if="mod.version"><Tag />{{ mod.version }}</span>
                <span v-if="mod.update_time"><Clock />{{ mod.update_time }}</span>
                <span v-if="mod.subscribers"><Users />{{ mod.subscribers }} 订阅</span>
                <span v-if="mod.rating !== null"><Star />{{ mod.rating }} 评分</span>
              </div>
              <div v-if="mod.tags && mod.tags.length" class="mod-tags"><Badge v-for="tag in mod.tags" :key="tag" variant="secondary">{{ tag }}</Badge></div>
            </CardContent>
            <CardFooter class="mod-actions">
              <UiButton size="sm" :disabled="!selectedWorldId" @click="openConfigDialog(mod)"><Settings2 data-icon="inline-start" />配置</UiButton>
              <DropdownMenu>
                <DropdownMenuTrigger as-child><UiButton variant="ghost" size="icon-sm" :aria-label="`打开 ${mod.name} 操作菜单`" title="模组操作"><MoreHorizontal /></UiButton></DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuGroup>
                    <DropdownMenuItem @select="showModDetails(mod)">查看详情</DropdownMenuItem>
                    <DropdownMenuItem v-if="mod.updateAvailable" @select="updateMod(mod)">更新模组</DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup><DropdownMenuItem variant="destructive" @select="uninstallMod(mod)">卸载模组</DropdownMenuItem></DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardFooter>
          </Card>
    </div>

    <Empty v-else-if="!loadError">
      <EmptyHeader><EmptyMedia variant="icon"><PackageOpen /></EmptyMedia><EmptyTitle>{{ selectedRoomId ? '还没有安装任何模组' : '没有可管理的房间' }}</EmptyTitle><EmptyDescription>{{ selectedRoomId ? '从创意工坊搜索并添加模组。' : '先创建或接管一个房间，再管理模组。' }}</EmptyDescription></EmptyHeader>
      <EmptyContent v-if="selectedRoomId"><UiButton @click="goToSearch"><Plus data-icon="inline-start" />添加模组</UiButton></EmptyContent>
    </Empty>

    <mod-config-dialog v-model="configDialogVisible" :mod-id="currentModId" :mod-info="currentModInfo" :room-id="selectedRoomId" :world-id="selectedWorldId" :is-new-mod="false" @config-updated="handleConfigUpdated" />

    <Sheet v-model:open="detailsDialogVisible">
      <SheetContent side="right" class="mod-details-sheet">
        <SheetHeader><SheetTitle>模组详情</SheetTitle><SheetDescription>已安装模组的版本、兼容性和文件信息。</SheetDescription></SheetHeader>
        <ScrollArea class="mod-details-scroll">
          <div v-if="currentModInfo" class="mod-details-content">
            <div class="mod-details-header">
              <div class="mod-details-image"><ImageIcon /><img v-if="currentModInfo.image || defaultIcon" :src="currentModInfo.image || defaultIcon" :alt="currentModInfo.name" @error="handleImageError" /></div>
              <div><h3>{{ currentModInfo.name }}</h3><p>{{ currentModInfo.author || '未知作者' }}</p><Badge :variant="currentModInfo.enabled ? 'default' : 'secondary'">{{ currentModInfo.enabled ? '已启用' : '已禁用' }}</Badge></div>
            </div>
            <Separator />
            <section><h4>模组描述</h4><p class="description-content">{{ currentModInfo.description || '该模组暂无描述' }}</p></section>
            <section v-if="currentModInfo.compatibility"><h4>兼容性</h4><div class="compatibility-tags">
              <Badge v-if="currentModInfo.compatibility.dst">饥荒联机版</Badge><Badge v-if="currentModInfo.compatibility.ds" variant="outline">单机版饥荒</Badge><Badge v-if="currentModInfo.compatibility.rog" variant="secondary">巨人国</Badge><Badge v-if="currentModInfo.compatibility.sw" variant="secondary">海难</Badge><Badge v-if="currentModInfo.compatibility.hamlet" variant="outline">哈姆雷特</Badge>
            </div></section>
            <section><h4>文件信息</h4><dl class="file-info-list">
              <div><dt>模组 ID</dt><dd>{{ currentModInfo.modid || '未知' }}</dd></div><div><dt>安装位置</dt><dd>{{ currentModInfo.path || '未知' }}</dd></div><div><dt>文件大小</dt><dd>{{ currentModInfo.size || '未知' }}</dd></div><div><dt>安装时间</dt><dd>{{ currentModInfo.time || currentModInfo.installedAt || '未知' }}</dd></div>
            </dl></section>
          </div>
        </ScrollArea>
        <SheetFooter><UiButton variant="outline" @click="detailsDialogVisible = false">关闭</UiButton><UiButton @click="openConfigDialog(currentModInfo)" :disabled="!currentModInfo || !selectedWorldId">配置模组</UiButton></SheetFooter>
      </SheetContent>
    </Sheet>

    <UiDialog v-model:open="uninstallDialogVisible">
      <DialogContent>
        <DialogHeader><DialogTitle>卸载模组</DialogTitle><DialogDescription>此操作会永久删除模组文件和配置。</DialogDescription></DialogHeader>
        <Alert variant="destructive"><TriangleAlert /><AlertTitle>{{ currentModInfo ? currentModInfo.name : '' }}</AlertTitle><AlertDescription>输入完整房间名确认卸载。</AlertDescription></Alert>
        <FieldGroup><Field><FieldLabel for="uninstall-confirmation">完整房间名</FieldLabel><UiInput id="uninstall-confirmation" v-model="uninstallConfirmation" :placeholder="currentRoom ? `请输入 ${currentRoom.name}` : '请输入完整房间名'" /></Field></FieldGroup>
        <DialogFooter><UiButton variant="outline" @click="uninstallDialogVisible = false">取消</UiButton><UiButton variant="destructive" @click="confirmUninstall" :disabled="uninstalling"><Spinner v-if="uninstalling" data-icon="inline-start" />确认卸载</UiButton></DialogFooter>
      </DialogContent>
    </UiDialog>

    <UiDialog v-model:open="configFileDialogVisible">
      <DialogContent class="max-w-4xl">
        <DialogHeader><DialogTitle>模组配置文件</DialogTitle><DialogDescription>modoverrides.lua</DialogDescription></DialogHeader>
        <div v-if="loadingConfig" class="loading-state"><Spinner /><span>正在读取配置文件</span></div>
        <pre v-else class="lua-code">{{ configFileContent }}</pre>
        <DialogFooter><UiButton variant="outline" @click="configFileDialogVisible = false">关闭</UiButton><UiButton @click="downloadConfigFile"><Download data-icon="inline-start" />下载配置文件</UiButton></DialogFooter>
      </DialogContent>
    </UiDialog>
  </div>
</template>

<script>
import { Clock, Download, FileCode2, ImageIcon, MoreHorizontal, PackageOpen, Plus, RefreshCw, Search, Settings2, Star, Tag, TriangleAlert, Users } from '@lucide/vue';
import { toast } from 'vue-sonner';
import ModConfigDialog from './ModConfigDialog.vue';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select as UiSelect, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Spinner } from '@/components/ui/spinner';
import { Switch as UiSwitch } from '@/components/ui/switch';

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
    MoreHorizontal,
    PackageOpen,
    Plus,
    RefreshCw,
    ScrollArea,
    Search,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
    Separator,
    Settings2,
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
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
      loadError: '',
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
    };
  },
  computed: {
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
      this.loadError = '';
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
        this.loadError = error.message || '加载模组上下文失败';
        toast.error(this.loadError);
      } finally {
        this.loadingRooms = false;
      }
    },

    async handleRoomChange(roomId) {
      this.loadError = '';
      try {
        const context = await modApi.getContext({ roomId });
        this.selectedRoomWorlds = context.worlds;
        this.selectedWorldId = context.world?.id || '';
        await this.syncRouteContext();
        await this.fetchModsList();
      } catch (error) {
        this.loadError = error.message || '切换房间失败';
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
    async fetchModsList() {
      if (!this.selectedRoomId) {
        this.modsList = [];
        return;
      }
      this.loading = true;
      this.loadError = '';
      try {
        this.modsList = await modApi.getServerList({ roomId: this.selectedRoomId });
      } catch (error) {
        this.modsList = [];
        this.loadError = error.message || '未知错误';
        toast.error(`获取模组列表失败：${this.loadError}`);
      } finally {
        this.loading = false;
      }
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
        toast.warning('请先选择要配置的世界');
        return;
      }
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
        toast.error(`获取模组配置失败：${err.message || '未知错误'}`);
      }).finally(() => {
        this.loading = false;
      });
    },
    
    // 配置更新回调
    handleConfigUpdated(data) {
      toast.success(`模组 ${data.modId} 配置已更新！`);
      this.fetchModsList();
    },
    
    // 切换模组状态
    toggleModStatus(mod, status) {
      this.loading = true;
      const action = status ? '启用' : '禁用';
      
      modApi.toggleMod({
        roomId: this.selectedRoomId,
        modid: mod.modid,
        worldIds: mod.configuredWorlds.length > 0
          ? mod.configuredWorlds
          : this.selectedRoomWorlds.map(world => world.id),
        enabled: status
      }).then(() => {
        // 更新成功后,更新本地状态
        mod.enabled = status;
        toast.success(`已${action}模组 ${mod.name}`);
      }).catch(err => {
        console.error(err);
        // 操作失败,恢复状态
        mod.enabled = !status;
        toast.error(`${action}模组失败：${err.message || '未知错误'}`);
      }).finally(() => {
        this.loading = false;
      });
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
    showModDetails(mod) {
      this.currentModInfo = mod;
      this.detailsDialogVisible = true;
    },
    
    // 更新模组
    async updateMod(mod) {
      this.loading = true;
      try {
        await modApi.updateMod({ roomId: this.selectedRoomId, modid: mod.modid });
        await this.fetchModsList();
        toast.success(`模组 ${mod.name} 已更新`);
      } catch (error) {
        toast.error(`更新模组失败：${error.message || '未知错误'}`);
      } finally {
        this.loading = false;
      }
    },
    
    // 卸载模组
    uninstallMod(mod) {
      this.currentModInfo = mod;
      this.uninstallConfirmation = '';
      this.uninstallDialogVisible = true;
    },
    
    // 确认卸载
    confirmUninstall() {
      if (!this.currentModInfo) return;
      if (!this.currentRoom || this.uninstallConfirmation !== this.currentRoom.name) {
        toast.warning('请输入完整房间名确认卸载');
        return;
      }
      
      this.uninstalling = true;
      
      // 使用新的接口卸载模组
      modApi.deleteMod({
        roomId: this.selectedRoomId,
        modid: this.currentModInfo.modid,
        worldIds: this.selectedRoomWorlds.map(world => world.id),
        confirmation: this.uninstallConfirmation,
        removeFiles: true
      })
        .then(() => {
          // 从列表中移除
          const index = this.modsList.findIndex(mod => mod.modid === this.currentModInfo.modid);
          if (index > -1) {
            this.modsList.splice(index, 1);
          }
          
          toast.success(`模组 ${this.currentModInfo.name} 已成功卸载`);
        })
        .catch(err => {
          console.error('卸载模组失败:', err);
          toast.error(`卸载模组失败: ${err.message || '未知错误'}`);
        })
        .finally(() => {
          this.uninstalling = false;
          this.uninstallDialogVisible = false;
          this.uninstallConfirmation = '';
          this.currentModInfo = null;
        });
    },
    
    // 导航到搜索页面
    goToSearch() {
      this.$router.push({ path: '/mods/search', query: { roomId: this.selectedRoomId || undefined } });
    },

    // 获取配置文件
    getModConfigFile() {
      if (!this.selectedWorldId) {
        toast.warning('请先选择要查看的世界');
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
            toast.warning('该世界还没有 modoverrides.lua 文件');
          }
        })
        .catch(err => {
          console.error('获取配置文件失败:', err);
          toast.error(`获取配置文件失败：${err.message || '未知错误'}`);
        })
        .finally(() => {
          this.loadingConfig = false;
        });
    },
    
    // 下载配置文件
    downloadConfigFile() {
      if (!this.configFileContent) {
        toast.error('没有可下载的配置内容');
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
      
      toast.success('模组配置文件已成功下载');
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
  gap: 16px;
}

.page-heading,
.header-actions,
.mod-title-row,
.mod-actions,
.filter-actions,
.loading-state,
.mod-meta span,
.mod-details-header {
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
  font-size: 20px;
  font-weight: 650;
  line-height: 28px;
}

.page-heading p {
  margin: 2px 0 0;
  color: var(--muted-foreground);
  font-size: 12px;
}

.header-actions,
.filter-actions,
.mod-actions {
  gap: 8px;
}

.header-actions {
  flex-wrap: wrap;
}

.filter-form {
  display: grid;
  grid-template-columns: repeat(5, minmax(150px, 1fr)) auto;
  align-items: end;
  gap: 12px;
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

.mod-image,
.mod-details-image {
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

.mod-image > svg,
.mod-details-image > svg {
  width: 28px;
  height: 28px;
}

.mod-image img,
.mod-details-image img {
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

.mod-tags,
.compatibility-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}

.mod-actions {
  justify-content: space-between;
  margin-top: auto;
}

.mod-details-sheet {
  width: min(680px, 96vw);
  max-width: min(680px, 96vw);
}

.mod-details-scroll {
  height: calc(100vh - 150px);
  padding: 0 18px 18px;
}

.mod-details-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.mod-details-header {
  align-items: flex-start;
  gap: 16px;
}

.mod-details-image {
  width: 120px;
  aspect-ratio: 1;
  flex: none;
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.mod-details-header h3 {
  margin: 0;
  font-size: 18px;
}

.mod-details-header p {
  margin: 4px 0 10px;
  color: var(--muted-foreground);
}

.description-content {
  white-space: pre-line;
}

.file-info-list {
  margin: 0;
}

.file-info-list > div {
  display: grid;
  grid-template-columns: 100px minmax(0, 1fr);
  gap: 10px;
  padding: 8px 0;
  border-bottom: 1px solid var(--border);
}

.file-info-list dt {
  color: var(--muted-foreground);
}

.file-info-list dd {
  min-width: 0;
  margin: 0;
  overflow-wrap: anywhere;
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

@media (max-width: 1180px) {
  .filter-form {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .page-heading {
    align-items: stretch;
    flex-direction: column;
  }

  .filter-form {
    grid-template-columns: 1fr;
  }

  .filter-actions > * {
    flex: 1;
  }

  .mod-details-sheet {
    width: 100vw;
    max-width: 100vw;
  }
}
</style>
