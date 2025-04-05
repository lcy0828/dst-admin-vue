<template>
  <div class="world-settings-container">
    <el-card class="settings-card" shadow="hover">
      <div slot="header" class="card-header">
        <div class="header-title">
          <i class="el-icon-earth"></i>
          <h2>世界设置{{ roomName ? ` - ${roomName}` : '' }}</h2>
        </div>
        <div class="header-actions">
          <el-button 
            size="small" 
            type="primary"
            plain
            icon="el-icon-refresh" 
            @click="fetchWorldSettings" 
            :loading="loading"
            :disabled="loading"
          >刷新设置</el-button>
        </div>
      </div>

      <el-tabs v-model="activeTab" type="border-card" class="custom-tabs">
        <!-- 动态生成世界标签页 -->
        <el-tab-pane 
          v-for="world in sortedRoomWorlds" 
          :key="world.name" 
          :label="world.name + (world.type === 'forest' ? ' (森林)' : world.type === 'cave' ? ' (洞穴)' : '')" 
          :name="world.name">
          <template slot="label">
            <span>{{ world.name + (world.type === 'forest' ? ' (森林)' : world.type === 'cave' ? ' (洞穴)' : '') }}</span>
            <i class="el-icon-close world-delete-icon" @click.stop="confirmDeleteWorld(world)"></i>
          </template>
          <div class="tab-header-content">
            <div class="world-icon" :class="world.type === 'forest' ? 'forest-icon' : 'cave-icon'"></div>
            <div class="world-description">
              <h3>{{ world.name }} {{ world.type === 'forest' ? '森林世界' : '洞穴世界' }}</h3>
              <p>配置游戏的{{ world.type === 'forest' ? '主' : '地下' }}世界设置，包括地形、资源、危险等各种生成规则</p>
            </div>
          </div>
          
          <el-tabs type="card" class="settings-tabs">
            <el-tab-pane label="世界生成组">
              <div v-if="loading" class="loading-container">
                <el-skeleton :rows="10" animated />
              </div>
              <world-settings-panel
                v-else-if="world.type === 'forest' ? forestSettings : caveSettings"
                :settings="world.type === 'forest' ? filteredForestSettings : filteredCaveSettings"
                :original-settings="originalSettings && originalSettings[world.type]"
                :world-type="world.type"
                :search-text="searchText"
                :show-group="'WORLDGEN_GROUP'"
                @setting-change="handleSettingChange"
                @search-input="searchText = $event"
              />
              <div v-else class="empty-state">
                <el-empty :description="`暂无${world.type === 'forest' ? '森林' : '洞穴'}世界设置数据`"></el-empty>
              </div>
            </el-tab-pane>
            
            <el-tab-pane label="世界设置组">
              <div v-if="loading" class="loading-container">
                <el-skeleton :rows="10" animated />
              </div>
              <world-settings-panel
                v-else-if="world.type === 'forest' ? forestSettings : caveSettings"
                :settings="world.type === 'forest' ? filteredForestSettings : filteredCaveSettings"
                :original-settings="originalSettings && originalSettings[world.type]"
                :world-type="world.type"
                :search-text="searchText"
                :show-group="'WORLDSETTINGS_GROUP'"
                @setting-change="handleSettingChange"
                @search-input="searchText = $event"
              />
              <div v-else class="empty-state">
                <el-empty :description="`暂无${world.type === 'forest' ? '森林' : '洞穴'}世界设置数据`"></el-empty>
              </div>
            </el-tab-pane>
            
            <el-tab-pane label="基础配置">
              <div v-if="loading || loadingServerIni" class="loading-container">
                <el-skeleton :rows="10" animated />
              </div>
              <div v-else-if="serverIni">
                <el-form label-width="120px" class="server-ini-form">
                  <h3>网络设置</h3>
                  <el-form-item label="服务器端口">
                    <el-input-number 
                      v-model="serverIni.network.server_port" 
                      :min="1024" 
                      :max="65535"
                      @change="serverIniChanged = true">
                    </el-input-number>
                  </el-form-item>
                  
                  <h3>分片设置</h3>
                  <el-form-item label="是否为主世界">
                    <el-switch 
                      v-model="serverIni.shard.is_master"
                      active-color="#13ce66"
                      @change="handleMasterWorldChange">
                    </el-switch>
                  </el-form-item>
                  <el-form-item label="世界名称">
                    <el-input 
                      v-model="serverIni.shard.name"
                      @input="serverIniChanged = true">
                    </el-input>
                  </el-form-item>
                  <el-form-item label="世界ID">
                    <el-input-number 
                      v-model="serverIni.shard.id" 
                      :min="1"
                      :max="999"
                      @change="serverIniChanged = true">
                    </el-input-number>
                  </el-form-item>
                  
                  <h3>账户设置</h3>
                  <el-form-item label="编码用户路径">
                    <el-switch 
                      v-model="serverIni.account.encode_user_path"
                      active-color="#13ce66"
                      @change="serverIniChanged = true">
                    </el-switch>
                  </el-form-item>
                  
                  <h3>Steam设置</h3>
                  <el-form-item label="主服务器端口">
                    <el-input-number 
                      v-model="serverIni.steam.master_server_port" 
                      :min="1024" 
                      :max="65535"
                      @change="serverIniChanged = true">
                    </el-input-number>
                  </el-form-item>
                  <el-form-item label="验证端口">
                    <el-input-number 
                      v-model="serverIni.steam.authentication_port" 
                      :min="1024" 
                      :max="65535"
                      @change="serverIniChanged = true">
                    </el-input-number>
                  </el-form-item>
                  
                  <el-form-item>
                    <el-button 
                      type="primary" 
                      @click="saveServerIni"
                      :loading="savingServerIni"
                      :disabled="!serverIniChanged">
                      保存配置
                    </el-button>
                    <el-button @click="resetServerIni" :disabled="!serverIniChanged">重置</el-button>
                  </el-form-item>
                </el-form>
              </div>
              <div v-else class="empty-state">
                <el-empty description="暂无基础配置数据"></el-empty>
              </div>
            </el-tab-pane>
            
            <el-tab-pane label="模组配置">
              <div class="empty-state">
                <el-empty description="模组配置功能即将上线"></el-empty>
              </div>
            </el-tab-pane>
          </el-tabs>
        </el-tab-pane>
        
        <!-- 添加世界按钮 -->
        <el-tab-pane name="add-world" disabled>
          <template slot="label">
            <div class="add-world-tab" @click.stop="showAddWorldDialog">
              <i class="el-icon-plus"></i>
              <span>新增世界</span>
            </div>
          </template>
        </el-tab-pane>
        
        <!-- 如果没有世界，显示默认的标签页 -->
        <el-tab-pane label="森林" name="forest" v-if="roomWorlds.length === 0 && hasForestWorld">
          <div class="tab-header-content">
            <div class="world-icon forest-icon"></div>
            <div class="world-description">
              <h3>森林世界</h3>
              <p>配置游戏的主世界设置，包括地形、资源、危险等各种生成规则</p>
            </div>
          </div>
          
          <div v-if="loading" class="loading-container">
            <el-skeleton :rows="10" animated />
          </div>
          <world-settings-panel
            v-else-if="forestSettings"
            :settings="currentFilteredSettings"
            :original-settings="originalSettings && originalSettings.forest"
            :world-type="'forest'"
            :search-text="searchText"
            @setting-change="handleSettingChange"
            @search-input="searchText = $event"
          />
          <div v-else class="empty-state">
            <el-empty description="暂无森林世界设置数据"></el-empty>
          </div>
        </el-tab-pane>

        <el-tab-pane label="洞穴" name="cave" v-if="roomWorlds.length === 0 && hasCaveWorld">
          <div class="tab-header-content">
            <div class="world-icon cave-icon"></div>
            <div class="world-description">
              <h3>洞穴世界</h3>
              <p>配置游戏的地下世界设置，包括地形、资源、危险等各种生成规则</p>
            </div>
          </div>
          
          <div v-if="loading" class="loading-container">
            <el-skeleton :rows="10" animated />
          </div>
          <world-settings-panel
            v-else-if="caveSettings"
            :settings="currentFilteredSettings"
            :original-settings="originalSettings && originalSettings.cave"
            :world-type="'cave'"
            :search-text="searchText"
            @setting-change="handleSettingChange"
            @search-input="searchText = $event"
          />
          <div v-else class="empty-state">
            <el-empty description="暂无洞穴世界设置数据"></el-empty>
          </div>
        </el-tab-pane>
      </el-tabs>

      <!-- 为固定底栏预留空间 -->
      <div style="height: 85px; width: 100%;"></div>
    </el-card>

    <!-- 底部工具栏 - 使用内联样式确保直接生效 -->
    <div id="settings-fixed-footer" :style="footerStyle">
      <div :style="hasChanges ? footerChangedContentStyle : footerContentStyle">
        <settings-footer
          :has-changes="hasChanges"
          :loading="loading"
          :save-loading="saveLoading"
          :changed-items="getChangedItems()"
          @save="saveSettings"
          @reset="resetSettings"
        />
      </div>
    </div>

    <el-dialog
      title="保存为自定义预设"
      :visible.sync="presetDialogVisible"
      width="30%"
      :close-on-click-modal="false"
      append-to-body
    >
      <el-form :model="newPreset" label-width="80px">
        <el-form-item label="预设名称">
          <el-input v-model="newPreset.name" placeholder="输入一个唯一的预设名称"></el-input>
        </el-form-item>
        <el-form-item label="预设描述">
          <el-input type="textarea" v-model="newPreset.description" rows="3" placeholder="请简要描述这个预设的特点"></el-input>
        </el-form-item>
      </el-form>
      <span slot="footer" class="dialog-footer">
        <el-button @click="presetDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmSavePreset">保存</el-button>
      </span>
    </el-dialog>
    
    <!-- 添加世界对话框 -->
    <el-dialog
      title="新增世界"
      :visible.sync="addWorldDialogVisible"
      width="30%"
      :close-on-click-modal="false"
      append-to-body
    >
      <el-form :model="newWorld" label-width="80px">
        <el-form-item label="世界名称">
          <el-input v-model="newWorld.name" placeholder="请输入世界名称"></el-input>
        </el-form-item>
        <el-form-item label="世界类型">
          <el-select v-model="newWorld.type" placeholder="请选择世界类型" @change="handleWorldTypeChange">
            <el-option label="森林" value="forest"></el-option>
            <el-option label="洞穴" value="cave"></el-option>
          </el-select>
        </el-form-item>
      </el-form>
      <span slot="footer" class="dialog-footer">
        <el-button @click="addWorldDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="addWorld" :loading="addWorldLoading">创建</el-button>
      </span>
    </el-dialog>
    
    <!-- 删除世界确认对话框 -->
    <el-dialog
      title="删除世界"
      :visible.sync="deleteWorldDialogVisible"
      width="30%"
      :close-on-click-modal="false"
      append-to-body
    >
      <p>确定要删除世界 <strong>{{ worldToDelete ? worldToDelete.name : '' }}</strong> 吗？此操作不可恢复！</p>
      <span slot="footer" class="dialog-footer">
        <el-button @click="deleteWorldDialogVisible = false">取消</el-button>
        <el-button type="danger" @click="deleteWorld" :loading="deleteWorldLoading">删除</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import Vue from 'vue';
