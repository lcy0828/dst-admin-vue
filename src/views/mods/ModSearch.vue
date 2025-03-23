<template>
  <div class="page-container">
    <el-card class="main-card">
      <div slot="header" class="clearfix">
        <span>搜索模组</span>
        <div class="header-actions">
          <el-button size="small" type="primary" @click="goToModList">返回已下载模组</el-button>
        </div>
      </div>
      
      <!-- 搜索表单 -->
      <div class="search-form-container">
        <el-form :inline="true" :model="searchForm" size="small">
          <el-form-item>
            <el-input 
              v-model="searchForm.keyword" 
              placeholder="输入模组名称搜索..." 
              prefix-icon="el-icon-search" 
              clearable
              @keyup.enter.native="searchMods">
            </el-input>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="searchMods">搜索</el-button>
            <el-button @click="resetSearch">重置</el-button>
          </el-form-item>
        </el-form>
      </div>
      
      <!-- 模组列表 -->
      <div v-loading="loading" class="mod-search-results">
        <div v-if="searchResults.length > 0" class="mod-grid">
          <el-row :gutter="20">
            <el-col 
              :xs="24" 
              :sm="12" 
              :md="8" 
              :lg="6" 
              v-for="mod in searchResults" 
              :key="mod.id" 
              class="mod-card-col">
              <el-card class="mod-card" shadow="hover">
                <div class="mod-card-image">
                  <el-image 
                    :src="mod.img || defaultImage" 
                    fit="cover"
                    lazy>
                    <div slot="error" class="image-slot">
                      <i class="el-icon-picture-outline"></i>
                    </div>
                  </el-image>
                  <div class="mod-card-badge" v-if="mod.isInstalled">
                    <el-tag size="small" type="success">已安装</el-tag>
                  </div>
                </div>
                
                <div class="mod-card-content">
                  <div class="mod-card-title" :title="mod.name">{{ mod.name }}</div>
                  <div class="mod-card-meta">
                    <span class="mod-card-author">
                      <i class="el-icon-user"></i> {{ mod.auth }}
                    </span>
                    <span class="mod-card-stats">
                      <i class="el-icon-star-on"></i> {{ mod.sub }}
                    </span>
                  </div>
                  <div class="mod-card-description" :title="mod.describe">
                    {{ mod.describe || '暂无描述' }}
                  </div>
                  <div class="mod-card-version" v-if="mod.version">
                    <span class="version-tag">{{ mod.version }}</span>
                  </div>
                </div>
                
                <div class="mod-card-actions">
                  <el-button 
                    size="small" 
                    type="primary" 
                    @click="configMod(mod)"
                    :disabled="false">
                    配置
                  </el-button>
                  <el-button 
                    size="small" 
                    @click="viewDetails(mod)">
                    详情
                  </el-button>
                </div>
              </el-card>
            </el-col>
          </el-row>
          
          <!-- 分页 -->
          <div class="pagination-container">
            <el-pagination
              background
              layout="prev, pager, next"
              :total="totalResults"
              :page-size="pageSize"
              :current-page.sync="currentPage"
              @current-change="handlePageChange">
            </el-pagination>
          </div>
        </div>
        
        <!-- 无结果提示 -->
        <div v-else-if="!loading && hasSearched" class="empty-results">
          <el-empty description="没有找到匹配的模组" :image-size="200">
            <template #description>
              <p>没有找到匹配的模组</p>
              <p>尝试使用不同的关键词或者筛选条件</p>
            </template>
          </el-empty>
        </div>
        
        <!-- 初始提示 -->
        <div v-else-if="!loading && !hasSearched" class="initial-prompt">
          <div class="prompt-content">
            <i class="el-icon-search prompt-icon"></i>
            <h3>搜索Steam Workshop模组</h3>
            <p>输入关键词开始搜索，或者直接粘贴Steam Workshop模组链接</p>
            
            <div class="url-import">
              <el-input
                v-model="workshopUrl"
                placeholder="粘贴Steam Workshop模组URL..."
                clearable>
                <el-button slot="append" @click="importFromUrl">导入</el-button>
              </el-input>
            </div>
          </div>
        </div>
      </div>
    </el-card>
    
    <!-- 模组详情对话框 -->
    <el-dialog
      title="模组详情"
      :visible.sync="detailsDialogVisible"
      width="800px"
      class="mod-details-dialog">
      <div v-if="currentMod" class="mod-details-content">
        <!-- 模组头部信息 -->
        <div class="mod-details-header">
          <div class="mod-details-preview">
            <el-image 
              :src="currentMod.img || defaultImage" 
              fit="cover">
              <div slot="error" class="image-slot">
                <i class="el-icon-picture-outline"></i>
              </div>
            </el-image>
          </div>
          
          <div class="mod-details-info">
            <h2 class="mod-details-name">{{ currentMod.name }}</h2>
            
            <div class="mod-details-meta">
              <span class="mod-details-author">
                <i class="el-icon-user"></i> {{ currentMod.auth }}
              </span>
              <span class="mod-details-update" v-if="currentMod.time">
                <i class="el-icon-time"></i> {{ currentMod.time }}
              </span>
              <span class="mod-details-subscribers">
                <i class="el-icon-star-on"></i> {{ currentMod.sub }} 订阅者
              </span>
            </div>
            
            <div class="mod-details-version" v-if="currentMod.version">
              <span class="version-tag">{{ currentMod.version }}</span>
            </div>
            
            <div class="mod-details-actions">
              <el-button 
                type="primary" 
                @click="configMod(currentMod)">
                配置模组
              </el-button>
            </div>
          </div>
        </div>
        
        <!-- 模组描述 -->
        <div class="mod-details-description" v-if="currentMod.describe">
          <h3>模组描述</h3>
          <div class="description-content">
            {{ currentMod.describe || '该模组暂无描述' }}
          </div>
        </div>
      </div>
      
      <span slot="footer" class="dialog-footer">
        <el-button @click="detailsDialogVisible = false">关闭</el-button>
      </span>
    </el-dialog>
    
    <!-- 模组配置对话框 -->
    <mod-config-dialog
      :visible.sync="configDialogVisible"
      :mod-id="selectedModId"
      :mod-info="currentMod"
      :is-new-mod="true"
      @config-updated="handleConfigUpdated">
    </mod-config-dialog>
  </div>
