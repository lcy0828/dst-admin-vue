<template>
  <div class="page-container">
    <el-card class="main-card" v-loading="loading">
      <div slot="header" class="clearfix">
        <span>{{ title }}</span>
        <div class="header-actions">
          <el-button size="small" type="text" @click="refreshModInfo">刷新</el-button>
          <el-button size="small" type="text" @click="goBack">返回</el-button>
        </div>
      </div>
      
      <!-- 模组基本信息 -->
      <div class="mod-info-header" v-if="modInfo">
        <div class="mod-icon">
          <el-image 
            :src="modInfo.iconUrl || defaultIcon" 
            fit="cover"
            :preview-src-list="[modInfo.iconUrl || defaultIcon]">
            <div slot="error" class="image-slot">
              <i class="el-icon-picture-outline"></i>
            </div>
          </el-image>
        </div>
        <div class="mod-basic-info">
          <h2 class="mod-name">{{ modInfo.name }}</h2>
          <div class="mod-meta">
            <span class="mod-author">
              <i class="el-icon-user"></i> {{ modInfo.author }}
            </span>
            <span class="mod-version">
              <i class="el-icon-info"></i> v{{ modInfo.version }}
            </span>
            <el-tag size="small" v-if="modInfo.dst_compatible" type="success">DST</el-tag>
            <el-tag size="small" v-if="modInfo.dont_starve_compatible" type="info">DS</el-tag>
          </div>
          <div class="mod-description">{{ modInfo.description }}</div>
          <div class="mod-status">
            <span>状态：</span>
            <el-switch
              v-model="modStatus"
              active-text="启用"
              inactive-text="禁用"
              @change="handleStatusChange">
            </el-switch>
          </div>
        </div>
      </div>
      
      <!-- 配置选项 -->
      <div class="config-options-container" v-if="configOptions && configOptions.length > 0">
        <h3 class="section-title">配置选项</h3>
        
        <!-- 选项分组 -->
        <div 
          v-for="(group, groupIndex) in groupedOptions" 
          :key="groupIndex" 
          class="option-group">
          
          <!-- 分组标题 -->
          <div v-if="group.title" class="group-header">
            <span class="group-title">{{ group.title }}</span>
            <el-divider></el-divider>
          </div>
          
          <!-- 分组中的选项 -->
          <el-form label-position="top" class="config-form">
            <el-form-item 
              v-for="(option, index) in group.options" 
              :key="option.name || index"
              :label="option.label"
              :class="{'is-null-option': option.name === 'null'}">
              
              <!-- 显示帮助提示 -->
              <el-tooltip 
                v-if="option.hover" 
                class="item" 
                effect="dark" 
                :content="option.hover" 
                placement="top-start">
                <i class="el-icon-question help-icon"></i>
              </el-tooltip>
              
              <!-- 标题行，不是真正的配置选项 -->
              <div v-if="option.name === 'null'">
                <div class="null-option-label">{{ option.label }}</div>
              </div>
              
              <!-- 布尔值选项（开关） -->
              <el-switch 
                v-else-if="isBoolean(option)"
                v-model="configValues[option.name]"
                active-color="#13ce66"
                inactive-color="#ff4949">
              </el-switch>
              
              <!-- 数字选项（有很多预设值，显示为单选按钮或下拉框） -->
              <div v-else-if="isNumericOption(option)">
                <!-- 如果选项数量少，使用单选按钮组 -->
                <el-radio-group 
                  v-if="option.options.length <= 5"
                  v-model="configValues[option.name]"
                  size="small">
                  <el-radio-button 
                    v-for="opt in option.options" 
                    :key="opt.data"
                    :label="opt.data">
                    {{ opt.description }}
                  </el-radio-button>
                </el-radio-group>
                
                <!-- 如果选项数量多，使用下拉选择框 -->
                <el-select 
                  v-else
                  v-model="configValues[option.name]"
                  style="width: 100%">
                  <el-option
                    v-for="opt in option.options"
                    :key="opt.data"
                    :label="opt.description"
                    :value="opt.data">
                  </el-option>
                </el-select>
              </div>
              
              <!-- 字符串选项 -->
              <el-select 
                v-else
                v-model="configValues[option.name]"
                style="width: 100%">
                <el-option
                  v-for="opt in option.options"
                  :key="getOptionKey(opt)"
                  :label="opt.description"
                  :value="opt.data">
                </el-option>
              </el-select>
              
              <!-- 选项说明 -->
              <div class="option-description" v-if="option.hover">
                {{ option.hover }}
              </div>
            </el-form-item>
          </el-form>
        </div>
        
        <!-- 保存/重置按钮 -->
        <div class="action-buttons">
          <el-button type="primary" @click="saveConfig" :loading="saving">保存配置</el-button>
          <el-button @click="resetConfig">重置</el-button>
        </div>
      </div>
      
      <!-- 无配置选项情况 -->
      <el-empty 
        v-else-if="!loading && modInfo" 
        description="该模组没有可配置选项" 
        :image-size="100">
      </el-empty>
      
      <!-- 未找到模组信息 -->
      <el-empty 
        v-else-if="!loading && !modInfo" 
        description="未找到模组信息" 
        :image-size="100">
        <el-button @click="goBack">返回模组列表</el-button>
      </el-empty>
    </el-card>
  </div>