import WorldSettingsPanel from '@/components/worlds/WorldSettingsPanel.vue';
import SettingsFooter from '@/components/worlds/SettingsFooter.vue';
import axios from 'axios';
import config from '@/api/config';

// 注册自定义指令，优化下拉菜单的关闭行为
Vue.directive('optimized-select', {
  inserted(el, binding) {
    const selectInput = el.querySelector('.el-input__inner');
    const selectComponent = binding.value;
    
    if (selectInput) {
      // 优化初始值显示
      const select = el.__vue__;
      if (select && select.value) {
        const options = select.options || [];
        const selectedOption = options.find(option => option.value === select.value);
        if (selectedOption && selectedOption.currentLabel) {
          selectInput.value = selectedOption.currentLabel;
        }
      }
      
      // 优化下拉面板处理
      el.addEventListener('mousedown', (e) => {
        // 阻止冒泡，防止全局点击事件关闭其他下拉框
        e.stopPropagation();
      });
      
      // 使用事件委托处理选项点击
      const dropdown = document.querySelector(`.${selectComponent.popperClass}`);
      if (dropdown) {
        dropdown.addEventListener('click', (e) => {
          // 检查是否点击在选项上
          if (e.target.closest('.el-select-dropdown__item')) {
            // 手动关闭下拉框，提高响应速度
            setTimeout(() => {
              dropdown.style.display = 'none';
            }, 10);
          }
        });
      }
    }
  },
  
  // 更新时重新设置显示值
  update(el) {
    const selectInput = el.querySelector('.el-input__inner');
    const select = el.__vue__;
    
    if (selectInput && select && select.value) {
      const options = select.options || [];
      const selectedOption = options.find(option => option.value === select.value);
      if (selectedOption && selectedOption.currentLabel) {
        selectInput.value = selectedOption.currentLabel;
      }
    }
  },
  
  // 组件卸载时清理事件监听
  unbind(el, binding) {
    const selectComponent = binding.value;
    const dropdown = document.querySelector(`.${selectComponent.popperClass}`);
    
    if (dropdown) {
      dropdown.removeEventListener('click', () => {});
    }
    
    el.removeEventListener('mousedown', () => {});
  }
});

