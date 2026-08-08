<template>
  <el-dialog
    v-model="dialogVisible"
    :title="`模组配置 - ${modInfo ? modInfo.name || '未命名模组' : '加载中...'}`"
    class="mod-config-dialog"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    :before-close="handleClose"
    width="55%"
    :append-to-body="true"
    :destroy-on-close="true"
  >
    <!-- 简化的配置容器 -->
    <div class="config-container">
      <!-- 加载指示器 -->
      <div v-if="loading" class="loading-container">
        <component :is="'el-icon-loading'" class="legacy-icon" />
        <p>加载模组配置中...</p>
      </div>
      
      <!-- 配置选项列表 -->
      <template v-else-if="modInfo">
        <!-- 重置按钮 -->
        <div class="reset-button-container" v-if="hasOptions">
          <el-button size="small" type="text" @click="resetToDefault" class="reset-button">
            <component :is="'el-icon-refresh-left'" class="legacy-icon" /> 重置为默认配置
          </el-button>
        </div>
        
        <!-- 配置内容区域（包含描述和选项，共享一个滚动条） -->
        <div class="config-scroll-area">
          <!-- 模组描述 -->
          <div class="mod-description" v-if="modInfo.description">
            <div class="description-header">
              <component :is="'el-icon-info-circle'" class="legacy-icon" />
              <span>模组描述</span>
            </div>
            <div class="description-content">
              {{ modInfo.description || '该模组暂无描述' }}
            </div>
          </div>
          
          <!-- 配置表单 -->
          <el-form v-if="hasOptions" :model="configForm" label-width="180px" size="small" class="config-form">
            <el-form-item 
              v-for="option in allOptions" 
              :key="option.name" 
              :label="option.label"
              class="config-form-item">
              
              <!-- 开关类型 -->
              <template v-if="isBooleanOption(option)">
                <div class="option-control-wrapper">
                  <el-switch
                    v-model="configForm[option.name]"
                    @change="handleConfigChange(option.name)"
                    active-color="#13ce66"
                    inactive-color="#ff4949">
                  </el-switch>
                  <span class="option-value-text">{{ configForm[option.name] ? '开启' : '关闭' }}</span>
                  
                  <!-- 配置提示 -->
                  <el-tooltip 
                    v-if="option.hover" 
                    class="item" 
                    effect="dark" 
                    :content="option.hover" 
                    placement="top">
                    <component :is="'el-icon-question'" class="legacy-icon option-tooltip" />
                  </el-tooltip>
                </div>
              </template>
              
              <!-- 下拉选择类型 -->
              <template v-else-if="option.options && option.options.length > 0">
                <div class="option-control-wrapper">
                  <el-select 
                    v-model="configForm[option.name]" 
                    @change="handleConfigChange(option.name)"
                    class="option-select">
                    <el-option
                      v-for="(opt, idx) in option.options"
                      :key="idx"
                      :label="opt.description"
                      :value="opt.data">
                    </el-option>
                  </el-select>
                  
                  <!-- 配置提示 -->
                  <el-tooltip 
                    v-if="option.hover" 
                    class="item" 
                    effect="dark" 
                    :content="option.hover" 
                    placement="top">
                    <component :is="'el-icon-question'" class="legacy-icon option-tooltip" />
                  </el-tooltip>
                </div>
              </template>
              
              <!-- 普通输入框 -->
              <template v-else>
                <div class="option-control-wrapper">
                  <el-input
                    :model-value="configForm[option.name]"
                    @update:model-value="value => updateTextOption(option, value)"
                    @change="handleConfigChange(option.name)"
                    class="option-input" />
                  
                  <!-- 配置提示 -->
                  <el-tooltip 
                    v-if="option.hover" 
                    class="item" 
                    effect="dark" 
                    :content="option.hover" 
                    placement="top">
                    <component :is="'el-icon-question'" class="legacy-icon option-tooltip" />
                  </el-tooltip>
                </div>
              </template>
            </el-form-item>
          </el-form>
          
          <!-- 无配置选项提示 -->
          <div v-if="!hasOptions" class="no-options">
            <el-empty description="该模组没有配置选项" :image-size="100"></el-empty>
          </div>
        </div>
      </template>
      
      <!-- 无模组信息提示 -->
      <div v-else class="no-mod-info">
        <el-empty description="无法加载模组信息" :image-size="100"></el-empty>
      </div>
    </div>
    
    <!-- 底部按钮 -->
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button type="primary" @click="saveConfig" :loading="saving">保存配置</el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script>
import { modApi } from '@/api';

