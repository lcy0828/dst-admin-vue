<template>
  <div class="world-settings-container">
    <section class="settings-surface">
      <header class="page-header">
        <div>
          <h1>世界设置{{ roomName ? ` - ${roomName}` : '' }}</h1>
          <p>管理世界生成、运行参数和模组配置。</p>
        </div>
        <div class="header-actions">
          <UiButton variant="outline" size="sm" @click="reloadSettings" :disabled="loading || loadingRooms">
            <Spinner v-if="loading || loadingRooms" data-icon="inline-start" />
            <RefreshCw v-else data-icon="inline-start" />
            刷新设置
          </UiButton>
          <UiButton size="sm" :disabled="!roomId || roomHasRunningWorld" :title="roomHasRunningWorld ? '请先停止房间中的所有世界' : '新增世界'" @click="showAddWorldDialog"><Plus data-icon="inline-start" />新增世界</UiButton>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>选择房间</CardTitle>
          <CardDescription>世界设置会直接读写所选房间的真实配置。</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel for="world-settings-room">房间</FieldLabel>
              <UiSelect v-model="selectedRoomId" :disabled="loadingRooms" @update:model-value="handleRoomChange">
                <SelectTrigger id="world-settings-room"><SelectValue placeholder="请选择已接管房间" /></SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem v-for="room in roomOptions" :key="room.id" :value="room.id">{{ room.name }}</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </UiSelect>
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      <Alert v-if="roomOptionsError" variant="destructive" class="load-error">
        <TriangleAlert />
        <AlertTitle>房间目录加载失败</AlertTitle>
        <AlertDescription>{{ roomOptionsError }}</AlertDescription>
        <AlertAction><UiButton size="sm" variant="outline" :disabled="loadingRooms" @click="retryRoomOptions">重新加载</UiButton></AlertAction>
      </Alert>

      <Alert v-if="loadError" variant="destructive" class="load-error">
        <TriangleAlert />
        <AlertTitle>世界设置加载失败</AlertTitle>
        <AlertDescription>{{ loadError }}</AlertDescription>
        <AlertAction><UiButton size="sm" variant="outline" @click="reloadSettings">重新加载</UiButton></AlertAction>
      </Alert>

      <Tabs v-if="!loadError && roomId" v-model="activeTab" orientation="horizontal" class="world-tabs">
        <div class="world-tabs-toolbar">
          <TabsList class="world-tab-list">
            <TabsTrigger v-for="world in visibleWorlds" :key="world.name" :value="world.name">
              {{ world.name }}{{ world.type === 'forest' ? ' · 森林' : world.type === 'cave' ? ' · 洞穴' : '' }}
            </TabsTrigger>
          </TabsList>
          <UiButton
            v-if="currentWorld && !currentWorld.fallback"
            variant="destructive"
            size="icon-sm"
            :disabled="currentWorld.status === 'running'"
            aria-label="删除当前世界"
            :title="currentWorld.status === 'running' ? '请先停止当前世界' : '删除当前世界'"
            @click="confirmDeleteWorld(currentWorld)"
          >
            <Trash2 />
          </UiButton>
        </div>

        <TabsContent v-for="world in visibleWorlds" :key="world.name" :value="world.name">
          <Card>
            <CardHeader>
              <CardTitle class="world-heading">
                <Sun v-if="world.type === 'forest'" />
                <Moon v-else />
                {{ world.name }} {{ world.type === 'forest' ? '森林世界' : '洞穴世界' }}
              </CardTitle>
              <CardDescription>配置地形、资源、危险、分片参数和模组。</CardDescription>
              <CardAction><Badge :variant="world.type === 'forest' ? 'outline' : 'secondary'">{{ world.type === 'forest' ? '森林' : '洞穴' }}</Badge></CardAction>
            </CardHeader>
            <CardContent>
              <Tabs v-model="worldSectionTab" orientation="horizontal" class="world-section-tabs">
                <TabsList class="section-tab-list">
                  <TabsTrigger value="worldgen">世界生成组</TabsTrigger>
                  <TabsTrigger value="worldsettings">世界设置组</TabsTrigger>
                  <TabsTrigger value="server-ini">基础配置</TabsTrigger>
                  <TabsTrigger value="mods">模组配置</TabsTrigger>
                </TabsList>

                <TabsContent value="worldgen">
                  <div v-if="loading" class="skeleton-stack">
                    <Skeleton v-for="index in 8" :key="index" class="skeleton-row" />
                  </div>
                  <world-settings-panel
                    v-else-if="getSettingsForWorld(world)"
                    :settings="getSettingsForWorld(world)"
                    :original-settings="originalSettings && originalSettings[world.type]"
                    :world-type="world.type"
                    :search-text="searchText"
                    show-group="WORLDGEN_GROUP"
                    @setting-change="handleSettingChange"
                    @search-input="searchText = $event"
                  />
                  <Empty v-else>
                    <EmptyHeader><EmptyTitle>暂无{{ world.type === 'forest' ? '森林' : '洞穴' }}世界生成数据</EmptyTitle></EmptyHeader>
                  </Empty>
                </TabsContent>

                <TabsContent value="worldsettings">
                  <div v-if="loading" class="skeleton-stack">
                    <Skeleton v-for="index in 8" :key="index" class="skeleton-row" />
                  </div>
                  <world-settings-panel
                    v-else-if="getSettingsForWorld(world)"
                    :settings="getSettingsForWorld(world)"
                    :original-settings="originalSettings && originalSettings[world.type]"
                    :world-type="world.type"
                    :search-text="searchText"
                    show-group="WORLDSETTINGS_GROUP"
                    @setting-change="handleSettingChange"
                    @search-input="searchText = $event"
                  />
                  <Empty v-else>
                    <EmptyHeader><EmptyTitle>暂无{{ world.type === 'forest' ? '森林' : '洞穴' }}世界设置数据</EmptyTitle></EmptyHeader>
                  </Empty>
                </TabsContent>

                <TabsContent value="server-ini">
                  <div v-if="loading || loadingServerIni" class="skeleton-stack">
                    <Skeleton v-for="index in 6" :key="index" class="skeleton-row" />
                  </div>
                  <FieldGroup v-else-if="serverIni" class="server-ini-grid">
                    <Field>
                      <FieldLabel for="world-server-port">服务器端口</FieldLabel>
                      <UiInput id="world-server-port" v-model.number="serverIni.network.server_port" type="number" min="1024" max="65535" @change="serverIniChanged = true" />
                    </Field>
                    <Field orientation="horizontal">
                      <FieldContent><FieldLabel for="world-is-master">主世界</FieldLabel><FieldDescription>主世界的分片 ID 固定为 1。</FieldDescription></FieldContent>
                      <UiSwitch id="world-is-master" v-model="serverIni.shard.is_master" @update:model-value="handleMasterWorldChange" />
                    </Field>
                    <Field>
                      <FieldLabel for="world-shard-name">世界名称</FieldLabel>
                      <UiInput id="world-shard-name" v-model="serverIni.shard.name" @input="serverIniChanged = true" />
                    </Field>
                    <Field>
                      <FieldLabel for="world-shard-id">世界 ID</FieldLabel>
                      <UiInput id="world-shard-id" v-model.number="serverIni.shard.id" type="number" min="1" max="999" @change="serverIniChanged = true" />
                    </Field>
                    <Field orientation="horizontal">
                      <FieldContent><FieldLabel for="world-encode-path">编码用户路径</FieldLabel><FieldDescription>使用编码后的用户目录。</FieldDescription></FieldContent>
                      <UiSwitch id="world-encode-path" v-model="serverIni.account.encode_user_path" @update:model-value="serverIniChanged = true" />
                    </Field>
                    <Field>
                      <FieldLabel for="world-master-port">主服务器端口</FieldLabel>
                      <UiInput id="world-master-port" v-model.number="serverIni.steam.master_server_port" type="number" min="1024" max="65535" @change="serverIniChanged = true" />
                    </Field>
                    <Field>
                      <FieldLabel for="world-auth-port">验证端口</FieldLabel>
                      <UiInput id="world-auth-port" v-model.number="serverIni.steam.authentication_port" type="number" min="1024" max="65535" @change="serverIniChanged = true" />
                    </Field>
                    <div class="form-actions">
                      <UiButton @click="saveServerIni" :disabled="savingServerIni || !serverIniChanged">
                        <Spinner v-if="savingServerIni" data-icon="inline-start" />保存配置
                      </UiButton>
                      <UiButton variant="outline" @click="resetServerIni" :disabled="!serverIniChanged">重置</UiButton>
                    </div>
                  </FieldGroup>
                  <Empty v-else>
                    <EmptyHeader><EmptyTitle>暂无基础配置数据</EmptyTitle></EmptyHeader>
                  </Empty>
                </TabsContent>

                <TabsContent value="mods">
                  <Alert>
                    <Package />
                    <AlertTitle>{{ roomName }} / {{ world.name }}</AlertTitle>
                    <AlertDescription>管理当前世界的模组启用状态与配置。</AlertDescription>
                    <AlertAction><UiButton @click="openWorldMods(world)">打开模组配置</UiButton></AlertAction>
                  </Alert>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Empty v-if="!loadError && roomId && visibleWorlds.length === 0">
        <EmptyHeader>
          <EmptyMedia variant="icon"><Globe2 /></EmptyMedia>
          <EmptyTitle>当前房间没有世界</EmptyTitle>
          <EmptyDescription>创建森林或洞穴世界后即可配置。</EmptyDescription>
        </EmptyHeader>
        <EmptyContent><UiButton @click="showAddWorldDialog"><Plus data-icon="inline-start" />新增世界</UiButton></EmptyContent>
      </Empty>

      <Empty v-if="!loadError && !roomId && !loadingRooms && !roomOptionsError">
        <EmptyHeader>
          <EmptyMedia variant="icon"><Globe2 /></EmptyMedia>
          <EmptyTitle>{{ roomOptions.length ? '请选择房间' : '没有可管理的房间' }}</EmptyTitle>
          <EmptyDescription>{{ roomOptions.length ? '选择一个已接管房间后即可管理世界配置。' : '先创建或接管房间，再管理世界配置。' }}</EmptyDescription>
        </EmptyHeader>
      </Empty>

      <div class="footer-spacer" aria-hidden="true"></div>
    </section>

    <div v-if="!loadError" id="settings-fixed-footer">
      <settings-footer
        :has-changes="hasChanges"
        :loading="loading"
        :save-loading="saveLoading"
        :changed-items="getChangedItems()"
        @save="saveSettings"
        @reset="resetSettings"
      />
    </div>

    <UiDialog v-model:open="addWorldDialogVisible">
      <DialogContent>
        <DialogHeader><DialogTitle>新增世界</DialogTitle><DialogDescription>在当前房间中创建新的森林或洞穴分片。</DialogDescription></DialogHeader>
        <Alert v-if="roomHasRunningWorld" variant="destructive"><TriangleAlert /><AlertTitle>需要先停止房间</AlertTitle><AlertDescription>创建世界前必须停止该房间中的所有世界。</AlertDescription></Alert>
        <FieldGroup>
          <Field><FieldLabel for="new-world-name">世界名称</FieldLabel><UiInput id="new-world-name" v-model="newWorld.name" placeholder="请输入世界名称" /></Field>
          <Field>
            <FieldLabel>世界类型</FieldLabel>
            <UiSelect v-model="newWorld.type" @update:model-value="handleWorldTypeChange">
              <SelectTrigger><SelectValue placeholder="请选择世界类型" /></SelectTrigger>
              <SelectContent><SelectGroup><SelectItem value="forest">森林</SelectItem><SelectItem value="cave">洞穴</SelectItem></SelectGroup></SelectContent>
            </UiSelect>
          </Field>
        </FieldGroup>
        <DialogFooter>
          <UiButton variant="outline" @click="addWorldDialogVisible = false">取消</UiButton>
          <UiButton @click="addWorld" :disabled="addWorldLoading || roomHasRunningWorld">
            <Spinner v-if="addWorldLoading" data-icon="inline-start" />创建
          </UiButton>
        </DialogFooter>
      </DialogContent>
    </UiDialog>

    <UiDialog v-model:open="deleteWorldDialogVisible">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>删除世界</DialogTitle>
          <DialogDescription>世界 {{ worldToDelete ? worldToDelete.name : '' }} 会被移入服务器上的可恢复目录。</DialogDescription>
        </DialogHeader>
        <Alert variant="destructive"><TriangleAlert /><AlertTitle>需要房间名确认</AlertTitle><AlertDescription>输入完整房间名后才能继续。</AlertDescription></Alert>
        <FieldGroup>
            <Field :data-invalid="Boolean(deleteConfirmation) && deleteConfirmation !== roomName">
              <FieldLabel for="delete-world-confirmation">完整房间名</FieldLabel>
              <UiInput id="delete-world-confirmation" v-model="deleteConfirmation" :aria-invalid="Boolean(deleteConfirmation) && deleteConfirmation !== roomName" :placeholder="roomName ? `请输入 ${roomName}` : '请输入完整房间名'" />
            </Field>
        </FieldGroup>
        <DialogFooter>
          <UiButton variant="outline" @click="deleteWorldDialogVisible = false">取消</UiButton>
          <UiButton variant="destructive" @click="deleteWorld" :disabled="deleteWorldLoading || deleteConfirmation !== roomName || worldToDelete?.status === 'running'">
            <Spinner v-if="deleteWorldLoading" data-icon="inline-start" />删除
          </UiButton>
        </DialogFooter>
      </DialogContent>
    </UiDialog>
  </div>
