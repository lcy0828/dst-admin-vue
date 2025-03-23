<template>
  <el-dialog
    :visible.sync="dialogVisible"
    :title="`模组配置 - ${modInfo ? modInfo.name || '未命名模组' : '加载中...'}`"
    class="mod-config-dialog"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    :before-close="handleClose"
    width="50%"
    :append-to-body="true"
    :destroy-on-close="true"
    align-center
  >
    
    <!-- 配置容器 -->
    <div class="config-container">
      <!-- 模组基本信息 -->
      <div v-if="modInfo" class="mod-info-section">
        <div class="mod-info-header">
          <el-image 
            :src="modInfo.iconUrl || defaultIcon" 
            fit="cover"
            class="mod-icon">
            <div slot="error" class="image-slot">
              <i class="el-icon-picture-outline"></i>
            </div>
          </el-image>
          
          <div class="mod-info-details">
            <h2 class="mod-name">{{ modInfo.name }}</h2>
            <div class="mod-meta">
              <span class="mod-author">
                <i class="el-icon-user"></i> {{ modInfo.author }}
              </span>
              <span class="mod-version">
                <i class="el-icon-info"></i> v{{ modInfo.version }}
              </span>
            </div>
            <div class="mod-description" v-if="modInfo.description">
              {{ modInfo.description || '暂无描述' }}
            </div>
          </div>
        </div>
      </div>
      
      <!-- 配置选项 -->
      <div v-if="hasOptions" class="config-options-section">
        <div class="options-header">
          <h3 class="section-title">配置选项</h3>
          <div class="section-actions">
            <el-button size="small" type="text" @click="resetToDefault">
              <i class="el-icon-refresh-left"></i> 重置为默认配置
            </el-button>
          </div>
        </div>
        
        <!-- 搜索和过滤 -->
        <div class="filter-container" v-if="filteredCategories.length > 3">
          <el-input
            v-model="searchQuery"
            placeholder="搜索配置选项..."
            prefix-icon="el-icon-search"
            clearable
            size="small"
            class="search-input">
          </el-input>
        </div>
        
        <!-- 配置选项列表 -->
        <div class="config-list-container">
          <div v-if="loading" class="loading-indicator">
            <p class="loading-text">正在加载模组配置...</p>
            <div class="loading-spinner"></div>
          </div>
          
          <el-collapse v-else v-model="activeCategories">
            <el-collapse-item 
              v-for="(category, categoryIndex) in filteredCategories" 
              :key="categoryIndex"
              :name="categoryIndex">
              <template slot="title">
                <span class="category-title" style="font-weight: bold;">{{ category.name }}</span>
              </template>
              
              <div class="category-options">
                <el-form :model="configForm" label-width="150px" size="small">
                  <el-form-item 
                    v-for="option in category.options" 
                    :key="option.name" 
                    :label="option.label"
                    class="config-form-item">
                    
                    <!-- 配置说明提示 -->
                    <el-tooltip 
                      v-if="option.hover" 
                      class="item" 
                      effect="dark" 
                      :content="option.hover" 
                      placement="top">
                      <i class="el-icon-question option-tooltip"></i>
                    </el-tooltip>
                    
                    <!-- 调试信息 -->
                    <span v-if="debug" class="debug-info">
                      {{option.name}}: {{configForm[option.name]}} ({{typeof configForm[option.name]}})
                    </span>
                    
                    <div class="option-control-wrapper">
                      <!-- 开关类型 -->
                      <template v-if="isBooleanOption(option)">
                        <el-switch
                          v-model="configForm[option.name]"
                          @change="handleConfigChange(option.name)"
                          class="switch-option">
                        </el-switch>
                        <span class="option-value-text">{{ getOptionLabel(option, configForm[option.name]) }}</span>
                      </template>
                      
                      <!-- 单选类型 -->
                      <template v-else-if="isRadioOption(option)">
                        <el-radio-group 
                          v-model="configForm[option.name]" 
                          @change="handleConfigChange(option.name)"
                          class="radio-options">
                          <el-radio 
                            v-for="(opt, idx) in option.options" 
                            :key="idx" 
                            :label="opt.data">
                            {{ opt.description }}{{ isDefaultOption(option, opt.data) && !hasDefaultText(opt.description) ? ' (默认)' : '' }}
                          </el-radio>
                        </el-radio-group>
                      </template>
                      
                      <!-- 下拉选择类型 -->
                      <template v-else-if="option.options && option.options.length > 0">
                        <el-select 
                          v-model="configForm[option.name]" 
                          @change="handleConfigChange(option.name)"
                          class="option-select">
                          <el-option
                            v-for="(opt, idx) in option.options"
                            :key="idx"
                            :label="opt.description + (isDefaultOption(option, opt.data) && !hasDefaultText(opt.description) ? ' (默认)' : '')"
                            :value="opt.data">
                          </el-option>
                        </el-select>
                      </template>
                      
                      <!-- 普通输入框 -->
                      <template v-else>
                        <el-input 
                          v-model="configForm[option.name]" 
                          @change="handleConfigChange(option.name)"
                          class="option-input" />
                      </template>
                    </div>
                  </el-form-item>
                </el-form>
              </div>
            </el-collapse-item>
          </el-collapse>
        </div>
      </div>
      
      <!-- 无配置选项提示 -->
      <div v-if="!loading && !hasOptions && modInfo" class="no-options">
        <el-empty description="该模组没有配置选项" :image-size="150"></el-empty>
      </div>
      
      <!-- 轻量级加载提示 -->
      <div v-if="!modInfo" class="initial-loading">
        <i class="el-icon-loading"></i>
        <p>加载模组信息中...</p>
      </div>
    </div>
    
    <span slot="footer" class="dialog-footer">
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" @click="saveConfig" :loading="saving">保存配置</el-button>
    </span>
  </el-dialog>
