<template>
  <div class="page-container">
    <header class="page-heading">
      <div><h1>搜索模组</h1><p>从创意工坊检索并安装到指定房间。</p></div>
      <UiButton variant="outline" size="sm" @click="goToModList"><ArrowLeft data-icon="inline-start" />返回已下载模组</UiButton>
    </header>

    <Card size="sm" class="search-panel">
      <CardHeader><div><CardTitle>搜索条件</CardTitle><CardDescription>选择目标房间并输入创意工坊模组名称。</CardDescription></div></CardHeader>
      <CardContent>
        <FieldGroup class="search-form">
          <Field>
            <FieldLabel for="workshop-room">房间</FieldLabel>
            <UiSelect v-model="selectedRoomId" :disabled="loadingRooms" @update:model-value="handleRoomChange">
              <SelectTrigger id="workshop-room"><SelectValue :placeholder="loadingRooms ? '正在加载房间' : '请选择房间'" /></SelectTrigger>
              <SelectContent>
                <SelectGroup><SelectItem v-for="room in roomOptions" :key="room.id" :value="room.id">{{ room.name }}</SelectItem></SelectGroup>
              </SelectContent>
            </UiSelect>
          </Field>
          <Field>
            <FieldLabel for="mod-search-keyword">模组名称</FieldLabel>
            <InputGroup>
              <InputGroupAddon><Search /></InputGroupAddon>
              <InputGroupInput id="mod-search-keyword" v-model="searchForm.keyword" placeholder="输入模组名称搜索" @keyup.enter="startSearch" />
            </InputGroup>
          </Field>
          <div class="search-actions">
            <UiButton @click="startSearch" :disabled="searching || !searchForm.keyword.trim()">
              <Spinner v-if="searching" data-icon="inline-start" /><Search v-else data-icon="inline-start" />搜索
            </UiButton>
            <UiButton variant="outline" @click="resetSearch">重置</UiButton>
          </div>
        </FieldGroup>
      </CardContent>
    </Card>

    <Alert v-if="loadError" variant="destructive">
      <TriangleAlert />
      <AlertTitle>模组数据加载失败</AlertTitle>
      <AlertDescription>{{ loadError }}</AlertDescription>
      <AlertAction><UiButton size="sm" variant="outline" @click="retryLoad">重试</UiButton></AlertAction>
    </Alert>

    <div v-if="searching" class="mod-grid">
          <Card v-for="index in 8" :key="index" class="mod-card">
            <Skeleton class="mod-image" />
            <CardHeader><Skeleton class="skeleton-title" /><Skeleton class="skeleton-meta" /></CardHeader>
            <CardContent><Skeleton class="skeleton-description" /></CardContent>
            <CardFooter><Skeleton class="skeleton-button" /></CardFooter>
          </Card>
    </div>

    <div v-else-if="!loadError && searchResults.length > 0">
          <div class="mod-grid">
            <Card v-for="mod in searchResults" :key="mod.id" class="mod-card">
              <div class="mod-image">
                <ImageIcon />
                <img v-if="mod.img || defaultImage" :src="mod.img || defaultImage" :alt="mod.name" loading="lazy" @error="handleImageError" />
              </div>
              <CardHeader>
                <div class="mod-title-row"><CardTitle class="truncate" :title="mod.name">{{ mod.name }}</CardTitle><Badge v-if="mod.isInstalled">已安装</Badge></div>
                <CardDescription>{{ mod.auth || '未知作者' }}</CardDescription>
              </CardHeader>
              <CardContent class="mod-meta">
                <span v-if="mod.version"><Tag />{{ mod.version }}</span>
                <span><Clock />{{ mod.time || '--' }}</span>
                <span><Users />{{ mod.sub || 0 }} 订阅</span>
                <span v-if="mod.rating !== null"><Star />{{ formatRating(mod.rating) }} 评分</span>
              </CardContent>
              <CardFooter class="mod-actions">
                <UiButton
                  size="sm"
                  :variant="mod.isInstalled ? 'outline' : 'default'"
                  :disabled="!selectedRoomId || downloadingMods[mod.id]"
                  @click="handleDownloadMod(mod)"
                >
                  <Spinner v-if="downloadingMods[mod.id]" data-icon="inline-start" />
                  <RefreshCw v-else-if="mod.isInstalled" data-icon="inline-start" />
                  <Download v-else data-icon="inline-start" />
                  {{ downloadingMods[mod.id] ? '下载中' : mod.isInstalled ? '更新' : '下载' }}
                </UiButton>
                <UiButton variant="ghost" size="sm" @click="showModDetails(mod)">查看详情</UiButton>
              </CardFooter>
            </Card>
          </div>

          <Pagination v-if="totalResults > pageSize" :page="currentPage" :total="totalResults" :items-per-page="pageSize" show-edges @update:page="handlePageChange">
            <PaginationContent v-slot="{ items }">
              <PaginationPrevious />
              <template v-for="(item, index) in items" :key="index">
                <PaginationItem v-if="item.type === 'page'" :value="item.value" :is-active="item.value === currentPage">{{ item.value }}</PaginationItem>
                <PaginationEllipsis v-else :index="index" />
              </template>
              <PaginationNext />
            </PaginationContent>
          </Pagination>
    </div>

    <Empty v-else-if="!loadError && hasSearched">
      <EmptyHeader><EmptyMedia variant="icon"><SearchX /></EmptyMedia><EmptyTitle>没有找到匹配的模组</EmptyTitle><EmptyDescription>尝试使用其他关键词。</EmptyDescription></EmptyHeader>
    </Empty>
    <Empty v-else-if="!loadError">
      <EmptyHeader><EmptyMedia variant="icon"><Search /></EmptyMedia><EmptyTitle>尚未搜索模组</EmptyTitle></EmptyHeader>
    </Empty>

    <UiDialog v-model:open="detailsDialogVisible">
      <DialogContent class="max-h-[calc(100dvh-2rem)] max-w-3xl overflow-y-auto">
        <DialogHeader><DialogTitle>模组详情</DialogTitle><DialogDescription>创意工坊模组信息。</DialogDescription></DialogHeader>
        <div v-if="currentModInfo" class="mod-details">
          <div class="mod-details-header">
            <div class="mod-details-image"><ImageIcon /><img v-if="currentModInfo.img || defaultImage" :src="currentModInfo.img || defaultImage" :alt="currentModInfo.name" @error="handleImageError" /></div>
            <div>
              <h3>{{ currentModInfo.name }}</h3>
              <div class="mod-details-meta">
                <span><User />{{ currentModInfo.auth || '未知作者' }}</span>
                <span v-if="currentModInfo.version"><Tag />v{{ currentModInfo.version }}</span>
                <span><Clock />{{ currentModInfo.time || '--' }}</span>
                <span v-if="currentModInfo.sub"><Users />{{ currentModInfo.sub }} 订阅</span>
                <span v-if="currentModInfo.rating !== null"><Star />{{ formatRating(currentModInfo.rating) }} 评分</span>
              </div>
              <Badge v-if="currentModInfo.isInstalled">已安装</Badge>
            </div>
          </div>
          <Separator />
          <div v-if="currentModInfo.describe"><h4>模组描述</h4><p class="description-content">{{ currentModInfo.describe }}</p></div>
        </div>
        <DialogFooter>
          <UiButton variant="outline" @click="detailsDialogVisible = false">关闭</UiButton>
          <UiButton :disabled="!selectedRoomId || downloadingMods[currentModInfo?.id]" @click="handleDownloadMod(currentModInfo)">
            <Spinner v-if="downloadingMods[currentModInfo?.id]" data-icon="inline-start" />
            {{ currentModInfo?.isInstalled ? '更新模组' : '下载模组' }}
          </UiButton>
        </DialogFooter>
      </DialogContent>
    </UiDialog>
  </div>
