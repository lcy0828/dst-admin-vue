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
              <p class="save-desc">{{ room.savepath || '暂无描述' }}</p>
              <div class="save-worlds" v-if="room.worlds && room.worlds.length">
                <el-tag size="small" v-for="(world, index) in room.worlds" :key="index" 
                  :type="world.type === 'master' ? 'primary' : 'success'" class="world-tag">
                  {{ world.name }}
                </el-tag>
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
                  <el-dropdown-item command="duplicate" divided>复制房间</el-dropdown-item>
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
  </div>
</template>

<script>
import { roomApi } from '../../api/index';
import SpecialLists from './SpecialLists.vue';
import ServerToken from './ServerToken.vue';
import LogViewer from '../servers/LogViewer.vue';

export default {
  name: 'RoomList',
  components: {
    SpecialLists,
    ServerToken,
    LogViewer
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
      selectedWorldDisplay: ''
    }
  },
  computed: {
    filteredRooms() {
      let result = this.rooms;
      
      // 按搜索查询筛选
      if (this.searchQuery) {
        const query = this.searchQuery.toLowerCase();
        result = result.filter(room => 
          room.name.toLowerCase().includes(query) || 
          (room.savepath && room.savepath.toLowerCase().includes(query))
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
      console.log("开始获取房间列表");
      roomApi.getRoomList()
        .then(response => {
          console.log("房间列表API响应:", response);
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
      this.$confirm(`确定要开启房间 "${room.name}" 吗?`, '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        this.loading = true;
        roomApi.startRoom(room.id)
          .then(() => {
            this.$message({
              message: `房间 ${room.name} 已开启`,
              type: 'success'
            });
          })
          .catch(error => {
            this.$message.error(`开启房间失败: ${error.message}`);
          })
          .finally(() => {
            this.loading = false;
          });
      }).catch(() => {
        this.$message({
          type: 'info',
          message: '已取消操作'
        });
      });
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
        case 'duplicate':
          this.duplicateRoom(room);
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
    duplicateRoom(room) {
      this.$confirm(`确定要复制房间 "${room.name}" 吗?`, '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'info'
      }).then(() => {
        // 调用复制房间API
        this.$message({
          type: 'success',
          message: `已复制房间 ${room.name}`
        });
      }).catch(() => {
        this.$message({
          type: 'info',
          message: '已取消操作'
        });          
      });
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
    }
  }
};
</script>

<style lang="scss" scoped>
.world-settings-page {
  padding: 20px;
  
  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    
    h2 {
      margin: 0;
    }
    
    .header-actions {
      display: flex;
      align-items: center;
    }
  }
  
  .settings-card {
    margin-bottom: 20px;
  }
  
  .loading-page-content,
  .empty-save-content,
  .loading-saves-content {
    text-align: center;
    padding: 40px 0;
    
    .loading-page-icon,
    .empty-save-icon,
    .loading-saves-icon {
      font-size: 48px;
      color: #909399;
      margin-bottom: 20px;
    }
    
    h4 {
      font-size: 18px;
      margin-bottom: 10px;
    }
    
    p {
      color: #606266;
      margin-bottom: 20px;
    }
  }
  
  .save-list {
    .save-item {
      margin-bottom: 20px;
      transition: all 0.3s;
      
      &:hover {
        transform: translateY(-5px);
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
      }
      
      .save-item-content {
        margin-bottom: 15px;
        
        .save-name {
          font-size: 16px;
          font-weight: bold;
          margin-bottom: 5px;
          color: #303133;
        }
        
        .save-desc {
          color: #606266;
          font-size: 13px;
          margin-bottom: 8px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .save-worlds {
          margin-bottom: 10px;
          
          .world-tag {
            margin-right: 5px;
            margin-bottom: 5px;
          }
        }
        
        .save-info {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          color: #909399;
          
          i {
            margin-right: 3px;
          }
        }
      }
      
      .save-actions {
        display: flex;
        justify-content: space-between;
        margin-top: 10px;
      }
    }
  }
  
  .select-save-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .fullheight-dialog {
    :deep(.el-dialog__body) {
      max-height: 70vh;
      overflow-y: auto;
    }
  }
}
</style> 