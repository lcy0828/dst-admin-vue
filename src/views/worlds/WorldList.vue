<template>
  <div class="world-list-page">
    <div class="page-header">
      <h2>世界列表</h2>
      <div class="header-actions">
        <el-input
          placeholder="搜索世界"
          v-model="searchQuery"
          class="search-input"
          prefix-icon="el-icon-search"
          size="small"
          clearable>
        </el-input>
        <el-button type="primary" size="small" icon="el-icon-plus" @click="createWorld">创建世界</el-button>
      </div>
    </div>
    
    <el-row :gutter="20">
      <!-- 左侧房间分类 -->
      <el-col :span="4">
        <div class="sidebar-container">
          <room-categories 
            :rooms="rooms" 
            @category-change="handleCategoryChange" 
            @refresh="refreshWorlds" />
        </div>
      </el-col>
      
      <!-- 右侧世界列表 -->
      <el-col :span="20">
        <el-card shadow="hover" class="world-list-card">
          <div slot="header" class="card-header">
            <div class="header-left">
              <span>{{ getCategoryTitle() }}</span>
              <el-select 
                v-model="selectedRoom" 
                placeholder="选择房间" 
                size="small" 
                style="margin-left: 15px; width: 180px;"
                clearable
                filterable
                @change="handleRoomChange">
                <el-option
                  v-for="room in rooms"
                  :key="room.id"
                  :label="room.name"
                  :value="room.id">
                  <span style="float: left">{{ room.name }}</span>
                  <span style="float: right; color: #8492a6; font-size: 12px">
                    {{ room.worlds ? room.worlds.length : 0 }}个世界
                    <el-tag size="mini" type="success" v-if="room.status === 'running'">运行中</el-tag>
                  </span>
                </el-option>
              </el-select>
            </div>
            <div>
              <el-button style="margin-left: 10px;" size="small" icon="el-icon-refresh" @click="refreshWorlds">刷新</el-button>
            </div>
          </div>
          
          <el-table
            :data="filteredWorlds"
            style="width: 100%"
            v-loading="loading"
            border
            stripe
            highlight-current-row
            @row-click="handleRowClick">
            <el-table-column prop="name" label="世界名称" min-width="120"></el-table-column>
            <el-table-column prop="roomName" label="所属房间" min-width="100"></el-table-column>
            <el-table-column prop="type" label="世界类型" width="100">
              <template slot-scope="scope">
                <el-tag size="small" :type="scope.row.type === 'master' || scope.row.type === 'forest' ? 'primary' : 'success'">
                  {{ scope.row.type === 'master' || scope.row.type === 'forest' ? '主世界' : '洞穴' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="season" label="季节" width="90"></el-table-column>
            <el-table-column prop="day" label="天数" width="70" align="center"></el-table-column>
            <el-table-column prop="status" label="状态" width="90" align="center">
              <template slot-scope="scope">
                <el-tag :type="scope.row.status === 'running' ? 'success' : 'info'" size="small">
                  {{ scope.row.status === 'running' ? '运行中' : '已停止' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="200" fixed="right">
              <template slot-scope="scope">
                <el-button 
                  :type="scope.row.status === 'running' ? 'danger' : 'success'" 
                  size="mini" 
                  @click.stop="toggleWorldStatus(scope.row)">
                  {{ scope.row.status === 'running' ? '停止' : '启动' }}
                </el-button>
                <el-button 
                  type="primary" 
                  size="mini" 
                  @click.stop="editWorld(scope.row)">编辑</el-button>
                <el-dropdown trigger="click" @command="handleMoreCommands($event, scope.row)" @click.stop>
                  <el-button size="mini">
                    更多<i class="el-icon-arrow-down el-icon--right"></i>
                  </el-button>
                  <el-dropdown-menu slot="dropdown">
                    <el-dropdown-item command="regenerate">重新生成</el-dropdown-item>
                    <el-dropdown-item command="backup">备份世界</el-dropdown-item>
                    <el-dropdown-item command="delete" divided>
                      <span style="color: #F56C6C;">删除世界</span>
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </el-dropdown>
              </template>
            </el-table-column>
          </el-table>
          
          <!-- 筛选信息提示 -->
          <div class="filter-info" v-if="selectedRoom && !loading">
            <el-alert
              type="info"
              :closable="false"
              show-icon>
              <template slot="title">
                当前只显示 <b>{{ getSelectedRoomName() }}</b> 房间的世界
                <el-button type="text" @click="selectedRoom = null" style="margin-left: 10px;">查看全部</el-button>
              </template>
            </el-alert>
          </div>
          
          <!-- 无世界时的提示 -->
          <div v-if="!loading && filteredWorlds.length === 0" class="empty-worlds">
            <i class="el-icon-warning-outline"></i>
            <p>没有找到符合条件的世界</p>
          </div>
        </el-card>
      </el-col>
    </el-row>
    
    <!-- 添加房间选择对话框 -->
    <el-dialog
      title="选择房间"
      :visible.sync="roomSelectDialogVisible"
      width="500px"
      class="room-select-dialog">
      <div class="room-select-content">
        <p class="dialog-tip">请选择要在哪个房间中创建新世界：</p>
        
        <el-input
          placeholder="搜索房间"
          v-model="roomSearchQuery"
          class="room-search-input"
          prefix-icon="el-icon-search"
          clearable>
        </el-input>
        
        <div class="room-list">
          <el-radio-group v-model="tempSelectedRoom" class="room-radio-group">
            <el-radio 
              v-for="room in filteredDialogRooms" 
              :key="room.id" 
              :label="room.id"
              class="room-radio-item">
              <div class="room-item-content">
                <div class="room-name">{{ room.name }}</div>
                <div class="room-info">
                  <span>{{ room.worlds ? room.worlds.length : 0 }}个世界</span>
                  <el-tag size="mini" type="success" v-if="room.status === 'running'">运行中</el-tag>
                </div>
              </div>
            </el-radio>
          </el-radio-group>
          
          <div v-if="filteredDialogRooms.length === 0" class="no-rooms-tip">
            <i class="el-icon-info"></i>
            <span>没有找到符合条件的房间</span>
          </div>
        </div>
      </div>
      <span slot="footer" class="dialog-footer">
        <el-button @click="closeRoomDialog">取消</el-button>
        <el-button type="primary" @click="confirmRoomSelect" :disabled="!tempSelectedRoom">确定</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import { roomApi } from '../../api/index';
import RoomCategories from '../../components/worlds/RoomCategories.vue';
import axios from 'axios';
import config from '../../api/config';

export default {
  name: 'WorldList',
  components: {
    RoomCategories
  },
  data() {
    return {
      loading: false,
      searchQuery: '',
      currentCategory: 'all',
      rooms: [], // 房间列表
      worlds: [],
      isRefreshing: false,
      lastRefreshTime: 0,
      selectedRoom: null,
      roomSelectDialogVisible: false,
      roomSearchQuery: '',
      tempSelectedRoom: null
    }
  },
  computed: {
    filteredWorlds() {
      let result = this.worlds;
      
      // 按分类筛选
      if (this.currentCategory !== 'all') {
        if (this.currentCategory === 'active') {
          result = result.filter(world => world.status === 'running');
        } else if (this.currentCategory === 'inactive') {
          result = result.filter(world => world.status !== 'running');
        } else if (this.currentCategory === 'forest') {
          result = result.filter(world => world.type === 'master' || world.type === 'forest');
        } else if (this.currentCategory === 'cave') {
          result = result.filter(world => world.type === 'cave');
        } else if (this.currentCategory.startsWith('custom_')) {
          // 自定义分类的筛选逻辑，这里需要根据实际情况实现
          // 可以通过解析 currentCategory 来获取自定义分类的ID
          // 示例: const customId = parseInt(this.currentCategory.split('_')[1]);
        }
      }
      
      // 按搜索查询筛选
      if (this.searchQuery) {
        const query = this.searchQuery.toLowerCase();
        result = result.filter(world => 
          world.name.toLowerCase().includes(query) || 
          world.description.toLowerCase().includes(query) ||
          (world.roomName && world.roomName.toLowerCase().includes(query))
        );
      }
      
      // 按房间筛选
      if (this.selectedRoom) {
        result = result.filter(world => world.roomId === this.selectedRoom);
      }
      
      return result;
    },
    filteredDialogRooms() {
      if (!this.roomSearchQuery) {
        return this.rooms;
      }
      
      const query = this.roomSearchQuery.toLowerCase();
      return this.rooms.filter(room => 
        room.name.toLowerCase().includes(query)
      );
    }
  },
  methods: {
    getCategoryTitle() {
      let title = '';
      switch(this.currentCategory) {
        case 'all':
          title = '所有世界';
          break;
        case 'active':
          title = '活跃世界';
          break;
        case 'inactive':
          title = '非活跃世界';
          break;
        case 'forest':
          title = '主世界';
          break;
        case 'cave':
          title = '洞穴世界';
          break;
        case 'both':
          title = '混合房间世界';
          break;
        default:
          if (this.currentCategory.startsWith('custom_')) {
            const customId = parseInt(this.currentCategory.split('_')[1]);
            // 这里应该根据customId从自定义分类列表中找到对应的分类名称
            title = '自定义分类';
          } else {
            title = '所有世界';
          }
      }
      
      // 添加房间信息
      if (this.selectedRoom) {
        title += ` - ${this.getSelectedRoomName()}`;
      }
      
      return title;
    },
    handleCategoryChange(category) {
      this.currentCategory = category;
      this.refreshWorlds();
    },
    getServerStatus() {
      return axios.get(`${config.BASE_URL}/tmux/list`)
        .then(response => {
          if (response && response.data && response.data.status === 200 && Array.isArray(response.data.data)) {
            const servers = response.data.data;
            console.log("服务器状态数据:", servers);
            
            // 更新世界状态
            this.worlds.forEach(world => {
              // 正确匹配：通过archive_name(房间名)和world_name(世界名)来匹配
              const runningServer = servers.find(server => 
                server.archive_name === world.roomName && 
                server.world_name === world.name
              );
              
              if (runningServer) {
                console.log(`世界 ${world.name} 运行状态: ${runningServer.status}`);
                world.status = runningServer.status; // 使用实际状态
              }
            });
            
            // 更新房间状态
            this.rooms.forEach(room => {
              // 如果该房间下有任何世界在运行，则认为房间正在运行
              const runningServer = servers.find(server => 
                server.archive_name === room.name && 
                server.status === "running"
              );
              room.status = runningServer ? 'running' : 'stopped';
            });
          }
        })
        .catch(error => {
          console.error("获取服务器状态失败:", error);
        });
    },
    refreshWorlds() {
      // 如果正在刷新或者距离上次刷新不足2秒，则不进行刷新
      const now = Date.now();
      if (this.isRefreshing || (now - this.lastRefreshTime < 2000)) {
        return;
      }
      
      this.isRefreshing = true;
      this.lastRefreshTime = now;
      this.loading = true;
      console.log("开始获取世界列表");
      
      // 加载房间列表
      roomApi.getRoomList()
        .then(response => {
          if (response && (Array.isArray(response) || response.data)) {
            const roomsData = Array.isArray(response) ? response : 
                         (Array.isArray(response.data) ? response.data : 
                         (response.data && Array.isArray(response.data.data) ? response.data.data : []));
            
            this.rooms = roomsData.map(room => ({
              id: room.id || room.name,
              name: room.name,
              status: '',
              worlds: room.worlds || []
            }));
            
            // 直接从房间数据中提取世界信息
            let allWorlds = [];
            this.rooms.forEach(room => {
              if (room.worlds && Array.isArray(room.worlds)) {
                const worldsData = room.worlds.map(world => ({
                  id: `${room.id}_${world.name || world.worldName}`,
                  name: world.name || world.worldName,
                  roomId: room.id,
                  roomName: room.name,
                  type: world.type || 'unknown',
                  season: '未知',
                  day: 0,
                  status: 'stopped',
                  description: `${room.name}的${(world.type === 'forest' || world.type === 'master') ? '主世界' : '洞穴'}`
                }));
                allWorlds = [...allWorlds, ...worldsData];
              }
            });
            
            this.worlds = allWorlds;
            
            // 获取运行状态
            return this.getServerStatus();
          } else {
            this.$message.warning('获取房间列表数据格式异常');
            return Promise.reject(new Error('获取房间列表数据格式异常'));
          }
        })
        .then(() => {
          if (this.worlds.length > 0) {
            this.$message.success('世界列表已刷新');
          } else {
            this.$message.warning('没有找到任何世界');
          }
        })
        .catch(error => {
          console.error('获取世界列表失败:', error);
          this.$message.error('获取世界列表失败: ' + (error.message || '未知错误'));
        })
        .finally(() => {
          this.loading = false;
          this.isRefreshing = false;
        });
    },
    createWorld() {
      if (this.selectedRoom) {
        // 已选择房间，直接跳转
        const room = this.rooms.find(r => r.id === this.selectedRoom);
        if (room) {
          this.$router.push({
            path: '/worlds/settings',
            query: { roomId: room.id, roomName: room.name }
          });
        } else {
          this.$message.error('获取房间信息失败');
        }
      } else {
        // 未选择房间，显示选择对话框
        this.roomSelectDialogVisible = true;
      }
    },
    editWorld(world) {
      this.$router.push({
        path: '/worlds/settings',
        query: { id: world.id }
      });
    },
    toggleWorldStatus(world) {
      const action = world.status === 'running' ? '停止' : '启动';
      this.$confirm(`确定要${action}世界 "${world.name}" 吗?`, '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        this.loading = true;
        
        if (world.status === 'running') {
          // 停止世界
          axios.post(`${config.BASE_URL}/tmux/stop`, {
            archive_name: world.roomName,
            world_name: world.name
          })
            .then(response => {
              if (response.data && response.data.status === 200) {
                this.$message.success(`世界 ${world.name} 已停止`);
                // 更新状态
                world.status = 'stopped';
              } else {
                this.$message.error(response.data.msg || `停止世界失败`);
              }
            })
            .catch(error => {
              this.$message.error(`停止世界失败: ${error.message || '未知错误'}`);
            })
            .finally(() => {
              this.loading = false;
            });
        } else {
          // 启动世界
          axios.post(`${config.BASE_URL}/tmux/start`, {
            archive_name: world.roomName,
            world_name: world.name,
            world_type: world.type === 'cave' ? 'cave' : 'forest',
            server_mode: '64' // 默认使用64位服务器模式
          })
            .then(response => {
              if (response.data && response.data.status === 200) {
                this.$message.success(`世界 ${world.name} 已启动`);
                // 更新状态
                world.status = 'running';
              } else {
                this.$message.error(response.data.msg || `启动世界失败`);
              }
            })
            .catch(error => {
              this.$message.error(`启动世界失败: ${error.message || '未知错误'}`);
            })
            .finally(() => {
              this.loading = false;
            });
        }
      }).catch(() => {
        this.$message({
          type: 'info',
          message: '已取消操作'
        });
      });
    },
    handleRowClick(row) {
      // 点击行跳转到详情页
      this.$router.push({
        path: '/worlds/details',
        query: { id: row.id }
      });
    },
    handleMoreCommands(command, world) {
      switch (command) {
        case 'regenerate':
          this.regenerateWorld(world);
          break;
        case 'backup':
          this.backupWorld(world);
          break;
        case 'delete':
          this.deleteWorld(world);
          break;
      }
    },
    regenerateWorld(world) {
      this.$confirm(`确定要重新生成世界 "${world.name}" 吗？现有的世界数据将会丢失！`, '警告', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        this.loading = true;
        
        // 模拟API调用
        setTimeout(() => {
          this.loading = false;
          this.$message({
            type: 'success',
            message: `世界 ${world.name} 正在重新生成...`
          });
        }, 1000);
      }).catch(() => {
        this.$message({
          type: 'info',
          message: '已取消操作'
        });
      });
    },
    backupWorld(world) {
      this.$confirm(`确定要备份世界 "${world.name}" 吗?`, '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'info'
      }).then(() => {
        this.loading = true;
        
        // 模拟API调用
        setTimeout(() => {
          this.loading = false;
          this.$message({
            type: 'success',
            message: `世界 ${world.name} 备份已创建`
          });
        }, 1000);
      }).catch(() => {
        this.$message({
          type: 'info',
          message: '已取消操作'
        });
      });
    },
    deleteWorld(world) {
      this.$confirm(`确定要删除世界 "${world.name}" 吗？此操作不可恢复!`, '警告', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        this.loading = true;
        
        // 模拟API调用
        setTimeout(() => {
          // 从本地列表中移除
          this.worlds = this.worlds.filter(w => w.id !== world.id);
          
          this.loading = false;
          this.$message({
            type: 'success',
            message: `世界 ${world.name} 已删除`
          });
        }, 1000);
      }).catch(() => {
        this.$message({
          type: 'info',
          message: '已取消操作'
        });
      });
    },
    handleRoomChange(value) {
      this.selectedRoom = value;
    },
    getSelectedRoomName() {
      const room = this.rooms.find(r => r.id === this.selectedRoom);
      return room ? room.name : '所有房间';
    },
    confirmRoomSelect() {
      if (!this.tempSelectedRoom) {
        this.$message.warning('请选择一个房间');
        return;
      }
      
      // 获取选择的房间信息
      const room = this.rooms.find(r => r.id === this.tempSelectedRoom);
      if (!room) {
        this.$message.error('获取房间信息失败');
        return;
      }
      
      // 关闭对话框
      this.roomSelectDialogVisible = false;
      
      // 重置临时选择
      this.tempSelectedRoom = null;
      this.roomSearchQuery = '';
      
      // 跳转到创建世界页面
      this.$router.push({
        path: '/worlds/settings',
        query: { roomId: room.id, roomName: room.name }
      });
    },
    closeRoomDialog() {
      this.roomSelectDialogVisible = false;
      this.tempSelectedRoom = null;
      this.roomSearchQuery = '';
    }
  },
  mounted() {
    // 在页面加载时只调用一次刷新方法
    this.refreshWorlds();
  }
}
</script>

