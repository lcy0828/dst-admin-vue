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
              @keyup.enter="searchMods">
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
          <div class="mod-flex-container">
            <div 
              v-for="index in 8" 
              :key="'skeleton-' + index" 
              class="mod-flex-item">
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
            </div>
          </div>
        </div>
        
        <!-- 搜索结果 -->
        <div v-else-if="searchResults.length > 0" class="mod-grid">
          <div class="mod-flex-container">
            <div
              v-for="mod in searchResults" 
              :key="mod.id" 
              class="mod-flex-item">
              <el-card 
                class="mod-card" 
                :class="{'is-installed': mod.isInstalled}"
                shadow="hover">
                <div class="mod-card-header">
                  <div class="mod-card-title" :title="mod.name">{{ mod.name }}</div>
                  <div v-if="mod.isInstalled" class="status-switch">
                    <el-tag size="small" type="success">已安装</el-tag>
                  </div>
                </div>

                <div class="mod-card-content">
                  <div class="mod-card-image">
                    <el-image 
                      :src="mod.img || defaultImage" 
                      fit="cover"
                      lazy>
                      <div slot="error" class="image-slot">
                        <component is="el-icon-picture-outline" class="legacy-icon" />
                      </div>
                    </el-image>
                  </div>
                  
                  <div class="mod-card-info">
                    <div class="mod-card-author">
                      <component is="el-icon-user" class="legacy-icon" />
                      <span>{{ mod.auth }}</span>
                    </div>
                    <div class="mod-card-version">
                      <component is="el-icon-info" class="legacy-icon" />
                      <span>{{ mod.version }}</span>
                    </div>
                    <div class="mod-card-update">
                      <component is="el-icon-time" class="legacy-icon" />
                      <span>{{ mod.time }}</span>
                    </div>
                    <div class="mod-card-subscribers">
                      <component is="el-icon-user-solid" class="legacy-icon" />
                      <span>{{ mod.sub }} 订阅</span>
                    </div>
                    <div class="mod-card-rating" v-if="mod.rating_img">
                      <component is="el-icon-star-on" class="legacy-icon" />
                      <span>{{ extractRating(mod.rating_img) }} 星</span>
                    </div>
                  </div>
                </div>
                
                <div class="mod-card-actions">
                  <el-button 
                    size="small" 
                    :type="mod.isInstalled ? 'success' : 'primary'" 
                    :disabled="downloadingMods[mod.id]" 
                    :loading="downloadingMods[mod.id]"
                    @click="handleDownloadMod(mod)">
                    <span v-if="mod.isInstalled">
                      <component is="el-icon-refresh" class="legacy-icon" /> 更新
                    </span>
                    <span v-else>
                      {{ downloadingMods[mod.id] ? '下载中...' : '下载' }}
                    </span>
                  </el-button>
                  <el-dropdown trigger="click" @command="handleCommand" size="small">
                    <el-button size="small" type="text">
                      更多<component is="el-icon-arrow-down" class="legacy-icon el-icon--right" />
                    </el-button>
                    <el-dropdown-menu slot="dropdown">
                      <el-dropdown-item :command="{type: 'details', mod: mod}">查看详情</el-dropdown-item>
                    </el-dropdown-menu>
                  </el-dropdown>
                </div>
              </el-card>
            </div>
          </div>
          
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
    
    <!-- 模组详情对话框 -->
    <el-dialog
      title="模组详情"
      v-model="detailsDialogVisible"
      width="700px"
      class="mod-details-dialog"
      :modal="false"
      :append-to-body="true">
      <div v-if="currentModInfo" class="mod-details-content">
        <!-- 模组基本信息 -->
        <div class="mod-details-header">
          <el-image 
            :src="currentModInfo.img || defaultImage" 
            fit="cover"
            class="mod-details-image">
            <div slot="error" class="image-slot">
              <component is="el-icon-picture-outline" class="legacy-icon" />
            </div>
          </el-image>
          
          <div class="mod-details-info">
            <h2 class="mod-details-name">{{ currentModInfo.name }}</h2>
            <div class="mod-details-meta">
              <span class="mod-details-author">
                <component is="el-icon-user" class="legacy-icon" /> {{ currentModInfo.auth }}
              </span>
              <span class="mod-details-version">
                <component is="el-icon-info" class="legacy-icon" /> v{{ currentModInfo.version }}
              </span>
              <span class="mod-details-update">
                <component is="el-icon-time" class="legacy-icon" /> {{ currentModInfo.time }}
              </span>
              <span class="mod-details-subscribers" v-if="currentModInfo.sub">
                <component is="el-icon-user-solid" class="legacy-icon" /> {{ currentModInfo.sub }} 订阅
              </span>
              <span class="mod-details-rating" v-if="currentModInfo.rating_img">
                <component is="el-icon-star-on" class="legacy-icon" /> {{ extractRating(currentModInfo.rating_img) }} 星
              </span>
            </div>
            <div class="mod-details-status" v-if="currentModInfo.isInstalled">
              <el-tag size="medium" type="success">已安装</el-tag>
            </div>
          </div>
        </div>
        
        <!-- 模组描述 -->
        <div class="mod-details-description" v-if="currentModInfo.describe">
          <h3>模组描述</h3>
          <div class="description-content">
            {{ currentModInfo.describe || '该模组暂无描述' }}
          </div>
        </div>
      </div>
      
      <span slot="footer" class="dialog-footer">
        <el-button @click="detailsDialogVisible = false">关闭</el-button>
        <el-button 
          type="primary" 
          :disabled="downloadingMods[currentModInfo?.id]"
          :loading="downloadingMods[currentModInfo?.id]"
          @click="handleDownloadMod(currentModInfo)">
          {{ currentModInfo?.isInstalled ? '更新模组' : '下载模组' }}
        </el-button>
      </span>
    </el-dialog>
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
      downloadingMods: {}, // 跟踪正在下载的模组
      installedMods: [], // 存储已安装的模组信息
      loadingInstalledMods: false, // 加载已安装模组的状态
      detailsDialogVisible: false, // 详情对话框可见性
      currentModInfo: null // 当前查看的模组
    };
  },
  created() {
    // 获取已安装模组列表
    this.getInstalledMods();
    
    const urlParams = new URLSearchParams(window.location.search);
    const keyword = urlParams.get('keyword');
    
    if (keyword) {
      this.searchForm.keyword = keyword;
      this.searchMods();
    }
  },
  methods: {
    // 获取已安装模组列表
    getInstalledMods() {
      this.loadingInstalledMods = true;
      modApi.getServerList()
        .then(res => {
          this.installedMods = res || [];
        })
        .catch(err => {
          console.error('获取已安装模组失败:', err);
        })
        .finally(() => {
          this.loadingInstalledMods = false;
        });
    },
    
    // 检查模组是否已安装
    isModInstalled(modId) {
      return this.installedMods.some(mod => mod.modid === modId);
    },
    
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
            // 标记已安装的模组
            this.searchResults = data.map(mod => ({
              ...mod,
              isInstalled: this.isModInstalled(mod.id)
            }));
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
      
      // 如果模组已安装，询问是否要更新
      if (mod.isInstalled) {
        this.$confirm(`模组 "${name}" 已安装，是否要更新？`, '提示', {
          confirmButtonText: '更新',
          cancelButtonText: '取消',
          type: 'warning'
        }).then(() => {
          this.downloadMod(mod);
        }).catch(() => {
          // 用户取消，不执行任何操作
        });
      } else {
        // 直接下载
        this.downloadMod(mod);
      }
    },
    
    // 实际执行下载的方法
    downloadMod(mod) {
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
          
          // 更新模组状态
          this.$set(mod, 'isInstalled', true);
          
          // 刷新已安装模组列表
          this.getInstalledMods();
          
          this.$message.success(mod.isInstalled ? '更新成功' : '下载成功');
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

    showModDetails(mod) {
      this.currentModInfo = mod;
      this.detailsDialogVisible = true;
    },

    // 提取星级评分
    extractRating(ratingImg) {
      if (!ratingImg) return '';
      try {
        // 从形如"https://community.fastly.steamstatic.com/public/images/sharedfiles/5-star.png"的图片URL提取星级
        const match = ratingImg.match(/(\d+)-star/);
        if (match && match[1]) {
          return match[1];
        }
        return '';
      } catch (error) {
        return '';
      }
    },
    
    // 处理下拉菜单命令
    handleCommand(command) {
      switch(command.type) {
        case 'details':
          this.showModDetails(command.mod);
          break;
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

.search-form-container {
  margin-bottom: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid #e8ece5;
}

.mod-search-results {
  min-height: 400px;
}

.mod-grid {
  margin-bottom: 20px;
}

.mod-flex-container {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
}

.mod-flex-item {
  flex: 0 0 calc(25% - 15px);
  margin-bottom: 20px;
  min-width: 0;
}

@media (max-width: 1200px) {
  .mod-flex-item {
    flex: 0 0 calc(33.333% - 14px);
  }
}

@media (max-width: 992px) {
  .mod-flex-item {
    flex: 0 0 calc(50% - 10px);
  }
}

@media (max-width: 768px) {
  .mod-flex-item {
    flex: 0 0 100%;
  }
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

.mod-card-header {
  border-bottom: 1px solid #e8ece5;
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
  background-color: #f1f4ed;
  color: #758078;
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
.mod-card-update,
.mod-card-subscribers,
.mod-card-rating {
  display: flex;
  align-items: center;
  margin-bottom: 5px;
}

.mod-card-author i,
.mod-card-version i,
.mod-card-update i,
.mod-card-subscribers i,
.mod-card-rating i {
  margin-right: 5px;
  width: 16px;
  text-align: center;
  color: #758078;
}

.mod-card-actions {
  display: flex;
  justify-content: space-between;
  margin-top: auto;
  padding-top: 10px;
  border-top: 1px solid #e8ece5;
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
  color: #d97932;
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
  border-bottom: 1px solid #e8ece5;
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
  color: #27352f;
  line-height: 1.2;
}

.mod-details-meta {
  display: flex;
  flex-wrap: wrap;
  margin-bottom: 15px;
  color: #536159;
}

.mod-details-author,
.mod-details-version,
.mod-details-update,
.mod-details-subscribers,
.mod-details-rating {
  margin-right: 15px;
  margin-bottom: 5px;
  display: flex;
  align-items: center;
}

.mod-details-author i,
.mod-details-version i,
.mod-details-update i,
.mod-details-subscribers i,
.mod-details-rating i {
  margin-right: 5px;
}

.mod-details-description {
  margin-bottom: 20px;
}

.mod-details-description h3 {
  font-size: 16px;
  margin: 0 0 10px 0;
  color: #27352f;
}

.description-content {
  padding: 15px;
  background-color: #f8f8f8;
  border-radius: 4px;
  color: #536159;
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
  background-color: #f1f4ed;
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
  border-top: 1px solid #e8ece5;
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
:deep(.el-dialog__wrapper) {
  background-color: transparent !important;
  pointer-events: auto !important;
}

:deep(.el-dialog) {
  pointer-events: auto !important;
}

:deep(.v-modal) {
  display: none !important;
  opacity: 0 !important;
  visibility: hidden !important;
}

.mod-card.is-installed {
  border: 2px solid #4f8a5b;
  box-shadow: 0 4px 12px rgba(103, 194, 58, 0.2);
}

.mod-card.is-installed:hover {
  box-shadow: 0 8px 16px rgba(103, 194, 58, 0.3);
}
</style> 