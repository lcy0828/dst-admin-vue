<template>
  <div class="world-settings-container">
    <el-card class="settings-card" shadow="hover">
      <div slot="header" class="card-header">
        <div class="header-title">
          <i class="el-icon-earth"></i>
          <h2>世界设置</h2>
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
        <el-tab-pane label="森林" name="forest">
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

        <el-tab-pane label="洞穴" name="cave">
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
  </div>
</template>

<script>
import Vue from 'vue';
import WorldSettingsPanel from '@/components/worlds/WorldSettingsPanel.vue';
import SettingsFooter from '@/components/worlds/SettingsFooter.vue';

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
      }
    }
  },
  created() {
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
      // 切换标签页时，重新检查变更
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
      return this.activeTab === 'forest' ? 
        this.filteredForestSettings : 
        this.filteredCaveSettings;
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
      fetch('/static/json/dst_world_setting_zh.json')
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
        })
        .catch(error => {
          console.error('加载本地设置失败:', error);
          this.$message.error('加载设置失败');
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
      const worldType = this.activeTab;
      
      // 准备要保存的数据，只包含已修改的部分
      const changedSettings = this.prepareChangedSettings();
      
      // 调用API保存设置
      this.$api.roomApi.saveWorldSettings(worldType, changedSettings)
        .then(response => {
          this.$message.success(`${worldType === 'forest' ? '森林' : '洞穴'}世界设置保存成功`);
          
          // 更新原始设置
          if (worldType === 'forest') {
            this.originalSettings.forest = JSON.parse(JSON.stringify(this.forestSettings));
          } else {
            this.originalSettings.cave = JSON.parse(JSON.stringify(this.caveSettings));
          }
          
          // 清除变更状态和缓存
          this.hasChanges = false;
          this.changedItemsCache = null;
          
          // 重建缓存
          this.buildCaches();
        })
        .catch(error => {
          console.error(`保存${worldType === 'forest' ? '森林' : '洞穴'}世界设置失败:`, error);
          this.$message.error(`保存${worldType === 'forest' ? '森林' : '洞穴'}世界设置失败`);
        })
        .finally(() => {
          this.saveLoading = false;
        });
    },
    prepareChangedSettings() {
      const worldType = this.activeTab;
      const result = {};
      
      // 获取已修改的项目
      const changedItems = this.getChangedItems();
      if (changedItems.length === 0) {
        // 如果没有修改，直接返回完整设置
        result[worldType] = this.activeTab === 'forest' ? 
          this.forestSettings : this.caveSettings;
        return result;
      }
      
      // 创建一个最小化的设置对象，只包含变更的项
      const minimalSettings = { ...this.activeSettings };
      
      // TODO: 由于API可能需要完整结构，这里返回完整设置
      // 如果API支持增量更新，可以进一步优化此处逻辑
      
      result[worldType] = minimalSettings;
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
      const activeSettings = this.activeTab === 'forest' ? this.forestSettings : this.caveSettings;
      const originalSettings = this.activeTab === 'forest' ? this.originalSettings.forest : this.originalSettings.cave;
      
      if (!activeSettings || !originalSettings) return [];
      
      // 使用之前建立的缓存优化查找
      const worldType = this.activeTab;
      
      // 遍历活动设置，找出与默认值不同的项
      this.traverseSettings(activeSettings, (item, itemKey, path) => {
        const defaultValue = this.defaultValueCache[`${worldType}_${itemKey}`];
        
        // 如果没有默认值记录，或者值不同，则添加到变更列表
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
</style>