export default {
  name: 'ModConfigDialog',
  props: {
    modelValue: {
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
    },
    roomId: {
      type: String,
      default: ''
    },
    worldId: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      dialogVisible: false,
      loading: false,
      saving: false,
      configForm: {},
      originalConfig: {},
      defaultConfig: {},
      userCustomConfig: {},
      configRevision: '',
      configuredEnabled: true,
      isInitialized: false,
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
    
    // 所有配置选项(已扁平化)
    allOptions() {
      if (!this.hasOptions) return [];
      return this.modInfo.configuration_options.filter(option => 
        option.name && option.name !== "Title" && option.name !== "null"
      );
    }
  },
  watch: {
    modelValue(newVal) {
      this.dialogVisible = newVal;
      if (newVal) {
        // 确保在打开对话框时重置状态
        this.resetComponentState();
        this.$nextTick(() => {
          // 如果已有模组信息，立即初始化
          if (this.modInfo) {
            this.initializeConfig();
          }
          this.setupKeepAliveTimer();
        });
      } else {
        this.clearKeepAliveTimer();
      }
    },
    dialogVisible(newVal) {
      if (!newVal) {
        this.$emit('update:modelValue', false);
        this.clearKeepAliveTimer();
      } else {
        this.setupKeepAliveTimer();
      }
    },
    modInfo: {
      handler(newModInfo) {
        if (newModInfo && this.dialogVisible && !this.isInitialized) {
          this.$nextTick(() => {
            this.initializeConfig();
          });
        }
      },
      immediate: true
    }
  },
  methods: {
    // 重置组件状态
    resetComponentState() {
      this.isInitialized = false;
      this.loading = false;
      this.saving = false;
      this.configForm = {};
      this.originalConfig = {};
      this.defaultConfig = {};
      this.userCustomConfig = {};
      this.configRevision = '';
      this.configuredEnabled = true;
      // 清除定时器
      this.clearKeepAliveTimer();
    },
    
    // 设置保持对话框活跃的定时器
    setupKeepAliveTimer() {
      this.clearKeepAliveTimer();
      this.keepAliveInterval = setInterval(() => {
        if (!this.dialogVisible) {
          this.clearKeepAliveTimer();
        }
      }, 5000);
    },
    
    // 清除定时器
    clearKeepAliveTimer() {
      if (this.keepAliveInterval) {
        clearInterval(this.keepAliveInterval);
        this.keepAliveInterval = null;
      }
    },
    
    // 初始化配置
    async initializeConfig() {
      if (this.isInitialized) return;
      if (!this.modInfo) return;
      
      this.isInitialized = true;
      this.loading = true;
      
      this.configForm = {};
      this.originalConfig = {};
      this.defaultConfig = {};
      this.userCustomConfig = {};
      
      try {
        await this.getUserCustomConfig();
        if (this.modInfo.configuration_options) {
          this.initializeConfigFromData(this.modInfo.configuration_options);
        }
      } catch (error) {
        this.isInitialized = false;
      } finally {
        this.loading = false;
      }
    },
    
    // 获取用户自定义配置
    getUserCustomConfig() {
      if (!this.modId) {
        return Promise.resolve();
      }
      
      return modApi.getModCustomConfig({
        roomId: this.roomId,
        worldId: this.worldId,
        modid: this.modId
      })
        .then(res => {
          if (res && res.modinfo && res.modinfo.configuration_options) {
            this.userCustomConfig = res.modinfo.configuration_options;
            this.configRevision = res.modinfo.revision;
            this.configuredEnabled = res.modinfo.enabled;
          }
        })
        .catch(err => {
          console.error('获取用户自定义配置失败', err);
          this.$message.error(`获取用户自定义配置失败：${err.message || '未知错误'}`);
          throw err;
        });
    },
    
    // 从数据初始化配置表单
    initializeConfigFromData(configOptions) {
      if (!Array.isArray(configOptions)) return;
      
      configOptions.forEach(option => {
        if (!option.name || option.name === "Title" || option.name === "null") return;
        
        try {
          const parsedValue = this.parseOptionValue(option.default);
          
          // 检查是否有用户自定义配置
          const hasUserConfig = Object.prototype.hasOwnProperty.call(this.userCustomConfig, option.name);
          const userValue = hasUserConfig ? this.userCustomConfig[option.name] : undefined;
          
          if (userValue !== undefined) {
            // 使用用户自定义配置
            this.configForm[option.name] = userValue;
            this.originalConfig[option.name] = userValue;
            // 默认值仍保留原始默认值
            this.defaultConfig[option.name] = parsedValue;
          } else if (parsedValue === undefined && option.options && option.options.length > 0) {
            const defaultOption = option.options.find(opt => 
              opt.description && opt.description.includes('默认')
            );
            if (defaultOption) {
              this.configForm[option.name] = defaultOption.data;
              this.originalConfig[option.name] = defaultOption.data;
              this.defaultConfig[option.name] = defaultOption.data;
              return;
            }
          } else {
            // 使用默认值
            this.configForm[option.name] = parsedValue;
            this.originalConfig[option.name] = parsedValue;
            this.defaultConfig[option.name] = parsedValue;
          }
        } catch (error) {
          console.error(`解析选项 ${option.name} 的默认值失败`, error);
        }
      });
      
      this.configForm = {...this.configForm};
      this.originalConfig = {...this.originalConfig};
      this.defaultConfig = {...this.defaultConfig};
    },
    
    // 解析配置值
    parseOptionValue(value) {
      if (value === undefined || value === null) return value;
      
      try {
        if (typeof value === 'string') {
          const lowerValue = value.toLowerCase();
          if (lowerValue === 'true') return true;
          if (lowerValue === 'false') return false;
          
          if (!isNaN(value) && value !== '') {
            return Number(value);
          }
        }
        return value;
      } catch (error) {
        return value;
      }
    },
    
    // 判断是否是布尔选项
    isBooleanOption(option) {
      if (option.type === 'boolean') return true;
      if (!option.options || !Array.isArray(option.options) || option.options.length !== 2) {
        return false;
      }
      
      const values = option.options.map(opt => String(opt.data).toLowerCase());
      return values.includes('true') && values.includes('false');
    },

    updateTextOption(option, value) {
      if (option.type === 'number' && value !== '') {
        const numeric = Number(value);
        this.configForm[option.name] = Number.isFinite(numeric) ? numeric : value;
      } else {
        this.configForm[option.name] = value;
      }
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
      if (this.saving) return;
      const prepared = this.prepareConfigForSubmit(this.configForm);
      const changedConfig = Object.fromEntries(
        Object.entries(prepared).filter(([key, value]) =>
          JSON.stringify(value) !== JSON.stringify(this.originalConfig[key])
        )
      );
      const enabled = this.modInfo?.configuration?.enabled ?? this.configuredEnabled;
      if (Object.keys(changedConfig).length === 0 && enabled === this.configuredEnabled) {
        this.$message.info('没有需要保存的配置变更');
        return;
      }

      this.saving = true;
      const customConfigData = {
        roomId: this.roomId,
        worldId: this.worldId,
        modid: this.modId,
        expectedRevision: this.configRevision,
        configuration_options: changedConfig,
        enabled
      };
      
      // 只使用新接口保存用户自定义配置
      modApi.saveModCustomConfig(customConfigData)
        .then(() => {
          this.originalConfig = JSON.parse(JSON.stringify(this.configForm));
          
          this.$emit('config-updated', {
            modId: this.modId,
            configData: this.configForm
          });
          
          this.dialogVisible = false;
          
          this.$message({
            type: 'success',
            message: '配置已保存'
          });
        })
        .catch(error => {
          this.$message({
            type: 'error',
            message: `保存模组配置失败：${error.message || '未知错误'}`
          });
        })
        .finally(() => {
          this.saving = false;
        });
    },
    
    // 准备提交数据
    prepareConfigForSubmit(configData) {
      const result = {};
      
      Object.keys(configData).forEach(key => {
        const value = configData[key];
        const option = this.findOptionByName(key);
        
        if (option && option.options && option.options.length > 0) {
          const matchingOption = option.options.find(opt => opt.data === value);
          result[key] = matchingOption ? matchingOption.data : value;
        } else {
          result[key] = value;
        }
      });
      
      return result;
    },
    
    // 查找选项定义
    findOptionByName(name) {
      if (!this.modInfo || !this.modInfo.configuration_options) return null;
      return this.modInfo.configuration_options.find(option => option.name === name);
    },
    
    // 处理配置变更
    handleConfigChange(optionName) {
      return this.configForm[optionName];
    },
    
    // 关闭对话框
    handleClose() {
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
          this.clearKeepAliveTimer();
        }).catch(() => {});
      } else {
        this.dialogVisible = false;
        this.clearKeepAliveTimer();
      }
    }
  },
  beforeUnmount() {
    this.resetComponentState();
  }
};
</script>

