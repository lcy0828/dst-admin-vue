<template>
  <div class="page-container">
    <el-card class="main-card">
      <template #header>
        <div class="clearfix">
          <span>搜索模组</span>
          <div class="header-actions">
            <el-button size="small" type="primary" @click="goToModList">返回已下载模组</el-button>
          </div>
        </div>
      </template>
      
      <!-- 搜索表单 -->
      <div class="search-form-container">
        <el-form :inline="true" :model="searchForm" size="small">
          <el-form-item label="房间">
            <el-select
              v-model="selectedRoomId"
              placeholder="请选择房间"
              filterable
              :loading="loadingRooms"
              @change="handleRoomChange">
              <el-option
                v-for="room in roomOptions"
                :key="room.id"
                :label="room.name"
                :value="room.id">
              </el-option>
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-input 
              v-model="searchForm.keyword" 
              placeholder="输入模组名称搜索..." 
              prefix-icon="el-icon-search" 
              clearable
              @keyup.enter="startSearch">
            </el-input>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="startSearch" :loading="searching">搜索</el-button>
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
                      <template #error>
                        <div class="image-slot">
                          <component :is="'el-icon-picture-outline'" class="legacy-icon" />
                        </div>
                      </template>
                    </el-image>
                  </div>
                  
                  <div class="mod-card-info">
                    <div class="mod-card-author">
                      <component :is="'el-icon-user'" class="legacy-icon" />
                      <span>{{ mod.auth }}</span>
                    </div>
                    <div class="mod-card-version" v-if="mod.version">
                      <component :is="'el-icon-info'" class="legacy-icon" />
                      <span>{{ mod.version }}</span>
                    </div>
                    <div class="mod-card-update">
                      <component :is="'el-icon-time'" class="legacy-icon" />
                      <span>{{ mod.time }}</span>
                    </div>
                    <div class="mod-card-subscribers">
                      <component :is="'el-icon-user-solid'" class="legacy-icon" />
                      <span>{{ mod.sub }} 订阅</span>
                    </div>
                    <div class="mod-card-rating" v-if="mod.rating !== null">
                      <component :is="'el-icon-star-on'" class="legacy-icon" />
                      <span>{{ formatRating(mod.rating) }} 评分</span>
                    </div>
                  </div>
                </div>
                
                <div class="mod-card-actions">
                  <el-button 
                    size="small" 
                    :type="mod.isInstalled ? 'success' : 'primary'" 
                    :disabled="!selectedRoomId || downloadingMods[mod.id]"
                    :loading="downloadingMods[mod.id]"
                    @click="handleDownloadMod(mod)">
                    <span v-if="mod.isInstalled">
                      <component :is="'el-icon-refresh'" class="legacy-icon" /> 更新
                    </span>
                    <span v-else>
                      {{ downloadingMods[mod.id] ? '下载中...' : '下载' }}
                    </span>
                  </el-button>
                  <el-dropdown trigger="click" @command="handleCommand" size="small">
                    <el-button size="small" type="text">
                      更多<component :is="'el-icon-arrow-down'" class="legacy-icon el-icon--right" />
                    </el-button>
                    <template #dropdown>
                      <el-dropdown-menu>
                        <el-dropdown-item :command="{type: 'details', mod: mod}">查看详情</el-dropdown-item>
                      </el-dropdown-menu>
                    </template>
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
              v-model:current-page="currentPage"
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
            <template #error>
              <div class="image-slot">
                <component :is="'el-icon-picture-outline'" class="legacy-icon" />
              </div>
            </template>
          </el-image>
          
          <div class="mod-details-info">
            <h2 class="mod-details-name">{{ currentModInfo.name }}</h2>
            <div class="mod-details-meta">
              <span class="mod-details-author">
                <component :is="'el-icon-user'" class="legacy-icon" /> {{ currentModInfo.auth }}
              </span>
              <span class="mod-details-version" v-if="currentModInfo.version">
                <component :is="'el-icon-info'" class="legacy-icon" /> v{{ currentModInfo.version }}
              </span>
              <span class="mod-details-update">
                <component :is="'el-icon-time'" class="legacy-icon" /> {{ currentModInfo.time }}
              </span>
              <span class="mod-details-subscribers" v-if="currentModInfo.sub">
                <component :is="'el-icon-user-solid'" class="legacy-icon" /> {{ currentModInfo.sub }} 订阅
              </span>
              <span class="mod-details-rating" v-if="currentModInfo.rating !== null">
                <component :is="'el-icon-star-on'" class="legacy-icon" /> {{ formatRating(currentModInfo.rating) }} 评分
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
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="detailsDialogVisible = false">关闭</el-button>
          <el-button
            type="primary"
            :disabled="!selectedRoomId || downloadingMods[currentModInfo?.id]"
            :loading="downloadingMods[currentModInfo?.id]"
            @click="handleDownloadMod(currentModInfo)">
            {{ currentModInfo?.isInstalled ? '更新模组' : '下载模组' }}
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { modApi } from '@/api';

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
      defaultImage: '',
      downloadingMods: {}, // 跟踪正在下载的模组
      installedMods: [], // 存储已安装的模组信息
      loadingInstalledMods: false, // 加载已安装模组的状态
      loadingRooms: false,
      roomOptions: [],
      selectedRoomId: '',
      selectedRoomWorlds: [],
      detailsDialogVisible: false, // 详情对话框可见性
      currentModInfo: null // 当前查看的模组
    };
  },
  async created() {
    await this.initializeContext();
    const keyword = this.$route.query.keyword;
    if (typeof keyword === 'string' && keyword.trim()) {
      this.searchForm.keyword = keyword;
      await this.searchMods();
    }
  },
  methods: {
    async initializeContext() {
      this.loadingRooms = true;
      try {
        const context = await modApi.getContext({ roomId: this.$route.query.roomId || '' });
        this.roomOptions = context.rooms;
        this.selectedRoomId = context.room?.id || '';
        this.selectedRoomWorlds = context.worlds;
        if (this.selectedRoomId) await this.getInstalledMods();
      } catch (error) {
        this.$message.error(error.message || '加载房间失败');
      } finally {
        this.loadingRooms = false;
      }
    },

    async handleRoomChange(roomId) {
      try {
        const context = await modApi.getContext({ roomId });
        this.selectedRoomWorlds = context.worlds;
        await this.$router.replace({
          path: this.$route.path,
          query: { ...this.$route.query, roomId }
        });
        await this.getInstalledMods();
        this.searchResults = this.searchResults.map(mod => ({
          ...mod,
          isInstalled: this.isModInstalled(mod.id)
        }));
      } catch (error) {
        this.$message.error(error.message || '切换房间失败');
      }
    },

    // 获取已安装模组列表
    async getInstalledMods() {
      if (!this.selectedRoomId) {
        this.installedMods = [];
        return;
      }
      this.loadingInstalledMods = true;
      try {
        this.installedMods = await modApi.getServerList({ roomId: this.selectedRoomId });
      } catch (error) {
        this.installedMods = [];
        this.$message.error(`获取已安装模组失败：${error.message || '未知错误'}`);
      } finally {
        this.loadingInstalledMods = false;
      }
    },
    
    // 检查模组是否已安装
    isModInstalled(modId) {
      return this.installedMods.some(mod => mod.modid === modId);
    },
    
    startSearch() {
      this.currentPage = 1;
      this.searchMods();
    },

    async searchMods() {
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
      
      try {
        const data = await modApi.searchMods({
          keyword: this.searchForm.keyword,
          page: this.currentPage,
          pageSize: this.pageSize
        });
        this.searchResults = (data.items || []).map(mod => ({
          ...mod,
          isInstalled: this.isModInstalled(mod.id)
        }));
        this.totalResults = data.total || 0;
      } catch (error) {
        this.$message.error(`搜索模组失败：${error.message || '未知错误'}`);
        this.searchResults = [];
        this.totalResults = 0;
      } finally {
        this.searching = false;
      }
    },
    handleDownloadMod(mod) {
      const { name } = mod;
      
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
    async downloadMod(mod) {
      if (!this.selectedRoomId) {
        this.$message.warning('请先选择房间');
        return;
      }
      const id = mod.id;
      const wasInstalled = mod.isInstalled;
      
      // 显示下载中消息
      const loadingMessage = this.$message({
        type: 'info',
        message: '正在下载模组，请耐心等待...',
        duration: 0,
        showClose: true
      });
      
      this.downloadingMods[id] = true;
      
      try {
        await modApi.downloadMod({
          roomId: this.selectedRoomId,
          worldIds: this.selectedRoomWorlds.map(world => world.id),
          id,
          installed: wasInstalled,
          enabled: true,
          includeDependencies: true
        });
        mod.isInstalled = true;
        await this.getInstalledMods();
        this.$message.success(wasInstalled ? '更新成功' : '下载成功');
      } catch (error) {
        this.$message.error(`${wasInstalled ? '更新' : '下载'}失败：${error.message || '未知错误'}`);
      } finally {
        loadingMessage.close();
        this.downloadingMods[id] = false;
      }
    },
    
    resetSearch() {
      this.searchForm.keyword = '';
      this.hasSearched = false;
      this.searchResults = [];
      this.searching = false;
      this.totalResults = 0;
      this.currentPage = 1;
    },
    
    handlePageChange(page) {
      this.currentPage = page;
      this.searchMods();
    },

    goToModList() {
      this.$router.push({ path: '/mods/list', query: { roomId: this.selectedRoomId || undefined } });
    },

    showModDetails(mod) {
      this.currentModInfo = mod;
      this.detailsDialogVisible = true;
    },

    // 提取星级评分
    formatRating(rating) {
      return Number.isFinite(Number(rating)) ? Number(rating).toFixed(2) : '';
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
  border-bottom: 1px solid var(--border-color);
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
  border-bottom: 1px solid var(--border-color);
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
  background-color: var(--surface-muted);
  color: var(--text-secondary);
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
  color: var(--text-secondary);
}

.mod-card-actions {
  display: flex;
  justify-content: space-between;
  margin-top: auto;
  padding-top: 10px;
  border-top: 1px solid var(--border-color);
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
  color: var(--primary-color);
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
  border-bottom: 1px solid var(--border-color);
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
  color: var(--text-primary);
  line-height: 1.2;
}

.mod-details-meta {
  display: flex;
  flex-wrap: wrap;
  margin-bottom: 15px;
  color: var(--text-regular);
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
  color: var(--text-primary);
}

.description-content {
  padding: 15px;
  background-color: #f8f8f8;
  border-radius: 4px;
  color: var(--text-regular);
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
  background-color: var(--surface-muted);
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
  border-top: 1px solid var(--border-color);
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
