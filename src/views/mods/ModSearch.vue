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
            <el-button type="primary" @click="searchMods" :loading="searching">搜索</el-button>
            <el-button @click="resetSearch">重置</el-button>
          </el-form-item>
        </el-form>
      </div>
      
      <!-- 模组列表 -->
      <div class="mod-search-results">
        <!-- 加载中提示 -->
        <div v-if="searching" class="loading-container">
          <el-row :gutter="20">
            <el-col 
              :xs="24" 
              :sm="12" 
              :md="8" 
              :lg="6" 
              v-for="index in 8" 
              :key="'skeleton-' + index" 
              class="mod-card-col">
              <div class="loading-card">
                <div class="loading-image"></div>
                <div class="loading-content">
                  <div class="loading-title"></div>
                  <div class="loading-meta"></div>
                  <div class="loading-description"></div>
                  <div class="loading-actions">
                    <div class="loading-button"></div>
                    <div class="loading-button"></div>
                  </div>
                </div>
              </div>
            </el-col>
          </el-row>
        </div>
        
        <!-- 搜索结果 -->
        <div v-else-if="searchResults.length > 0" class="mod-grid">
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
                    :disabled="downloadingMods[mod.id]" 
                    :loading="downloadingMods[mod.id]"
                    @click="handleDownloadMod(mod)">
                    {{ downloadingMods[mod.id] ? '下载中...' : '下载到服务器' }}
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
        <div v-else-if="hasSearched" class="empty-results">
          <el-empty description="没有找到匹配的模组" :image-size="200">
            <template #description>
              <p>没有找到匹配的模组</p>
              <p>尝试使用不同的关键词或者筛选条件</p>
            </template>
          </el-empty>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script>
import { itemApi, modApi } from '@/api';

export default {
  name: 'ModSearch',
  data() {
    return {
      searchForm: {
        keyword: '',
      },
      searching: false,
      hasSearched: false,
      searchResults: [],
      totalResults: 0,
      pageSize: 20,
      currentPage: 1,
      defaultImage: 'https://placehold.co/200x200/409EFF/white?text=MOD',
      downloadingMods: {} // 跟踪正在下载的模组
    };
  },
  created() {
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
      if (this.searching) {
        return;
      }
      
      this.searching = true;
      this.hasSearched = true;
      this.searchResults = [];
      
      const encodedKeyword = encodeURIComponent(this.searchForm.keyword);
      
      itemApi.searchItems({modname: encodedKeyword})
        .then(data => {
          if (Array.isArray(data)) {
            this.searchResults = data;
            this.totalResults = data.length;
          } else {
            this.searchResults = [];
            this.totalResults = 0;
          }
        })
        .catch(error => {
          this.$message.error('搜索模组失败');
          this.searchResults = [];
        })
        .finally(() => {
          this.searching = false;
        });
    },
    handleDownloadMod(mod) {
      let {id, img, name, time, version, sub, rating_img, auth} = mod;
      let params = {
        auth,
        id,
        img,
        name,
        time,
        version,
        sub,
        rating: rating_img.split('https://community.fastly.steamstatic.com/public/images/sharedfiles/')[1].split('-')[0]
      }
      
      // 显示下载中消息
      const loadingMessage = this.$message({
        type: 'info',
        message: '正在下载模组，请耐心等待...',
        duration: 0,
        showClose: true
      });
      
      this.downloadingMods[id] = true;
      
      modApi.downloadMod(params)  
        .then(() => {
          // 关闭下载中消息
          loadingMessage.close();
          this.$message.success('下载成功');
          this.downloadingMods[id] = false;
        })
        .catch(error => {
          // 关闭下载中消息
          loadingMessage.close();
          this.$message.error('下载失败：' + (error.message || '未知错误'));
          this.downloadingMods[id] = false;
        });
    },
    
    resetSearch() {
      this.searchForm.keyword = '';
      this.hasSearched = false;
      this.searchResults = [];
      this.searching = false;
    },
    
    handlePageChange(page) {
      this.currentPage = page;
    },

    goToModList() {
      this.$router.push('/mods');
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
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.mod-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 15px 30px rgba(0, 0, 0, 0.15);
}

.mod-card-image {
  position: relative;
  width: 100%;
  height: 0;
  padding-bottom: 56.25%; /* 16:9 比例 */
  overflow: hidden;
}

.mod-card-image .el-image {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s ease;
}

.mod-card:hover .mod-card-image .el-image {
  transform: scale(1.05);
}

.image-slot {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #f5f7fa, #e4e8f0);
  color: #909399;
}

.image-slot i {
  font-size: 24px;
  opacity: 0.7;
}

.mod-card-badge {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 1;
}

.mod-card-badge .el-tag {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  font-weight: bold;
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
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transition: all 0.3s;
}

.mod-details-preview:hover {
  transform: scale(1.02);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
}

.mod-details-preview .el-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
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

.loading-container {
  min-height: 300px;
  padding: 20px;
}

.loading-container .el-skeleton {
  margin-bottom: 20px;
}

.loading-card {
  height: 300px;
  background-color: #f5f7fa;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.loading-image {
  height: 150px;
  background: linear-gradient(90deg, #f2f2f2 25%, #e6e6e6 50%, #f2f2f2 75%);
  background-size: 200% 100%;
  animation: loading 1.5s infinite;
}

.loading-content {
  padding: 15px;
}

.loading-title, .loading-meta, .loading-description {
  height: 16px;
  margin-bottom: 15px;
  background: linear-gradient(90deg, #f2f2f2 25%, #e6e6e6 50%, #f2f2f2 75%);
  background-size: 200% 100%;
  animation: loading 1.5s infinite;
  border-radius: 3px;
}

.loading-title {
  width: 70%;
}

.loading-meta {
  width: 50%;
  height: 12px;
}

.loading-description {
  width: 100%;
  height: 40px;
}

@keyframes loading {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

.loading-actions {
  display: flex;
  justify-content: space-between;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid #ebeef5;
}

.loading-button {
  width: 45%;
  height: 28px;
  border-radius: 4px;
  background: linear-gradient(90deg, #f2f2f2 25%, #e6e6e6 50%, #f2f2f2 75%);
  background-size: 200% 100%;
  animation: loading 1.5s infinite;
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
  
  .loading-container {
    padding: 10px;
  }
}

/* 禁用蒙版和对话框覆盖样式 */
::v-deep .el-dialog__wrapper {
  background-color: transparent !important;
  pointer-events: auto !important;
}

::v-deep .el-dialog {
  pointer-events: auto !important;
}

::v-deep .v-modal {
  display: none !important;
  opacity: 0 !important;
  visibility: hidden !important;
}
</style> 