<style scoped>
.config-container {
  min-height: 200px;
  padding: 0 20px;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 0;
  color: #536159;
}

.loading-container i {
  font-size: 32px;
  margin-bottom: 10px;
  color: #d97932;
}

.reset-button-container {
  text-align: right;
  margin-bottom: 12px;
}

.reset-button {
  font-size: 14px;
  padding: 0;
}

.reset-button i {
  margin-right: 4px;
}

/* 滚动区域 */
.config-scroll-area {
  max-height: 60vh;
  overflow-y: auto;
  padding-right: 10px;
}

/* 模组描述样式 */
.mod-description {
  margin-bottom: 25px;
  background-color: #f8f9fa;
  border-radius: 6px;
  padding: 15px;
  border-left: 4px solid #d97932;
}

.description-header {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
  font-weight: 500;
  color: #d97932;
}

.description-header i {
  margin-right: 6px;
  font-size: 16px;
}

.description-content {
  color: #536159;
  line-height: 1.6;
  font-size: 14px;
  white-space: pre-line;
}

.config-form {
  margin-bottom: 10px;
}

.config-form-item {
  border-bottom: 1px solid #e8ece5;
  padding-bottom: 20px;
  margin-bottom: 20px;
  position: relative;
}

.config-form-item:last-child {
  border-bottom: none;
  margin-bottom: 0;
}