export default {
  name: 'WorldSettings',
  components: {
    WorldSettingsPanel,
    SettingsFooter
  },
  data() {
    return {
      activeTab: 'forest',
      forestSettings: null,
      caveSettings: null,
      originalSettings: null,
      loading: false,
      saveLoading: false,
      searchText: '',
      hasChanges: false,
      currentPreset: 'default',
      presetDialogVisible: false,
      newPreset: {
        name: '',
        description: '',
        settings: null
      },
      presets: {
        default: { name: '默认设置', description: '游戏默认平衡性设置' },
        easy: { name: '简单模式', description: '资源丰富，怪物稀少' },
        hard: { name: '困难模式', description: '资源稀缺，怪物增多' },
        abundant: { name: '资源丰富', description: '所有资源再生速度更快' },
        scarce: { name: '资源稀缺', description: '所有资源再生速度更慢' },
        custom: { name: '自定义', description: '自定义设置' }
      },
      customPresets: [],
      descriptionCache: {},
      itemOptionsCache: {},
      changedItemsCache: null,
      checkChangesTimer: null,
      loadedSelects: {},  // 用于跟踪哪些select已经加载了选项
      categoryPathCache: {}, // 用于缓存设置项路径
      defaultValueCache: {}, // 用于缓存默认值
      virtualScrollState: {}, // 虚拟滚动状态
      renderQueue: [], // 渲染队列
      windowSize: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      menuWidth: '230px', // 默认值，将通过getMenuWidth动态更新
      footerContentStyle: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%'
      },
      footerChangedContentStyle: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        position: 'relative'
      },
      // 添加房间相关数据
      roomId: null,
      roomName: null,
      roomWorlds: [],
      hasForestWorld: true,
      hasCaveWorld: true,
      worldOverrides: {}, // 存储每个世界的自定义配置
      loadedWorldConfigs: {}, // 用于跟踪已加载的世界配置
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
    if (roomId && roomName) {
      this.roomId = roomId;
      this.roomName = roomName;
      
      // 获取房间世界列表
      this.loadRoomWorlds();
    }
    
    this.fetchWorldSettings();
    this.loadCustomPresets();
    
    // 添加防抖的全局点击事件处理
    this.debouncedGlobalClick = this.debounce(this.handleGlobalClick, 50);
    document.addEventListener('click', this.debouncedGlobalClick);
    
    // 添加窗口大小变化监听
    this.debouncedResize = this.debounce(this.handleResize, 150);
    window.addEventListener('resize', this.debouncedResize);
  },
  beforeDestroy() {
    // 清理事件监听器
    document.removeEventListener('click', this.debouncedGlobalClick);
    window.removeEventListener('resize', this.debouncedResize);
    window.removeEventListener('resize', this.handleResize);
    
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
      // 切换标签页时，清空变更缓存
      this.changedItemsCache = null;
      
      // 加载当前选中世界的配置
      const currentWorld = this.roomWorlds.find(world => world.name === newTab);
      if (currentWorld && this.roomName) {
        // 如果世界类型是未知的，弹出对话框让用户选择
        if (currentWorld.type === 'unknown' || !currentWorld.type) {
          this.$confirm('这个世界的类型未知，请选择世界类型', '选择世界类型', {
            confirmButtonText: '森林世界',
            cancelButtonText: '洞穴世界',
            type: 'warning',
            center: true,
            distinguishCancelAndClose: true,
            closeOnClickModal: false
          }).then(() => {
            // 用户选择了森林世界
            this.$set(currentWorld, 'type', 'forest');
            // 更新世界类型标志
            this.hasForestWorld = true;
            // 加载该世界的配置
            this.loadWorldConfig(currentWorld);
          }).catch(action => {
            if (action === 'cancel') {
              // 用户选择了洞穴世界
              this.$set(currentWorld, 'type', 'cave');
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
        
        // 检查是否已经加载过该世界的配置
        const worldKey = `${this.roomName}_${currentWorld.name}`;
        if (!this.loadedWorldConfigs) {
          this.loadedWorldConfigs = {};
        }
        
        console.log(`切换到标签页 ${newTab}, 检查是否需要加载配置...`);
        
        // 如果没有加载过该世界的配置，则加载
        if (!this.loadedWorldConfigs[worldKey]) {
          console.log(`${newTab} 的配置未曾加载，开始加载...`);
          this.loading = true;
          
          // 先确保基础设置正确
          this.ensureBaseSettings(currentWorld.type).then(() => {
            this.loadWorldOverrides(this.roomName, currentWorld.name)
              .then(data => {
                console.log(`已加载 ${currentWorld.name} 的世界配置数据:`, data ? Object.keys(data).length : 0);
                this.loadedWorldConfigs[worldKey] = true;
                
                // 显式触发视图更新
                this.$forceUpdate();
                
                // 重新检查变更
                this.debouncedCheckChanges();
              })
              .finally(() => {
                this.loading = false;
                
                // 加载服务器基础配置
                this.fetchServerIni(this.roomName, currentWorld.name);
              });
          });
        } else {
          console.log(`${newTab} 的配置已加载过，直接重新应用...`);
          // 如果已经加载过，重新应用世界配置
          this.applyCurrentWorldConfig(currentWorld);
          
          // 加载服务器基础配置
          this.fetchServerIni(this.roomName, currentWorld.name);
        }
      }
      
      // 重新检查变更
      this.debouncedCheckChanges();
      
      // 重新初始化视图
      this.$nextTick(() => {
        this.optimizeInitialRendering();
        this.setupScrollListeners();
      });
    },
    
    // 确保基础设置已经加载
    ensureBaseSettings(worldType) {
      if (worldType === 'forest' && this.forestSettings) {
        return Promise.resolve();
      } else if (worldType === 'cave' && this.caveSettings) {
        return Promise.resolve();
      } else {
        return this.loadDefaultSettings(worldType);
      }
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
    
    // 变更项数量
    changedItemsCount() {
      if (this.changedItemsCache !== null) {
        return this.changedItemsCache.length;
      }
      return this.getChangedItems().length;
    },
    
    // 根据屏幕宽度和状态计算底栏样式
    footerStyle() {
      if (this.windowSize.width > 1200) {
        // 宽屏设备样式
        return {
          position: 'fixed',
          bottom: '0',
          left: this.menuWidth,
          width: `calc(100% - ${this.menuWidth})`,
          zIndex: 9999,
          backgroundColor: 'var(--el-bg-color)',
          boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.1)',
          borderTop: '1px solid var(--el-border-color-light)',
          transition: 'all 0.3s ease-in-out',
          padding: '8px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end'
        };
      } else {
        // 适合移动设备的样式
        return {
          position: 'fixed',
          bottom: '0',
          left: this.menuWidth,
          width: `calc(100% - ${this.menuWidth})`,
          zIndex: 9999,
          backgroundColor: 'var(--el-bg-color)',
          boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.1)',
          borderTop: '1px solid var(--el-border-color-light)',
          transition: 'all 0.3s ease-in-out',
          padding: '8px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        };
      }
    },
    
    // 底栏内容样式
    footerContentStyle() {
      return {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%'
      };
    },
    
    // 有变更时的底栏内容样式
    footerChangedContentStyle() {
      const style = {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        position: 'relative'
      };
      
      // 添加顶部警告线
      style.paddingTop = '3px';
      style.borderTop = '3px solid #e6a23c';
      style.marginTop = '-3px';
      
      return style;
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
    // 获取左侧菜单宽度
    getMenuWidth() {
      try {
        // 尝试获取左侧菜单元素，查找多种可能的选择器
        const sidebarSelectors = [
          '.el-aside',
          '.el-menu-vertical',
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
          // 获取实际宽度并考虑一些边距
          const sidebarWidth = sidebar.offsetWidth;
          // 如果宽度过小，可能不是主侧边栏，使用默认值
          if (sidebarWidth < 50) {
            this.menuWidth = '200px';
          } else {
            // 为了防止底栏与菜单紧贴，添加一些边距
            this.menuWidth = (sidebarWidth + 5) + 'px';
          }
          
          console.log('获取到菜单宽度:', this.menuWidth);
        } else {
          // 如果找不到菜单，则使用默认宽度
          const parentBody = document.querySelector('body');
          if (parentBody && parentBody.classList.contains('sidebar-collapse')) {
            // 如果侧边栏已折叠
            this.menuWidth = '64px';
          } else {
            // 默认宽度
            this.menuWidth = '200px';
          }
          
          console.log('使用默认菜单宽度:', this.menuWidth);
        }
      } catch (error) {
        console.error('获取菜单宽度出错:', error);
        this.menuWidth = '200px';
      }
    },
    
    // 加载房间世界列表
    loadRoomWorlds() {
      if (!this.roomId) return;
      
      // 显示加载状态
      this.loading = true;
      
      // 获取房间世界列表
      axios.get(`${config.BASE_URL}/dstserver/list`)
        .then(response => {
          if (response && response.data && response.data.status === 200 && Array.isArray(response.data.data)) {
            // 查找指定的房间
            const room = response.data.data.find(r => r.id === this.roomId || r.name === this.roomName);
            if (room && room.worlds && Array.isArray(room.worlds)) {
              this.roomWorlds = room.worlds;
              
              // 检查是否有森林和洞穴世界
              this.hasForestWorld = this.roomWorlds.some(world => 
                world.type === 'forest' || world.name.toLowerCase().includes('forest'));
              
              this.hasCaveWorld = this.roomWorlds.some(world => 
                world.type === 'cave' || world.name.toLowerCase().includes('cave'));
              
              // 设置默认选中的标签页
              if (this.roomWorlds.length > 0) {
                // 使用排序后的数组，选择第一个世界作为活动标签页
                const sortedWorlds = this.sortedRoomWorlds;
                if (sortedWorlds.length > 0) {
                  this.activeTab = sortedWorlds[0].name;
                  
                  // 先完整加载基础配置，之后再加载特定世界的配置
                  this.loading = true;
                  this.fetchWorldSettings()
                    .then(() => {
                      console.log('基础配置加载完成，开始加载世界配置');
                      
                      // 确保界面更新完成后再加载世界配置
                      return new Promise(resolve => {
                        this.$nextTick(() => {
                          // 等待选择器渲染完成
                          setTimeout(() => {
                            resolve();
                          }, 300);
                        });
                      });
                    })
                    .then(() => {
                      if (sortedWorlds[0]) {
                        return this.loadWorldOverrides(this.roomName, sortedWorlds[0].name);
                      }
                      return Promise.resolve();
                    })
                    .finally(() => {
                      this.loading = false;
                    });
                }
              } else if (!this.hasForestWorld && this.hasCaveWorld) {
                // 如果房间内没有世界，但有洞穴类型，则默认选中洞穴标签
                this.activeTab = 'cave';
                this.loading = false;
              } else {
                // 默认选择森林标签
                this.activeTab = 'forest';
                this.loading = false;
              }
              
              console.log('房间世界列表:', this.roomWorlds);
              console.log('有森林世界:', this.hasForestWorld);
              console.log('有洞穴世界:', this.hasCaveWorld);
              console.log('当前选中标签页:', this.activeTab);
            } else {
              this.loading = false;
            }
          } else {
            this.loading = false;
          }
        })
        .catch(error => {
          console.error('获取房间世界列表失败:', error);
          this.$message.error('获取房间世界列表失败');
          this.loading = false;
        });
    },
    
    // 加载世界的自定义配置
    loadWorldOverrides(savename, worldname) {
      if (!savename || !worldname) return Promise.resolve(null);
      
      console.log(`加载世界 ${worldname} 的自定义配置...`);
      
      // 使用统一的获取接口
      return axios.get(`${config.BASE_URL}/dstserver/worldoverrides`, {
        params: {
          savename,
          worldname
        }
      })
      .then(response => {
        if (response && response.data && response.data.status === 200) {
          const worldOverridesData = response.data.data;
          console.log(`获取到世界 ${worldname} 的自定义配置:`, worldOverridesData);
          
          // 检查数据是否为空对象
          if (worldOverridesData && Object.keys(worldOverridesData).length > 0) {
            // 确定世界类型
            const worldType = worldname.toLowerCase().includes('forest') || 
                         worldname.toLowerCase().includes('master') ? 'forest' : 'cave';
            
            console.log(`开始应用 ${worldname} 的自定义配置 (类型: ${worldType})...`);
            // 应用世界自定义配置到设置中
            this.applyWorldOverrides(worldOverridesData, worldType, worldname);
            
            // 记录已加载此世界配置
            if (!this.loadedWorldConfigs) {
              this.loadedWorldConfigs = {};
            }
            this.loadedWorldConfigs[`${savename}_${worldname}`] = true;
            
            return worldOverridesData;
          } else {
            console.warn(`世界 ${worldname} 的配置数据为空，将使用默认配置`);
          }
        } else {
          console.warn(`获取世界 ${worldname} 配置的API返回状态异常:`, response?.data);
        }
        return null;
      })
      .catch(error => {
        console.error(`获取世界 ${worldname} 的自定义配置失败:`, error);
        return Promise.reject(error);
      });
    },
    
    // 应用世界自定义配置到设置中
    applyWorldOverrides(overridesData, worldType, worldname) {
      if (!overridesData || !worldType) {
        console.warn(`应用世界配置失败: 无效的数据或世界类型`);
        return;
      }
      
      // 存储每个世界的覆盖配置，以便保存时使用
      if (!this.worldOverrides) {
        this.worldOverrides = {};
      }
      
      // 记录配置项数量，用于日志
      const configCount = Object.keys(overridesData).length;
      console.log(`准备应用 ${worldname} 的 ${configCount} 个配置项, 世界类型: ${worldType}`);
      
      this.worldOverrides[worldname] = {
        type: worldType,
        data: JSON.parse(JSON.stringify(overridesData)) // 创建深拷贝
      };
      
      // 根据世界类型选择基础设置
      const baseSettings = worldType === 'forest' ? this.forestSettings : this.caveSettings;
      if (!baseSettings) {
        console.warn(`应用世界配置失败: 无法找到 ${worldType} 类型的基础设置`);
        return;
      }
      
      console.log(`已找到 ${worldType} 类型的基础设置`);
      
      // 跟踪应用的配置项数量
      let appliedCount = 0;
      let missingCount = 0;
      
      // 遍历所有设置项，应用自定义配置
      this.traverseSettings(baseSettings, (item, itemKey) => {
        if (overridesData.hasOwnProperty(itemKey)) {
          const oldValue = item.value;
          const newValue = overridesData[itemKey];
          
          // 只在值不同时更新
          if (oldValue !== newValue) {
            Vue.set(item, 'value', newValue);
            appliedCount++;
            
            // 每10个配置项记录一次日志，避免日志过多
            if (appliedCount % 10 === 0 || appliedCount === 1) {
              console.log(`已应用 ${appliedCount}/${configCount} 个配置项`);
            }
          }
        } else {
          missingCount++;
        }
      });
      
      console.log(`已完成世界 ${worldname} 的 ${appliedCount} 个配置项应用，${missingCount} 个配置项在基础设置中未找到`);
      
      // 直接触发视图更新
      this.$forceUpdate();
      
      // 重新标记变更状态
      this.checkChanges();
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
      Vue.set(item, 'value', value);
      
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
          console.error('加载本地设置失败:', error);
          this.$message.error('加载设置失败');
          return Promise.reject(error);
        })
        .finally(() => {
          this.loading = false;
        });
    },
    loadLocalSettings() {
      fetch('/static/json/dst_world_setting_zh.json')
        .then(response => response.json())
        .then(data => {
          this.forestSettings = data.forest || {};
          this.caveSettings = data.cave || {};
          this.originalSettings = JSON.parse(JSON.stringify(data));
          this.hasChanges = false;
          
          // 数据加载完成后，确保所有选择器初始值正确显示
          this.$nextTick(() => {
            this.prerenderAllSelects();
          });
        })
        .catch(error => {
          console.error('加载本地设置失败:', error);
          this.$message.error('加载设置失败');
        });
    },
    getItemImageStyle(image, atlas) {
      if (!image || !atlas) return {};
      
      // 计算背景位置
      const bgPosX = -(image.x * atlas.width / atlas.item_size * 100);
      const bgPosY = -(image.y * atlas.height / atlas.item_size * 100);
      
      // 构建图片URL
      const imageUrl = `/static/misc/${atlas.name}.webp`;
      
      return {
        backgroundImage: `url(${imageUrl})`,
        backgroundPosition: `${bgPosX}% ${bgPosY}%`,
        backgroundSize: `${atlas.width / atlas.item_size * 100}%`,
      };
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
    getSortedCategories(group) {
      // 将对象转换为包含key和value的数组，并按order排序
      return Object.entries(group)
        .map(([key, value]) => ({ key, value }))
        .sort((a, b) => (a.value.order || 999) - (b.value.order || 999));
    },
    matchesSearch(text) {
      if (!this.searchText) return true;
      return text.toLowerCase().includes(this.searchText.toLowerCase());
    },
    checkChanges() {
      if (!this.originalSettings) return;
      
      // 重置缓存
      this.changedItemsCache = null;
      
      // 采用Object.keys和引用比较优化检查
      const activeSettings = this.activeTab === 'forest' ? this.forestSettings : this.caveSettings;
      const originalSettings = this.activeTab === 'forest' ? this.originalSettings.forest : this.originalSettings.cave;
      
      if (!activeSettings || !originalSettings) {
        this.hasChanges = false;
        return;
      }
      
      // 快速检查是否有变更
      const changedItems = this.getChangedItems();
      this.hasChanges = changedItems.length > 0;
    },
    saveSettings() {
      this.saveLoading = true;
      const currentWorld = this.roomWorlds.find(world => world.name === this.activeTab);
      
      if (!currentWorld) {
        this.$message.error('无法确定要保存的世界');
        this.saveLoading = false;
        return;
      }
      
      // 准备要保存的数据，只包含已修改的部分
      const changedSettings = this.prepareChangedSettings();
      const worldType = currentWorld.type === 'forest' ? 'forest' : 'cave';
      
      const axios = require('axios');
      const config = require('../../api/config').default;
      
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
      
      // 根据世界类型确定API端点
      const apiEndpoint = worldType === 'forest' 
        ? `${config.BASE_URL}/dstserver/forestworld`
        : `${config.BASE_URL}/dstserver/caveworld`;
      
      // 调用API保存设置
      axios.post(apiEndpoint, {
        savename: this.roomName,
        worldname: currentWorld.name,
        overrides: changedSettings[worldType]
      })
        .then(response => {
          if (response.data && response.data.status === 200) {
            this.$message.success(`${currentWorld.name} 世界设置保存成功`);
            
            // 更新原始设置
            if (worldType === 'forest') {
              this.originalSettings.forest = JSON.parse(JSON.stringify(this.forestSettings));
            } else {
              this.originalSettings.cave = JSON.parse(JSON.stringify(this.caveSettings));
            }
            
            // 更新存储的世界覆盖配置
            if (!this.worldOverrides[currentWorld.name]) {
              this.worldOverrides[currentWorld.name] = {
                type: worldType,
                data: {}
              };
            }
            
            // 更新覆盖数据
            Object.keys(changedSettings[worldType]).forEach(key => {
              this.worldOverrides[currentWorld.name].data[key] = changedSettings[worldType][key];
            });
            
            // 清除变更状态和缓存
            this.hasChanges = false;
            this.changedItemsCache = null;
            
            // 重建缓存
            this.buildCaches();
          } else {
            this.$message.error(response.data.msg || '保存设置失败');
          }
        })
        .catch(error => {
          console.error(`保存 ${currentWorld.name} 世界设置失败:`, error);
          this.$message.error(`保存 ${currentWorld.name} 世界设置失败`);
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
      if (!this.originalSettings) return;
      
      const worldType = this.activeTab;
      
      if (worldType === 'forest' && this.originalSettings.forest) {
        // 使用高效方式重置设置
        this.applySettingsValues(this.forestSettings, this.originalSettings.forest);
        this.$message.info('森林世界设置已重置');
      } else if (worldType === 'cave' && this.originalSettings.cave) {
        this.applySettingsValues(this.caveSettings, this.originalSettings.cave);
        this.$message.info('洞穴世界设置已重置');
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
          Vue.set(category.items[itemKey], 'value', sourceItem.value);
        }
      });
    },
    saveAsPreset() {
      this.presetDialogVisible = true;
      this.newPreset = {
        name: '',
        description: '',
        settings: null
      };
    },
    confirmSavePreset() {
      if (!this.newPreset.name) {
        this.$message.warning('请输入预设名称');
        return;
      }
      
      // 保存当前设置为自定义预设
      const presetId = 'custom_' + Date.now();
      
      // 创建高效的预设对象，只保存必要信息
      const preset = {
        id: presetId,
        name: this.newPreset.name,
        description: this.newPreset.description,
        createdAt: new Date().toISOString(),
        settings: {}
      };
      
      // 只保存当前标签页的设置
      if (this.activeTab === 'forest' && this.forestSettings) {
        preset.settings.forest = this.extractEssentialSettings(this.forestSettings);
      } else if (this.activeTab === 'cave' && this.caveSettings) {
        preset.settings.cave = this.extractEssentialSettings(this.caveSettings);
      }
      
      // 添加到预设列表
      this.customPresets.push(preset);
      
      // 高效保存到本地存储
      this.savePresetsToLocalStorage();
      
      this.$message.success('预设保存成功');
      this.presetDialogVisible = false;
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
    savePresetsToLocalStorage() {
      try {
        // 先处理预设数据，减少存储大小
        const minimalPresets = this.customPresets.map(preset => ({
          id: preset.id,
          name: preset.name,
          description: preset.description,
          createdAt: preset.createdAt,
          settings: preset.settings
        }));
        
        localStorage.setItem('dst_custom_presets', JSON.stringify(minimalPresets));
      } catch (e) {
        console.error('保存自定义预设失败:', e);
        this.$message.error('保存预设失败，可能是存储空间不足');
      }
    },
    getSettingDescription(item, itemKey, category) {
      // 优化缓存方式
      const cacheKey = `${itemKey}-${item.value}`;
      if (this.descriptionCache[cacheKey]) {
        return this.descriptionCache[cacheKey];
      }
      
      // 基本描述
      let desc = `${item.text}：`;
      
      // 添加当前值的描述
      const options = this.getItemOptions(category.desc, item.desc);
      const currentValue = options[item.value] || item.value;
      desc += `当前值为【${currentValue}】`;
      
      // 使用策略模式优化描述生成
      const descriptionStrategies = {
        monster: '。此选项影响游戏中怪物的数量和出现频率，数值越高难度越大。',
        enemy: '。此选项影响游戏中怪物的数量和出现频率，数值越高难度越大。',
        hound: '。此选项影响游戏中怪物的数量和出现频率，数值越高难度越大。',
        regrowth: '。此选项影响资源再生速度，选择更快的速度可以使游戏更加轻松。',
        respawn: '。此选项影响资源再生速度，选择更快的速度可以使游戏更加轻松。',
        season: '。此选项影响季节的持续时间，影响游戏的整体节奏。',
        start: '。此选项影响游戏开局设置。',
        world_size: '。世界大小影响地图范围，较大的世界有更多资源但探索难度更高。',
        damage: '。此选项影响伤害计算，调整游戏难度。'
      };
      
      // 查找适用的描述策略
      let descriptionAdded = false;
      for (const [keyword, description] of Object.entries(descriptionStrategies)) {
        if (itemKey.includes(keyword) || (keyword === 'world_size' && itemKey === keyword)) {
          desc += description;
          descriptionAdded = true;
          break;
        }
      }
      
      // 如果没有匹配的策略，添加通用描述
      if (!descriptionAdded) {
        desc += '。调整此选项可能会影响游戏平衡性。';
      }
      
      // 保存到缓存
      this.descriptionCache[cacheKey] = desc;
      return desc;
    },
    isItemChanged(item, itemKey, activeTab) {
      if (!this.originalSettings || !item) return false;
      
      try {
        // 获取对应的原始设置
        let originalItem = null;
        
        // 查找原始设置中对应的项
        if (activeTab === 'forest' && this.originalSettings.forest) {
          this.traverseSettings(this.originalSettings.forest, (origItem, origKey, path) => {
            if (origKey === itemKey) {
              originalItem = origItem;
            }
          });
        } else if (activeTab === 'cave' && this.originalSettings.cave) {
          this.traverseSettings(this.originalSettings.cave, (origItem, origKey, path) => {
            if (origKey === itemKey) {
              originalItem = origItem;
            }
          });
        }
        
        // 如果找到原始设置项，比较其值是否与当前值不同
        if (originalItem) {
          // 两种特殊情况:
          // 1. 原值为default，当前值也为default - 未变更
          // 2. 原值不是default但等于初始默认值，当前值也等于初始默认值 - 未变更
          if (originalItem.value === 'default' && item.value === 'default') {
            return false;
          }
          
          // 如果值不同，则认为有变更
          return originalItem.value !== item.value;
        }
        
        return false;
      } catch (e) {
        console.error('比较设置项变化时出错:', e);
        return false;
      }
    },
    getChangedItems() {
      if (this.changedItemsCache !== null) {
        return this.changedItemsCache;
      }
      
      if (!this.originalSettings) return [];
      
      const changedItems = [];
      const currentWorld = this.roomWorlds.find(world => world.name === this.activeTab);
      if (!currentWorld) return [];
      
      // 根据世界类型确定使用的设置
      const worldType = currentWorld.type === 'forest' ? 'forest' : 'cave';
      const activeSettings = worldType === 'forest' ? this.forestSettings : this.caveSettings;
      const originalSettings = this.originalSettings[worldType];
      
      if (!activeSettings || !originalSettings) return [];
      
      // 获取当前世界的覆盖配置
      const worldOverrides = this.worldOverrides[currentWorld.name] || { data: {} };
      
      // 遍历活动设置，找出与默认值不同的项
      this.traverseSettings(activeSettings, (item, itemKey, path) => {
        // 获取原始值（从默认设置或世界覆盖配置中）
        let defaultValue;
        
        // 优先使用覆盖配置中的值
        if (worldOverrides.data.hasOwnProperty(itemKey)) {
          defaultValue = worldOverrides.data[itemKey];
        } else {
          // 否则使用默认设置中的值
          defaultValue = this.defaultValueCache[`${worldType}_${itemKey}`];
        }
        
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
    isDefaultOption(itemKey, descKey) {
      if (descKey === 'default') return true;
      
      // 检查是否与原始默认配置匹配
      if (!this.originalSettings) return false;
      
      let originalItem = null;
      if (this.activeTab === 'forest' && this.originalSettings.forest) {
        this.traverseSettings(this.originalSettings.forest, (origItem, origKey) => {
          if (origKey === itemKey) {
            originalItem = origItem;
          }
        });
      } else if (this.activeTab === 'cave' && this.originalSettings.cave) {
        this.traverseSettings(this.originalSettings.cave, (origItem, origKey) => {
          if (origKey === itemKey) {
            originalItem = origItem;
          }
        });
      }
      
      return originalItem && originalItem.value === descKey;
    },
    handleSelectChange(item, newValue) {
      if (item.value === newValue) return; // 防止无变化时的更新
      
      // 更新值
      Vue.set(item, 'value', newValue);
      
      // 使用节流优化下拉菜单关闭
      if (this._closeDropdownTimer) {
        clearTimeout(this._closeDropdownTimer);
      }
      
      this._closeDropdownTimer = setTimeout(() => {
        // 使用requestAnimationFrame优化视觉表现
        window.requestAnimationFrame(() => {
          const selectDropdowns = document.querySelectorAll('.el-select-dropdown.el-popper');
          selectDropdowns.forEach(dropdown => {
            dropdown.style.display = 'none';
          });
        });
      }, 10);
      
      // 使用防抖优化变更检查
      this.debouncedCheckChanges();
      
      // 立即清除变更缓存以便重新计算
      this.changedItemsCache = null;
    },
    handleSelectFocus(itemKey) {
      this.$set(this.loadedSelects, itemKey, true);
      
      // 预加载相关选项
      this.preloadRelatedOptions(itemKey);
    },
    
    shouldRenderOptions(itemKey) {
      // 只有在已加载的情况下才渲染选项
      return this.loadedSelects[itemKey] === true;
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
        this.$set(this.loadedSelects, key, true);
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
            this.$set(this.loadedSelects, key, true);
          }
        });
      }, 500);
    },
    
    updateSelectLabels() {
      // 使用 requestAnimationFrame 优化性能
      window.requestAnimationFrame(() => {
        const selects = document.querySelectorAll('.el-select');
        
        // 处理前20个可见的选择器，避免一次处理过多
        const visibleSelects = Array.from(selects)
          .filter(el => this.isElementInViewport(el))
          .slice(0, 20);
        
        visibleSelects.forEach(select => {
          const component = select.__vue__;
          const input = select.querySelector('.el-input__inner');
          
          if (component && input && component.value) {
            const option = component.options.find(opt => opt.value === component.value);
            if (option && option.currentLabel) {
              input.value = option.currentLabel;
            }
          }
        });
      });
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
          this.$set(this.loadedSelects, key, true);
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
    handleGlobalClick(event) {
      // 检查是否点击在下拉菜单外部
      const selectDropdowns = document.querySelectorAll('.el-select-dropdown.el-popper');
      
      if (selectDropdowns.length > 0) {
        // 检查是否点击在任何下拉菜单或选择器上
        const clickedOnSelect = !!event.target.closest('.el-select');
        const clickedOnDropdown = Array.from(selectDropdowns).some(dropdown => 
          dropdown.contains(event.target)
        );
        
        // 如果点击在下拉菜单和选择器之外，关闭所有下拉菜单
        if (!clickedOnSelect && !clickedOnDropdown) {
          // 使用 requestAnimationFrame 优化性能
          window.requestAnimationFrame(() => {
            selectDropdowns.forEach(dropdown => {
              dropdown.style.display = 'none';
            });
          });
        }
      }
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
    getOptionCount(categoryDesc, itemDesc) {
      const options = this.getItemOptions(categoryDesc, itemDesc);
      return Object.keys(options).length;
    },
    getVisibleOptions(categoryDesc, itemDesc, itemKey) {
      const allOptions = this.getItemOptions(categoryDesc, itemDesc);
      
      // 如果已加载此选择器，返回所有选项
      if (this.loadedSelects[itemKey]) {
        return allOptions;
      }
      
      // 否则只返回当前值和默认值相关的选项
      const currentValue = this.findItemInSettings(this.activeSettings, itemKey)?.value;
      const defaultValue = this.defaultValueCache[`${this.activeTab}_${itemKey}`];
      
      const result = {};
      if (currentValue && allOptions[currentValue]) {
        result[currentValue] = allOptions[currentValue];
      }
      if (defaultValue && allOptions[defaultValue]) {
        result[defaultValue] = allOptions[defaultValue];
      }
      if (allOptions['default']) {
        result['default'] = allOptions['default'];
      }
      
      // 如果结果为空，至少返回几个选项
      if (Object.keys(result).length === 0) {
        const keys = Object.keys(allOptions).slice(0, 5);
        keys.forEach(key => {
          result[key] = allOptions[key];
        });
      }
      
      return result;
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
      // 只处理可见区域内的选择框
      const visibleSelects = Array.from(document.querySelectorAll('.el-select'))
        .filter(el => this.isElementInViewport(el));
      
      // 分批处理，避免一次性处理过多DOM导致卡顿
      const batchSize = 5;
      const processBatch = (startIndex) => {
        const endIndex = Math.min(startIndex + batchSize, visibleSelects.length);
        const batch = visibleSelects.slice(startIndex, endIndex);
        
        batch.forEach(select => {
          // 减少repaint/reflow
          select.style.willChange = 'transform';
          
          // 优化下拉菜单渲染
          const dropdown = select.querySelector('.el-select-dropdown');
          if (dropdown) {
            dropdown.style.willChange = 'transform, opacity';
            dropdown.style.transition = 'transform 0.1s ease-out, opacity 0.1s ease-out';
          }
        });
        
        // 继续处理下一批
        if (endIndex < visibleSelects.length) {
          setTimeout(() => processBatch(endIndex), 0);
        }
      };
      
      processBatch(0);
    },
    
    updateVisibleSelectLabels() {
      // 使用 requestAnimationFrame 优化性能
      window.requestAnimationFrame(() => {
        const selects = document.querySelectorAll('.el-select');
        
        // 处理前20个可见的选择器，避免一次处理过多
        const visibleSelects = Array.from(selects)
          .filter(el => this.isElementInViewport(el))
          .slice(0, 20);
        
        visibleSelects.forEach(select => {
          const component = select.__vue__;
          const input = select.querySelector('.el-input__inner');
          
          if (component && input && component.value) {
            const option = component.options.find(opt => opt.value === component.value);
            if (option && option.currentLabel) {
              input.value = option.currentLabel;
            }
          }
        });
      });
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
        this.$once('hook:beforeDestroy', () => {
          scrollContainer.removeEventListener('scroll', debouncedScrollHandler);
        });
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
            if (worldOverride.data.hasOwnProperty(itemKey)) {
              Vue.set(item, 'value', worldOverride.data[itemKey]);
            }
          });
          
          console.log(`已重新应用世界 ${currentWorld.name} 的配置`);
        }
      }
    },
    // 显示新增世界对话框
    showAddWorldDialog() {
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
    
    // 确认创建临时世界开始配置
    confirmNewWorldConfig() {
      if (!this.newWorld.name) {
        this.$message.warning('请输入世界名称');
        return;
      }
      
      if (!this.newWorld.type) {
        this.$message.warning('请选择世界类型');
        return;
      }
      
      this.addWorldDialogVisible = false;
      this.loading = true;
      
      // 临时世界信息
      const tempWorldName = this.newWorld.name;
      const worldType = this.newWorld.type;
      
      console.log(`开始创建新世界: ${tempWorldName}, 类型: ${worldType}`);
      
      // 先确保基础设置已加载完成
      this.loadDefaultSettings(worldType)
        .then(() => {
          console.log(`已加载${worldType === 'forest' ? '森林' : '洞穴'}世界默认配置`);
          
          // 提取默认配置
          const defaultOverrides = this.extractAllSettings(worldType);
          
          // 确定API端点
          const apiEndpoint = worldType === 'forest' 
            ? `${config.BASE_URL}/dstserver/forestworld`
            : `${config.BASE_URL}/dstserver/caveworld`;
          
          // 创建基础配置
          const serverIni = this.createServerIniConfig(tempWorldName, worldType);
          
          console.log(`创建世界配置请求：${apiEndpoint}`);
          
          // 创建两个请求
          const configPromise = axios.post(apiEndpoint, {
            savename: this.roomName,
            worldname: tempWorldName,
            overrides: defaultOverrides
          });
          
          const serverIniPromise = axios.post(`${config.BASE_URL}/dstserver/serverini`, {
            savename: this.roomName,
            worldname: tempWorldName,
            config: serverIni
          });
          
          // 并行执行两个请求
          Promise.all([configPromise, serverIniPromise])
            .then(([configResponse, serverIniResponse]) => {
              let success = true;
              let errorMessages = [];
              
              if (configResponse.data && configResponse.data.status === 200) {
                console.log(`世界 ${tempWorldName} 配置创建成功`);
              } else {
                errorMessages.push(configResponse.data?.msg || '创建世界配置失败');
                success = false;
              }
              
              if (serverIniResponse.data && serverIniResponse.data.status === 200) {
                console.log(`世界 ${tempWorldName} 基础配置设置成功`);
              } else {
                errorMessages.push(serverIniResponse.data?.msg || '设置基础配置失败');
                success = false;
              }
              
              if (success) {
                // 显示单个成功消息
                this.$message.success(`已创建世界 ${tempWorldName} 并完成所有配置设置`);
                
                // 添加世界到当前视图
                const newWorld = {
                  name: tempWorldName,
                  type: worldType
                };
                
                // 更新原始设置，确保设置在内存中已可用
                if (worldType === 'forest') {
                  if (!this.originalSettings) this.originalSettings = {};
                  this.originalSettings.forest = JSON.parse(JSON.stringify(this.forestSettings));
                  // 更新世界类型标志
                  this.hasForestWorld = true;
                } else {
                  if (!this.originalSettings) this.originalSettings = {};
                  this.originalSettings.cave = JSON.parse(JSON.stringify(this.caveSettings));
                  // 更新世界类型标志
                  this.hasCaveWorld = true;
                }
                
                // 预先添加世界到列表，避免等待刷新
                this.roomWorlds.push(newWorld);
                
                // 记录已加载此世界配置
                const worldKey = `${this.roomName}_${tempWorldName}`;
                if (!this.loadedWorldConfigs) {
                  this.loadedWorldConfigs = {};
                }
                this.loadedWorldConfigs[worldKey] = true;
                
                // 存储世界覆盖配置，以便正确应用
                if (!this.worldOverrides) {
                  this.worldOverrides = {};
                }
                
                this.worldOverrides[tempWorldName] = {
                  type: worldType,
                  data: JSON.parse(JSON.stringify(defaultOverrides))
                };
                
                // 切换到新世界标签
                this.activeTab = tempWorldName;
                
                // 添加短暂延迟，确保UI更新
                setTimeout(() => {
                  // 刷新世界列表以获取服务器最新状态
                  this.fetchRoomWorlds()
                    .then(() => {
                      console.log(`已刷新房间世界列表，尝试初始化 ${tempWorldName} 配置`);
                      
                      // 确保加载新世界的配置
                      const serverWorld = this.roomWorlds.find(world => world.name === tempWorldName);
                      if (serverWorld) {
                        // 确保世界类型正确
                        if (serverWorld.type !== worldType) {
                          console.log(`更新世界类型: ${serverWorld.type} -> ${worldType}`);
                          this.$set(serverWorld, 'type', worldType);
                        }
                        
                        // 手动初始化世界配置
                        this.initWorldConfig(serverWorld);
                      } else {
                        console.log(`无法在刷新后的列表中找到世界 ${tempWorldName}`);
                      }
                    })
                    .catch(error => {
                      console.error('刷新世界列表失败:', error);
                      // 如果刷新失败，确保使用本地添加的世界
                      this.initWorldConfig(newWorld);
                    });
                }, 500);
              } else {
                // 显示错误消息，合并多个错误
                if (errorMessages.length > 0) {
                  this.$message.error(errorMessages.join('；'));
                } else {
                  this.$message.error('创建世界失败');
                }
              }
              
              this.loading = false;
            })
            .catch(error => {
              console.error('创建世界失败:', error);
              this.$message.error('创建世界失败: ' + (error.message || '未知错误'));
              this.loading = false;
            });
        })
        .catch(error => {
          console.error('加载默认配置失败:', error);
          this.$message.error('加载默认配置失败: ' + (error.message || '未知错误'));
          this.loading = false;
        });
    },
    
    // 初始化世界配置
    initWorldConfig(world) {
      if (!world || !this.roomName) return;
      
      // 创建加载提示
      const loadingInstance = this.$loading({
        lock: true,
        text: `正在加载 ${world.name} 的配置数据...`,
        spinner: 'el-icon-loading',
        background: 'rgba(255, 255, 255, 0.7)'
      });
      
      console.log(`开始初始化世界 ${world.name} (类型: ${world.type}) 的配置`);
      
      // 先确保基础设置已加载
      const loadDefaultSettingsPromise = this.loadDefaultSettings(world.type);
      
      // 等待基础设置加载完成
      loadDefaultSettingsPromise.then(() => {
        // 设置当前世界的数据，确保其他方法能正确识别当前世界类型
        if (world.type === 'forest') {
          if (!this.originalSettings) this.originalSettings = {};
          this.originalSettings.forest = JSON.parse(JSON.stringify(this.forestSettings));
          console.log('基础森林设置已准备就绪');
        } else {
          if (!this.originalSettings) this.originalSettings = {};
          this.originalSettings.cave = JSON.parse(JSON.stringify(this.caveSettings));
          console.log('基础洞穴设置已准备就绪');
        }
        
        // 记录已加载配置
        const worldKey = `${this.roomName}_${world.name}`;
        if (!this.loadedWorldConfigs) {
          this.loadedWorldConfigs = {};
        }

        // 首先检查是否已有存储的覆盖配置
        if (this.worldOverrides && this.worldOverrides[world.name]) {
          console.log(`发现已存储的 ${world.name} 配置，直接应用缓存的配置...`);
          
          // 设置为已加载
          this.loadedWorldConfigs[worldKey] = true;
          
          // 应用缓存的配置
          this.applyCurrentWorldConfig(world);
          
          // 显式触发视图更新
          this.$forceUpdate();
          
          // 获取服务器基础配置
          this.fetchServerIni(this.roomName, world.name)
            .catch(error => {
              console.warn(`加载服务器基础配置失败，将使用默认配置:`, error);
            })
            .finally(() => {
              // 关闭加载提示
              loadingInstance.close();
              this.loading = false;
            });
          
          return;
        }
        
        // 添加延迟，确保服务器有时间处理完成
        console.log(`等待1.5秒, 确保服务器完成配置处理...`);
        setTimeout(() => {
          console.log(`开始获取 ${world.name} 的世界配置覆盖数据...`);
          // 加载世界覆盖配置
          this.loadWorldOverrides(this.roomName, world.name)
            .then(data => {
              console.log(`成功加载 ${world.name} 的世界配置, 配置项数量:`, data ? Object.keys(data).length : 0);
              // 记录已加载
              this.loadedWorldConfigs[worldKey] = true;
              
              // 显式触发视图更新
              this.$forceUpdate();
              
              // 触发变更检查
              this.debouncedCheckChanges();
              
              // 加载服务器基础配置
              console.log(`开始加载 ${world.name} 的服务器基础配置...`);
              return this.fetchServerIni(this.roomName, world.name);
            })
            .catch(error => {
              console.error(`加载世界配置失败:`, error);
              this.$message.warning(`配置加载失败，正在使用默认配置`);
              
              // 如果配置加载失败，使用默认配置
              console.log(`使用默认配置...`);
              
              if (!this.worldOverrides) {
                this.worldOverrides = {};
              }
              
              // 创建默认配置覆盖
              const defaultOverrides = this.extractAllSettings(world.type);
              
              // 存储默认配置
              this.worldOverrides[world.name] = {
                type: world.type,
                data: JSON.parse(JSON.stringify(defaultOverrides))
              };
              
              // 应用默认配置
              if (world.type === 'forest') {
                this.forestSettings = this.getDefaultForestSettings();
              } else {
                this.caveSettings = this.getDefaultCaveSettings();
              }
              
              // 记录为已加载
              this.loadedWorldConfigs[worldKey] = true;
              
              // 显式触发视图更新
              this.$forceUpdate();
              
              // 触发变更检查
              this.debouncedCheckChanges();
            })
            .finally(() => {
              // 关闭加载提示
              loadingInstance.close();
              
              // 标记加载完成
              this.loading = false;
              
              // 设置延迟的额外检查，确保UI更新
              setTimeout(() => {
                console.log(`最终检查状态...`);
                this.$forceUpdate();
                this.debouncedCheckChanges();
              }, 500);
            });
        }, 1500); // 延迟1.5秒执行，给予更多时间
      });
    },
    
    // 创建服务器基础配置对象
    createServerIniConfig(worldName, worldType) {
      const worldIdMatch = worldName.match(/\d+/);
      let worldId = worldIdMatch ? parseInt(worldIdMatch[0]) : 1;
      
      // 判断是否是森林世界
      const isForest = worldType === 'forest';
      
      // 如果是主森林世界，确保ID为1
      if (isForest && !this.roomWorlds.some(w => w.type === 'forest' || w.name.toLowerCase().includes('forest'))) {
        worldId = 1;
      }
      
      // 根据世界ID计算端口
      const serverPort = 10997 + worldId;
      const masterServerPort = 27016 + worldId;
      const authPort = 8766 + worldId;
      
      // 创建基础配置
      return {
        network: {
          server_port: serverPort
        },
        shard: {
          is_master: isForest && worldId === 1, // 只有第一个森林世界是主世界
          name: worldName, // 分片名称为世界名称
          id: worldId // 分片ID为世界ID
        },
        account: {
          encode_user_path: false
        },
        steam: {
          master_server_port: masterServerPort,
          authentication_port: authPort
        }
      };
    },
    
    // 加载指定世界的配置（处理用户选择世界类型后）
    loadWorldConfig(world) {
      if (!world || !this.roomName) return;
      
      console.log(`通过loadWorldConfig启动世界配置加载流程...`);
      
      // 直接调用增强的initWorldConfig方法
      this.initWorldConfig(world);
      
      // 如果是未知类型的世界，则还需要设置默认配置
      if (world.type === 'unknown' || !world.type) {
        console.log(`检测到未知类型世界，将创建默认配置...`);
        this.setWorldDefaultConfig(world);
      }
    },
    
    // 为未知类型的世界设置默认配置
    setWorldDefaultConfig(world) {
      if (!world || !this.roomName) return;
      
      // 根据配置获取所有默认值
      const defaultOverrides = this.extractAllSettings(world.type);
      
      // 根据世界类型选择API端点
      const apiEndpoint = world.type === 'forest' 
        ? `${config.BASE_URL}/dstserver/forestworld`
        : `${config.BASE_URL}/dstserver/caveworld`;
      
      // 创建基础配置
      const serverIni = this.createServerIniConfig(world.name, world.type);
      
      console.log(`为未知类型世界 ${world.name} 设置默认配置 (类型: ${world.type})...`);
      
      // 调用API更新世界配置
      axios.post(apiEndpoint, {
        savename: this.roomName,
        worldname: world.name,
        overrides: defaultOverrides
      })
      .then(response => {
        if (response.data && response.data.status === 200) {
          this.$message.success(`已将世界 ${world.name} 设置为 ${world.type === 'forest' ? '森林' : '洞穴'} 类型`);
          
          // 设置基础配置
          axios.post(`${config.BASE_URL}/dstserver/serverini`, {
            savename: this.roomName,
            worldname: world.name,
            config: serverIni
          })
          .then(() => {
            console.log(`已完成 ${world.name} 的基础配置设置`);
          })
          .catch(error => {
            console.error(`设置基础配置失败:`, error);
          });
        } else {
          this.$message.warning(response.data?.msg || `世界类型更新失败`);
        }
      })
      .catch(error => {
        console.error('设置默认配置失败:', error);
        this.$message.warning(`配置设置失败，请尝试刷新页面`);
      });
    },
    
    // 添加新世界
    addWorld() {
      if (!this.newWorld.name) {
        this.$message.warning('请输入世界名称');
        return;
      }
      
      // 如果是新世界配置模式，则确认创建临时世界
      if (this.isNewWorldConfig) {
        this.confirmNewWorldConfig();
        return;
      }
      
      this.addWorldLoading = true;
      
      // 调用API创建新世界
      axios.post(`${config.BASE_URL}/dstserver/createworld`, {
        roomName: this.roomName,
        worldName: this.newWorld.name,
        worldType: this.newWorld.type
      })
        .then(response => {
          if (response.data && response.data.status === 200) {
            this.$message.success(`已创建世界 ${this.newWorld.name}`);
            this.addWorldDialogVisible = false;
            
            // 查找并移除临时世界
            const tempWorldIndex = this.roomWorlds.findIndex(world => world.isTemp && world.name === this.activeTab);
            if (tempWorldIndex !== -1) {
              this.roomWorlds.splice(tempWorldIndex, 1);
            }
            
            // 如果有待保存的配置设置，则在创建世界后应用这些设置
            if (this.pendingWorldSettings && this.pendingWorldType) {
              // 刷新世界列表，然后应用配置
              this.fetchRoomWorlds()
                .then(() => {
                  // 切换到新创建的世界
                  this.activeTab = this.newWorld.name;
                  
                  // 应用保存的配置
                  this.applyPendingSettings();
                });
            } else {
              // 刷新世界列表
              this.fetchRoomWorlds();
            }
          } else {
            this.$message.error(response.data.msg || '创建世界失败');
          }
        })
        .catch(error => {
          this.$message.error('创建世界失败: ' + (error.message || '未知错误'));
        })
        .finally(() => {
          this.addWorldLoading = false;
        });
    },
    
    // 应用待保存的配置
    applyPendingSettings() {
      if (!this.pendingWorldSettings || !this.pendingWorldType || !this.newWorld.name) {
        return;
      }
      
      const worldType = this.pendingWorldType;
      const settings = this.pendingWorldSettings;
      
      // 根据世界类型确定API端点
      const apiEndpoint = worldType === 'forest' 
        ? `${config.BASE_URL}/dstserver/forestworld`
        : `${config.BASE_URL}/dstserver/caveworld`;
      
      this.saveLoading = true;
      
      // 调用API保存设置
      axios.post(apiEndpoint, {
        savename: this.roomName,
        worldname: this.newWorld.name,
        overrides: settings[worldType]
      })
        .then(response => {
          if (response.data && response.data.status === 200) {
            this.$message.success(`${this.newWorld.name} 世界配置应用成功`);
            
            // 清除待保存的配置
            this.pendingWorldSettings = null;
            this.pendingWorldType = null;
            
            // 清除变更状态和缓存
            this.hasChanges = false;
            this.changedItemsCache = null;
            
            // 重新加载世界配置
            const currentWorld = this.roomWorlds.find(world => world.name === this.newWorld.name);
            if (currentWorld) {
              this.loadWorldOverrides(this.roomName, currentWorld.name);
            }
          } else {
            this.$message.error(response.data.msg || '应用新世界配置失败');
          }
        })
        .catch(error => {
          console.error(`应用 ${this.newWorld.name} 世界配置失败:`, error);
          this.$message.error(`应用 ${this.newWorld.name} 世界配置失败`);
        })
        .finally(() => {
          this.saveLoading = false;
        });
    },
    
    // 显示删除世界确认对话框
    confirmDeleteWorld(world) {
      this.worldToDelete = world;
      this.deleteWorldDialogVisible = true;
    },
    
    // 删除世界
    deleteWorld() {
      if (!this.worldToDelete) {
        this.$message.warning('未选择要删除的世界');
        return;
      }
      
      this.deleteWorldLoading = true;
      
      // 调用API删除世界
      axios.post(`${config.BASE_URL}/dstserver/deleteworld`, {
        savename: this.roomName,
        worldname: this.worldToDelete.name
      })
        .then(response => {
          if (response.data && response.data.status === 200) {
            this.$message.success(`已删除世界 ${this.worldToDelete.name}`);
            this.deleteWorldDialogVisible = false;
            
            // 刷新世界列表
            this.fetchRoomWorlds();
          } else {
            this.$message.error(response.data.msg || '删除世界失败');
          }
        })
        .catch(error => {
          this.$message.error('删除世界失败: ' + (error.message || '未知错误'));
        })
        .finally(() => {
          this.deleteWorldLoading = false;
        });
    },
    
    // 刷新房间世界列表
    fetchRoomWorlds() {
      return new Promise((resolve, reject) => {
        axios.get(`${config.BASE_URL}/dstserver/list`)
          .then(response => {
            if (response && response.data && response.data.status === 200 && Array.isArray(response.data.data)) {
              // 查找指定的房间
              const room = response.data.data.find(r => r.id === this.roomId || r.name === this.roomName);
              if (room && room.worlds && Array.isArray(room.worlds)) {
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
                  // 如果没有世界，则根据类型选择默认标签
                  this.activeTab = this.hasForestWorld ? 'forest' : 'cave';
                }
                resolve();
              } else {
                reject(new Error('找不到指定房间或房间没有世界'));
              }
            } else {
              reject(new Error('获取世界列表失败'));
            }
          })
          .catch(error => {
            console.error('获取房间世界列表失败:', error);
            reject(error);
          });
      });
    },
    // 获取服务器基础配置
    fetchServerIni(savename, worldname) {
      if (!savename || !worldname) return Promise.resolve(null);
      
      this.loadingServerIni = true;
      this.serverIni = null;
      this.serverIniOriginal = null;
      this.serverIniChanged = false;
      
      return new Promise((resolve, reject) => {
        axios.get(`${config.BASE_URL}/dstserver/serverini`, {
          params: {
            savename,
            worldname
          }
        })
          .then(response => {
            if (response.data && response.data.status === 200 && response.data.data) {
              this.serverIni = response.data.data;
              // 深拷贝保存原始配置用于重置
              this.serverIniOriginal = JSON.parse(JSON.stringify(response.data.data));
              console.log('服务器基础配置加载成功:', this.serverIni);
              resolve(this.serverIni);
            } else {
              // 如果API返回失败或没有数据，创建默认配置
              const currentWorld = this.roomWorlds.find(world => world.name === worldname);
              if (currentWorld) {
                // 创建默认配置
                this.createDefaultServerIni(currentWorld);
                resolve(this.serverIni);
              } else {
                this.$message.warning('加载服务器基础配置失败');
                console.warn('加载服务器基础配置失败:', response.data);
                reject(new Error('加载服务器基础配置失败'));
              }
            }
          })
          .catch(error => {
            // 接口出错时也创建默认配置
            const currentWorld = this.roomWorlds.find(world => world.name === worldname);
            if (currentWorld) {
              // 创建默认配置
              this.createDefaultServerIni(currentWorld);
              resolve(this.serverIni);
            } else {
              this.$message.error('加载服务器基础配置出错: ' + (error.message || '未知错误'));
              console.error('加载服务器基础配置出错:', error);
              reject(error);
            }
          })
          .finally(() => {
            this.loadingServerIni = false;
          });
      });
    },
    
    // 创建默认服务器配置
    createDefaultServerIni(world) {
      // 判断当前世界在所有世界中的顺序
      const worldIndex = this.sortedRoomWorlds.findIndex(w => w.name === world.name);
      
      // 判断是否是第一个森林世界
      const isFirstForest = world.type === 'forest' && this.sortedRoomWorlds.filter(w => w.type === 'forest').findIndex(w => w.name === world.name) === 0;
      
      // 提取世界ID（如果存在）
      const worldIdMatch = world.name.match(/\d+/);
      let worldId = worldIdMatch ? parseInt(worldIdMatch[0]) : (worldIndex + 1);
      
      // 如果是主世界，确保分片ID为1
      if (isFirstForest) {
        worldId = 1;
      }
      
      // 根据世界ID计算端口
      // 服务器端口 = 10997 + ID
      const serverPort = 10997 + worldId;
      // 主服务器端口 = 27016 + ID
      const masterServerPort = 27016 + worldId;
      // 验证端口 = 8766 + ID
      const authPort = 8766 + worldId;
      
      // 创建默认配置
      this.serverIni = {
        network: {
          server_port: serverPort
        },
        shard: {
          is_master: isFirstForest, // 只有第一个森林世界是主世界
          name: world.name, // 分片名称为世界名称
          id: worldId // 分片ID为世界ID
        },
        account: {
          encode_user_path: false
        },
        steam: {
          master_server_port: masterServerPort,
          authentication_port: authPort
        }
      };
      
      // 深拷贝保存原始配置用于重置
      this.serverIniOriginal = JSON.parse(JSON.stringify(this.serverIni));
      
      console.log(`已为世界 ${world.name} 创建默认基础配置:`, this.serverIni);
    },
    
    // 保存服务器基础配置
    saveServerIni() {
      if (!this.serverIni) return;
      
      const currentWorld = this.roomWorlds.find(world => world.name === this.activeTab);
      if (!currentWorld) {
        this.$message.error('无法找到当前世界');
        return;
      }
      
      // 检查规则：如果是主世界，分片ID必须为1
      if (this.serverIni.shard.is_master && this.serverIni.shard.id !== 1) {
        this.serverIni.shard.id = 1;
        this.$message.warning('主世界的世界ID已自动设置为1');
      }
      
      this.savingServerIni = true;
      
      axios.post(`${config.BASE_URL}/dstserver/serverini`, {
        savename: this.roomName,
        worldname: currentWorld.name,
        config: this.serverIni
      })
        .then(response => {
          if (response.data && response.data.status === 200) {
            this.$message.success('服务器基础配置保存成功');
            // 更新原始配置
            this.serverIniOriginal = JSON.parse(JSON.stringify(this.serverIni));
            this.serverIniChanged = false;
          } else {
            this.$message.error(response.data.msg || '保存服务器基础配置失败');
          }
        })
        .catch(error => {
          this.$message.error('保存服务器基础配置出错: ' + (error.message || '未知错误'));
          console.error('保存服务器基础配置出错:', error);
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
        this.$message.info('已将主世界的世界ID自动设置为1');
      }
    },
    // 加载默认设置
    loadDefaultSettings(worldType) {
      return new Promise((resolve) => {
        console.log(`加载${worldType === 'forest' ? '森林' : '洞穴'}世界默认配置...`);
        
        // 直接使用静态默认配置
        this.initStaticDefaultSettings(worldType);
        resolve();
      });
    },
    
    // 初始化静态默认设置（当API不可用时使用）
    initStaticDefaultSettings(worldType) {
      if (worldType === 'forest') {
        // 这里可以设置静态的森林默认配置
        this.forestSettings = this.getDefaultForestSettings();
      } else {
        // 这里可以设置静态的洞穴默认配置
        this.caveSettings = this.getDefaultCaveSettings();
      }
      console.log(`已初始化静态${worldType === 'forest' ? '森林' : '洞穴'}世界默认配置`);
    },
    
    // 获取默认森林配置
    getDefaultForestSettings() {
      // 返回一个基本的默认森林配置
      return {
        // 这里是基本的默认森林配置结构，可以根据实际需求进行调整
        world: {
          worldgen: {
            text: '世界生成',
            order: 1,
            items: {
              endless: { text: '四季', description: '四季模式', value: 'default' },
              autumn: { text: '秋天', description: '秋天', value: 'default' },
              spring: { text: '春天', description: '春天', value: 'default' },
              summer: { text: '夏天', description: '夏天', value: 'default' },
              winter: { text: '冬天', description: '冬天', value: 'default' },
              day: { text: '白天', description: '白天长度', value: 'default' },
              season_start: { text: '起始季节', description: '游戏开始的季节', value: 'default' }
            }
          }
        }
      };
    },
    
    // 获取默认洞穴配置
    getDefaultCaveSettings() {
      // 返回一个基本的默认洞穴配置
      return {
        // 这里是基本的默认洞穴配置结构，可以根据实际需求进行调整
        world: {
          worldgen: {
            text: '世界生成',
            order: 1,
            items: {
              boons: { text: '遗物', description: '遗物生成', value: 'default' },
              branching: { text: '分支', description: '洞穴分支数量', value: 'default' },
              loop: { text: '环路', description: '环路数量', value: 'default' },
              caves: { text: '洞穴密度', description: '洞穴密度', value: 'default' }
            }
          }
        }
      };
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
    },
    
    // 获取默认森林世界覆盖设置
    getDefaultForestOverrides() {
      return this.extractAllSettings('forest');
    },
    
    // 获取默认洞穴世界覆盖设置
    getDefaultCaveOverrides() {
      return this.extractAllSettings('cave');
    }
  }
}
</script>

