<template>
  <el-dialog
    title="模组配置"
    :visible.sync="dialogVisible"
    width="900px"
    class="mod-config-dialog"
    :fullscreen="false"
    :append-to-body="true"
    :lock-scroll="true"
    :modal-append-to-body="false"
    :before-close="handleClose">
    
    <!-- 加载状态 -->
    <div v-loading="loading" class="config-container">
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
      <div v-if="!loading && hasOptions" class="config-options-section">
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
            size="small">
          </el-input>
        </div>
        
        <!-- 配置选项列表 -->
        <div class="config-list-container">
          <el-collapse v-model="activeCategories">
            <el-collapse-item 
              v-for="(category, categoryIndex) in filteredCategories" 
              :key="categoryIndex"
              :name="categoryIndex">
              <template slot="title">
                <span class="category-title" style="font-weight: bold;">{{ category.name }}</span>
              </template>
              
              <div class="category-options">
                <el-form :model="configForm" label-width="180px" size="small">
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
                        style="width: 100%">
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
                        @change="handleConfigChange(option.name)" />
                    </template>
                  </el-form-item>
                </el-form>
              </div>
            </el-collapse-item>
          </el-collapse>
        </div>
        
        <!-- 无配置选项提示 -->
        <div v-if="!hasOptions" class="no-options">
          <el-empty description="该模组没有配置选项" :image-size="150"></el-empty>
        </div>
      </div>
    </div>
    
    <span slot="footer" class="dialog-footer">
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" @click="saveConfig" :loading="saving">保存配置</el-button>
    </span>
  </el-dialog>
</template>