</template>

<script>
import ModConfigDialog from './ModConfigDialog.vue';

export default {
  name: 'ModSearch',
  components: {
    ModConfigDialog
  },
  data() {
    return {
      searchForm: {
        keyword: '',
      },
      loading: false,
      hasSearched: false,
      searchResults: [],
      totalResults: 0,
      pageSize: 20,
      currentPage: 1,
      defaultImage: 'https://placehold.co/200x200/409EFF/white?text=MOD',
      detailsDialogVisible: false,
      currentMod: null,
      workshopUrl: '',
      configDialogVisible: false,
      selectedModId: null
    };
  },
  created() {
    // 检查URL参数中是否有搜索关键词
    const urlParams = new URLSearchParams(window.location.search);
    const keyword = urlParams.get('keyword');
    
    if (keyword) {
      this.searchForm.keyword = keyword;
      this.searchMods();
    }
  },
  methods: {
    searchMods() {
      if (!this.searchForm.keyword.trim()) {
        this.$message.warning('请输入搜索关键词');
        return;
      }
      
      this.loading = true;
      this.hasSearched = true;
      
      // 使用提供的API进行搜索
      fetch(`http://192.168.2.12:8000/mod/search?modname=${encodeURIComponent(this.searchForm.keyword)}`)
        .then(response => {
          if (!response.ok) {
            throw new Error('搜索失败');
          }
          return response.json();
        })
        .then(data => {
          console.log('搜索结果:', data);
          this.searchResults = data;
          this.totalResults = data.length;
          this.loading = false;
        })
        .catch(error => {
          console.error('搜索错误:', error);
          this.$message.error('搜索模组失败');
          this.loading = false;
          this.searchResults = [];
        });
    },
    
    resetSearch() {
      this.searchForm.keyword = '';
      this.hasSearched = false;
      this.searchResults = [];
    },
    
    handlePageChange(page) {
      this.currentPage = page;
      // 如果需要分页，可以在这里添加逻辑
      // 目前API不支持分页，所以暂时不处理
    },
    
    formatNumber(num) {
      return num;
    },
    
    configMod(mod) {
      this.selectedModId = mod.id;
      this.currentMod = mod;
      this.configDialogVisible = true;
    },
    
    viewDetails(mod) {
      this.currentMod = mod;
      this.detailsDialogVisible = true;
    },
    
    closeSearch() {
      this.goToModList();
    },
    
    goToModList() {
      this.$router.push('/mods');
    },
    
    handleConfigUpdated(data) {
      this.$message({
        type: 'success',
        message: '模组配置已保存'
      });
      
      // 可选：自动返回模组列表
      // this.goToModList();
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

.search-form-container {
  margin-bottom: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid #EBEEF5;
}

.mod-search-results {
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

.mod-card-image {
  position: relative;
  width: 100%;
  height: 0;
  padding-bottom: 56.25%; /* 16:9 比例 */
  overflow: hidden;
  border-radius: 4px 4px 0 0;
}

.mod-card-image .el-image {
  position: absolute;
  top: 0;
  left: 0;
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

.mod-card-badge {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 1;
}

.mod-card-content {
  padding: 15px;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.mod-card-title {
  font-weight: bold;
  font-size: 16px;
  margin-bottom: 10px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mod-card-meta {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #606266;
  margin-bottom: 10px;
}

.mod-card-author,
.mod-card-stats {
  display: flex;
  align-items: center;
}

.mod-card-author i,
.mod-card-stats i {
  margin-right: 5px;
}

.mod-card-description {
  font-size: 13px;
  color: #606266;
  margin-bottom: 10px;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.mod-card-version {
  margin-bottom: 10px;
}

.version-tag {
  background-color: #f0f0f0;
  padding: 2px 5px;
  border-radius: 4px;
  font-size: 12px;
  color: #606266;
}

.mod-card-actions {
  display: flex;
  justify-content: space-between;
  border-top: 1px solid #EBEEF5;
  padding-top: 10px;
}

.pagination-container {
  text-align: center;
  margin-top: 30px;
}

.empty-results,
.initial-prompt {
  padding: 40px 0;
  text-align: center;
}

.prompt-content {
  max-width: 500px;
  margin: 0 auto;
}

.prompt-icon {
  font-size: 48px;
  color: #409EFF;
  margin-bottom: 20px;
}

.url-import {
  margin-top: 30px;
  max-width: 400px;
  margin-left: auto;
  margin-right: auto;
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

.mod-details-preview {
  width: 250px;
  height: 140px;
  margin-right: 20px;
  flex-shrink: 0;
  border-radius: 4px;
  overflow: hidden;
}

.mod-details-preview .el-image {
  width: 100%;
  height: 100%;
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
.mod-details-update,
.mod-details-subscribers {
  margin-right: 15px;
  margin-bottom: 5px;
  display: flex;
  align-items: center;
}

.mod-details-author i,
.mod-details-update i,
.mod-details-subscribers i {
  margin-right: 5px;
}

.mod-details-version {
  margin-top: 15px;
}

.mod-details-actions {
  margin-top: 15px;
}

.mod-details-description {
  margin-bottom: 20px;
}

.mod-details-description h3 {
  font-size: 16px;
  margin: 0 0 10px 0;
  color: #303133;
}

.description-content {
  padding: 15px;
  background-color: #f8f8f8;
  border-radius: 4px;
  color: #606266;
  line-height: 1.6;
  font-size: 14px;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .search-form-container .el-form {
    display: flex;
    flex-direction: column;
  }
  
  .search-form-container .el-form-item {
    margin-right: 0;
    margin-bottom: 10px;
  }
  
  .mod-details-header {
    flex-direction: column;
  }
  
  .mod-details-preview {
    width: 100%;
    max-width: 300px;
    height: auto;
    margin: 0 auto 15px;
  }
}
</style> 