.config-form-item .el-form-item__label {
  font-weight: 500;
  color: #27352f;
}

.option-tooltip {
  margin-left: 10px;
  color: #758078;
  cursor: pointer;
  font-size: 14px;
}

.option-tooltip:hover {
  color: #d97932;
}

.option-control-wrapper {
  display: flex;
  align-items: center;
}

.option-value-text {
  margin-left: 10px;
  font-size: 13px;
  color: #536159;
}

.option-select, .option-input {
  width: 100%;
  max-width: 350px;
}

.no-options, .no-mod-info {
  display: flex;
  justify-content: center;
  padding: 30px 0;
}

.mod-config-dialog :deep(.el-dialog__body) {
  padding: 20px 20px;
}

.mod-config-dialog :deep(.el-dialog__header) {
  padding: 15px 20px;
  border-bottom: 1px solid #e8ece5;
  background-color: #f9f9f9;
}

.mod-config-dialog :deep(.el-dialog__title) {
  font-size: 16px;
  font-weight: 600;
}

.mod-config-dialog :deep(.el-dialog__footer) {
  padding: 15px 20px;
  border-top: 1px solid #e8ece5;
  background-color: #f9f9f9;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .mod-config-dialog :deep(.el-dialog) {
    width: 90% !important;
    margin-top: 10vh !important;
  }
  
  .config-form-item .el-form-item__label {
    float: none;
    display: block;
    text-align: left;
    padding: 0 0 10px;
    width: 100% !important;
    line-height: 1.4;
  }
  
  .config-form-item .el-form-item__content {
    margin-left: 0 !important;
  }
  
  .option-select, .option-input {
    max-width: 100%;
  }
}
</style>
