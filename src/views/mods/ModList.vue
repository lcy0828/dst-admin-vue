<template>
  <div class="page-container">
    <el-card class="main-card">
      <template #header>
        <div class="clearfix">
          <span>已下载模组</span>
          <div class="header-actions">
            <el-button size="small" type="primary" @click="refreshModList">刷新</el-button>
            <el-button size="small" type="success" @click="goToSearch">添加模组</el-button>
            <el-button size="small" type="info" @click="getModConfigFile">获取配置文件</el-button>
          </div>
        </div>
      </template>

      <!-- 过滤和排序区域 -->
      <div class="filter-container">
        <el-form :inline="true" :model="filterForm" size="small">
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
          <el-form-item label="世界">
            <el-select
              v-model="selectedWorldId"
              placeholder="配置与文件查看目标"
              filterable
              clearable
              :disabled="!selectedRoomId"
              @change="handleWorldChange">
              <el-option
                v-for="world in selectedRoomWorlds"
                :key="world.id"
                :label="world.name"
                :value="world.id">
              </el-option>
            </el-select>
          </el-form-item>
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
              <el-option label="更新时间" value="update_time"></el-option>
              <el-option label="订阅数" value="subscribers"></el-option>
              <el-option label="评分" value="rating"></el-option>
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
          <div class="mod-flex-container">
            <div 
              v-for="mod in filteredMods" 
              :key="mod.id" 
              class="mod-flex-item">
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
                      :src="mod.image || defaultIcon" 
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
                      <span>{{ mod.author }}</span>
                    </div>
                    <div class="mod-card-version" v-if="mod.version">
                      <component :is="'el-icon-info'" class="legacy-icon" />
                      <span>{{ mod.version }}</span>
                    </div>
                    <div class="mod-card-update" v-if="mod.update_time">
                      <component :is="'el-icon-time'" class="legacy-icon" />
                      <span>{{ mod.update_time }}</span>
                    </div>
                    <div class="mod-card-subscribers" v-if="mod.subscribers">
                      <component :is="'el-icon-user-solid'" class="legacy-icon" />
                      <span>{{ mod.subscribers }} 订阅</span>
                    </div>
                    <div class="mod-card-rating" v-if="mod.rating !== null">
                      <component :is="'el-icon-star-on'" class="legacy-icon" />
                      <span>{{ mod.rating }} 评分</span>
                    </div>
                    <div class="mod-card-tags" v-if="mod.tags && mod.tags.length">
                      <el-tag size="mini" v-for="tag in mod.tags" :key="tag" class="mod-tag">{{ tag }}</el-tag>
                    </div>
                  </div>
                </div>
                
                <div class="mod-card-actions">
                  <el-button 
                    size="small" 
                    type="primary"
                    :disabled="!selectedWorldId"
                    @click="openConfigDialog(mod)">
                    配置
                  </el-button>
                  <el-dropdown trigger="click" @command="handleCommand" size="small">
                    <el-button size="small" type="text">
                      更多<component :is="'el-icon-arrow-down'" class="legacy-icon el-icon--right" />
                    </el-button>
                    <template #dropdown>
                      <el-dropdown-menu>
                        <el-dropdown-item :command="{type: 'details', mod: mod}">查看详情</el-dropdown-item>
                        <el-dropdown-item :command="{type: 'update', mod: mod}" v-if="mod.updateAvailable">更新模组</el-dropdown-item>
                        <el-dropdown-item :command="{type: 'uninstall', mod: mod}">卸载模组</el-dropdown-item>
                      </el-dropdown-menu>
                    </template>
                  </el-dropdown>
                </div>
              </el-card>
            </div>
          </div>
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
      v-model="configDialogVisible"
      :mod-id="currentModId"
      :mod-info="currentModInfo"
      :room-id="selectedRoomId"
      :world-id="selectedWorldId"
      :is-new-mod="false"
      @config-updated="handleConfigUpdated">
    </mod-config-dialog>

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
            :src="currentModInfo.image || defaultIcon" 
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
                <component :is="'el-icon-user'" class="legacy-icon" /> {{ currentModInfo.author }}
              </span>
              <span class="mod-details-version" v-if="currentModInfo.version">
                <component :is="'el-icon-info'" class="legacy-icon" /> v{{ currentModInfo.version }}
              </span>
              <span class="mod-details-update" v-if="currentModInfo.update_time">
                <component :is="'el-icon-time'" class="legacy-icon" /> {{ currentModInfo.update_time }}
              </span>
              <span class="mod-details-subscribers" v-if="currentModInfo.subscribers">
                <component :is="'el-icon-user-solid'" class="legacy-icon" /> {{ currentModInfo.subscribers }} 订阅
              </span>
              <span class="mod-details-rating" v-if="currentModInfo.rating !== null">
                <component :is="'el-icon-star-on'" class="legacy-icon" /> {{ currentModInfo.rating }} 评分
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
              <span class="file-info-label">模组ID:</span>
              <span class="file-info-value">{{ currentModInfo.modid || '未知' }}</span>
            </div>
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
              <span class="file-info-value">{{ currentModInfo.time || currentModInfo.installedAt || '未知' }}</span>
            </div>
          </div>
        </div>
      </div>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="detailsDialogVisible = false">关闭</el-button>
          <el-button type="primary" @click="openConfigDialog(currentModInfo)" :disabled="!currentModInfo || !selectedWorldId">配置模组</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 卸载确认对话框 -->
    <el-dialog
      title="卸载模组"
      v-model="uninstallDialogVisible"
      width="500px"
      :modal="false"
      :append-to-body="true">
      <div class="uninstall-content">
        <p>您确定要卸载模组 <strong>{{ currentModInfo ? currentModInfo.name : '' }}</strong> 吗？</p>
        <p class="warning-text">此操作将永久删除该模组的所有文件和配置，且不可恢复。</p>
        <el-input
          v-model="uninstallConfirmation"
          :placeholder="currentRoom ? `请输入完整房间名：${currentRoom.name}` : '请输入完整房间名'">
        </el-input>
      </div>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="uninstallDialogVisible = false">取消</el-button>
          <el-button type="danger" @click="confirmUninstall" :loading="uninstalling">确认卸载</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 模组配置文件查看对话框 -->
    <el-dialog
      title="模组配置文件 (modoverrides.lua)"
      v-model="configFileDialogVisible"
      width="60%"
      :append-to-body="true"
      class="config-file-dialog">
      <div v-loading="loadingConfig" class="config-file-content">
        <pre class="lua-code">{{ configFileContent }}</pre>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="configFileDialogVisible = false">关闭</el-button>
          <el-button type="primary" @click="downloadConfigFile">下载配置文件</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import ModConfigDialog from './ModConfigDialog.vue';