<style scoped lang="scss">
.world-list-page {
  padding: 25px;
  background-color: #f5f7fa;
  min-height: calc(100vh - 80px);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 25px;
  padding-bottom: 15px;
  border-bottom: 1px solid #ebeef5;
}

.page-header h2 {
  margin: 0;
  font-size: 24px;
  color: #303133;
  position: relative;
  padding-left: 15px;
}

.page-header h2:before {
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

.header-actions {
  display: flex;
  align-items: center;
}

.search-input {
  width: 250px;
  margin-right: 15px;
}

.world-list-card {
  margin-bottom: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: bold;
  color: #303133;
}

.header-left {
  display: flex;
  align-items: center;
}

.header-left span {
  font-size: 16px;
  margin-right: 10px;
}

/* 表格样式 */
.el-table {
  border-radius: 8px;
  overflow: hidden;
}

.el-table >>> th {
  background-color: #f5f7fa !important;
  color: #606266;
  font-weight: bold;
  padding: 12px 0;
}

/* 表格行悬停样式 */
.el-table >>> .el-table__row {
  cursor: pointer;
}

.el-table >>> .el-table__row:hover {
  background-color: #ecf5ff;
}

/* 空列表提示样式 */
.empty-worlds {
  padding: 60px 0;
  text-align: center;
  color: #909399;
}

.empty-worlds i {
  font-size: 64px;
  margin-bottom: 15px;
  color: #dcdfe6;
}

.empty-worlds p {
  font-size: 16px;
}

.sidebar-container {
  background-color: transparent;
  padding: 0;
}

.el-row {
  margin-left: -10px !important;
  margin-right: -10px !important;
}

.el-col {
  padding-left: 10px !important;
  padding-right: 10px !important;
}

.filter-info {
  margin-top: 20px;
  padding: 10px;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
}

/* 房间选择对话框样式 */
.room-select-content {
  padding: 10px 0;
}

.dialog-tip {
  font-size: 14px;
  color: #606266;
  margin-bottom: 15px;
}

.room-search-input {
  margin-bottom: 20px;
}

.room-list {
  max-height: 300px;
  overflow-y: auto;
}

.room-radio-group {
  width: 100%;
  display: flex;
  flex-direction: column;
}

.room-radio-item {
  display: flex;
  align-items: center;
  padding: 12px;
  margin-bottom: 10px;
  border-radius: 6px;
  border: 1px solid #EBEEF5;
  transition: all 0.3s;
  margin-right: 0;

  :deep(.el-radio__label) {
    width: 100%;
  }
}

.room-radio-item:hover {
  background-color: #F5F7FA;
}

.room-item-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.room-name {
  font-weight: bold;
  color: #303133;
}

.room-info {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #909399;
  font-size: 12px;
}

.no-rooms-tip {
  text-align: center;
  padding: 20px;
  color: #909399;
}

.no-rooms-tip i {
  margin-right: 5px;
}
</style> 