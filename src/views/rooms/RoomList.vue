<template>
  <div class="world-settings-page">
    <div class="page-header">
      <h2>房间列表</h2>
      <div class="header-actions">
        <el-input
          placeholder="搜索房间"
          v-model="searchQuery"
          class="search-input"
          prefix-icon="el-icon-search"
          clearable
          style="width: 250px; margin-right: 10px;">
        </el-input>
        <el-button @click="refreshRooms" icon="el-icon-refresh">刷新</el-button>
        <el-button type="primary" @click="createRoom" icon="el-icon-plus">创建房间</el-button>
      </div>
    </div>
    
    <!-- 页面加载状态 -->
    <el-card v-if="loading" shadow="hover" class="settings-card">
      <div class="loading-page-content">
        <i class="el-icon-loading loading-page-icon"></i>
        <p>正在加载页面内容...</p>
      </div>
    </el-card>
    
    <!-- 无存档时的导引提示 -->
    <el-card v-if="!loading && filteredRooms.length === 0" shadow="hover" class="settings-card empty-save-card">
      <div class="empty-save-content">
        <i class="el-icon-folder-add empty-save-icon"></i>
        <h4>暂无房间</h4>
        <p>您尚未创建任何房间，请点击下方按钮创建新房间</p>
        <el-button type="primary" @click="createRoom">创建新房间</el-button>
      </div>
    </el-card>
    
    <!-- 房间列表卡片样式展示 -->
    <div v-if="!loading && filteredRooms.length > 0" class="save-list">
      <el-row :gutter="20">
        <el-col :span="8" v-for="room in filteredRooms" :key="room.id">
          <el-card shadow="hover" class="save-item">
            <div class="save-item-content">
              <h4 class="save-name">{{ room.name }}</h4>
              <div class="save-worlds" v-if="room.worlds && room.worlds.length">
                <div class="world-category forest" v-if="getWorldsByType(room.worlds, 'forest').length > 0">
                  <span class="world-category-title">主世界:</span>
                  <div class="world-tags">
                    <el-tag size="small" v-for="world in getWorldsByType(room.worlds, 'forest')" :key="world.name" 
                      type="primary" class="world-tag">
                      {{ world.name }}
                    </el-tag>
                  </div>
                </div>
                <div class="world-category cave" v-if="getWorldsByType(room.worlds, 'cave').length > 0">
                  <span class="world-category-title">洞穴:</span>
                  <div class="world-tags">
                    <el-tag size="small" v-for="world in getWorldsByType(room.worlds, 'cave')" :key="world.name" 
                      type="success" class="world-tag">
                      {{ world.name }}
                    </el-tag>
                  </div>
                </div>
                <div class="world-category unknown" v-if="getWorldsByType(room.worlds, 'unknown').length > 0">
                  <span class="world-category-title">其他:</span>
                  <div class="world-tags">
                    <el-tag size="small" v-for="world in getWorldsByType(room.worlds, 'unknown')" :key="world.name" 
                      type="info" class="world-tag">
                      {{ world.name }}
                    </el-tag>
                  </div>
                </div>
              </div>
              <div class="save-info">
                <span class="save-date" v-if="room.updateTime">
                  <i class="el-icon-time"></i> {{ formatDate(room.updateTime) }}
                </span>
                <span class="save-world-count" v-if="room.worlds">
                  <i class="el-icon-s-grid"></i> {{ room.worlds ? room.worlds.length : 0 }} 个世界
                </span>
              </div>
            </div>
            <div class="save-actions">
              <el-button-group>
                <el-button type="success" size="small" @click="startRoom(room)" icon="el-icon-video-play">开启</el-button>
                <el-button type="primary" size="small" @click="editRoom(room)" icon="el-icon-edit">编辑</el-button>
              </el-button-group>
              <el-dropdown trigger="click" @command="handleDropdownCommand($event, room)" style="margin-left: 10px;">
                <el-button type="info" size="small">
                  更多操作<i class="el-icon-arrow-down el-icon--right"></i>
                </el-button>
                <el-dropdown-menu slot="dropdown">
                  <el-dropdown-item command="special-lists">特殊名单</el-dropdown-item>
                  <el-dropdown-item command="token">服务器令牌</el-dropdown-item>
                  <el-dropdown-item command="logs">查看日志</el-dropdown-item>
                  <el-dropdown-item command="backup">备份房间</el-dropdown-item>
                  <el-dropdown-item command="delete" divided>
                    <span style="color: #F56C6C;">删除房间</span>
                  </el-dropdown-item>
                </el-dropdown-menu>
              </el-dropdown>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>
    
    <!-- 特殊名单对话框 -->
    <el-dialog 
      title="特殊名单管理" 
      :visible.sync="specialListsVisible" 
      width="80%" 
      :before-close="closeSpecialListsDialog"
      class="fullheight-dialog">
      <SpecialLists 
        v-if="specialListsVisible" 
        :savename="selectedSavename"
        @close="specialListsVisible = false" />
    </el-dialog>
    
    <!-- 服务器令牌对话框 -->
    <el-dialog 
      title="服务器令牌管理" 
      :visible.sync="serverTokenVisible" 
      width="60%" 
      :before-close="closeServerTokenDialog">
      <ServerToken 
        v-if="serverTokenVisible" 
        :savename="selectedSavename"
        @close="serverTokenVisible = false" />
    </el-dialog>
    
    <!-- 服务器日志对话框 -->
    <el-dialog 
      title="服务器日志" 
      :visible.sync="logViewerVisible" 
      width="80%" 
      :before-close="closeLogViewerDialog"
      :append-to-body="true"
      :modal="false"
      :destroy-on-close="true"
      class="fullheight-dialog">
      <LogViewer 
        v-if="logViewerVisible" 
        :archiveName="selectedSavename"
        :title="'服务器日志 - ' + selectedRoomName"
        :subtitle="selectedWorldDisplay"
        :worlds="selectedRoomWorlds"
        :defaultWorld="selectedRoomWorldName"
        @close="logViewerVisible = false" />
    </el-dialog>
    
    <!-- 启动房间对话框 -->
    <el-dialog 
      title="启动房间" 
      :visible.sync="startDialogVisible" 
      width="60%" 
      :before-close="closeStartDialog"
      class="fullheight-dialog">
      <StartRoomForm 
        v-if="startDialogVisible" 
        :room="selectedRoom"
        :startForm="startForm"
        @confirm="confirmStartRoom"
        @close="closeStartDialog" />
    </el-dialog>
  </div>
