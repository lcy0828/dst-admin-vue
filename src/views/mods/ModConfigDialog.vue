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
  >
    <!-- 简化的配置容器 -->
    <div class="config-container">
      <!-- 加载指示器 -->
      <div v-if="loading" class="loading-container">
        <i class="el-icon-loading"></i>
        <p>加载模组配置中...</p>
      </div>
      
      <!-- 配置选项列表 -->
      <template v-else-if="modInfo">
        <!-- 重置按钮 -->
        <div class="reset-button-container" v-if="hasOptions">
          <el-button size="small" type="text" @click="resetToDefault">
            <i class="el-icon-refresh-left"></i> 重置为默认配置
          </el-button>
        </div>
        
        <!-- 配置表单 -->
        <el-form v-if="hasOptions" :model="configForm" label-width="150px" size="small" class="config-form">
          <el-form-item 
            v-for="option in allOptions" 
            :key="option.name" 
            :label="option.label"
            class="config-form-item">
            
            <!-- 配置提示 -->
            <el-tooltip 
              v-if="option.hover" 
              class="item" 
              effect="dark" 
              :content="option.hover" 
              placement="top">
              <i class="el-icon-question option-tooltip"></i>
            </el-tooltip>
            
            <!-- 开关类型 -->
            <template v-if="isBooleanOption(option)">
              <el-switch
                v-model="configForm[option.name]"
                @change="handleConfigChange(option.name)">
              </el-switch>
              <span class="option-value-text">{{ configForm[option.name] ? '开启' : '关闭' }}</span>
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
                  :label="opt.description"
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
          </el-form-item>
        </el-form>
        
        <!-- 无配置选项提示 -->
        <div v-else class="no-options">
          <el-empty description="该模组没有配置选项" :image-size="100"></el-empty>
        </div>
      </template>
      
      <!-- 无模组信息提示 -->
      <div v-else class="no-mod-info">
        <el-empty description="无法加载模组信息" :image-size="100"></el-empty>
      </div>
    </div>
    
    <!-- 底部按钮 -->
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
      dialogVisible: false,
      loading: false,
      saving: false,
      configForm: {},
      originalConfig: {},
      defaultConfig: {},
      defaultIcon: 'https://placehold.co/200x200/409EFF/white?text=MOD',
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
    visible(newVal) {
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
        this.$emit('update:visible', false);
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
    initializeConfig() {
      if (this.isInitialized) return;
      if (!this.modInfo) return;
      
      this.isInitialized = true;
      this.loading = true;
      
      this.configForm = {};
      this.originalConfig = {};
      this.defaultConfig = {};
      
      try {
        if (this.modInfo.configuration_options) {
          this.initializeConfigFromData(this.modInfo.configuration_options);
        }
      } catch (error) {
        console.error('模组配置初始化失败', error);
        this.$message.error('模组配置初始化失败');
        this.isInitialized = false;
      } finally {
        this.loading = false;
      }
    },
    
    // 从数据初始化配置表单
    initializeConfigFromData(configOptions) {
      if (!Array.isArray(configOptions)) return;
      
      configOptions.forEach(option => {
        if (!option.name || option.name === "Title" || option.name === "null") return;
        
        try {
          const parsedValue = this.parseOptionValue(option.default);
          
          if (parsedValue === undefined && option.options && option.options.length > 0) {
            const defaultOption = option.options.find(opt => 
              opt.description && opt.description.includes('默认')
            );
            if (defaultOption) {
              this.configForm[option.name] = defaultOption.data;
              this.originalConfig[option.name] = defaultOption.data;
              this.defaultConfig[option.name] = defaultOption.data;
              return;
            }
          }
          
          this.configForm[option.name] = parsedValue;
          this.originalConfig[option.name] = parsedValue;
          this.defaultConfig[option.name] = parsedValue;
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
      if (!option.options || !Array.isArray(option.options) || option.options.length !== 2) {
        return false;
      }
      
      const values = option.options.map(opt => String(opt.data).toLowerCase());
      return values.includes('true') && values.includes('false');
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
      
      this.saving = true;
      
      const submitData = {
        modid: this.modId,
        refresh: "false",
        version: this.modInfo?.version || "",
        config: this.prepareConfigForSubmit(this.configForm)
      };
      
      modApi.updateModConfig(this.modId, submitData)
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
        .catch(() => {
          this.$message({
            type: 'error',
            message: '保存模组配置失败'
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
      console.log(`配置项变更: ${optionName} => ${JSON.stringify(this.configForm[optionName])}`);
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
  beforeDestroy() {
    this.resetComponentState();
  }
};
</script>

<style scoped>
.config-container {
  min-height: 200px;
  padding: 0 10px;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 0;
  color: #606266;
}

.loading-container i {
  font-size: 32px;
  margin-bottom: 10px;
  color: #409EFF;
}

.reset-button-container {
  text-align: right;
  margin-bottom: 15px;
}

.config-form {
  max-height: 60vh;
  overflow-y: auto;
  padding-right: 10px;
}

.config-form-item {
  border-bottom: 1px solid #EBEEF5;
  padding-bottom: 15px;
  margin-bottom: 15px;
  position: relative;
}

.config-form-item:last-child {
  border-bottom: none;
}

.option-tooltip {
  margin-left: 5px;
  color: #909399;
  cursor: pointer;
}

.option-tooltip:hover {
  color: #409EFF;
}

.option-value-text {
  margin-left: 10px;
  font-size: 13px;
  color: #606266;
}

.option-select, .option-input {
  width: 100%;
  max-width: 300px;
}

.no-options, .no-mod-info {
  display: flex;
  justify-content: center;
  padding: 30px 0;
}

/* 响应式调整 */
@media (max-width: 768px) {
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
}
</style> 