</template>

<script>
import { modApi } from '@/api';

export default {
  name: 'ModConfigDialog',
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    modId: {
      type: String,
      default: null
    },
    modInfo: {
      type: Object,
      default: null
    },
    isNewMod: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      // 弹窗可见状态
      dialogVisible: false,
      // 加载状态
      loading: false,
      saving: false,
      // 配置表单
      configForm: {},
      // 原始配置，用于重置
      originalConfig: {},
      // 默认配置，用于重置为默认值
      defaultConfig: {},
      // 搜索查询
      searchQuery: '',
      // 默认图标
      defaultIcon: 'https://placehold.co/200x200/409EFF/white?text=MOD',
      // 当前展开的分类
      activeCategories: [],
      // 调试模式
      debug: false,
      // 是否已初始化
      isInitialized: false,
      // 防止对话框自动关闭
      keepAliveInterval: null
    };
  },
  computed: {
    // 是否有配置选项
    hasOptions() {
      return this.modInfo && 
        this.modInfo.configuration_options && 
        this.modInfo.configuration_options.length > 0;
    },
    
    // 按分类整理的配置选项
    categorizedOptions() {
      if (!this.modInfo || !this.modInfo.configuration_options) return [];
      
      const result = [];
      let currentCategory = { name: '基本设置', options: [] };
      
      // 确保configuration_options存在并且是数组
      const configOptions = Array.isArray(this.modInfo.configuration_options) ? 
        this.modInfo.configuration_options : [];
      
      console.log('计算分类选项 - 总数:', configOptions.length);
      
      // 遍历所有选项进行分类
      configOptions.forEach((option, index) => {
        // 如果是空选项或没有name属性，跳过
        if (!option || !option.name) {
          return;
        }
        
        // 调试输出
        console.log(`选项[${index}] ${option.name}(${option.label || '无标签'}): ${option.name === 'Title' || option.name === 'null' ? '分类标题' : '配置项'}`);
        
        // 判断是否是分类标题
        if (option.name === "Title" || option.name === "null") {
          // 将之前的分类添加到结果中(如果有选项)
          if (currentCategory.options.length > 0) {
            result.push({...currentCategory});
            console.log(`添加分类: ${currentCategory.name} 包含 ${currentCategory.options.length} 个选项`);
          }
          
          // 创建新分类
          currentCategory = {
            name: option.label || '其他设置',
            options: []
          };
        } else {
          // 普通选项，添加到当前分类
          // 确保选项有label属性
          if (!option.label && option.name) {
            option.label = option.name;
          }
          
          currentCategory.options.push(option);
        }
      });
      
      // 添加最后一个分类(如果有选项)
      if (currentCategory.options.length > 0) {
        result.push(currentCategory);
        console.log(`添加最后分类: ${currentCategory.name} 包含 ${currentCategory.options.length} 个选项`);
      }
      
      return result;
    },
    
    // 添加分类和搜索过滤
    filteredCategories() {
      // 如果没有搜索查询，返回所有分类
      if (!this.searchQuery.trim()) {
        return this.categorizedOptions;
      }
      
      const query = this.searchQuery.trim().toLowerCase();
      
      // 过滤包含查询词的选项
      return this.categorizedOptions.map(category => {
        const filteredOptions = category.options.filter(option => {
          // 检查名称、标签、悬停提示
          return (option.name && option.name.toLowerCase().includes(query)) ||
                 (option.label && option.label.toLowerCase().includes(query)) ||
                 (option.hover && option.hover.toLowerCase().includes(query));
        });
        
        // 如果该分类有匹配的选项，返回过滤后的分类
        if (filteredOptions.length > 0) {
          return {
            name: category.name, 
            options: filteredOptions 
          };
        }
        
        return null;
      }).filter(Boolean);
    }
  },
  watch: {
    visible(newVal) {
      this.dialogVisible = newVal;
      if (newVal) {
        // 在visible变为true时初始化配置，用$nextTick确保DOM已更新
        this.$nextTick(() => {
          console.log('弹窗显示，开始初始化');
          this.initializeConfig();
          // 添加保持对话框活跃的定时器
          this.setupKeepAliveTimer();
        });
      } else {
        // 清除定时器
        this.clearKeepAliveTimer();
        // 当对话框关闭时重置初始化状态，以便下次打开可以重新初始化
        this.isInitialized = false;
      }
    },
    dialogVisible(newVal) {
      if (!newVal) {
        this.$emit('update:visible', false);
        // 清除定时器
        this.clearKeepAliveTimer();
        // 当对话框关闭时重置初始化状态，以便下次打开可以重新初始化
        this.isInitialized = false;
      } else {
        // 如果对话框变为可见状态，确保定时器已设置
        this.setupKeepAliveTimer();
      }
    },
    filteredCategories: {
      handler(newCategories) {
        if (newCategories.length > 0 && this.activeCategories.length === 0) {
          this.activeCategories = [0];
        }
      },
      immediate: true
    }
  },
  methods: {
    // 重置组件状态
    resetComponentState() {
      console.log('重置组件状态');
      this.isInitialized = false;
      this.loading = false;
      this.saving = false;
      this.configForm = {};
      this.originalConfig = {};
      this.defaultConfig = {};
      this.searchQuery = '';
      this.activeCategories = [];
      // 清除定时器
      this.clearKeepAliveTimer();
    },

    // 判断描述中是否已包含"默认"字样
    hasDefaultText(description) {
      if (!description) return false;
      // 确保description是字符串类型
      if (typeof description !== 'string') return false;
      return description.includes('默认');
    },

    // 设置保持对话框活跃的定时器
    setupKeepAliveTimer() {
      // 先清除可能存在的旧定时器
      this.clearKeepAliveTimer();
      
      // 设置新的定时器，每5秒触发一次保持对话框活跃
      this.keepAliveInterval = setInterval(() => {
        console.log('保持对话框活跃...');
        // 如果对话框不再可见，清除定时器
        if (!this.dialogVisible) {
          this.clearKeepAliveTimer();
        }
      }, 5000);
      
      console.log('设置了对话框保活定时器');
    },
    
    // 清除保持对话框活跃的定时器
    clearKeepAliveTimer() {
      if (this.keepAliveInterval) {
        clearInterval(this.keepAliveInterval);
        this.keepAliveInterval = null;
        console.log('清除了对话框保活定时器');
      }
    },

    // 初始化配置
    initializeConfig() {
      // 如果已经初始化过，则不重复执行
      if (this.isInitialized) {
        console.log('已初始化过，跳过重复初始化');
        return;
      }
      
      console.log('开始初始化配置');
      // 设置初始化标志位，防止重复请求
      this.isInitialized = true;
      this.loading = true;
      this.searchQuery = '';
      
      // 清空配置表单
      this.configForm = {};
      this.originalConfig = {};
      this.defaultConfig = {};
      
      try {
        // 如果已经有模组信息，先初始化配置选项
        if (this.modInfo && this.modInfo.configuration_options) {
          console.log('从模组信息初始化配置');
          this.initializeConfigFromData(this.modInfo.configuration_options);
        }
        
        // 如果不是新模组，可以从API获取保存的配置
        if (this.modId) {
          this.fetchSavedConfig();
        } else {
          this.loading = false;
          
          // 延迟设置所有分类展开，确保categorizedOptions已计算完成
          this.$nextTick(() => {
            this.setAllCategoriesExpanded();
          });
        }
      } catch (error) {
        console.error('初始化配置出错:', error);
        this.loading = false;
        this.$message.error('模组配置初始化失败');
        // 如果初始化失败，重置初始化标志，以便下次可以重试
        this.isInitialized = false;
      }
    },
    
    // 添加新方法用于从配置数据初始化表单
    initializeConfigFromData(configOptions) {
      if (!configOptions || !Array.isArray(configOptions)) {
        console.warn('配置选项不存在或不是数组');
        return;
      }
      
      // 初始化配置表单
      configOptions.forEach(option => {
        // 跳过分类标题或没有名称的选项
        if (!option.name || option.name === "Title" || option.name === "null") {
          return;
        }
        
        try {
          // 处理数字、字符串、布尔值等不同类型的数据
          const parsedValue = this.parseOptionValue(option.default);
          console.log(`初始化选项: ${option.name}, 默认值: ${option.default} => ${parsedValue} (${typeof parsedValue})`);
          
          this.configForm[option.name] = parsedValue;
          this.originalConfig[option.name] = parsedValue;
          this.defaultConfig[option.name] = parsedValue;
        } catch (error) {
          console.error(`处理选项 ${option.name} 出错:`, error);
        }
      });
      
      // 确保更新是响应式的
      this.configForm = {...this.configForm};
      this.originalConfig = {...this.originalConfig};
      this.defaultConfig = {...this.defaultConfig};
    },
    
    // 获取保存的配置
    fetchSavedConfig() {
      if (!this.modId) {
        this.loading = false;
        return;
      }
      
      // 准备请求参数
      const requestData = {
        modid: this.modId,
        refresh: "true",
        version: this.modInfo?.version || ""
      };
      
      console.log('请求模组配置参数:', requestData);
      
      // 使用全局API接口
      modApi.getModConfig(this.modId, requestData)
        .then(data => {
          console.log('接口返回数据:', data ? '成功' : '失败');
          
          // 更新模组信息
          if (data && data.modinfo) {
            // 更新模组信息，确保使用接口返回的最新数据
            this.$emit('update-mod-info', data.modinfo);
            // 更新本地模组信息
            this.modInfo = data.modinfo;
            
            // 重置配置表单
            this.configForm = {};
            this.originalConfig = {};
            this.defaultConfig = {};
            
            // 确保configuration_options存在并且是数组
            const configOptions = data.modinfo.configuration_options || [];
            
            console.log('配置选项数量:', configOptions.length);
            
            // 初始化配置表单为默认值
            configOptions.forEach(option => {
              if (option.name && option.name !== "Title") {
                // 处理数字、字符串、布尔值等不同类型的数据
                this.configForm[option.name] = this.parseOptionValue(option.default);
                this.originalConfig[option.name] = this.parseOptionValue(option.default);
                this.defaultConfig[option.name] = this.parseOptionValue(option.default);
              }
            });
            
            // 如果有保存的配置值，覆盖默认值
            if (data.config) {
              console.log('覆盖保存的配置');
              Object.keys(data.config).forEach(key => {
                this.configForm[key] = this.parseOptionValue(data.config[key]);
                this.originalConfig[key] = this.parseOptionValue(data.config[key]);
              });
            }
            
            // 确保更新是响应式的
            this.configForm = {...this.configForm};
            this.originalConfig = {...this.originalConfig};
            
            // 设置所有分类展开
            this.$nextTick(() => {
              this.setAllCategoriesExpanded();
            });
          } else {
            this.$message.error('模组配置数据格式错误');
          }
        })
        .catch(error => {
          console.error('获取模组配置错误:', error);
          this.$message({
            type: 'error',
            message: '获取模组配置失败，使用默认配置'
          });
          // 如果请求失败，重置初始化标志，以便下次可以重试
          this.isInitialized = false;
        })
        .finally(() => {
          this.loading = false;
        });
    },
    
    // 添加辅助方法来解析不同类型的配置值
    parseOptionValue(value) {
      // 如果值是 undefined 或 null，直接返回
      if (value === undefined || value === null) {
        return value;
      }
      
      try {
        // 处理布尔值（字符串形式）
        if (typeof value === 'string') {
          const lowerValue = value.toLowerCase();
          if (lowerValue === 'true') return true;
          if (lowerValue === 'false') return false;
          
          // 处理数字字符串
          if (!isNaN(value) && value !== '') {
            // 检查是否是整数
            const num = Number(value);
            return num;
          }
        }
        
        // 其他类型保持不变
        return value;
      } catch (error) {
        console.error('解析配置值出错:', error, value);
        return value;
      }
    },
    
    // 判断是否是布尔选项（开关类型）
    isBooleanOption(option) {
      if (!option.options || !Array.isArray(option.options) || option.options.length !== 2) {
        return false;
      }
      
      // 将数据值转换为字符串进行比较
      const values = option.options.map(opt => String(opt.data).toLowerCase());
      const hasTrue = values.includes('true');
      const hasFalse = values.includes('false');
      
      const isBool = hasTrue && hasFalse;
      console.log(`选项类型: ${option.name} - 值集合: [${values.join(', ')}] - ${isBool ? '布尔开关' : '不是布尔'}`);
      
      return isBool;
    },
    
    // 判断是否是单选选项（选项较少时适合）
    isRadioOption(option) {
      const isRadio = option.options && 
        Array.isArray(option.options) &&
        option.options.length > 0 && 
        option.options.length <= 5;
        
      console.log(`选项类型: ${option.name} - ${isRadio ? '单选按钮' : '不是单选'}`);
      return isRadio;
    },
    
    // 判断是否是默认选项
    isDefaultOption(option, value) {
      return option.default === value;
    },
    
    // 获取开关选项的显示文本
    getOptionLabel(option, isActive) {
      if (!option.options || option.options.length < 2) return '';
      
      const activeOpt = option.options.find(opt => opt.data === true || opt.data === 'true');
      const inactiveOpt = option.options.find(opt => opt.data === false || opt.data === 'false');
      
      let text;
      if (isActive) {
        text = activeOpt ? activeOpt.description : '是';
        // 如果是默认值并且描述中没有"默认"字样，添加(默认)标记
        if ((option.default === true || option.default === 'true') && activeOpt && !this.hasDefaultText(activeOpt.description)) {
          text += ' (默认)';
        }
      } else {
        text = inactiveOpt ? inactiveOpt.description : '否';
        // 如果是默认值并且描述中没有"默认"字样，添加(默认)标记
        if ((option.default === false || option.default === 'false') && inactiveOpt && !this.hasDefaultText(inactiveOpt.description)) {
          text += ' (默认)';
        }
      }
      
      return text;
    },
    
    // 重置为默认配置
    resetToDefault() {
      this.$confirm('确定要重置所有配置为默认值吗？', '确认重置', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        this.configForm = JSON.parse(JSON.stringify(this.defaultConfig));
        this.$message({
          type: 'success',
          message: '配置已重置为默认值'
        });
      }).catch(() => {});
    },
    
    // 保存配置
    saveConfig() {
      // 如果已经在保存中，不重复提交
      if (this.saving) {
        console.log('保存请求已在进行中，跳过');
        return;
      }
      
      this.saving = true;
      
      // 准备提交的数据
      const submitData = {
        modid: this.modId,
        refresh: "false",
        version: this.modInfo?.version || "",
        config: this.prepareConfigForSubmit(this.configForm)
      };
      
      console.log('提交配置数据:', submitData.modid);
      
      // 使用全局API接口
      modApi.updateModConfig(this.modId, submitData)
        .then(data => {
          console.log('保存配置返回:', data ? '成功' : '失败');
          
          // 更新原始配置
          this.originalConfig = JSON.parse(JSON.stringify(this.configForm));
          
          // 通知父组件配置已更新
          this.$emit('config-updated', {
            modId: this.modId,
            configData: this.configForm
          });
          
          // 关闭对话框
          this.dialogVisible = false;
          
          // 显示成功提示
          this.$message({
            type: 'success',
            message: '配置已保存'
          });
        })
        .catch(error => {
          console.error('保存模组配置错误:', error);
          this.$message({
            type: 'error',
            message: '保存模组配置失败'
          });
        })
        .finally(() => {
          this.saving = false;
        });
    },
    
    // 添加新方法用于准备提交的配置数据
    prepareConfigForSubmit(configData) {
      const result = {};
      
      // 遍历配置数据，确保数据类型正确
      Object.keys(configData).forEach(key => {
        const value = configData[key];
        
        // 找到对应的选项定义
        const option = this.findOptionByName(key);
        if (option && option.options && option.options.length > 0) {
          // 确保提交的值匹配选项中的数据类型
          const matchingOption = option.options.find(opt => opt.data === value);
          if (matchingOption) {
            result[key] = matchingOption.data;
          } else {
            // 如果没有找到匹配的选项，使用原始值
            result[key] = value;
          }
        } else {
          // 如果没有找到选项定义，使用原始值
          result[key] = value;
        }
      });
      
      return result;
    },
    
    // 添加新方法用于查找选项定义
    findOptionByName(name) {
      if (!this.modInfo || !this.modInfo.configuration_options) {
        return null;
      }
      
      return this.modInfo.configuration_options.find(option => option.name === name);
    },
    
    // 关闭对话框
    handleClose() {
      // 检查是否有未保存的更改
      let hasChanges = false;
      
      for (const key in this.configForm) {
        if (this.configForm[key] !== this.originalConfig[key]) {
          hasChanges = true;
          break;
        }
      }
      
      if (hasChanges) {
        this.$confirm('您有未保存的配置更改，确定要关闭吗？', '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }).then(() => {
          this.dialogVisible = false;
          // 清除定时器
          this.clearKeepAliveTimer();
        }).catch(() => {
          // 用户取消关闭
        });
      } else {
        this.dialogVisible = false;
        // 清除定时器
        this.clearKeepAliveTimer();
      }
    },
    
    // 添加handleConfigChange方法，用于跟踪表单更改
    handleConfigChange(optionName) {
      console.log(`配置项变更: ${optionName} => ${JSON.stringify(this.configForm[optionName])}`);
    },
    
    // 添加设置所有分类展开的方法
    setAllCategoriesExpanded() {
      if (this.categorizedOptions && this.categorizedOptions.length > 0) {
        // 设置所有分类展开
        this.activeCategories = this.categorizedOptions.map((_, index) => index);
        console.log('所有分类已设置为展开状态:', this.activeCategories);
      }
    }
  },
  mounted() {
    // 确保所有分类展开
    this.$nextTick(() => {
      this.setAllCategoriesExpanded();
    });
  },
  beforeDestroy() {
    // 组件销毁前重置状态
    this.resetComponentState();
  }
};
</script>

