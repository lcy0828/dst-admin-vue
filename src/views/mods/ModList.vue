<template>
  <div class="page-container">
    <el-card class="main-card">
      <div slot="header" class="clearfix">
        <span>已下载模组</span>
        <div class="header-actions">
          <el-button size="small" type="primary" @click="refreshModList">刷新</el-button>
          <el-button size="small" type="success" @click="goToSearch">添加模组</el-button>
        </div>
      </div>

      <!-- 过滤和排序区域 -->
      <div class="filter-container">
        <el-form :inline="true" :model="filterForm" size="small">
          <el-form-item label="状态">
            <el-select v-model="filterForm.status" placeholder="全部">
              <el-option label="全部" value=""></el-option>
              <el-option label="已启用" value="enabled"></el-option>
              <el-option label="已禁用" value="disabled"></el-option>
            </el-select>
          </el-form-item>
          <el-form-item label="排序方式">
            <el-select v-model="filterForm.sortBy">
              <el-option label="名称" value="name"></el-option>
              <el-option label="作者" value="author"></el-option>
              <el-option label="更新时间" value="updated"></el-option>
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-input v-model="filterForm.keyword" placeholder="搜索模组" prefix-icon="el-icon-search" clearable></el-input>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="applyFilter">筛选</el-button>
            <el-button @click="resetFilter">重置</el-button>
          </el-form-item>
        </el-form>
      </div>
      
      <!-- 模组列表 -->
      <div v-loading="loading" class="mod-list-container" element-loading-background="rgba(255, 255, 255, 0.7)">
        <div v-if="modsList.length > 0" class="mod-grid">
          <el-row :gutter="20">
            <el-col 
              :xs="24" 
              :sm="12" 
              :md="8" 
              :lg="6" 
              v-for="mod in filteredMods" 
              :key="mod.id" 
              class="mod-card-col">
              <el-card :class="['mod-card', {'is-disabled': !mod.enabled}]" shadow="hover">
                <div class="mod-card-header">
                  <div class="mod-card-title" :title="mod.name">{{ mod.name }}</div>
                  <el-switch
                    v-model="mod.enabled"
                    @change="(val) => toggleModStatus(mod, val)"
                    active-color="#13ce66"
                    inactive-color="#ff4949"
                    class="status-switch">
                  </el-switch>
                </div>
                
                <div class="mod-card-content">
                  <div class="mod-card-image">
                    <el-image 
                      :src="mod.iconUrl || defaultIcon" 
                      fit="cover"
                      lazy>
                      <div slot="error" class="image-slot">
                        <i class="el-icon-picture-outline"></i>
                      </div>
                    </el-image>
                  </div>
                  
                  <div class="mod-card-info">
                    <div class="mod-card-author">
                      <i class="el-icon-user"></i>
                      <span>{{ mod.author }}</span>
                    </div>
                    <div class="mod-card-version">
                      <i class="el-icon-info"></i>
                      <span>v{{ mod.version }}</span>
                    </div>
                    <div class="mod-card-update" v-if="mod.updatedAt">
                      <i class="el-icon-time"></i>
                      <span>{{ mod.updatedAt }}</span>
                    </div>
                    <div class="mod-card-tags" v-if="mod.tags && mod.tags.length">
                      <el-tag size="mini" v-for="tag in mod.tags" :key="tag" class="mod-tag">{{ tag }}</el-tag>
                    </div>
                  </div>
                </div>
                
                <div class="mod-card-description" :title="mod.description">
                  {{ mod.description || '暂无描述' }}
                </div>
                
                <div class="mod-card-actions">
                  <el-button 
                    size="small" 
                    type="primary"
                    @click="openConfigDialog(mod)"
                    :disabled="!mod.enabled">
                    配置
                  </el-button>
                  <el-dropdown trigger="click" @command="handleCommand" size="small">
                    <el-button size="small" type="text">
                      更多<i class="el-icon-arrow-down el-icon--right"></i>
                    </el-button>
                    <el-dropdown-menu slot="dropdown">
                      <el-dropdown-item :command="{type: 'details', mod: mod}">查看详情</el-dropdown-item>
                      <el-dropdown-item :command="{type: 'update', mod: mod}" v-if="mod.updateAvailable">更新模组</el-dropdown-item>
                      <el-dropdown-item :command="{type: 'uninstall', mod: mod}">卸载模组</el-dropdown-item>
                    </el-dropdown-menu>
                  </el-dropdown>
                </div>
              </el-card>
            </el-col>
          </el-row>
        </div>
        
        <!-- 无模组提示 -->
        <div v-else-if="!loading" class="empty-mods">
          <el-empty description="还没有安装任何模组" :image-size="200">
            <template #description>
              <p>您还没有安装任何模组</p>
              <p>点击下方按钮开始添加模组</p>
            </template>
            <el-button type="primary" @click="goToSearch">添加模组</el-button>
          </el-empty>
        </div>
      </div>
    </el-card>
    
    <!-- 模组配置对话框 -->
    <mod-config-dialog
      :visible.sync="configDialogVisible"
      :mod-id="currentModId"
      :mod-info="currentModInfo"
      :is-new-mod="false"
      @config-updated="handleConfigUpdated">
    </mod-config-dialog>

    <!-- 模组详情对话框 -->
    <el-dialog
      title="模组详情"
      :visible.sync="detailsDialogVisible"
      width="700px"
      class="mod-details-dialog"
      :modal="false"
      :append-to-body="true">
      <div v-if="currentModInfo" class="mod-details-content">
        <!-- 模组基本信息 -->
        <div class="mod-details-header">
          <el-image 
            :src="currentModInfo.iconUrl || defaultIcon" 
            fit="cover"
            class="mod-details-image">
            <div slot="error" class="image-slot">
              <i class="el-icon-picture-outline"></i>
            </div>
          </el-image>
          
          <div class="mod-details-info">
            <h2 class="mod-details-name">{{ currentModInfo.name }}</h2>
            <div class="mod-details-meta">
              <span class="mod-details-author">
                <i class="el-icon-user"></i> {{ currentModInfo.author }}
              </span>
              <span class="mod-details-version">
                <i class="el-icon-info"></i> v{{ currentModInfo.version }}
              </span>
              <span class="mod-details-update" v-if="currentModInfo.updatedAt">
                <i class="el-icon-time"></i> {{ currentModInfo.updatedAt }}
              </span>
            </div>
            <div class="mod-details-status">
              <el-tag size="medium" :type="currentModInfo.enabled ? 'success' : 'danger'">
                {{ currentModInfo.enabled ? '已启用' : '已禁用' }}
              </el-tag>
            </div>
          </div>
        </div>
        
        <!-- 模组描述 -->
        <div class="mod-details-description">
          <h3>模组描述</h3>
          <div class="description-content">
            {{ currentModInfo.description || '该模组暂无描述' }}
          </div>
        </div>
        
        <!-- 兼容性信息 -->
        <div class="mod-details-compatibility" v-if="currentModInfo.compatibility">
          <h3>兼容性</h3>
          <div class="compatibility-tags">
            <el-tag size="medium" type="success" v-if="currentModInfo.compatibility.dst">
              饥荒联机版
            </el-tag>
            <el-tag size="medium" type="info" v-if="currentModInfo.compatibility.ds">
              单机版饥荒
            </el-tag>
            <el-tag size="medium" type="warning" v-if="currentModInfo.compatibility.rog">
              巨人国
            </el-tag>
            <el-tag size="medium" type="danger" v-if="currentModInfo.compatibility.sw">
              海难
            </el-tag>
            <el-tag size="medium" v-if="currentModInfo.compatibility.hamlet">
              哈姆雷特
            </el-tag>
          </div>
        </div>
        
        <!-- 文件信息 -->
        <div class="mod-details-files">
          <h3>文件信息</h3>
          <div class="file-info-list">
            <div class="file-info-item">
              <span class="file-info-label">安装位置:</span>
              <span class="file-info-value">{{ currentModInfo.path || '未知' }}</span>
            </div>
            <div class="file-info-item">
              <span class="file-info-label">文件大小:</span>
              <span class="file-info-value">{{ currentModInfo.size || '未知' }}</span>
            </div>
            <div class="file-info-item">
              <span class="file-info-label">安装时间:</span>
              <span class="file-info-value">{{ currentModInfo.installedAt || '未知' }}</span>
            </div>
          </div>
        </div>
      </div>
      
      <span slot="footer" class="dialog-footer">
        <el-button @click="detailsDialogVisible = false">关闭</el-button>
        <el-button type="primary" @click="openConfigDialog(currentModInfo)" :disabled="!currentModInfo || !currentModInfo.enabled">配置模组</el-button>
      </span>
    </el-dialog>

    <!-- 卸载确认对话框 -->
    <el-dialog
      title="卸载模组"
      :visible.sync="uninstallDialogVisible"
      width="500px"
      :modal="false"
      :append-to-body="true">
      <div class="uninstall-content">
        <p>您确定要卸载模组 <strong>{{ currentModInfo ? currentModInfo.name : '' }}</strong> 吗？</p>
        <p class="warning-text">此操作将永久删除该模组的所有文件和配置，且不可恢复。</p>
      </div>
      
      <span slot="footer" class="dialog-footer">
        <el-button @click="uninstallDialogVisible = false">取消</el-button>
        <el-button type="danger" @click="confirmUninstall" :loading="uninstalling">确认卸载</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import ModConfigDialog from './ModConfigDialog.vue';