</template>

<script>
export default {
  name: 'ModSettings',
  data() {
    return {
      loading: false,
      saving: false,
      modId: null,
      modInfo: null,
      configOptions: [],
      configValues: {},
      originalConfigValues: {},
      modStatus: true,
      defaultIcon: 'https://placehold.co/200x200/409EFF/white?text=MOD'
    };
  },
  computed: {
    title() {
      return this.modInfo ? `模组配置：${this.modInfo.name}` : '模组配置';
    },
    
    // 将选项分组，处理null选项作为分组标题
    groupedOptions() {
      const groups = [];
      let currentGroup = {
        title: null,
        options: []
      };
      
      if (!this.configOptions || this.configOptions.length === 0) {
        return groups;
      }
      
      this.configOptions.forEach(option => {
        // 处理null选项作为分组标题
        if (option.name === 'null') {
          // 如果当前组已经有选项，创建新组
          if (currentGroup.options.length > 0) {
            groups.push({...currentGroup});
            currentGroup = {
              title: option.label,
              options: []
            };
          } else {
            // 如果当前组还没有选项，直接设置标题
            currentGroup.title = option.label;
          }
        } else {
          // 普通选项，添加到当前组
          currentGroup.options.push(option);
        }
      });
      
      // 添加最后一个组
      if (currentGroup.options.length > 0) {
        groups.push(currentGroup);
      }
      
      return groups;
    },
    
    // 检查是否有未保存的更改
    hasChanges() {
      for (const key in this.configValues) {
        if (this.configValues[key] !== this.originalConfigValues[key]) {
          return true;
        }
      }
      return false;
    }
  },
  created() {
    // 获取路由参数中的模组ID
    this.modId = this.$route.params.id;
    if (this.modId) {
      this.fetchModInfo();
    }
  },
  beforeRouteLeave(to, from, next) {
    // 如果有未保存的更改，提示用户
    if (this.hasChanges) {
      this.$confirm('有未保存的更改，确定要离开吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        next();
      }).catch(() => {
        next(false);
      });
    } else {
      next();
    }
  },
  methods: {
    // 获取模组信息和配置
    fetchModInfo() {
      this.loading = true;
      
      // 模拟从API获取模组信息
      setTimeout(() => {
        // 示例数据
        const response = {
          "status": 200, 
          "modinfo": {
            "dont_starve_compatible": false, 
            "shipwrecked_compatible": false, 
            "configuration_options": [
              {"hover":"语言","name":"language","label":"语言","default":true,"options":[{"description":"简体中文","data":true},{"description":"English","data":false}]},
              {"default":0,"options":[{"description":"","data":0}],"name":"null","label":"基本设置"},
              {"hover":"伤害","name":"damage","label":"伤害","default":5,"options":[{"description":1,"data":1},{"description":3,"data":3},{"description":5,"data":5},{"description":7,"data":7},{"description":9,"data":9},{"description":11,"data":11},{"description":13,"data":13},{"description":15,"data":15},{"description":17,"data":17},{"description":19,"data":19},{"description":21,"data":21},{"description":23,"data":23},{"description":25,"data":25},{"description":27,"data":27},{"description":29,"data":29},{"description":31,"data":31},{"description":33,"data":33},{"description":35,"data":35},{"description":37,"data":37},{"description":39,"data":39},{"description":41,"data":41},{"description":43,"data":43},{"description":45,"data":45},{"description":47,"data":47},{"description":49,"data":49},{"description":51,"data":51}]},
              {"hover":"位面伤害","name":"planardamage","label":"位面伤害","default":2,"options":[{"description":0,"data":0},{"description":2,"data":2},{"description":4,"data":4},{"description":6,"data":6},{"description":8,"data":8},{"description":10,"data":10},{"description":12,"data":12},{"description":14,"data":14},{"description":16,"data":16},{"description":18,"data":18},{"description":20,"data":20},{"description":22,"data":22},{"description":24,"data":24},{"description":26,"data":26},{"description":28,"data":28},{"description":30,"data":30},{"description":32,"data":32},{"description":34,"data":34},{"description":36,"data":36},{"description":38,"data":38},{"description":40,"data":40},{"description":42,"data":42},{"description":44,"data":44},{"description":46,"data":46},{"description":48,"data":48},{"description":50,"data":50}]},
              {"hover":"耐久","name":"durability","label":"耐久","default":500,"options":[{"description":300,"data":300},{"description":400,"data":400},{"description":500,"data":500},{"description":600,"data":600},{"description":700,"data":700},{"description":800,"data":800},{"description":900,"data":900},{"description":1000,"data":1000},{"description":"Infinity","data":-1}]},
              {"default":0,"options":[{"description":"","data":0}],"name":"null","label":"高级设置"},
              {"hover":"砍树","name":"chop","label":"砍树","default":true,"options":[{"description":"是","data":true},{"description":"否","data":false}]},
              {"hover":"摧毁建筑","name":"hammer","label":"摧毁建筑","default":false,"options":[{"description":"是","data":true},{"description":"否","data":false}]},
              {"hover":"挖矿","name":"mine","label":"挖矿","default":true,"options":[{"description":"是","data":true},{"description":"否","data":false}]},
              {"hover":"铲作物","name":"dig","label":"铲作物","default":false,"options":[{"description":"是","data":true},{"description":"否","data":false}]}
            ], 
            "icon": "modicon.tex", 
            "api_version_dst": 10, 
            "forumthread": "", 
            "api_version": 6, 
            "all_clients_require_mod": true, 
            "version": "1.0.4", 
            "reign_of_giants_compatible": false, 
            "dst_compatible": true, 
            "locale": "zh", 
            "icon_atlas": "modicon.xml", 
            "description": "来自泰拉瑞亚的强大魔法武器。", 
            "name": "终极棱镜", 
            "author": "WIGFRID", 
            "hamlet_compatible": false, 
            "server_filter_tags": ["LastPrism"],
            "iconUrl": "https://steamuserimages-a.akamaihd.net/ugc/1834650713180144448/9AEF44B007018B8BD48A8BA29874E31C069295D9/?imw=200&imh=200&ima=fit&impolicy=Letterbox&imcolor=%23000000&letterbox=true"
          }
        };
        
        // 设置模组信息
        this.modInfo = response.modinfo;
        this.processModConfig(response.modinfo);
        this.modStatus = true; // 默认启用
        
        this.loading = false;
      }, 800);
    },
    
    // 处理模组配置信息
    processModConfig(modInfo) {
      if (!modInfo || !modInfo.configuration_options) {
        this.configOptions = [];
        return;
      }
      
      this.configOptions = modInfo.configuration_options;
      
      // 设置默认值
      const defaultValues = {};
      this.configOptions.forEach(option => {
        if (option.name && option.name !== 'null') {
          defaultValues[option.name] = option.default;
        }
      });
      
      this.configValues = {...defaultValues};
      this.originalConfigValues = {...defaultValues};
    },
    
    // 判断是否为布尔类型选项
    isBoolean(option) {
      if (!option.options || option.options.length !== 2) return false;
      
      return option.options.every(opt => 
        typeof opt.data === 'boolean' || 
        opt.description === '是' || 
        opt.description === '否'
      );
    },
    
    // 判断是否为数字类型选项
    isNumericOption(option) {
      if (!option.options || option.options.length === 0) return false;
      return option.options.every(opt => 
        typeof opt.data === 'number' || 
        opt.data === -1 || // 处理Infinity特殊情况
        !isNaN(Number(opt.data))
      );
    },
    
    // 获取选项键值
    getOptionKey(option) {
      if (option.data === null || option.data === undefined) {
        return `null-${Math.random()}`;
      }
      return option.data;
    },
    
    // 保存配置
    saveConfig() {
      this.saving = true;
      
      // 模拟保存配置到API
      setTimeout(() => {
        // 更新原始配置，表示已保存
        this.originalConfigValues = {...this.configValues};
        
        this.saving = false;
        this.$message({
          type: 'success',
          message: '模组配置已保存'
        });
      }, 800);
    },
    
    // 重置配置
    resetConfig() {
      this.$confirm('确定要重置所有配置吗?', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        // 重置为默认值
        const defaultValues = {};
        this.configOptions.forEach(option => {
          if (option.name && option.name !== 'null') {
            defaultValues[option.name] = option.default;
          }
        });
        
        this.configValues = {...defaultValues};
        
        this.$message({
          type: 'success',
          message: '配置已重置为默认值'
        });
      }).catch(() => {
        // 取消重置
      });
    },
    
    // 刷新模组信息
    refreshModInfo() {
      if (this.hasChanges) {
        this.$confirm('有未保存的更改，确定要刷新吗？', '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }).then(() => {
          this.fetchModInfo();
        }).catch(() => {
          // 取消刷新
        });
      } else {
        this.fetchModInfo();
      }
    },
    
    // 切换模组状态（启用/禁用）
    handleStatusChange(status) {
      const action = status ? '启用' : '禁用';
      
      // 模拟API请求
      this.loading = true;
      setTimeout(() => {
        this.loading = false;
        this.$message({
          type: 'success',
          message: `模组已${action}`
        });
      }, 500);
    },
    
    // 返回上一页
    goBack() {
      if (this.hasChanges) {
        this.$confirm('有未保存的更改，确定要离开吗？', '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }).then(() => {
          this.$router.push('/mods/list');
        }).catch(() => {
          // 取消离开
        });
      } else {
        this.$router.push('/mods/list');
      }
    }
  }
};
</script>