</template>

<script>
import { ArrowLeft, Clock, Download, ImageIcon, RefreshCw, Search, SearchX, Star, Tag, TriangleAlert, User, Users } from '@lucide/vue';
import { toast } from 'vue-sonner';
import { modApi } from '@/api';
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button as UiButton } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog as UiDialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Select as UiSelect, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { confirmAction } from '@/lib/feedback';

export default {
  name: 'ModSearch',
  components: {
    ArrowLeft,
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
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
    Field,
    FieldGroup,
    FieldLabel,
    ImageIcon,
    InputGroup,
    InputGroupAddon,
    InputGroupInput,
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationNext,
    PaginationPrevious,
    RefreshCw,
    Search,
    SearchX,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
    Separator,
    Skeleton,
    Spinner,
    Star,
    Tag,
    TriangleAlert,
    UiButton,
    UiDialog,
    UiSelect,
    User,
    Users
  },
  data() {
    return {
      searchForm: {
        keyword: '',
      },
      searching: false,
      loadError: '',
      hasSearched: false,
      searchResults: [],
      totalResults: 0,
      pageSize: 20,
      currentPage: 1,
      defaultImage: '',
      downloadingMods: {}, // 跟踪正在下载的模组
      installedMods: [], // 存储已安装的模组信息
      loadingInstalledMods: false, // 加载已安装模组的状态
      loadingRooms: false,
      roomOptions: [],
      selectedRoomId: '',
      selectedRoomWorlds: [],
      detailsDialogVisible: false, // 详情对话框可见性
      currentModInfo: null // 当前查看的模组
    };
  },
  async created() {
    await this.initializeContext();
    const keyword = this.$route.query.keyword;
    if (typeof keyword === 'string' && keyword.trim()) {
      this.searchForm.keyword = keyword;
      await this.searchMods();
    }
  },
  methods: {
    handleImageError(event) {
      event.currentTarget.hidden = true;
    },
    async initializeContext() {
      this.loadingRooms = true;
      this.loadError = '';
      try {
        const context = await modApi.getContext({ roomId: this.$route.query.roomId || '' });
        this.roomOptions = context.rooms;
        this.selectedRoomId = context.room?.id || '';
        this.selectedRoomWorlds = context.worlds;
        if (this.selectedRoomId) await this.getInstalledMods();
      } catch (error) {
        this.loadError = error.message || '加载房间失败';
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
        await this.$router.replace({
          path: this.$route.path,
          query: { ...this.$route.query, roomId }
        });
        await this.getInstalledMods();
        this.searchResults = this.searchResults.map(mod => ({
          ...mod,
          isInstalled: this.isModInstalled(mod.id)
        }));
      } catch (error) {
        this.loadError = error.message || '切换房间失败';
        toast.error(this.loadError);
      }
    },

    // 获取已安装模组列表
    async getInstalledMods() {
      if (!this.selectedRoomId) {
        this.installedMods = [];
        return;
      }
      this.loadingInstalledMods = true;
      this.loadError = '';
      try {
        this.installedMods = await modApi.getServerList({ roomId: this.selectedRoomId });
      } catch (error) {
        this.installedMods = [];
        this.loadError = error.message || '未知错误';
        toast.error(`获取已安装模组失败：${this.loadError}`);
      } finally {
        this.loadingInstalledMods = false;
      }
    },
    
    // 检查模组是否已安装
    isModInstalled(modId) {
      return this.installedMods.some(mod => mod.modid === modId);
    },
    
    startSearch() {
      this.currentPage = 1;
      this.searchMods();
    },

    async searchMods() {
      if (!this.searchForm.keyword.trim()) {
        toast.warning('请输入搜索关键词');
        return;
      }
      if (this.searching) {
        return;
      }
      
      this.searching = true;
      this.loadError = '';
      this.hasSearched = true;
      this.searchResults = [];
      
      try {
        const data = await modApi.searchMods({
          keyword: this.searchForm.keyword,
          page: this.currentPage,
          pageSize: this.pageSize
        });
        this.searchResults = (data.items || []).map(mod => ({
          ...mod,
          isInstalled: this.isModInstalled(mod.id)
        }));
        this.totalResults = data.total || 0;
      } catch (error) {
        this.loadError = error.message || '未知错误';
        toast.error(`搜索模组失败：${this.loadError}`);
        this.searchResults = [];
        this.totalResults = 0;
      } finally {
        this.searching = false;
      }
    },
    handleDownloadMod(mod) {
      const { name } = mod;
      
      // 如果模组已安装，询问是否要更新
      if (mod.isInstalled) {
        confirmAction(`模组 "${name}" 已安装，是否要更新？`, '更新模组', {
          confirmButtonText: '更新',
          cancelButtonText: '取消',
          type: 'warning'
        }).then(() => {
          this.downloadMod(mod);
        }).catch(() => {
          // 用户取消，不执行任何操作
        });
      } else {
        // 直接下载
        this.downloadMod(mod);
      }
    },
    
    // 实际执行下载的方法
    async downloadMod(mod) {
      if (!this.selectedRoomId) {
        toast.warning('请先选择房间');
        return;
      }
      const id = mod.id;
      const wasInstalled = mod.isInstalled;
      
      // 显示下载中消息
      const loadingMessage = toast.loading('正在下载模组，请耐心等待...');
      
      this.downloadingMods[id] = true;
      
      try {
        await modApi.downloadMod({
          roomId: this.selectedRoomId,
          worldIds: this.selectedRoomWorlds.map(world => world.id),
          id,
          installed: wasInstalled,
          enabled: true,
          includeDependencies: true
        });
        mod.isInstalled = true;
        await this.getInstalledMods();
        toast.success(wasInstalled ? '更新成功' : '下载成功');
      } catch (error) {
        toast.error(`${wasInstalled ? '更新' : '下载'}失败：${error.message || '未知错误'}`);
      } finally {
        toast.dismiss(loadingMessage);
        this.downloadingMods[id] = false;
      }
    },
    
    resetSearch() {
      this.searchForm.keyword = '';
      this.hasSearched = false;
      this.searchResults = [];
      this.searching = false;
      this.totalResults = 0;
      this.currentPage = 1;
      this.loadError = '';
    },

    retryLoad() {
      if (!this.roomOptions.length) return this.initializeContext();
      if (this.hasSearched) return this.searchMods();
      return this.getInstalledMods();
    },
    
    handlePageChange(page) {
      this.currentPage = page;
      this.searchMods();
    },

    goToModList() {
      this.$router.push({ path: '/mods/list', query: { roomId: this.selectedRoomId || undefined } });
    },

    showModDetails(mod) {
      this.currentModInfo = mod;
      this.detailsDialogVisible = true;
    },

    // 提取星级评分
    formatRating(rating) {
      return Number.isFinite(Number(rating)) ? Number(rating).toFixed(2) : '';
    },
    
    // 处理下拉菜单命令
    handleCommand(command) {
      switch(command.type) {
        case 'details':
          this.showModDetails(command.mod);
          break;
      }
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
.mod-title-row,
.mod-actions,
.search-actions,
.mod-details-header,
.mod-details-meta,
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
  font-size: 20px;
  font-weight: 650;
  line-height: 28px;
}

.page-heading p {
  margin: 2px 0 0;
  color: var(--muted-foreground);
  font-size: 12px;
}

.search-form {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr));
  align-items: end;
  gap: 12px;
}