<style scoped>

.config-container {
  min-height: 200px;
  padding-right: 5px;
}

.mod-info-section {
  margin-bottom: 15px;
  padding-bottom: 15px;
  border-bottom: 1px solid #EBEEF5;
  background-color: #f9fafc;
  border-radius: 8px;
  padding: 15px;
}

.mod-info-header {
  display: flex;
  align-items: flex-start;
}

.mod-icon {
  width: 80px;
  height: 80px;
  margin-right: 15px;
  border-radius: 6px;
  box-shadow: 0 0 8px rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
}

.image-slot {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  color: #909399;
  font-size: 20px;
  background-color: #f6f8fa;
}

.mod-info-details {
  flex: 1;
}

.mod-name {
  margin: 0 0 8px 0;
  font-size: 20px;
  color: #303133;
  font-weight: 600;
}

.mod-meta {
  display: flex;
  flex-wrap: wrap;
  margin-bottom: 8px;
  font-size: 13px;
  color: #606266;
}

.mod-author, .mod-version {
  margin-right: 15px;
  display: flex;
  align-items: center;
  background: #f0f2f5;
  padding: 2px 8px;
  border-radius: 10px;
}

.mod-author i, .mod-version i {
  margin-right: 4px;
}

.mod-description {
  font-size: 13px;
  color: #606266;
  line-height: 1.5;
  max-height: 60px;
  overflow-y: auto;
  padding-right: 5px;
}