</template>

<script>
import { Globe2, Moon, Package, Plus, RefreshCw, Sun, Trash2, TriangleAlert } from '@lucide/vue';
import { toast } from 'vue-sonner';
import WorldSettingsPanel from '@/components/worlds/WorldSettingsPanel.vue';
import SettingsFooter from '@/components/worlds/SettingsFooter.vue';
import api from '@/api';
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button as UiButton } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog as UiDialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input as UiInput } from '@/components/ui/input';
import { Select as UiSelect, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { Switch as UiSwitch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { confirmAction } from '@/lib/feedback';

export default {
  name: 'WorldSettings',
  components: {
    Alert,
    AlertAction,
    AlertDescription,
    AlertTitle,
    Badge,
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
    Field,
    FieldContent,
    FieldDescription,
    FieldGroup,
    FieldLabel,
    Globe2,
    Moon,
    Package,
    Plus,
    RefreshCw,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
    SettingsFooter,
    Skeleton,
    Spinner,
    Sun,
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
    Trash2,
    TriangleAlert,
    UiButton,
    UiDialog,
    UiInput,
    UiSelect,
    UiSwitch,
    WorldSettingsPanel
  },
  data() {
    return {
      activeTab: 'forest',
      worldSectionTab: 'worldgen',
      forestSettings: null,
      caveSettings: null,
      originalSettings: null,
      loading: false,
      loadError: '',
      saveLoading: false,
      searchText: '',
      hasChanges: false,
      descriptionCache: {},
      itemOptionsCache: {},
      changedItemsCache: null,
      checkChangesTimer: null,
      loadedSelects: {},  // 用于跟踪哪些select已经加载了选项
      categoryPathCache: {}, // 用于缓存设置项路径
      defaultValueCache: {}, // 用于缓存默认值
      virtualScrollState: {}, // 虚拟滚动状态
      renderQueue: [], // 渲染队列
      scrollContainer: null,
      debouncedScrollHandler: null,
      windowSize: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      menuWidth: '230px', // 默认值，将通过getMenuWidth动态更新
      // 添加房间相关数据
      roomId: null,
      roomName: null,
      roomOptions: [],
      selectedRoomId: '',
      loadingRooms: false,
      roomOptionsError: '',
      roomWorlds: [],
      hasForestWorld: false,
      hasCaveWorld: false,
      worldOverrides: {}, // 存储每个世界的自定义配置
      worldOriginalSettings: {}, // 存储各世界从服务器加载后的真实基线
      loadedWorldConfigs: {}, // 用于跟踪已加载的世界配置
      initializingWorlds: false,
      // 新增世界相关
      addWorldDialogVisible: false,
      newWorld: {
        name: '',
        type: 'forest'
      },
      addWorldLoading: false,
      // 删除世界相关
      deleteWorldDialogVisible: false,
      worldToDelete: null,
      deleteConfirmation: '',
      deleteWorldLoading: false,
      // 基础配置相关
      serverIni: null,
      serverIniOriginal: null,
      loadingServerIni: false,
      savingServerIni: false,
      serverIniChanged: false,
      pendingWorldSettings: null,
      pendingWorldType: null,
      isNewWorldConfig: false,
      // 世界类型变更处理
      handleWorldTypeChange: () => {}
    }
  },
  created() {
    // 从URL参数中获取房间ID和名称
    const { roomId, roomName } = this.$route.query;
    this.roomId = roomId || null;
    this.roomName = roomName || '';
    this.fetchWorldSettings()
      .then(() => this.fetchRoomOptions())
      .then(loaded => (loaded && this.roomId ? this.loadRoomWorlds() : undefined))
      .catch(() => {});
    
    // 添加防抖的全局点击事件处理
    this.debouncedGlobalClick = this.debounce(this.handleGlobalClick, 50);
    document.addEventListener('click', this.debouncedGlobalClick);
    
    // 添加窗口大小变化监听
    this.debouncedResize = this.debounce(this.handleResize, 150);
    window.addEventListener('resize', this.debouncedResize);
  },
  beforeUnmount() {
    // 清理事件监听器
    document.removeEventListener('click', this.debouncedGlobalClick);
    window.removeEventListener('resize', this.debouncedResize);
    window.removeEventListener('resize', this.handleResize);
    if (this.scrollContainer && this.debouncedScrollHandler) {
      this.scrollContainer.removeEventListener('scroll', this.debouncedScrollHandler);
    }
    
    // 清理DOM观察器
    if (this.domObserver) {
      this.domObserver.disconnect();
      this.domObserver = null;
    }
    
    // 清理所有定时器
    if (this.checkChangesTimer) {
      clearTimeout(this.checkChangesTimer);
    }
    if (this._closeDropdownTimer) {
      clearTimeout(this._closeDropdownTimer);
    }
    if (this._renderTimer) {
      clearTimeout(this._renderTimer);
    }
    if (this._menuUpdateTimer) {
      clearTimeout(this._menuUpdateTimer);
    }
    
    // 清空缓存减少内存占用
    this.descriptionCache = null;
    this.itemOptionsCache = null;
    this.changedItemsCache = null;
    this.categoryPathCache = null;
    this.defaultValueCache = null;
    this.loadedSelects = null;
  },
  watch: {
    activeTab(newTab) {
      if (this.initializingWorlds) return;
      // 切换标签页时，清空变更缓存
      this.changedItemsCache = null;
      
      // 加载当前选中世界的配置
      const currentWorld = this.roomWorlds.find(world => world.name === newTab);
      if (currentWorld && this.roomName) {
        // 如果世界类型是未知的，弹出对话框让用户选择
        if (currentWorld.type === 'unknown' || !currentWorld.type) {
          confirmAction('这个世界的类型未知，请选择世界类型', '选择世界类型', {
            confirmButtonText: '森林世界',
            cancelButtonText: '洞穴世界',
            type: 'warning',
            center: true,
            distinguishCancelAndClose: true,
            closeOnClickModal: false
          }).then(() => {
            // 用户选择了森林世界
            currentWorld.type = 'forest';
            // 更新世界类型标志
            this.hasForestWorld = true;
            // 加载该世界的配置
            this.loadWorldConfig(currentWorld);
          }).catch(action => {
            if (action === 'cancel') {
              // 用户选择了洞穴世界
              currentWorld.type = 'cave';
              // 更新世界类型标志
              this.hasCaveWorld = true;
              // 加载该世界的配置
              this.loadWorldConfig(currentWorld);
            } else {
              // 用户关闭了对话框，回到先前的标签页
              const previousTab = this.activeTab;
              this.$nextTick(() => {
                this.activeTab = previousTab;
              });
            }
          });
          return;
        }
        
        // 每次切换标签页都重新加载该世界的配置
        this.loading = true;
        this.loadWorldOverrides(this.roomName, currentWorld.name)
          .finally(() => {
            // 更新已加载配置标记
            if (!this.loadedWorldConfigs) {
              this.loadedWorldConfigs = {};
            }
            this.loadedWorldConfigs[`${this.roomName}_${currentWorld.name}`] = true;
            this.loading = false;
            
            // 加载服务器基础配置
            this.fetchServerIni(this.roomName, currentWorld.name);
          });
      }
      
      // 重新检查变更
      this.debouncedCheckChanges();
      
      // 重新初始化视图
      this.$nextTick(() => {
        this.optimizeInitialRendering();
        this.setupScrollListeners();
      });
    },
    searchText() {
      // 搜索文本变化时，重置虚拟滚动状态
      this.virtualScrollState = {};
      
      // 重新初始化视图
      this.$nextTick(() => {
        this.optimizeInitialRendering();
      });
    }
  },
  mounted() {
    // 优化页面初始渲染
    this.$nextTick(() => {
      // 使用requestAnimationFrame优化渲染性能
      window.requestAnimationFrame(() => {
        // 使用防抖优化调用频率
        this.optimizeInitialRendering();
        this.setupScrollListeners();
        
        // 获取左侧菜单宽度
        this.getMenuWidth();
        
        // 设置DOM变化观察器来监听侧边栏变化
        this.setupDomObserver();
        
        // 延迟再次检查，确保所有元素都已渲染
        setTimeout(() => {
          this.getMenuWidth();
        }, 500);
      });
    });
    
    // 监听窗口大小变化
    window.addEventListener('resize', this.handleResize);
  },
  updated() {
    // 在组件更新后，确保select组件显示正确的值
    this.$nextTick(() => {
      this.updateVisibleSelectLabels();
    });
  },
  computed: {
    // 当前活动设置
    activeSettings() {
      // 检查当前选中的标签页对应的世界类型
      const selectedWorld = this.roomWorlds.find(world => world.name === this.activeTab);
      if (selectedWorld) {
        // 明确处理未知类型，避免默认为洞穴类型
        if (selectedWorld.type === 'unknown' || !selectedWorld.type) {
          return this.forestSettings; // 暂时返回森林设置，等待用户选择
        }
        return selectedWorld.type === 'forest' ? this.forestSettings : this.caveSettings;
      }
      // 如果没找到世界或使用默认标签页，则按照标签名确定
      return this.activeTab === 'forest' ? this.forestSettings : this.caveSettings;
    },
    
    // 过滤后的森林设置
    filteredForestSettings() {
      if (!this.forestSettings || !this.searchText) return this.forestSettings;
      return this.filterSettings(this.forestSettings);
    },
    
    // 过滤后的洞穴设置
    filteredCaveSettings() {
      if (!this.caveSettings || !this.searchText) return this.caveSettings;
      return this.filterSettings(this.caveSettings);
    },
    
    // 计算当前显示的设置
    currentFilteredSettings() {
      // 检查当前选中的标签页对应的世界类型
      const selectedWorld = this.roomWorlds.find(world => world.name === this.activeTab);
      if (selectedWorld) {
        // 明确处理未知类型，避免默认为洞穴类型
        if (selectedWorld.type === 'unknown' || !selectedWorld.type) {
          return this.filteredForestSettings; // 暂时返回森林设置，等待用户选择
        }
        return selectedWorld.type === 'forest' ? this.filteredForestSettings : this.filteredCaveSettings;
      }
      // 如果没找到世界或使用默认标签页，则按照标签名确定
      return this.activeTab === 'forest' ? this.filteredForestSettings : this.filteredCaveSettings;
    },
    
    currentWorld() {
      return this.visibleWorlds.find(world => world.name === this.activeTab) || this.visibleWorlds[0] || null;
    },

    roomHasRunningWorld() {
      return this.roomWorlds.some(world => world.status === 'running');
    },

    visibleWorlds() {
      return this.roomWorlds.length > 0 ? this.sortedRoomWorlds : [];
    },

    // 世界按照ID数字排序
    sortedRoomWorlds() {
      return this.roomWorlds.slice().sort((a, b) => {
        // 从名称中提取数字部分
        const numA = parseInt(a.name.replace(/[^\d]/g, '') || '0', 10);
        const numB = parseInt(b.name.replace(/[^\d]/g, '') || '0', 10);
        
        // 如果数字部分相同，按名称排序
        if (numA === numB) {
          return a.name.localeCompare(b.name);
        }
        
        // 按数字部分排序
        return numA - numB;
      });
    }
  },
  methods: {
    async fetchRoomOptions() {
      this.loadingRooms = true;
      this.roomOptionsError = '';
      try {
        const response = await api.worldApi.getWorldList();
        this.roomOptions = Array.isArray(response.data) ? response.data : [];
        const selected = this.roomOptions.find(room => room.id === this.roomId || room.name === this.roomName);
        const query = { ...this.$route.query };
        const hasLegacyRoomQuery = ['id', 'worldId', 'roomName'].some(key => key in query);
        delete query.id;
        delete query.worldId;
        delete query.roomName;
        if (selected) {
          this.roomId = selected.id;
          this.roomName = selected.name;
          this.selectedRoomId = selected.id;
          if (hasLegacyRoomQuery || query.roomId !== selected.id) {
            query.roomId = selected.id;
            await this.$router.replace({ path: this.$route.path, query });
          }
        } else {
          this.roomId = null;
          this.roomName = '';
          this.selectedRoomId = '';
          if (hasLegacyRoomQuery || 'roomId' in query) {
            delete query.roomId;
            await this.$router.replace({ path: this.$route.path, query });
          }
        }
        return true;
      } catch (error) {
        this.roomOptions = [];
        this.selectedRoomId = '';
        this.roomOptionsError = error.message || '无法读取已接管房间目录';
        return false;
      } finally {
        this.loadingRooms = false;
      }
    },
    async retryRoomOptions() {
      const loaded = await this.fetchRoomOptions();
      if (loaded && this.roomId) await this.loadRoomWorlds();
    },
    async handleRoomChange(roomId) {
      const room = this.roomOptions.find(item => item.id === roomId);
      if (!room) return;
      this.roomId = room.id;
      this.roomName = room.name;
      this.roomWorlds = [];
      this.activeTab = '';
      this.serverIni = null;
      this.hasChanges = false;
      this.loadError = '';
      const query = { ...this.$route.query, roomId: room.id };
      delete query.id;
      delete query.worldId;
      delete query.roomName;
      await this.$router.replace({ path: this.$route.path, query });
      await this.loadRoomWorlds();
    },
    getSettingsForWorld(world) {
      return world.type === 'cave' ? this.filteredCaveSettings : this.filteredForestSettings;
    },
    openWorldMods(world) {
      this.$router.push({
        path: '/mods/list',
        query: {
          roomId: this.roomId || this.$route.query.roomId || undefined,
          worldId: world?.id || undefined
        }
      });
    },
    // 获取左侧菜单宽度
    getMenuWidth() {
      try {
        if (window.innerWidth <= 768) {
          this.menuWidth = '0px';
          return;
        }

        // 尝试获取左侧菜单元素，查找多种可能的选择器
        const sidebarSelectors = [
          '.sidebar',
          '.app-sidebar',
          '.left-menu',
          '.nav-menu',
          '#app-menu',
          '[class*="sidebar"]',
          '[class*="menu-container"]'
        ];
        
        let sidebar = null;
        // 尝试所有可能的选择器
        for (const selector of sidebarSelectors) {
          sidebar = document.querySelector(selector);
          if (sidebar) break;
        }
        
        if (sidebar) {
          // 固定底栏左边缘与实际侧栏右边缘对齐。
          const sidebarWidth = sidebar.offsetWidth;
          if (sidebarWidth < 50) {
            this.menuWidth = '64px';
          } else {
            this.menuWidth = sidebarWidth + 'px';
          }
        } else {
          // 如果找不到菜单，则使用默认宽度
          const parentBody = document.querySelector('body');
          if (parentBody && parentBody.classList.contains('sidebar-collapse')) {
            // 如果侧边栏已折叠
            this.menuWidth = '64px';
          } else {
            // 默认宽度
            this.menuWidth = '216px';
          }
        }
      } catch (error) {
        this.menuWidth = '216px';
      }
    },
    
    // 加载房间世界列表
    loadRoomWorlds() {
      if (!this.roomId) return;
      this.loading = true;
      this.loadError = '';

      api.worldApi.getWorldList()
        .then(response => {
          const room = response.data.find(r => r.id === this.roomId || r.name === this.roomName);
          if (!room || !Array.isArray(room.worlds)) {
            throw new Error('找不到指定房间或房间世界列表无效');
          }
          this.roomId = room.id;
          this.roomName = room.name;
          this.roomWorlds = room.worlds;
          this.hasForestWorld = this.roomWorlds.some(world => world.type === 'forest');
          this.hasCaveWorld = this.roomWorlds.some(world => world.type === 'cave');
          if (this.roomWorlds.length === 0) {
            this.activeTab = 'forest';
            return null;
          }

          const firstWorld = this.sortedRoomWorlds[0];
          this.initializingWorlds = true;
          this.activeTab = firstWorld.name;
          return this.$nextTick()
            .then(() => {
              this.initializingWorlds = false;
              return this.loadWorldOverrides(this.roomName, firstWorld.name);
            })
            .then(() => this.fetchServerIni(this.roomName, firstWorld.name));
        })
        .catch(error => {
          this.loadError = error.message || '获取房间世界列表失败';
          toast.error('获取房间世界列表失败: ' + (error.message || '未知错误'));
        })
        .finally(() => {
          this.initializingWorlds = false;
          this.loading = false;
        });
    },
    
    // 加载世界的自定义配置
    loadWorldOverrides(savename, worldname) {
      if (!savename || !worldname) return Promise.resolve();
      
      // 确定世界类型
      const world = this.roomWorlds.find(item => item.name === worldname);
      const worldType = world?.type === 'cave' ? 'cave' : 'forest';

      return api.worldApi.getWorldOverrides(savename, worldname)
      .then(response => {
        const worldOverridesData = response.data || {};
        this.applyWorldOverrides(worldOverridesData, worldType, worldname);
        if (!this.loadedWorldConfigs) {
          this.loadedWorldConfigs = {};
          }
        this.loadedWorldConfigs[`${savename}_${worldname}`] = true;
        return worldOverridesData;
      })
      .catch(error => {
        if (worldType === 'forest') {
          this.forestSettings = null;
        } else {
          this.caveSettings = null;
        }
        delete this.worldOriginalSettings[worldname];
        delete this.worldOverrides[worldname];
        this.loadError = error.message || `加载世界 ${worldname} 的配置失败`;
        toast.error(`加载世界 ${worldname} 的配置失败: ${error.message || '未知错误'}`);
        return null;
      });
    },
    
    // 应用世界自定义配置到设置中
    applyWorldOverrides(overridesData, worldType, worldname) {
      if (!overridesData || !worldType) {
        return;
      }
      
      // 存储每个世界的覆盖配置，以便保存时使用
      if (!this.worldOverrides) {
        this.worldOverrides = {};
      }
      
      this.worldOverrides[worldname] = {
        type: worldType,
        data: JSON.parse(JSON.stringify(overridesData)) // 创建深拷贝
      };
      
      const defaults = this.originalSettings?.[worldType];
      if (!defaults) return;
      const settingsKey = worldType === 'forest' ? 'forestSettings' : 'caveSettings';
      this[settingsKey] = JSON.parse(JSON.stringify(defaults));
      const baseSettings = this[settingsKey];
      if (!baseSettings) {
        return;
      }
      
      // 遍历所有设置项，应用自定义配置
      this.traverseSettings(baseSettings, (item, itemKey) => {
        if (Object.prototype.hasOwnProperty.call(overridesData, itemKey)) {
          const oldValue = item.value;
          const newValue = overridesData[itemKey];
          
          // 只在值不同时更新
          if (oldValue !== newValue) {
            item.value = newValue;
          }
        }
      });
      this.worldOriginalSettings[worldname] = JSON.parse(JSON.stringify(baseSettings));
      this.hasChanges = false;
      this.changedItemsCache = null;
    },
    
    // 处理窗口大小变化
    handleResize() {
      this.windowSize = {
        width: window.innerWidth,
        height: window.innerHeight
      };
      
      // 重新获取左侧菜单宽度
      this.getMenuWidth();
      
      // 重新优化可视区域内的组件
      this.$nextTick(() => {
        this.optimizeInitialRendering();
      });
    },
    
    // 处理设置变更
    handleSettingChange({ item, value }) {
      // 只在值真正变化时才处理
      if (item.value === value) return;
      
      // 更新值
      item.value = value;
      
      // 使用防抖优化变更检查
      this.debouncedCheckChanges();
      
      // 清除变更缓存
      this.changedItemsCache = null;
    },
    debouncedCheckChanges() {
      if (this.checkChangesTimer) {
        clearTimeout(this.checkChangesTimer);
      }
      this.checkChangesTimer = setTimeout(() => {
        this.checkChanges();
      }, 200);
    },
    fetchWorldSettings() {
      this.loading = true;
      this.loadError = '';
      // 使用Promise优化数据加载
      return fetch('/static/json/dst_world_setting_zh.json')
        .then(response => {
          if (!response.ok) {
            throw new Error('网络响应异常');
          }
          return response.json();
        })
        .then(data => {
          this.forestSettings = data.forest || {};
          this.caveSettings = data.cave || {};
          this.originalSettings = JSON.parse(JSON.stringify(data));
          this.hasChanges = false;
          
          // 预先构建缓存
          this.buildCaches();
          
          // 数据加载后更新UI
          this.$nextTick(() => {
            this.prerenderAllSelects();
          });
          
          return data; // 返回数据以便链式调用
        })
        .catch(error => {
          this.loadError = error.message || '无法加载世界设置定义';
          toast.error('加载设置失败');
          return Promise.reject(error);
        })
        .finally(() => {
          this.loading = false;
        });
    },
    reloadSettings() {
      return this.fetchWorldSettings()
        .then(() => this.fetchRoomOptions())
        .then(loaded => (loaded && this.roomId ? this.loadRoomWorlds() : undefined))
        .catch(() => {});
    },
    getItemOptions(categoryDesc, itemDesc) {
      // 优化缓存键计算，减少序列化复杂对象的开销
      const cacheKey = JSON.stringify({ 
        categoryDesc: categoryDesc ? Object.keys(categoryDesc).join(',') : '', 
        itemDesc: itemDesc ? Object.keys(itemDesc).join(',') : '' 
      });
      
      if (this.itemOptionsCache[cacheKey]) {
        return this.itemOptionsCache[cacheKey];
      }
      
      const result = itemDesc || categoryDesc || {};
      this.itemOptionsCache[cacheKey] = result;
      return result;
    },
    checkChanges() {
      this.changedItemsCache = null;
      this.hasChanges = this.getChangedItems().length > 0;
    },
    saveSettings() {
      this.saveLoading = true;
      const currentWorld = this.roomWorlds.find(world => world.name === this.activeTab);
      
      if (!currentWorld) {
        toast.error('无法确定要保存的世界');
        this.saveLoading = false;
        return;
      }
      
      // 准备要保存的数据，只包含已修改的部分
      const changedSettings = this.prepareChangedSettings();
      const worldType = currentWorld.type === 'forest' ? 'forest' : 'cave';
      
      // 如果是临时世界，先弹窗让用户输入新世界名称
      if (currentWorld.isTemp) {
        this.saveLoading = false;
        this.newWorld = {
          name: '',
          type: worldType
        };
        this.addWorldDialogVisible = true;
        
        // 保存当前设置，供创建世界后使用
        this.pendingWorldSettings = changedSettings;
        this.pendingWorldType = worldType;
        return;
      }
      
      const apiMethod = worldType === 'forest' ? api.worldApi.forestWorld : api.worldApi.caveWorld;
      apiMethod({
        savename: this.roomName,
        worldname: currentWorld.name,
        overrides: changedSettings[worldType]
      })
        .then(async response => {
          if (response.status === 200) {
            toast.success(`${currentWorld.name} 世界设置保存成功`);
            await this.loadWorldOverrides(this.roomName, currentWorld.name);
            this.buildCaches();
          }
        })
        .catch(error => {
          toast.error(`保存 ${currentWorld.name} 世界设置失败: ${error.message || '未知错误'}`);
        })
        .finally(() => {
          this.saveLoading = false;
        });
    },
    prepareChangedSettings() {
      const currentWorld = this.roomWorlds.find(world => world.name === this.activeTab);
      if (!currentWorld) return {};
      
      const worldType = currentWorld.type === 'forest' ? 'forest' : 'cave';
      const result = {};
      result[worldType] = {};
      
      // 获取当前世界类型的所有设置项
      const activeSettings = worldType === 'forest' ? this.forestSettings : this.caveSettings;
      
      // 遍历所有设置项，收集所有参数值
      this.traverseSettings(activeSettings, (item, itemKey) => {
        // 将所有参数都添加到结果中
        result[worldType][itemKey] = item.value;
      });
      
      return result;
    },
    resetSettings() {
      const currentWorld = this.roomWorlds.find(world => world.name === this.activeTab);
      if (!currentWorld) return;
      const worldType = currentWorld.type === 'forest' ? 'forest' : 'cave';
      const baseline = this.worldOriginalSettings[currentWorld.name];
      if (!baseline) return;

      if (worldType === 'forest') {
        this.applySettingsValues(this.forestSettings, baseline);
        toast.info('森林世界设置已重置');
      } else {
        this.applySettingsValues(this.caveSettings, baseline);
        toast.info('洞穴世界设置已重置');
      }
      
      // 清除变更状态和缓存
      this.hasChanges = false;
      this.changedItemsCache = null;
    },
    applySettingsValues(target, source) {
      if (!target || !source) return;
      
      // 只遍历需要的部分
      this.traverseSettings(source, (sourceItem, itemKey, path) => {
        const category = this.getCategoryByPath(target, path);
        if (category && category.items && category.items[itemKey]) {
          // 直接设置值，避免深度克隆
          category.items[itemKey].value = sourceItem.value;
        }
      });
    },
    extractEssentialSettings(settings) {
      const result = {};
      
      // 遍历设置，提取值不是默认的项目
      this.traverseSettings(settings, (item, itemKey, path) => {
        // 获取路径
        const parts = path.split('.');
        if (parts.length < 2) return;
        
        const groupKey = parts[0];
        const categoryKey = parts[1];
        
        // 确保目标对象结构存在
        if (!result[groupKey]) {
          result[groupKey] = {};
        }
        if (!result[groupKey][categoryKey]) {
          result[groupKey][categoryKey] = { 
            items: {},
            // 复制其他必要属性
            text: settings[groupKey][categoryKey].text,
            order: settings[groupKey][categoryKey].order
          };
        }
        
        // 只保存值
        result[groupKey][categoryKey].items[itemKey] = {
          value: item.value,
          text: item.text
        };
      });
      
      return result;
    },
    getChangedItems() {
      if (this.changedItemsCache !== null) {
        return this.changedItemsCache;
      }
      
      const changedItems = [];
      const currentWorld = this.roomWorlds.find(world => world.name === this.activeTab);
      if (!currentWorld) return [];
      
      // 根据世界类型确定使用的设置
      const worldType = currentWorld.type === 'forest' ? 'forest' : 'cave';
      const activeSettings = worldType === 'forest' ? this.forestSettings : this.caveSettings;
      const baseline = this.worldOriginalSettings[currentWorld.name];

      if (!activeSettings || !baseline) return [];
      
      // 遍历活动设置，找出与默认值不同的项
      this.traverseSettings(activeSettings, (item, itemKey, path) => {
        const originalItem = this.findItemInSettings(baseline, itemKey);
        const defaultValue = originalItem?.value;
        
        // 如果当前值与默认值不同，则添加到变更列表
        if (defaultValue !== undefined && defaultValue !== item.value) {
          // 获取描述性文本
          const category = this.getCategoryByPath(activeSettings, path);
          const options = this.getItemOptions(category.desc, item.desc);
          
          changedItems.push({
            key: itemKey,
            text: item.text,
            oldValue: defaultValue,
            oldValueText: options[defaultValue] || defaultValue,
            newValue: item.value,
            newValueText: options[item.value] || item.value
          });
        }
      });
      
      this.changedItemsCache = changedItems;
      return changedItems;
    },
    prerenderAllSelects() {
      // 使用 requestIdleCallback 或 setTimeout 错开渲染，避免主线程阻塞
      if (window.requestIdleCallback) {
        window.requestIdleCallback(() => {
          this.loadedSelects = {};
          this.prerenderCommonSelects();
        });
      } else {
        setTimeout(() => {
          this.loadedSelects = {};
          this.prerenderCommonSelects();
        }, 100);
      }
    },
    
    prerenderCommonSelects() {
      // 预加载常用选择器
      const commonKeys = ['world_size', 'autumn', 'winter', 'spring', 'summer', 
                          'day', 'season_start', 'touchstone', 'regrowth', 
                          'spiders', 'hounds', 'bearger', 'deerclops'];
      
      commonKeys.forEach(key => {
        if (this.loadedSelects) this.loadedSelects[key] = true;
      });
      
      // 延迟加载其他选择器
      if (this._renderTimer) {
        clearTimeout(this._renderTimer);
      }
      
      this._renderTimer = setTimeout(() => {
        // 加载当前标签页中可见的选择器
        const visibleItems = document.querySelectorAll('.setting-item');
        visibleItems.forEach(item => {
          // 从自定义属性或ID中提取键名
          const key = item.getAttribute('data-key') || item.id;
          if (key) {
            if (this.loadedSelects) this.loadedSelects[key] = true;
          }
        });
      }, 500);
    },
    isElementInViewport(el) {
      const rect = el.getBoundingClientRect();
      return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
      );
    },
    getCategoryByPath(settings, path) {
      if (!path) return null;
      
      // 使用简单的路径分解而不是split
      const parts = path.split('.');
      if (parts.length < 2) return null;
      
      const groupKey = parts[0];
      const categoryKey = parts[1];
      
      // 直接访问对象，避免额外的操作
      return settings[groupKey] && settings[groupKey][categoryKey] ? settings[groupKey][categoryKey] : null;
    },
    filterSettings(settings) {
      if (!settings || !this.searchText) return settings;
      
      const result = JSON.parse(JSON.stringify(settings));
      const searchLower = this.searchText.toLowerCase();
      
      for (const groupKey in result) {
        const group = result[groupKey];
        for (const categoryKey in group) {
          const category = group[categoryKey];
          if (category.items) {
            // 过滤每个分类中的项目
            const filteredItems = {};
            let hasMatchingItems = false;
            
            for (const itemKey in category.items) {
              const item = category.items[itemKey];
              if (item.text && item.text.toLowerCase().includes(searchLower)) {
                filteredItems[itemKey] = item;
                hasMatchingItems = true;
              }
            }
            
            // 如果没有匹配项，则清空分类
            if (!hasMatchingItems) {
              category.items = {};
            } else {
              category.items = filteredItems;
            }
          }
        }
      }
      
      return result;
    },
    preloadRelatedOptions(currentItemKey) {
      // 预加载同一分类下的其他选项
      const currentPath = this.categoryPathCache[`${this.activeTab}_${currentItemKey}`];
      if (!currentPath) return;
      
      const category = this.getCategoryByPath(this.activeSettings, currentPath);
      if (!category || !category.items) return;
      
      // 找到同一分类下的其他项目（最多5个）
      const keys = Object.keys(category.items).slice(0, 5);
      keys.forEach(key => {
        if (key !== currentItemKey) {
          if (this.loadedSelects) this.loadedSelects[key] = true;
        }
      });
    },
    debounce(fn, delay) {
      let timer = null;
      return function(...args) {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          fn.apply(this, args);
        }, delay);
      };
    },
    handleGlobalClick() {
      // Reka Select 自行管理浮层关闭行为。
    },
    buildCaches() {
      // 清空旧缓存
      this.descriptionCache = {};
      this.itemOptionsCache = {};
      this.categoryPathCache = {};
      this.defaultValueCache = {};
      
      // 构建路径缓存和默认值缓存
      if (this.forestSettings) {
        this.buildSettingCache(this.forestSettings, 'forest');
      }
      if (this.caveSettings) {
        this.buildSettingCache(this.caveSettings, 'cave');
      }
    },
    buildSettingCache(settings, worldType) {
      // 为所有设置项构建缓存
      this.traverseSettings(settings, (item, itemKey, path) => {
        // 缓存路径以便快速查找
        this.categoryPathCache[`${worldType}_${itemKey}`] = path;
        
        // 缓存默认值以便快速比较变更
        if (this.originalSettings && this.originalSettings[worldType]) {
          const defaultItem = this.findItemInSettings(this.originalSettings[worldType], itemKey);
          if (defaultItem) {
            this.defaultValueCache[`${worldType}_${itemKey}`] = defaultItem.value;
          }
        }
      });
    },
    findItemInSettings(settings, targetKey) {
      let foundItem = null;
      this.traverseSettings(settings, (item, itemKey) => {
        if (itemKey === targetKey) {
          foundItem = item;
        }
      }, '', () => foundItem !== null); // 找到后立即停止遍历
      return foundItem;
    },
    traverseSettings(settings, callback, basePath = '', shouldStop = () => false) {
      const visitedItems = new Set();
      
      for (const groupKey in settings) {
        const group = settings[groupKey];
        const groupPath = basePath ? `${basePath}.${groupKey}` : groupKey;
        
        for (const categoryKey in group) {
          const category = group[categoryKey];
          const categoryPath = `${groupPath}.${categoryKey}`;
          
          if (category && category.items) {
            for (const itemKey in category.items) {
              // 避免重复处理同一个item
              const itemFullPath = `${categoryPath}.items.${itemKey}`;
              if (visitedItems.has(itemFullPath)) continue;
              
              visitedItems.add(itemFullPath);
              callback(category.items[itemKey], itemKey, categoryPath);
              
              // 如果条件满足，提前结束遍历
              if (shouldStop()) return;
            }
          }
        }
      }
    },
    optimizeInitialRendering() {
      // 优先处理可见区域内的元素
      this.optimizeVisibleSelectComponents();
      
      // 设置渲染延迟，避免页面卡顿
      setTimeout(() => {
        this.updateVisibleSelectLabels();
      }, 100);
    },
    
    optimizeVisibleSelectComponents() {
      // Reka Select 不需要额外的 DOM 渲染补丁。
    },
    
    updateVisibleSelectLabels() {
      // SelectValue 根据 modelValue 自动更新标签。
    },
    
    // 添加滚动事件监听，优化滚动时的性能
    setupScrollListeners() {
      // 使用被动事件监听器提高滚动性能
      const scrollContainer = document.querySelector('.settings-wrapper');
      if (scrollContainer) {
        // 防抖处理滚动事件
        const debouncedScrollHandler = this.debounce(() => {
          this.updateScrollItems();
        }, 100);
        
        scrollContainer.addEventListener('scroll', debouncedScrollHandler, { passive: true });
        this.scrollContainer = scrollContainer;
        this.debouncedScrollHandler = debouncedScrollHandler;
      }
    },
    updateScrollItems() {
      // 滚动时只更新可见区域内的选择器
      this.updateVisibleSelectLabels();
    },
    setupDomObserver() {
      // 创建一个MutationObserver实例来监听DOM变化
      this.domObserver = new MutationObserver((mutations) => {
        let shouldUpdate = false;
        
        // 检查变化是否可能影响侧边栏
        for (const mutation of mutations) {
          if (mutation.type === 'childList' || 
              (mutation.type === 'attributes' && 
               (mutation.attributeName === 'class' || 
                mutation.attributeName === 'style'))) {
            shouldUpdate = true;
            break;
          }
        }
        
        if (shouldUpdate) {
          // 使用防抖避免频繁更新
          if (this._menuUpdateTimer) clearTimeout(this._menuUpdateTimer);
          this._menuUpdateTimer = setTimeout(() => {
            this.getMenuWidth();
          }, 200);
        }
      });
      
      // 监听body及其所有子元素的变化
      this.domObserver.observe(document.body, {
        childList: true,  // 监听子元素增加或删除
        subtree: true,    // 监听所有后代元素
        attributes: true, // 监听属性变化
        attributeFilter: ['class', 'style'] // 只监听样式相关属性变化
      });
    },
    applyCurrentWorldConfig(currentWorld) {
      if (!currentWorld || !this.worldOverrides[currentWorld.name]) {
        return;
      }
      
      // 获取当前世界的覆盖配置
      const worldOverride = this.worldOverrides[currentWorld.name];
      
      // 重新应用配置到当前视图
      if (worldOverride && worldOverride.data) {
        const worldType = currentWorld.type === 'forest' ? 'forest' : 'cave';
        const settings = worldType === 'forest' ? this.forestSettings : this.caveSettings;
        
        if (settings) {
          // 遍历所有设置，应用保存的配置
          this.traverseSettings(settings, (item, itemKey) => {
            // 如果存在覆盖配置，则应用
            if (Object.prototype.hasOwnProperty.call(worldOverride.data, itemKey)) {
              item.value = worldOverride.data[itemKey];
            }
          });
        }
      }
    },
    // 显示新增世界对话框
    showAddWorldDialog() {
      if (!this.roomId) {
        toast.warning('请先选择房间');
        return;
      }
      if (this.roomHasRunningWorld) {
        toast.warning('创建世界前请先停止房间中的所有世界');
        return;
      }
      // 获取所有世界
      const allWorlds = this.roomWorlds;
      
      // 找出最大编号 (森林和洞穴共用一个编号系统)
      let maxNumber = 0;
      
      // 提取所有世界的编号
      allWorlds.forEach(world => {
        // 检查Forest格式
        let match = world.name.match(/Forest(\d+)/i);
        if (match && match[1]) {
          const num = parseInt(match[1]);
          if (!isNaN(num) && num > maxNumber) {
            maxNumber = num;
          }
        }
        
        // 检查Caves格式
        match = world.name.match(/Caves?(\d+)/i);
        if (match && match[1]) {
          const num = parseInt(match[1]);
          if (!isNaN(num) && num > maxNumber) {
            maxNumber = num;
          }
        }
      });
      
      // 生成默认世界名称，使用最大编号+1
      const nextNumber = maxNumber + 1;
      const defaultForestName = `Forest${nextNumber}`;
      const defaultCaveName = `Caves${nextNumber}`;
      
      // 设置默认世界类型和名称
      this.newWorld = {
        name: defaultForestName,
        type: 'forest'  // 默认为森林类型
      };
      
      // 添加名称变更处理器
      this.handleWorldTypeChange = (type) => {
        if (type === 'forest') {
          this.newWorld.name = defaultForestName;
        } else {
          this.newWorld.name = defaultCaveName;
        }
      };
      
      // 显示选择对话框
      this.addWorldDialogVisible = true;
      this.isNewWorldConfig = true;  // 标记为新世界配置模式
    },
    
    // 添加新世界
    addWorld() {
      if (this.roomHasRunningWorld) {
        toast.warning('创建世界前请先停止房间中的所有世界');
        return;
      }
      if (!this.newWorld.name) {
        toast.warning('请输入世界名称');
        return;
      }

      this.addWorldLoading = true;

      // 使用originalSettings中的原始默认值，而不是可能已修改过的值
      const worldType = this.newWorld.type;
      const overrides = {};
      
      if (this.originalSettings && this.originalSettings[worldType]) {
        // 从原始设置中提取所有设置项的值
        this.traverseSettings(this.originalSettings[worldType], (item, itemKey) => {
          overrides[itemKey] = item.value;
        });
      } else {
        // 如果没有原始设置，则使用当前设置（这种情况不应该出现，但作为后备）
        const defaultSettings = worldType === 'forest' ? this.forestSettings : this.caveSettings;
        this.traverseSettings(defaultSettings, (item, itemKey) => {
          overrides[itemKey] = item.value;
        });
      }

      // 调用API创建世界
      api.worldApi[worldType === 'forest' ? 'forestWorld' : 'caveWorld']({
        savename: this.roomName,
        worldname: this.newWorld.name,
        overrides: overrides
      })
        .then(response => {
          if (response.status === 200) {
            toast.success(`成功创建${worldType === 'forest' ? '森林' : '洞穴'}世界 ${this.newWorld.name}`);
            this.addWorldDialogVisible = false;
            const createdWorldName = this.newWorld.name;
            this.fetchRoomWorlds().then(() => {
              this.activeTab = createdWorldName;
            });
          } else {
            toast.error(response.data.msg || '创建世界失败');
          }
        })
        .catch(error => {
          toast.error('创建世界失败: ' + (error.message || '未知错误'));
        })
        .finally(() => {
          this.addWorldLoading = false;
        });
    },
    
    // 显示删除世界确认对话框
    confirmDeleteWorld(world) {
      if (world?.status === 'running') {
        toast.warning('删除前请先停止当前世界');
        return;
      }
      this.worldToDelete = world;
      this.deleteConfirmation = '';
      this.deleteWorldDialogVisible = true;
    },
    
    // 删除世界
    deleteWorld() {
      if (!this.worldToDelete) {
        toast.warning('未选择要删除的世界');
        return;
      }
      if (!this.deleteConfirmation) {
        toast.warning('请输入完整房间名确认删除');
        return;
      }
      if (this.deleteConfirmation !== this.roomName) {
        toast.warning('房间名不匹配');
        return;
      }
      if (this.worldToDelete.status === 'running') {
        toast.warning('删除前请先停止当前世界');
        return;
      }
      
      this.deleteWorldLoading = true;
      // 调用API删除世界
      api.worldApi.deleteWorld({
        savename: this.roomName,
        worldname: this.worldToDelete.name,
        confirmation: this.deleteConfirmation
      })
        .then(response => {
          if (response.status === 200) {
            toast.success(`已将世界 ${this.worldToDelete.name} 移入可恢复目录`);
            this.deleteWorldDialogVisible = false;
            
            // 刷新世界列表
            this.fetchRoomWorlds();
          } else {
            toast.error(response.data.msg || '删除世界失败');
          }
        })
        .catch(error => {
          toast.error('删除世界失败: ' + (error.message || '未知错误'));
        })
        .finally(() => {
          this.deleteWorldLoading = false;
        });
    },
    
    // 刷新房间世界列表
    fetchRoomWorlds() {
      return new Promise((resolve, reject) => {
        api.worldApi.getWorldList()
          .then(response => {
            if (response.status === 200) {
            // 查找指定的房间
              const room = response.data.find(r => r.id === this.roomId || r.name === this.roomName);
              if (room && Array.isArray(room.worlds)) {
                this.roomId = room.id;
                this.roomName = room.name;
                this.roomWorlds = room.worlds;
                
                // 检查是否有森林和洞穴世界
                this.hasForestWorld = this.roomWorlds.some(world => 
                  world.type === 'forest' || world.name.toLowerCase().includes('forest'));
                
                this.hasCaveWorld = this.roomWorlds.some(world => 
                  world.type === 'cave' || world.name.toLowerCase().includes('cave'));
                
                // 如果当前选中的标签页已被删除，则选择第一个世界
                if (this.roomWorlds.length > 0) {
                  if (!this.roomWorlds.some(world => world.name === this.activeTab)) {
                    this.activeTab = this.sortedRoomWorlds[0].name;
                  }
                } else {
                  this.activeTab = '';
                  this.serverIni = null;
                  this.hasChanges = false;
                }
                resolve();
              } else {
                reject(new Error('找不到指定房间'));
              }
            } else {
              reject(new Error('获取世界列表失败'));
            }
          })
          .catch(error => {
            reject(error);
          });
      });
    },
    // 获取服务器基础配置
    fetchServerIni(savename, worldname) {
      if (!savename || !worldname) return;
      
      this.loadingServerIni = true;
      this.serverIni = null;
      this.serverIniOriginal = null;
      this.serverIniChanged = false;
      
      return api.worldApi.getServerIni(savename, worldname)
        .then(response => {
          if (response.status === 200 && response.data) {
            this.serverIni = response.data;
            // 深拷贝保存原始配置用于重置
            this.serverIniOriginal = JSON.parse(JSON.stringify(response.data));
          }
        })
        .catch(error => {
          this.serverIni = null;
          this.serverIniOriginal = null;
          toast.error('加载服务器基础配置失败: ' + (error.message || '未知错误'));
        })
        .finally(() => {
          this.loadingServerIni = false;
        });
    },
    
    // 保存服务器基础配置
    saveServerIni() {
      if (!this.serverIni) return;
      
      const currentWorld = this.roomWorlds.find(world => world.name === this.activeTab);
      if (!currentWorld) {
        toast.error('无法找到当前世界');
        return;
      }
      
      // 检查规则：如果是主世界，分片ID必须为1
      if (this.serverIni.shard.is_master && this.serverIni.shard.id !== 1) {
        this.serverIni.shard.id = 1;
        toast.warning('主世界的世界ID已自动设置为1');
      }
      
      this.savingServerIni = true;

      api.worldApi.saveServerIni({
        savename: this.roomName,
        worldname: currentWorld.name,
        config: this.serverIni
      })
        .then(async response => {
          if (response.status === 200) {
            toast.success('服务器基础配置保存成功');
            await this.fetchServerIni(this.roomName, currentWorld.name);
          }
        })
        .catch(error => {
          toast.error('保存服务器基础配置失败: ' + (error.message || '未知错误'));
        })
        .finally(() => {
          this.savingServerIni = false;
        });
    },
    
    // 重置服务器基础配置
    resetServerIni() {
      if (this.serverIniOriginal) {
        this.serverIni = JSON.parse(JSON.stringify(this.serverIniOriginal));
        this.serverIniChanged = false;
      }
    },
    handleMasterWorldChange(value) {
      this.serverIniChanged = true;
      
      // 如果设置为主世界，确保世界ID为1
      if (value && this.serverIni) {
        this.serverIni.shard.id = 1;
        toast.info('已将主世界的世界ID自动设置为1');
      }
    },
    
    // 加载指定世界的配置（处理用户选择世界类型后）
    loadWorldConfig(world) {
      if (!world || !this.roomName) return;
      
      // 标记为加载中
      this.loading = true;
      
      // 添加到已加载配置
      const worldKey = `${this.roomName}_${world.name}`;
      if (!this.loadedWorldConfigs) {
        this.loadedWorldConfigs = {};
      }
      
      // 加载世界配置
      this.loadWorldOverrides(this.roomName, world.name)
        .finally(() => {
          this.loadedWorldConfigs[worldKey] = true;
          this.loading = false;
          
          // 加载服务器基础配置
          this.fetchServerIni(this.roomName, world.name);
          
          // 向服务器更新世界类型
          this.updateWorldType(world);
        });
    },
    
    // 更新世界类型
    updateWorldType(world) {
      if (!world || !this.roomName) return;
      
      const worldType = world.type; // 'forest' 或 'cave'
      
      // 先加载默认配置
      this.loading = true;
      
      // 使用原始设置，而不是可能已修改过的值
      let overrides = {};
      if (this.originalSettings && this.originalSettings[worldType]) {
        // 从原始设置中提取所有值
        this.traverseSettings(this.originalSettings[worldType], (item, itemKey) => {
          overrides[itemKey] = item.value;
        });
      } else {
        // 如果没有原始设置，则使用extractAllSettings方法（这种情况不应该出现，但作为后备）
        overrides = this.extractAllSettings(worldType);
      }

      let params = {
        savename: this.roomName,
        worldname: world.name,
        overrides: overrides
      };

      let apiMethod = worldType === 'forest' ? api.worldApi.forestWorld : api.worldApi.caveWorld;
      apiMethod(params).then(response => {
        if (response.status === 200) {
          toast.success('世界类型更新成功');
        }
      }).catch(error => {
        toast.error('更新世界类型失败: ' + (error.message || '未知错误'));
      }).finally(() => {
        this.loading = false;
      });
    },
    
    // 提取所有设置项的值
    extractAllSettings(worldType) {
      const settings = worldType === 'forest' ? this.forestSettings : this.caveSettings;
      const result = {};
      
      if (!settings) {
        console.error(`${worldType}设置未加载`);
        return result;
      }
      
      // 遍历所有设置项，收集所有参数值
      this.traverseSettings(settings, (item, itemKey) => {
        // 将所有参数都添加到结果中
        result[itemKey] = item.value;
      });
      
      return result;
    }
  }
}
</script>