<style scoped>
.page-container {
  padding: 20px;
}

.main-card {
  margin-bottom: 20px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  border-radius: 4px;
}

.header-actions {
  float: right;
}

.header-actions .el-button {
  margin-left: 10px;
}

.mod-info-header {
  display: flex;
  margin-bottom: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid #EBEEF5;
}

.mod-icon {
  width: 80px;
  height: 80px;
  margin-right: 20px;
  flex-shrink: 0;
  border-radius: 4px;
  overflow: hidden;
}

.mod-basic-info {
  flex: 1;
}

.mod-name {
  margin: 0 0 10px 0;
  font-size: 20px;
  color: #303133;
}

.mod-meta {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
  font-size: 14px;
  color: #606266;
}

.mod-author,
.mod-version {
  margin-right: 15px;
}

.mod-author i,
.mod-version i {
  margin-right: 5px;
}

.el-tag {
  margin-right: 5px;
}

.mod-description {
  font-size: 14px;
  color: #606266;
  line-height: 1.5;
  margin-bottom: 15px;
}

.mod-status {
  display: flex;
  align-items: center;
  font-size: 14px;
  color: #606266;
}

.mod-status span {
  margin-right: 10px;
}

.section-title {
  margin-top: 0;
  margin-bottom: 15px;
  font-size: 16px;
  color: #303133;
  font-weight: 600;
}

.option-group {
  margin-bottom: 20px;
}

.group-header {
  margin-bottom: 15px;
}

.group-title {
  font-size: 16px;
  font-weight: 600;
  color: #409EFF;
}

.config-form {
  margin-bottom: 20px;
}

.el-form-item {
  margin-bottom: 18px;
}

.is-null-option {
  display: none;
}

.null-option-label {
  font-weight: bold;
  color: #606266;
}

.help-icon {
  margin-left: 5px;
  color: #909399;
  cursor: help;
}

.option-description {
  margin-top: 5px;
  font-size: 12px;
  color: #909399;
  line-height: 1.5;
}

.image-slot {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  background: #f5f7fa;
  color: #909399;
  font-size: 20px;
}

.el-divider {
  margin: 10px 0;
}

.action-buttons {
  margin-top: 20px;
  text-align: center;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .mod-info-header {
    flex-direction: column;
  }
  
  .mod-icon {
    margin-bottom: 15px;
  }
}
</style> 