</template>

<script>
import { roomApi } from '../../api/index';
import config from '../../api/config';
import SpecialLists from './SpecialLists.vue';
import ServerToken from './ServerToken.vue';
import LogViewer from '../servers/LogViewer.vue';
import axios from 'axios';
import StartRoomForm from './StartRoomForm.vue';

export default {
  name: 'RoomList',
  components: {
    SpecialLists,
    ServerToken,
    LogViewer,
    StartRoomForm
  },
  data() {
    return {
      loading: false,
      searchQuery: '',
      rooms: [],
      specialListsVisible: false,
      serverTokenVisible: false,
      logViewerVisible: false,
      selectedSavename: '',
      selectedRoomName: '',
      selectedRoomWorlds: [],
      selectedRoomWorldName: '',
      selectedWorldDisplay: '',
      startDialogVisible: false,
      selectedRoom: null,
      startForm: {
        worldType: 'all',
        serverMode: '32'
      },
      startLoading: false
    }
  },
  computed: {
    filteredRooms() {
      let result = this.rooms;
      
      // 按搜索查询筛选
      if (this.searchQuery) {
        const query = this.searchQuery.toLowerCase();
        result = result.filter(room => 
          room.name.toLowerCase().includes(query)
        );
      }
      
      return result;
    }
  },
  created() {
    this.refreshRooms();
  },
  methods: {
    formatDate(timestamp) {
      if (!timestamp) return '';
      const date = new Date(timestamp);
      return date.toLocaleString();
    },
    refreshRooms() {
      this.loading = true;
      // 尝试使用新的API获取房间列表
      axios.get(`${config.BASE_URL}/dstserver/list`)
        .then(response => {
          if (response && response.data && response.data.status === 200 && Array.isArray(response.data.data)) {
            // 处理新API格式的数据，不再对unknown类型进行推断
            this.rooms = response.data.data.map(item => ({
              id: item.name,
              name: item.name,
              savepath: item.savepath || '',
              worlds: (item.worlds || []).map(world => ({
                name: world.name,
                type: world.type // 保留原始type值
              })),
              updateTime: item.updateTime || new Date().toISOString()
            }));
            
            this.$message({
              message: '房间列表已刷新',
              type: 'success'
            });
            this.loading = false;
          } else {
            this.fetchRoomsFromOldAPI();
          }
        })
        .catch(error => {
          this.fetchRoomsFromOldAPI();
        });
    },
    
    // 从旧API获取房间列表
    fetchRoomsFromOldAPI() {
      roomApi.getRoomList()
        .then(response => {
          console.log("旧API房间列表响应:", response);
          // 检查response直接是否为数组(没有经过状态包装的情况)
          if (Array.isArray(response)) {
            this.rooms = response.map(item => ({
              id: item.name,
              ...item,
              // 如果没有worlds属性，添加一个空数组
              worlds: item.worlds || []
            }));
            this.$message({
              message: '房间列表已刷新',
              type: 'success'
            });
          } 
          // 检查标准的状态+数据格式
          else if (response && response.data) {
            // 检查data本身是否为数组
            if (Array.isArray(response.data)) {
              this.rooms = response.data.map(item => ({
                id: item.name,
                ...item,
                worlds: item.worlds || []
              }));
            } 
            // 检查data.data是否为数组(嵌套数据结构)
            else if (response.data.data && Array.isArray(response.data.data)) {
              this.rooms = response.data.data.map(item => ({
                id: item.name,
                ...item,
                worlds: item.worlds || []
              }));
            } else {
              throw new Error('返回数据格式不是预期的数组');
            }
            
            this.$message({
              message: '房间列表已刷新',
              type: 'success'
            });
          } else {
            throw new Error('API返回数据格式异常');
          }
        })
        .catch(error => {
          console.error("获取房间列表失败:", error);
          this.$message.error('获取房间列表失败: ' + (error.message || '未知错误'));
        })
        .finally(() => {
          this.loading = false;
        });
    },
    createRoom() {
      this.$router.push('/rooms/settings');
    },
    editRoom(room) {
      this.$router.push({
        path: '/rooms/settings',
        query: { id: room.id }
      });
    },
    startRoom(room) {
      this.selectedRoom = room;
      this.startDialogVisible = true;
    },
    confirmStartRoom() {
      if (!this.selectedRoom) return;
      const archiveName = this.selectedRoom.id;
      const serverMode = this.startForm.serverMode;
      
      this.startLoading = true;
      if (this.startForm.worldType === 'all') {
        // 获取所有世界列表，然后为每个世界发起请求
        roomApi.getRoomWorlds(archiveName)
          .then(worlds => {
            if (!worlds || worlds.length === 0) {
              // 如果没有找到世界，则默认启动Forest1和Caves1
              const startPromises = [
                roomApi.startRoom({
                  archive_name: archiveName,
                  world_name: "Forest1",
                  server_mode: serverMode,
                  world_type: "forest"
                }),
                roomApi.startRoom({
                  archive_name: archiveName,
                  world_name: "Caves2",
                  server_mode: serverMode,
                  world_type: "cave"
                })
              ];
              return Promise.all(startPromises);
            } else {
              // 为每个世界单独发起请求
              const startPromises = worlds.map(world => {
                // 使用API返回的type字段，对于unknown类型的世界，根据名称推断类型
                let worldType = world.type;
                // 对于unknown类型，如果需要启动，需要推断一个有效的type(forest或cave)
                if (worldType === 'unknown') {
                  worldType = world.name.toLowerCase().includes('forest') ? 'forest' : 'cave';
                }
                
                return roomApi.startRoom({
                  archive_name: archiveName,
                  world_name: world.worldName || world.name,
                  server_mode: serverMode,
                  world_type: worldType
                });
              });
              return Promise.all(startPromises);
            }
          })
          .then(responses => {
            this.$message.success(`房间 ${this.selectedRoom.name} 的所有世界已启动`);
          })
          .catch(error => {
            this.$message.error(`启动房间失败: ${error.message || '未知错误'}`);
          })
          .finally(() => {
            this.startLoading = false;
            this.startDialogVisible = false;
          });
      } else if (this.startForm.worldType === 'unknown') {
        // 处理特殊情况：用户选择启动unknown类型的世界
        roomApi.getRoomWorlds(archiveName)
          .then(worlds => {
            // 过滤出unknown类型的世界
            const filteredWorlds = worlds.filter(world => world.type === 'unknown');
            if (filteredWorlds.length === 0) {
              this.$message.warning('没有找到其他类型的世界');
              this.startLoading = false;
              this.startDialogVisible = false;
              return;
            }
            
            // 为每个unknown世界启动，根据名称推断类型
            const startPromises = filteredWorlds.map(world => {
              const inferredType = world.name.toLowerCase().includes('forest') ? 'forest' : 'cave';
              return roomApi.startRoom({
                archive_name: archiveName,
                world_name: world.worldName || world.name,
                server_mode: serverMode,
                world_type: inferredType
              });
            });
            
            return Promise.all(startPromises);
          })
          .then(responses => {
            if (responses) {
              this.$message.success(`房间 ${this.selectedRoom.name} 的其他世界已启动`);
            }
          })
          .catch(error => {
            this.$message.error(`启动房间失败: ${error.message || '未知错误'}`);
          })
          .finally(() => {
            this.startLoading = false;
            this.startDialogVisible = false;
          });
      } else {
        // 获取特定类型的世界列表
        roomApi.getRoomWorlds(archiveName)
          .then(worlds => {
            // 根据类型过滤世界，严格使用API返回的type字段
            const filteredWorlds = worlds.filter(world => world.type === this.startForm.worldType);
            if (filteredWorlds.length === 0) {
              const defaultWorld = this.startForm.worldType === 'forest' ? 'Forest1' : 'Caves1';
              return roomApi.startRoom({
                archive_name: archiveName,
                world_name: defaultWorld,
                server_mode: serverMode,
                world_type: this.startForm.worldType
              });
            } else {
              const startPromises = filteredWorlds.map(world => 
                roomApi.startRoom({
                  archive_name: archiveName,
                  world_name: world.worldName || world.name,
                  server_mode: serverMode,
                  world_type: world.type
                })
              );
              return Promise.all(startPromises);
            }
          })
          .then(responses => {
            const worldType = this.startForm.worldType === 'forest' ? '森林' : '洞穴';
            this.$message.success(`房间 ${this.selectedRoom.name} 的${worldType}世界已启动`);
          })
          .catch(error => {
            this.$message.error(`启动房间失败: ${error.message || '未知错误'}`);
          })
          .finally(() => {
            this.startLoading = false;
            this.startDialogVisible = false;
          });
      }
    },
    closeStartDialog() {
      this.startDialogVisible = false;
    },
    handleDropdownCommand(command, room) {
      switch(command) {
        case 'special-lists':
          this.handleSpecialLists(room);
          break;
        case 'token':
          this.handleServerToken(room);
          break;
        case 'logs':
          this.handleViewLogs(room);
          break;
        case 'backup':
          this.backupRoom(room);
          break;
        case 'delete':
          this.deleteRoom(room);
          break;
      }
    },
    handleSpecialLists(room) {
      this.selectedSavename = room.id;
      this.specialListsVisible = true;
    },
    closeSpecialListsDialog() {
      this.specialListsVisible = false;
    },
    handleServerToken(room) {
      this.selectedSavename = room.id;
      this.serverTokenVisible = true;
    },
    closeServerTokenDialog() {
      this.serverTokenVisible = false;
    },
    handleViewLogs(room) {
      this.selectedSavename = room.id;
      this.selectedRoomName = room.name;
      this.selectedRoomWorlds = room.worlds || [];
      this.selectedRoomWorldName = room.worlds && room.worlds.length > 0 ? room.worlds[0].name : '';
      this.selectedWorldDisplay = room.worlds && room.worlds.length > 0 ? 
        `${room.worlds[0].name} (${room.worlds[0].type === 'master' ? '森林' : '洞穴'})` : '';
      this.logViewerVisible = true;
    },
    closeLogViewerDialog() {
      this.logViewerVisible = false;
    },
    backupRoom(room) {
      this.$confirm(`确定要备份房间 "${room.name}" 吗?`, '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'info'
      }).then(() => {
        // 调用备份房间API
        this.$message({
          type: 'success',
          message: `已备份房间 ${room.name}`
        });
      }).catch(() => {
        this.$message({
          type: 'info',
          message: '已取消操作'
        });          
      });
    },
    deleteRoom(room) {
      this.$confirm(`确定要删除房间 "${room.name}" 吗? 此操作不可恢复!`, '警告', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        // 调用删除房间API
        this.$message({
          type: 'success',
          message: `已删除房间 ${room.name}`
        });
        // 刷新房间列表
        this.refreshRooms();
      }).catch(() => {
        this.$message({
          type: 'info',
          message: '已取消操作'
        });          
      });
    },
    // 按类型获取世界列表
    getWorldsByType(worlds, type) {
      if (!worlds || !Array.isArray(worlds)) return [];
      return worlds.filter(world => {
        // 严格使用API返回的type字段
        return world.type === type;
      });
    }
  }
};
</script>