<style scoped>
.world-settings-container {
  width: 100%;
  min-width: 0;
  padding-bottom: 88px;
}

.settings-surface {
  display: flex;
  flex-direction: column;
  gap: 24px;
  min-width: 0;
}

.page-header,
.header-actions,
.world-tabs-toolbar,
.world-heading,
.form-actions {
  display: flex;
  align-items: center;
}

.page-header {
  justify-content: space-between;
  gap: 16px;
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

.header-actions,
.form-actions {
  gap: 8px;
}

.load-error {
  margin: 0;
}

.world-tabs,
.world-section-tabs {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  min-width: 0;
}

.world-tabs-toolbar {
  justify-content: space-between;
  gap: 8px;
}

.world-tab-list,
.section-tab-list {
  max-width: 100%;
  justify-content: flex-start;
  overflow-x: auto;
}

.world-heading {
  gap: 10px;
}

.world-heading > svg {
  width: 24px;
  height: 24px;
  flex: none;
  color: var(--primary);
}

.skeleton-stack {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.skeleton-row {
  height: 36px;
  width: 100%;
}

.server-ini-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px 24px;
}

.form-actions {
  grid-column: 1 / -1;
  justify-content: flex-end;
}

.footer-spacer {
  height: 72px;
}

#settings-fixed-footer {
  position: fixed;
  right: 0;
  bottom: 0;
  left: var(--sidebar-width, 216px);
  display: flex;
  align-items: center;
  padding: 8px 20px;
  border-top: 1px solid var(--border);
  background: var(--background);
  box-shadow: 0 -3px 14px color-mix(in srgb, var(--foreground) 10%, transparent);
}

@media (max-width: 768px) {
  .page-header {
    align-items: stretch;
    flex-direction: column;
  }

  .header-actions {
    flex-wrap: wrap;
  }

  .world-tabs-toolbar {
    align-items: flex-start;
  }

  .server-ini-grid {
    grid-template-columns: 1fr;
  }

  #settings-fixed-footer {
    left: 0;
    padding: 8px 12px;
  }
}
</style>