<script>
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
      debug: false
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
      const configOptions = this.modInfo.configuration_options || [];
      
      console.log('计算分类选项 - 总数:', configOptions.length);
      
      // 遍历所有选项进行分类
      configOptions.forEach((option, index) => {
        // 如果是空选项或没有name属性，跳过
        if (!option || !option.name) {
          return;
        }
        
        // 调试输出
        console.log(`选项[${index}] ${option.name}(${option.label}): ${option.name === 'Title' ? '分类标题' : '配置项'}`);
        
        // 判断是否是分类标题
        if (option.name === "Title") {
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
          console.log(`创建新分类: ${currentCategory.name}`);
        } 
        // 普通配置选项(非分类标题)
        else if (option.name !== "Title") {
          // 添加所有有name的选项，无论是否有options
          currentCategory.options.push(option);
          console.log(`向分类 ${currentCategory.name} 添加选项: ${option.name}`);
        }
      });
      
      // 添加最后一个分类(如果有选项)
      if (currentCategory.options.length > 0) {
        result.push(currentCategory);
        console.log(`添加最后分类: ${currentCategory.name} 包含 ${currentCategory.options.length} 个选项`);
      }
      
      console.log(`最终生成 ${result.length} 个分类`);
      return result;
    },
    
    // 过滤后的分类
    filteredCategories() {
      if (!this.searchQuery) {
        return this.categorizedOptions;
      }
      
      const query = this.searchQuery.toLowerCase();
      return this.categorizedOptions.map(category => {
        const filteredOptions = category.options.filter(option => {
          return option.label.toLowerCase().includes(query) || 
                 (option.hover && option.hover.toLowerCase().includes(query));
        });
        
        if (filteredOptions.length > 0) {
          return { 
            ...category, 
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
        this.initializeConfig();
        // 打开对话框时，移除页面滚动条
        document.body.style.overflow = 'hidden';
      } else {
        // 关闭对话框时，恢复页面滚动条
        document.body.style.overflow = '';
      }
    },
    dialogVisible(newVal) {
      if (!newVal) {
        this.$emit('update:visible', false);
        // 关闭对话框时，恢复页面滚动条
        document.body.style.overflow = '';
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
    // 判断描述中是否已包含"默认"字样
    hasDefaultText(description) {
      if (!description) return false;
      return description.includes('默认');
    },

    // 初始化配置
    initializeConfig() {
      this.loading = true;
      this.searchQuery = '';
      
      // 清空配置表单
      this.configForm = {};
      this.originalConfig = {};
      this.defaultConfig = {};
      
      // 如果已经有模组信息，先初始化配置选项
      if (this.modInfo && this.modInfo.configuration_options) {
        this.initializeConfigFromData(this.modInfo.configuration_options);
      }
      
      // 如果不是新模组，可以从API获取保存的配置
      if (this.modId) {
        this.fetchSavedConfig();
      } else {
        this.loading = false;
      }
      
      // 延迟设置所有分类展开，确保categorizedOptions已计算完成
      this.$nextTick(() => {
        this.setAllCategoriesExpanded();
      });
    },
    
    // 添加新方法用于从配置数据初始化表单
    initializeConfigFromData(configOptions) {
      if (!configOptions || !Array.isArray(configOptions)) return;
      
      // 初始化配置表单
      configOptions.forEach(option => {
        // 跳过分类标题
        if (option.name && option.name !== "Title") {
          // 处理数字、字符串、布尔值等不同类型的数据
          this.configForm[option.name] = this.parseOptionValue(option.default);
          this.originalConfig[option.name] = this.parseOptionValue(option.default);
          this.defaultConfig[option.name] = this.parseOptionValue(option.default);
        }
      });
    },
    
    // 获取保存的配置
    fetchSavedConfig() {
      this.loading = true;
      
      // 准备请求参数
      const requestData = {
        modid: this.modId,
        refresh: "true",
        version: this.modInfo?.version || ""
      };
      
      console.log('请求模组配置参数:', requestData);
      
      // 请求模组配置数据，使用POST请求
      fetch('http://192.168.2.12:8000/mod/down', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      })
        .then(response => {
          if (!response.ok) {
            throw new Error('获取模组配置失败');
          }
          return response.json();
        })
        .then(data => {
          console.log('接口返回数据:', JSON.stringify(data));
          
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
                console.log(`处理选项: ${option.name}, 默认值: ${option.default}, 类型: ${typeof option.default}`);
                // 处理数字、字符串、布尔值等不同类型的数据
                this.configForm[option.name] = this.parseOptionValue(option.default);
                this.originalConfig[option.name] = this.parseOptionValue(option.default);
                this.defaultConfig[option.name] = this.parseOptionValue(option.default);
              }
            });
            
            // 如果有保存的配置值，覆盖默认值
            if (data.config) {
              console.log('覆盖保存的配置:', JSON.stringify(data.config));
              Object.keys(data.config).forEach(key => {
                console.log(`更新配置: ${key}, 值: ${data.config[key]}, 类型: ${typeof data.config[key]}`);
                this.configForm[key] = this.parseOptionValue(data.config[key]);
                this.originalConfig[key] = this.parseOptionValue(data.config[key]);
              });
            }
            
            // 确保更新是响应式的
            this.configForm = {...this.configForm};
            this.originalConfig = {...this.originalConfig};
            
            console.log('最终配置表单:', JSON.stringify(this.configForm));
            
            // 设置所有分类展开
            this.$nextTick(() => {
              this.setAllCategoriesExpanded();
            });
          } else {
            this.$message.error('模组配置数据格式错误');
          }
          this.loading = false;
        })
        .catch(error => {
          console.error('获取模组配置错误:', error);
          this.$message({
            type: 'error',
            message: '获取模组配置失败，使用默认配置'
          });
          this.loading = false;
        });
    },
    
    // 添加辅助方法来解析不同类型的配置值
    parseOptionValue(value) {
      if (value === undefined || value === null) {
        return value;
      }
      
      // 处理布尔值（字符串形式）
      if (typeof value === 'string') {
        const lowerValue = value.toLowerCase();
        if (lowerValue === 'true') return true;
        if (lowerValue === 'false') return false;
        
        // 处理数字字符串
        if (!isNaN(value) && value !== '') {
          return Number(value);
        }
      }
      
      // 其他类型保持不变
      return value;
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
      this.saving = true;
      
      // 准备提交的数据
      const submitData = {
        modid: this.modId,
        refresh: "false",
        version: this.modInfo?.version || "",
        config: this.prepareConfigForSubmit(this.configForm)
      };
      
      console.log('提交配置数据:', submitData);
      
      // 发送配置数据到服务器
      fetch('http://192.168.2.12:8000/mod/down', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(submitData)
      })
        .then(response => {
          if (!response.ok) {
            throw new Error('保存模组配置失败');
          }
          return response.json();
        })
        .then(data => {
          console.log('保存配置返回:', data);
          this.saving = false;
          
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
          this.saving = false;
          this.$message({
            type: 'error',
            message: '保存模组配置失败'
          });
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
        }).catch(() => {
          // 用户取消关闭
        });
      } else {
        this.dialogVisible = false;
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
    // 如果有模组ID但没有模组信息，主动获取模组配置
    if (this.modId && !this.modInfo) {
      this.fetchSavedConfig();
    }
    
    // 确保所有分类展开
    this.$nextTick(() => {
      this.setAllCategoriesExpanded();
    });
  }
};
</script>

<style>
/* 隐藏主页面的右侧滚动条 */
html, body {
  overflow-x: hidden !important;
}

.mod-config-dialog {
  max-width: 95%;
  /* 防止对话框溢出 */
  overflow: hidden;
}

.mod-config-dialog .el-dialog__wrapper {
  overflow: hidden !important;
}

.mod-config-dialog .el-dialog__body {
  padding: 10px 20px;
  max-height: 70vh;
  overflow-y: auto;
  overflow-x: hidden;
}

.mod-config-dialog .el-dialog {
  margin: 0 auto !important;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.config-container {
  min-height: 200px;
}

.mod-info-section {
  margin-bottom: 15px;
  padding-bottom: 15px;
  border-bottom: 1px solid #EBEEF5;
}

.mod-info-header {
  display: flex;
  align-items: flex-start;
}

.mod-icon {
  width: 70px;
  height: 70px;
  margin-right: 15px;
  flex-shrink: 0;
  border-radius: 6px;
  overflow: hidden;
  box-shadow: 0 2px 8px 0 rgba(0, 0, 0, 0.1);
}

.image-slot {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  background-color: #f5f7fa;
  color: #909399;
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
  background: #f8f9fb;
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

.config-list-container {
  width: 100%;
}

.category-title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}

.category-options {
  padding: 0;
}

.config-form-item {
  margin-bottom: 10px;
  position: relative;
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
}

.el-collapse-item__content {
  padding: 15px;
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
</style> 