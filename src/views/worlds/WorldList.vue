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
          <template v-slot:header>
<div  class="card-header">
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
</template>

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
              <template v-slot="scope">
                <el-tag size="small" :type="getWorldTypeTag(scope.row.type)">
                  {{ getWorldTypeName(scope.row.type) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="season" label="季节" width="90">
              <template v-slot="scope">{{ scope.row.season ?? '--' }}</template>
            </el-table-column>
            <el-table-column prop="day" label="天数" width="70" align="center">
              <template v-slot="scope">{{ scope.row.day ?? '--' }}</template>
            </el-table-column>
            <el-table-column prop="status" label="状态" width="90" align="center">
              <template v-slot="scope">
                <el-tag :type="getWorldStatusTag(scope.row.status)" size="small">
                  {{ getWorldStatusName(scope.row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="200" fixed="right">
              <template v-slot="scope">
                <el-button
                  :type="scope.row.status === 'running' ? 'danger' : 'success'"
                  size="mini"
                  :disabled="scope.row.controlAvailable === false"
                  @click.stop="toggleWorldStatus(scope.row)">
                  {{ scope.row.status === 'running' ? '停止' : '启动' }}
                </el-button>
                <el-button
                  type="primary"
                  size="mini"
                  @click.stop="editWorld(scope.row)">编辑</el-button>
                <el-dropdown trigger="click" @command="handleMoreCommands($event, scope.row)" @click.stop>
                  <el-button size="mini">
                    更多<component :is="'el-icon-arrow-down'" class="legacy-icon el-icon--right" />
                  </el-button>
                  <template v-slot:dropdown>
<el-dropdown-menu >
                    <el-dropdown-item command="viewState">查看状态</el-dropdown-item>
                    <el-dropdown-item command="regenerate">重新生成</el-dropdown-item>
                    <el-dropdown-item command="backup">备份世界</el-dropdown-item>
                    <el-dropdown-item command="delete" divided>
                      <span style="color: #c94f4f;">删除世界</span>
                    </el-dropdown-item>
                  </el-dropdown-menu>
</template>
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
              <template v-slot:title>
                当前只显示 <b>{{ getSelectedRoomName() }}</b> 房间的世界
                <el-button type="text" @click="selectedRoom = null" style="margin-left: 10px;">查看全部</el-button>
              </template>
            </el-alert>
          </div>

          <!-- 无世界时的提示 -->
          <div v-if="!loading && filteredWorlds.length === 0" class="empty-worlds">
            <component :is="'el-icon-warning-outline'" class="legacy-icon" />
            <p>没有找到符合条件的世界</p>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 添加房间选择对话框 -->
    <el-dialog
      title="选择房间"
      v-model="roomSelectDialogVisible"
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
            <component :is="'el-icon-info'" class="legacy-icon" />
            <span>没有找到符合条件的房间</span>
          </div>
        </div>
      </div>
      <template v-slot:footer>
<span  class="dialog-footer">
        <el-button @click="closeRoomDialog">取消</el-button>
        <el-button type="primary" @click="confirmRoomSelect" :disabled="!tempSelectedRoom">确定</el-button>
      </span>
</template>
    </el-dialog>
  </div>
</template>

<script>
import { roomApi, systemApi } from '../../api/index';
import RoomCategories from '../../components/worlds/RoomCategories.vue';

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
        } else if (this.currentCategory === 'both') {
          const mixedRooms = new Set(this.rooms
            .filter(room => room.worlds.some(world => world.type === 'forest') &&
              room.worlds.some(world => world.type === 'cave'))
            .map(room => room.id));
          result = result.filter(world => mixedRooms.has(world.roomId));
        } else if (this.currentCategory.startsWith('custom_')) {
          result = [];
        }
      }

      // 按搜索查询筛选
      if (this.searchQuery) {
        const query = this.searchQuery.toLowerCase();
        result = result.filter(world =>
          String(world.name || '').toLowerCase().includes(query) ||
          String(world.description || '').toLowerCase().includes(query) ||
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
    getWorldTypeName(type) {
      if (type === 'forest' || type === 'master') return '主世界';
      if (type === 'cave') return '洞穴';
      return '其他';
    },
    getWorldTypeTag(type) {
      if (type === 'forest' || type === 'master') return 'primary';
      if (type === 'cave') return 'success';
      return 'info';
    },
    getWorldStatusName(status) {
      if (status === 'running') return '运行中';
      if (status === 'stopped') return '已停止';
      return '未知';
    },
    getWorldStatusTag(status) {
      if (status === 'running') return 'success';
      if (status === 'stopped') return 'info';
      return 'warning';
    },
    handleCategoryChange(category) {
      this.currentCategory = category;
      this.refreshWorlds();
    },
    getServerStatus() {
      return systemApi.getTmuxServers()
        .then(response => {
          if (response?.status === 200 && Array.isArray(response.data)) {
            const servers = response.data;

            this.worlds.forEach(world => {
              const runningServer = servers.find(server =>
                server.archive_name === world.roomName &&
                server.world_name === world.name
              );

              world.status = runningServer?.status || 'unknown';
            });

            this.rooms.forEach(room => {
              const runningServer = servers.find(server =>
                server.archive_name === room.name &&
                server.status === "running"
              );
              if (runningServer) {
                room.status = 'running';
              } else if (servers.some(server => server.archive_name === room.name && server.status === 'unknown')) {
                room.status = 'unknown';
              } else {
                room.status = 'stopped';
              }
            });
          }
        })
        .catch(error => {
          console.error("获取服务器状态失败:", error);
        });
    },
    refreshWorlds(force = false) {
      // 如果正在刷新或者距离上次刷新不足2秒，则不进行刷新
      const now = Date.now();
      if (this.isRefreshing || (!force && now - this.lastRefreshTime < 2000)) {
        return Promise.resolve();
      }

      this.isRefreshing = true;
      this.lastRefreshTime = now;
      this.loading = true;
      console.log("开始获取世界列表");

      // 加载房间列表
      return roomApi.getRoomList()
        .then(response => {
          if (response && (Array.isArray(response) || response.data)) {
            const roomsData = Array.isArray(response) ? response :
                         (Array.isArray(response.data) ? response.data :
                         (response.data && Array.isArray(response.data.data) ? response.data.data : []));

            this.rooms = roomsData.map(room => ({
              id: room.id || room.name,
              name: room.name,
              status: room.isRunning ? 'running' : 'unknown',
              worlds: room.worlds || []
            }));

            // 直接从房间数据中提取世界信息
            let allWorlds = [];
            this.rooms.forEach(room => {
              if (room.worlds && Array.isArray(room.worlds)) {
                const worldsData = room.worlds.map(world => ({
                  ...world,
                  id: world.id,
                  name: world.name || world.worldName,
                  roomId: room.id,
                  roomName: room.name,
                  type: world.type || 'unknown',
                  season: world.season ?? null,
                  day: world.day ?? null,
                  status: world.status || 'unknown',
                  description: world.description || ''
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
        query: { id: world.id, roomId: world.roomId, worldId: world.id }
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
        const request = {
          room_id: world.roomId,
          world_id: world.id
        };
        const operation = world.status === 'running'
          ? roomApi.stopRoom(request)
          : roomApi.startRoom(request);
        operation
          .then(async response => {
            await this.refreshWorlds(true);
            this.$message.success(response.msg || `${action}完成`);
          })
          .catch(error => {
            this.$message.error(`${action}世界失败: ${error.message || '未知错误'}`);
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
    handleRowClick(row) {
      // 点击行跳转到详情页
      this.$router.push({
        path: '/worlds/details',
        query: { id: row.id, roomId: row.roomId, worldId: row.id }
      });
    },
    handleMoreCommands(command, world) {
      switch (command) {
        case 'viewState':
          this.viewWorldState(world);
          break;
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
    viewWorldState(world) {
      this.$router.push({
        path: '/worlds/state',
        query: { archive: world.roomName, world: world.name }
      });
    },
    regenerateWorld(world) {
      this.$confirm(`确定要重新生成世界 "${world.name}" 吗？现有的世界数据将会丢失！`, '警告', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        this.loading = true;
        roomApi.regenerateWorld({ room_id: world.roomId, world_id: world.id })
          .then(response => this.$message.success(response.msg))
          .catch(error => this.$message.error(error.message))
          .finally(() => { this.loading = false; });
      }).catch(() => {
        this.$message({
          type: 'info',
          message: '已取消操作'
        });
      });
    },
    backupWorld(world) {
      this.$confirm(`v2 后端将备份世界 "${world.name}" 所属的整个房间 "${world.roomName}"，确定继续吗?`, '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'info'
      }).then(() => {
        this.loading = true;
        roomApi.backupRoom(world.roomId, `世界 ${world.name}`)
          .then(response => this.$message.success(response.msg || '房间备份已创建'))
          .catch(error => this.$message.error(`备份失败：${error.message}`))
          .finally(() => { this.loading = false; });
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
        roomApi.deleteWorld({ room_id: world.roomId, world_id: world.id })
          .then(response => {
            this.$message.success(response.msg);
            this.refreshWorlds();
          })
          .catch(error => this.$message.error(error.message))
          .finally(() => { this.loading = false; });
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
  background-color: var(--surface-muted);
  min-height: calc(100vh - 80px);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 25px;
  padding-bottom: 15px;
  border-bottom: 1px solid var(--border-color);
}

.page-header h2 {
  margin: 0;
  font-size: 24px;
  color: var(--text-primary);
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
  background-color: var(--primary-color);
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
  color: var(--text-primary);
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

.el-table :deep(th) {
  background-color: var(--surface-muted) !important;
  color: var(--text-regular);
  font-weight: bold;
  padding: 12px 0;
}

/* 表格行悬停样式 */
.el-table :deep(.el-table__row) {
  cursor: pointer;
}

.el-table :deep(.el-table__row:hover) {
  background-color: #fff3e6;
}

/* 空列表提示样式 */
.empty-worlds {
  padding: 60px 0;
  text-align: center;
  color: var(--text-secondary);
}

.empty-worlds i {
  font-size: 64px;
  margin-bottom: 15px;
  color: var(--el-border-color);
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
  color: var(--text-regular);
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
  border: 1px solid var(--border-color);
  transition: all 0.3s;
  margin-right: 0;

  :deep(.el-radio__label) {
    width: 100%;
  }
}

.room-radio-item:hover {
  background-color: var(--surface-muted);
}

.room-item-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.room-name {
  font-weight: bold;
  color: var(--text-primary);
}

.room-info {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-secondary);
  font-size: 12px;
}

.no-rooms-tip {
  text-align: center;
  padding: 20px;
  color: var(--text-secondary);
}

.no-rooms-tip i {
  margin-right: 5px;
}
</style>