<style scoped>
.world-settings-container {
  padding: 20px;
  padding-bottom: 100px; /* 为固定底栏留出空间 */
  background-color: #f8f9fc;
  min-height: calc(100vh - 120px);
}

.settings-card {
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05) !important;
  border: none;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.header-title i {
  font-size: 24px;
  color: #409EFF;
}

.header-title h2 {
  margin: 0;
  font-size: 20px;
  color: #303133;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.custom-tabs {
  margin-top: 20px;
  border-radius: 8px;
  overflow: hidden;
}

.tab-header-content {
  display: flex;
  margin-bottom: 20px;
  padding: 15px;
  background-color: rgba(64, 158, 255, 0.1);
  border-radius: 8px;
  align-items: center;
}

.world-icon {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  margin-right: 15px;
  background-size: cover;
  background-position: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}

.forest-icon {
  background-color: #67c23a;
}

.forest-icon::before {
  content: "\e93d";
  font-family: element-icons !important;
  font-size: 30px;
  color: #fff;
}

.cave-icon {
  background-color: #909399;
}

.cave-icon::before {
  content: "\e904";
  font-family: element-icons !important;
  font-size: 30px;
  color: #fff;
}

.world-description h3 {
  margin: 0 0 5px 0;
  font-size: 18px;
}

.world-description p {
  margin: 0;
  color: #606266;
  font-size: 14px;
}

.loading-container, .empty-state {
  padding: 30px;
  text-align: center;
}

.add-world-tab {
  display: flex;
  align-items: center;
  gap: 5px;
  color: #409EFF;
  cursor: pointer;
  padding: 0 10px;
}

.add-world-tab:hover {
  color: #66b1ff;
}

.world-delete-icon {
  margin-left: 8px;
  font-size: 12px;
  color: #909399;
  cursor: pointer;
}

.world-delete-icon:hover {
  color: #F56C6C;
}

.server-ini-form {
  padding: 20px;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.server-ini-form h3 {
  margin-top: 20px;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid #ebeef5;
  color: #409EFF;
}

.server-ini-form h3:first-child {
  margin-top: 0;
}

.settings-tabs {
  margin-bottom: 20px;
}
</style>