.search-actions,
.mod-actions {
  min-width: 0;
  gap: 8px;
}

.search-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.mod-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 250px), 1fr));
  gap: 16px;
  margin-bottom: 20px;
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

.mod-meta span,
.mod-details-meta span {
  gap: 5px;
}

.mod-meta svg,
.mod-details-meta svg {
  width: 14px;
  height: 14px;
}

.mod-actions {
  justify-content: space-between;
  margin-top: auto;
}

.skeleton-title {
  width: 70%;
  height: 18px;
}

.skeleton-meta {
  width: 45%;
  height: 12px;
}

.skeleton-description {
  width: 100%;
  height: 54px;
}

.skeleton-button {
  width: 84px;
  height: 30px;
}

.mod-details {
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
  margin: 0 0 10px;
  font-size: 18px;
}

.mod-details-meta {
  flex-wrap: wrap;
  gap: 8px 14px;
  margin-bottom: 10px;
  color: var(--muted-foreground);
  font-size: 12px;
}

.description-content {
  margin: 8px 0 0;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--muted);
  white-space: pre-line;
}

@media (max-width: 760px) {
  .page-heading {
    align-items: stretch;
    flex-direction: column;
  }

  .search-form {
    grid-template-columns: 1fr;
  }

  .mod-details-header {
    flex-direction: column;
  }
}
</style>