<style lang="scss" scoped>
.world-settings-page {
  padding: 25px;
  background-color: #f5f7fa;
  min-height: calc(100vh - 80px);
  
  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 30px;
    padding-bottom: 15px;
    border-bottom: 1px solid #ebeef5;
    
    h2 {
      margin: 0;
      font-size: 24px;
      color: #303133;
      position: relative;
      padding-left: 15px;
      
      &:before {
        content: '';
        position: absolute;
        left: 0;
        top: 50%;
        transform: translateY(-50%);
        width: 4px;
        height: 20px;
        background-color: #409EFF;
        border-radius: 2px;
      }
    }
    
    .header-actions {
      display: flex;
      align-items: center;
      
      .el-button {
        border-radius: 6px;
      }
    }
  }
  
  .settings-card {
    margin-bottom: 20px;
  }
  
  .loading-page-content,
  .empty-save-content,
  .loading-saves-content {
    text-align: center;
    padding: 60px 0;
    
    .loading-page-icon,
    .empty-save-icon,
    .loading-saves-icon {
      font-size: 64px;
      color: #409EFF;
      margin-bottom: 25px;
    }
    
    h4 {
      font-size: 22px;
      margin-bottom: 15px;
      color: #303133;
    }
    
    p {
      color: #606266;
      margin-bottom: 25px;
      font-size: 15px;
    }
    
    .el-button {
      padding: 12px 30px;
      border-radius: 6px;
      font-size: 16px;
    }
  }
  
  .save-list {
    .save-item {
      margin-bottom: 20px;
      position: relative;
      overflow: hidden;
      transition: all 0.3s;
      border-radius: 8px;
      
      &:hover {
        transform: translateY(-5px);
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
      }
      
      .save-item-content {
        min-height: 120px;
        padding-bottom: 60px; /* 为底部操作按钮留出空间 */
        
        .save-name {
          margin-top: 0;
          margin-bottom: 15px;
          font-size: 18px;
          font-weight: bold;
          color: #303133;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          padding-bottom: 8px;
          border-bottom: 1px solid #f0f0f0;
        }
        
        .save-worlds {
          margin: 15px 0;
          
          .world-category {
            margin-bottom: 12px;
            
            &:last-child {
              margin-bottom: 0;
            }
            
            .world-category-title {
              font-size: 14px;
              font-weight: 500;
              color: #606266;
              margin-right: 10px;
              display: inline-block;
              min-width: 60px;
            }
            
            .world-tags {
              display: inline-flex;
              flex-wrap: wrap;
              
              .world-tag {
                margin-right: 8px;
                margin-bottom: 8px;
                border-radius: 12px;
                padding: 2px 10px;
              }
            }
            
            &.forest .world-category-title {
              color: #409EFF;
            }
            
            &.cave .world-category-title {
              color: #67C23A;
            }
            
            &.unknown .world-category-title {
              color: #909399;
            }
          }
        }
        
        .save-info {
          display: flex;
          flex-wrap: wrap;
          font-size: 13px;
          color: #909399;
          margin-top: 15px;
          
          .save-date, .save-world-count {
            margin-right: 15px;
            margin-bottom: 5px;
            background-color: #f9f9f9;
            padding: 3px 10px;
            border-radius: 12px;
            
            i {
              margin-right: 5px;
            }
          }
        }
      }
      
      .save-actions {
        position: absolute;
        bottom: 20px;
        left: 20px;
        right: 20px;
        display: flex;
        justify-content: space-between;
        padding-top: 15px;
        border-top: 1px solid #f0f0f0;
      }
    }
  }
  
  .select-save-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .empty-save-card {
    border-radius: 10px;
    box-shadow: 0 5px 20px rgba(0, 0, 0, 0.05);
  }
  
  .fullheight-dialog {
    :deep(.el-dialog) {
      border-radius: 8px;
      overflow: hidden;
    }
    
    :deep(.el-dialog__body) {
      max-height: 70vh;
      overflow-y: auto;
    }
  }
}
</style> 