export default {
  name: 'ModList',
  components: {
    ModConfigDialog
  },
  data() {
    return {
      // 模组列表
      modsList: [],
      // 加载状态
      loading: false,
      // 筛选
      filterForm: {
        status: '',
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
      // 默认图标
      defaultIcon: 'https://placehold.co/200x200/409EFF/white?text=MOD'
    };
  },
  computed: {
    // 筛选后的模组列表
    filteredMods() {
      let result = [...this.modsList];
      
      // 按状态筛选
      if (this.filterForm.status) {
        const isEnabled = this.filterForm.status === 'enabled';
        result = result.filter(mod => mod.enabled === isEnabled);
      }
      
      // 按关键词筛选
      if (this.filterForm.keyword) {
        const keyword = this.filterForm.keyword.toLowerCase();
        result = result.filter(mod => 
          mod.name.toLowerCase().includes(keyword) || 
          mod.author.toLowerCase().includes(keyword) ||
          (mod.description && mod.description.toLowerCase().includes(keyword))
        );
      }
      
      // 排序
      result.sort((a, b) => {
        switch (this.filterForm.sortBy) {
          case 'name':
            return a.name.localeCompare(b.name);
          case 'author':
            return a.author.localeCompare(b.author);
          case 'updated':
            return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);
          default:
            return 0;
        }
      });
      
      return result;
    }
  },
  created() {
    this.fetchModsList();
  },
  methods: {
    // 获取模组列表
    fetchModsList() {
      this.loading = true;
      
      // 模拟从API获取模组列表
      setTimeout(() => {
        // 生成测试数据
        this.modsList = [
          {
            id: '2675609101',
            name: '终极棱镜',
            author: 'WIGFRID',
            version: '1.0.4',
            enabled: true,
            description: '来自泰拉瑞亚的强大魔法武器。',
            tags: ['武器', '物品'],
            updatedAt: '2023-10-15',
            installedAt: '2023-10-20',
            path: '/mods/LastPrism',
            size: '2.3 MB',
            updateAvailable: false,
            iconUrl: 'https://steamuserimages-a.akamaihd.net/ugc/1834650713180144448/9AEF44B007018B8BD48A8BA29874E31C069295D9/?imw=200&imh=200&ima=fit&impolicy=Letterbox&imcolor=%23000000&letterbox=true',
            compatibility: {
              dst: true,
              ds: false,
              rog: false,
              sw: false,
              hamlet: false
            }
          },
          {
            id: '1392778117',
            name: 'Legion-棱镜',
            author: 'ti_Tout',
            version: '1.0.2',
            enabled: true,
            description: '一款强大的武器模组，增加了多种棱镜武器。',
            tags: ['武器', '物品', '装备'],
            updatedAt: '2023-03-02',
            installedAt: '2023-04-10',
            path: '/mods/Legion',
            size: '5.7 MB',
            updateAvailable: true,
            iconUrl: 'https://steamuserimages-a.akamaihd.net/ugc/1021698814063197415/5348EF5526A2526D1A59E45AFA3A3C6299ABD826/?imw=200&imh=200&ima=fit&impolicy=Letterbox&imcolor=%23000000&letterbox=true',
            compatibility: {
              dst: true,
              ds: false,
              rog: false,
              sw: false,
              hamlet: false
            }
          },
          {
            id: '3',
            name: '资源显示器',
            author: 'ToolDev',
            version: '1.0.5',
            enabled: false,
            description: '在屏幕上显示各种资源的数量和位置信息。',
            tags: ['工具', '界面'],
            updatedAt: '2023-08-20',
            installedAt: '2023-09-05',
            path: '/mods/ResourceDisplay',
            size: '1.2 MB',
            updateAvailable: false,
            iconUrl: null,
            compatibility: {
              dst: true,
              ds: true,
              rog: true,
              sw: false,
              hamlet: false
            }
          },
          {
            id: '4',
            name: '高级建造系统',
            author: 'BuilderPro',
            version: '3.4.1',
            enabled: true,
            description: '增强建造系统，提供更多建筑选项和更方便的建造工具。',
            tags: ['建造', '工具'],
            updatedAt: '2023-11-10',
            installedAt: '2023-11-15',
            path: '/mods/AdvancedBuilding',
            size: '8.4 MB',
            updateAvailable: false,
            iconUrl: null,
            compatibility: {
              dst: true,
              ds: false,
              rog: false,
              sw: false,
              hamlet: false
            }
          }
        ];
        
        this.loading = false;
      }, 800);
    },
    
    // 应用筛选
    applyFilter() {
      // 已通过计算属性实现
    },
    
    // 重置筛选
    resetFilter() {
      this.filterForm = {
        status: '',
        sortBy: 'name',
        keyword: ''
      };
    },
    
    // 刷新模组列表
    refreshModList() {
      this.fetchModsList();
    },
    
    // 打开配置对话框
    openConfigDialog(mod) {
      if (!mod.enabled) return;
      
      // 先确保对话框已关闭，再重新打开
      this.configDialogVisible = false;
      
      // 使用nextTick确保在DOM更新后再打开对话框
      this.$nextTick(() => {
        this.currentModId = mod.id;
        
        // 准备模组信息，模拟API获取模组详细信息
        this.loading = true;
        
        setTimeout(() => {
          // 构建模组信息
          this.currentModInfo = {
            ...mod,
            // 添加配置选项信息
            configuration_options: [
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
            dst_compatible: mod.compatibility?.dst || false,
            dont_starve_compatible: mod.compatibility?.ds || false,
            reign_of_giants_compatible: mod.compatibility?.rog || false,
            shipwrecked_compatible: mod.compatibility?.sw || false,
            hamlet_compatible: mod.compatibility?.hamlet || false
          };
          
          this.loading = false;
          this.configDialogVisible = true;
        }, 100);
      });
    },
    
    // 配置更新回调
    handleConfigUpdated(data) {
      this.$message({
        type: 'success',
        message: `模组 ${data.modId} 配置已更新！`
      });
      
      // 可以在这里更新模组列表中的配置状态
    },
    
    // 切换模组状态
    toggleModStatus(mod, status) {
      // 模拟API操作
      this.loading = true;
      const action = status ? '启用' : '禁用';
      
      setTimeout(() => {
        // 更新状态
        const targetMod = this.modsList.find(m => m.id === mod.id);
        if (targetMod) {
          targetMod.enabled = status;
        }
        
        this.loading = false;
        this.$message({
          type: 'success',
          message: `模组 ${mod.name} 已${action}`
        });
      }, 500);
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
    updateMod(mod) {
      this.$message({
        type: 'info',
        message: `正在更新模组 ${mod.name}，此功能尚未实现`
      });
    },
    
    // 卸载模组
    uninstallMod(mod) {
      this.currentModInfo = mod;
      this.uninstallDialogVisible = true;
    },
    
    // 确认卸载
    confirmUninstall() {
      if (!this.currentModInfo) return;
      
      this.uninstalling = true;
      
      // 模拟API卸载操作
      setTimeout(() => {
        // 从列表中移除
        const index = this.modsList.findIndex(mod => mod.id === this.currentModInfo.id);
        if (index > -1) {
          this.modsList.splice(index, 1);
        }
        
        this.uninstalling = false;
        this.uninstallDialogVisible = false;
        
        this.$message({
          type: 'success',
          message: `模组 ${this.currentModInfo.name} 已成功卸载`
        });
        
        this.currentModInfo = null;
      }, 1000);
    },
    
    // 导航到搜索页面
    goToSearch() {
      this.$router.push('/mods/search');
    },
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

.filter-container {
  margin-bottom: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid #EBEEF5;
}

.mod-list-container {
  min-height: 400px;
}

.mod-grid {
  margin-bottom: 20px;
}

.mod-card-col {
  margin-bottom: 20px;
}

.mod-card {
  height: 100%;
  transition: all 0.3s;
  display: flex;
  flex-direction: column;
}

.mod-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
}

.mod-card.is-disabled {
  opacity: 0.7;
  background-color: #f8f8f8;
}

.mod-card-header {
  border-bottom: 1px solid #EBEEF5;
  padding-bottom: 10px;
  margin-bottom: 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.mod-card-title {
  font-weight: bold;
  font-size: 16px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  margin-right: 10px;
}

.status-switch {
  flex-shrink: 0;
}

.mod-card-content {
  display: flex;
  margin-bottom: 15px;
}

.mod-card-image {
  width: 80px;
  height: 80px;
  flex-shrink: 0;
  position: relative;
  margin-right: 15px;
  border-radius: 4px;
  overflow: hidden;
}

.mod-card-image .el-image {
  width: 100%;
  height: 100%;
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

.mod-card-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  font-size: 13px;
}

.mod-card-author,
.mod-card-version,
.mod-card-update {
  display: flex;
  align-items: center;
  margin-bottom: 5px;
}

.mod-card-author i,
.mod-card-version i,
.mod-card-update i {
  margin-right: 5px;
  width: 16px;
  text-align: center;
  color: #909399;
}

.mod-card-tags {
  margin-top: 5px;
}

.mod-tag {
  margin-right: 5px;
  margin-bottom: 5px;
}

.mod-card-description {
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid #EBEEF5;
  color: #606266;
  font-size: 13px;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.mod-card-actions {
  display: flex;
  justify-content: space-between;
  margin-top: auto;
}

.empty-mods {
  padding: 40px 0;
  text-align: center;
}

/* 详情对话框样式 */
.mod-details-dialog {
  max-width: 90%;
}

.mod-details-content {
  padding: 0 15px;
}

.mod-details-header {
  display: flex;
  margin-bottom: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid #EBEEF5;
}

.mod-details-image {
  width: 120px;
  height: 120px;
  margin-right: 20px;
  flex-shrink: 0;
  border-radius: 4px;
  overflow: hidden;
}

.mod-details-info {
  flex: 1;
}

.mod-details-name {
  margin: 0 0 15px 0;
  font-size: 24px;
  color: #303133;
  line-height: 1.2;
}

.mod-details-meta {
  display: flex;
  flex-wrap: wrap;
  margin-bottom: 15px;
  color: #606266;
}

.mod-details-author,
.mod-details-version,
.mod-details-update {
  margin-right: 15px;
  margin-bottom: 5px;
  display: flex;
  align-items: center;
}

.mod-details-author i,
.mod-details-version i,
.mod-details-update i {
  margin-right: 5px;
}

.mod-details-status {
  margin-bottom: 10px;
}

.mod-details-description,
.mod-details-compatibility,
.mod-details-files {
  margin-bottom: 20px;
}

.mod-details-description h3,
.mod-details-compatibility h3,
.mod-details-files h3 {
  font-size: 16px;
  margin: 0 0 10px 0;
  color: #303133;
}

.description-content {
  padding: 10px;
  background-color: #f8f8f8;
  border-radius: 4px;
  color: #606266;
  line-height: 1.6;
  font-size: 14px;
}

.compatibility-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.file-info-list {
  background-color: #f8f8f8;
  border-radius: 4px;
  padding: 10px;
}

.file-info-item {
  margin-bottom: 8px;
  display: flex;
}

.file-info-label {
  color: #909399;
  width: 100px;
  flex-shrink: 0;
}

.file-info-value {
  color: #606266;
}

/* 卸载对话框 */
.uninstall-content {
  text-align: center;
  padding: 20px 0;
}

.warning-text {
  color: #F56C6C;
  margin-top: 10px;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .mod-details-header {
    flex-direction: column;
  }
  
  .mod-details-image {
    width: 100%;
    max-width: 200px;
    height: auto;
    margin: 0 auto 15px;
  }
  
  .filter-container .el-form {
    display: flex;
    flex-direction: column;
  }
  
  .filter-container .el-form-item {
    margin-right: 0;
    margin-bottom: 10px;
  }
}
</style> 