.options-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding: 8px 0;
  border-bottom: 1px solid #EBEEF5;
}

.section-title {
  margin: 0;
  font-size: 16px;
  color: #303133;
  font-weight: 600;
}

.filter-container {
  margin-bottom: 12px;
}

.search-input {
  max-width: 300px;
}

.config-list-container {
  width: 100%;
}

.category-title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}

.category-options {
  padding: 10px 0;
}

.config-form-item {
  margin-bottom: 15px;
  position: relative;
  border-bottom: 1px dashed #f0f0f0;
  padding-bottom: 10px;
}

.config-form-item:last-child {
  border-bottom: none;
}

.config-form-item .el-form-item__label {
  font-weight: normal;
  color: #606266;
  font-size: 13px;
}

.option-tooltip {
  position: absolute;
  top: 10px;
  right: 10px;
  color: #909399;
  cursor: pointer;
  font-size: 14px;
}

.option-tooltip:hover {
  color: #409EFF;
}

.option-control-wrapper {
  max-width: 450px;
}

.switch-option {
  margin-top: 0;
  vertical-align: middle;
}

.option-value-text {
  margin-left: 8px;
  font-size: 13px;
  color: #606266;
  vertical-align: middle;
}

.option-select, .option-input {
  width: 100%;
  max-width: 300px;
}