import { modApi } from '@/api';

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
      loadingRooms: false,
      roomOptions: [],
      selectedRoomId: '',
      selectedRoomWorlds: [],
      selectedWorldId: '',
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
      uninstallConfirmation: '',
      // 默认图标
      defaultIcon: '',
      // 配置文件查看相关
      configFileDialogVisible: false,
      configFileContent: '',
      loadingConfig: false,
    };
  },
  computed: {
    currentRoom() {
      return this.roomOptions.find(room => room.id === this.selectedRoomId) || null;
    },
    // 筛选后的模组列表
    filteredMods() {
      let result = [...this.modsList];
      if (this.filterForm.status) {
        const isEnabled = this.filterForm.status === 'enabled';
        result = result.filter(mod => mod.enabled === isEnabled);
      }
      if (this.filterForm.keyword) {
        const keyword = this.filterForm.keyword.toLowerCase();
        result = result.filter(mod => 
          (mod.name || '').toLowerCase().includes(keyword) ||
          (mod.author || '').toLowerCase().includes(keyword) ||
          (mod.description && mod.description.toLowerCase().includes(keyword))
        );
      }
      result.sort((a, b) => {
        switch (this.filterForm.sortBy) {
          case 'name':
            return (a.name || '').localeCompare(b.name || '');
          case 'author':
            return (a.author || '').localeCompare(b.author || '');
          case 'update_time': {
            // 处理各种可能的日期格式
            const timeA = a.update_time || a.updatedAt || '';
            const timeB = b.update_time || b.updatedAt || '';
            return timeB.localeCompare(timeA); // 简单字符串比较，新的日期通常字符串比较结果更大
          }
          case 'subscribers': {
            // 移除逗号并转为数字
            const subsA = parseInt((a.subscribers || '0').replace(/,/g, '')) || 0;
            const subsB = parseInt((b.subscribers || '0').replace(/,/g, '')) || 0;
            return subsB - subsA;
          }
          case 'rating': {
            // 确保评分是数字
            const ratingA = parseFloat(a.rating || 0);
            const ratingB = parseFloat(b.rating || 0);
            return ratingB - ratingA;
          }
          default:
            return 0;
        }
      });
      return result;
    }
  },
  async created() {
    await this.initializeContext();
  },
  methods: {
    async initializeContext() {
      this.loadingRooms = true;
      try {
        const context = await modApi.getContext({
          roomId: this.$route.query.roomId || '',
          worldId: this.$route.query.worldId || ''
        });
        this.roomOptions = context.rooms;
        this.selectedRoomId = context.room?.id || '';
        this.selectedRoomWorlds = context.worlds;
        this.selectedWorldId = context.world?.id || '';
        if (this.selectedRoomId) await this.fetchModsList();
      } catch (error) {
        this.$message.error(error.message || '加载模组上下文失败');
      } finally {
        this.loadingRooms = false;
      }
    },

    async handleRoomChange(roomId) {
      try {
        const context = await modApi.getContext({ roomId });
        this.selectedRoomWorlds = context.worlds;
        this.selectedWorldId = context.world?.id || '';
        await this.syncRouteContext();
        await this.fetchModsList();
      } catch (error) {
        this.$message.error(error.message || '切换房间失败');
      }
    },

    async handleWorldChange() {
      await this.syncRouteContext();
    },

    async syncRouteContext() {
      await this.$router.replace({
        path: this.$route.path,
        query: {
          ...this.$route.query,
          roomId: this.selectedRoomId || undefined,
          worldId: this.selectedWorldId || undefined
        }
      });
    },

    // 获取模组列表
    async fetchModsList() {
      if (!this.selectedRoomId) {
        this.modsList = [];
        return;
      }
      this.loading = true;
      try {
        this.modsList = await modApi.getServerList({ roomId: this.selectedRoomId });
      } catch (error) {
        this.modsList = [];
        this.$message.error(`获取模组列表失败：${error.message || '未知错误'}`);
      } finally {
        this.loading = false;
      }
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
      if (!this.selectedWorldId) {
        this.$message.warning('请先选择要配置的世界');
        return;
      }
      // 先重置当前模组信息
      this.currentModInfo = null;
      this.loading = true;
      
      // 先获取模组配置数据
      modApi.getModConfig({
        roomId: this.selectedRoomId,
        worldId: this.selectedWorldId,
        modid: mod.modid,
        mod
      }).then(res => {
        this.currentModId = mod.modid;
        this.currentModInfo = res.modinfo;
        // 获取数据成功后再显示对话框
        this.$nextTick(() => {
          this.configDialogVisible = true;
        });
      }).catch(err => {
        console.error(err);
        this.$message.error(`获取模组配置失败：${err.message || '未知错误'}`);
      }).finally(() => {
        this.loading = false;
      });
    },
    
    // 配置更新回调
    handleConfigUpdated(data) {
      this.$message({
        type: 'success',
        message: `模组 ${data.modId} 配置已更新！`
      });
      this.fetchModsList();
    },
    
    // 切换模组状态
    toggleModStatus(mod, status) {
      this.loading = true;
      const action = status ? '启用' : '禁用';
      
      modApi.toggleMod({
        roomId: this.selectedRoomId,
        modid: mod.modid,
        worldIds: mod.configuredWorlds.length > 0
          ? mod.configuredWorlds
          : this.selectedRoomWorlds.map(world => world.id),
        enabled: status
      }).then(() => {
        // 更新成功后,更新本地状态
        mod.enabled = status;
        this.$message({
          type: 'success',
          message: `已${action}模组 ${mod.name}`
        });
      }).catch(err => {
        console.error(err);
        // 操作失败,恢复状态
        mod.enabled = !status;
        this.$message({
          type: 'error',
          message: `${action}模组失败：${err.message || '未知错误'}`
        });
      }).finally(() => {
        this.loading = false;
      });
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
    async updateMod(mod) {
      this.loading = true;
      try {
        await modApi.updateMod({ roomId: this.selectedRoomId, modid: mod.modid });
        await this.fetchModsList();
        this.$message.success(`模组 ${mod.name} 已更新`);
      } catch (error) {
        this.$message.error(`更新模组失败：${error.message || '未知错误'}`);
      } finally {
        this.loading = false;
      }
    },
    
    // 卸载模组
    uninstallMod(mod) {
      this.currentModInfo = mod;
      this.uninstallConfirmation = '';
      this.uninstallDialogVisible = true;
    },
    
    // 确认卸载
    confirmUninstall() {
      if (!this.currentModInfo) return;
      if (!this.currentRoom || this.uninstallConfirmation !== this.currentRoom.name) {
        this.$message.warning('请输入完整房间名确认卸载');
        return;
      }
      
      this.uninstalling = true;
      
      // 使用新的接口卸载模组
      modApi.deleteMod({
        roomId: this.selectedRoomId,
        modid: this.currentModInfo.modid,
        worldIds: this.selectedRoomWorlds.map(world => world.id),
        confirmation: this.uninstallConfirmation,
        removeFiles: true
      })
        .then(() => {
          // 从列表中移除
          const index = this.modsList.findIndex(mod => mod.modid === this.currentModInfo.modid);
          if (index > -1) {
            this.modsList.splice(index, 1);
          }
          
          this.$message({
            type: 'success',
            message: `模组 ${this.currentModInfo.name} 已成功卸载`
          });
        })
        .catch(err => {
          console.error('卸载模组失败:', err);
          this.$message({
            type: 'error',
            message: `卸载模组失败: ${err.message || '未知错误'}`
          });
        })
        .finally(() => {
          this.uninstalling = false;
          this.uninstallDialogVisible = false;
          this.uninstallConfirmation = '';
          this.currentModInfo = null;
        });
    },
    
    // 导航到搜索页面
    goToSearch() {
      this.$router.push({ path: '/mods/search', query: { roomId: this.selectedRoomId || undefined } });
    },

    // 获取配置文件
    getModConfigFile() {
      if (!this.selectedWorldId) {
        this.$message.warning('请先选择要查看的世界');
        return;
      }
      this.loadingConfig = true;
      modApi.getAllModConfigFile({
        roomId: this.selectedRoomId,
        worldId: this.selectedWorldId
      })
        .then(res => {
          if (res && res.file?.exists) {
            // 保存配置文件内容并显示对话框
            this.configFileContent = res.modinfo;
            this.configFileDialogVisible = true;
          } else {
            this.$message.warning('该世界还没有 modoverrides.lua 文件');
          }
        })
        .catch(err => {
          console.error('获取配置文件失败:', err);
          this.$message.error(`获取配置文件失败：${err.message || '未知错误'}`);
        })
        .finally(() => {
          this.loadingConfig = false;
        });
    },
    
    // 下载配置文件
    downloadConfigFile() {
      if (!this.configFileContent) {
        this.$message.error('没有可下载的配置内容');
        return;
      }
      
      // 创建一个可下载的 Lua 文件
      const blob = new Blob([this.configFileContent], { type: 'text/plain' });
      
      // 创建临时下载链接
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = 'modoverrides.lua';
      
      // 点击下载
      document.body.appendChild(link);
      link.click();
      
      // 清理
      window.URL.revokeObjectURL(link.href);
      document.body.removeChild(link);
      
      this.$message.success('模组配置文件已成功下载');
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

.filter-container {
  margin-bottom: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--border-color);
}

.mod-list-container {
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
  color: var(--text-secondary);
}

.mod-card-subscribers,
.mod-card-rating {
  display: flex;
  align-items: center;
  margin-bottom: 5px;
}

.mod-card-subscribers i,
.mod-card-rating i {
  margin-right: 5px;
  width: 16px;
  text-align: center;
  color: var(--text-secondary);
}

.mod-card-tags {
  margin-top: 5px;
}

.mod-tag {
  margin-right: 5px;
  margin-bottom: 5px;
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
  color: var(--text-primary);
}

.description-content {
  padding: 10px;
  background-color: #f8f8f8;
  border-radius: 4px;
  color: var(--text-regular);
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
  color: var(--text-secondary);
  width: 100px;
  flex-shrink: 0;
}

.file-info-value {
  color: var(--text-regular);
}

/* 卸载对话框 */
.uninstall-content {
  text-align: center;
  padding: 20px 0;
}

.warning-text {
  color: #c94f4f;
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

/* 配置文件对话框样式 */
.config-file-content {
  max-height: 60vh;
  overflow-y: auto;
  padding: 10px;
  background-color: var(--surface-muted);
  border-radius: 4px;
}

.lua-code {
  font-family: 'Courier New', Courier, monospace;
  white-space: pre-wrap;
  word-break: break-all;
  line-height: 1.5;
  color: #333;
  margin: 0;
  padding: 10px;
}

.config-file-dialog :deep(.el-dialog__body) {
  padding: 15px 20px;
}
</style>