.radio-options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 0;
}

.radio-options .el-radio {
  margin-right: 0;
  margin-bottom: 5px;
  padding: 5px 10px;
  border: 1px solid #DCDFE6;
  border-radius: 4px;
}

.radio-options .el-radio.is-checked {
  background-color: #F5F7FA;
  border-color: #409EFF;
}

.no-options {
  padding: 30px 0;
  text-align: center;
}

.el-collapse-item__header {
  font-weight: bold;
  background-color: #f5f7fa;
  border-left: 3px solid #409EFF;
  padding-left: 10px;
  border-radius: 4px;
  margin-bottom: 5px;
}

.el-collapse-item__content {
  padding: 15px;
  background-color: #fafbfc;
  border-radius: 0 0 4px 4px;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .mod-info-header {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
  
  .mod-icon {
    margin: 0 0 10px 0;
  }
  
  .mod-meta {
    justify-content: center;
  }
  
  .config-form-item .el-form-item__label {
    float: none;
    display: block;
    text-align: left;
    padding: 0 0 8px;
    width: 100% !important;
  }
  
  .config-form-item .el-form-item__content {
    margin-left: 0 !important;
  }
  
  .radio-options {
    flex-direction: column;
  }
}

.loading-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 30px 0;
  color: #606266;
}

.loading-text {
  margin-bottom: 15px;
  font-size: 14px;
}

.loading-spinner {
  width: 30px;
  height: 30px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #409EFF;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.initial-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 50px 0;
  color: #606266;
}

.initial-loading i {
  font-size: 32px;
  margin-bottom: 15px;
  color: #409EFF;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style> 