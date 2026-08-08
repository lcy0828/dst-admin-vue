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
          clearable>
        </el-input>
        <el-button @click="refreshRooms" icon="el-icon-refresh">刷新</el-button>
        <el-button type="primary" @click="createRoom" icon="el-icon-plus">创建房间</el-button>
      </div>
    </div>

    <!-- 页面加载状态 -->
    <el-card v-if="loading" shadow="hover" class="settings-card">
      <div class="loading-page-content">
        <component :is="'el-icon-loading'" class="legacy-icon loading-page-icon" />
        <p>正在加载页面内容...</p>
      </div>
    </el-card>

    <!-- 无存档时的导引提示 -->
    <el-card v-if="!loading && filteredRooms.length === 0" shadow="hover" class="settings-card empty-save-card">
      <div class="empty-save-content">
        <component :is="'el-icon-folder-add'" class="legacy-icon empty-save-icon" />
        <h4>暂无房间</h4>
        <p>您尚未创建任何房间，请点击下方按钮创建新房间</p>
        <el-button type="primary" @click="createRoom">创建新房间</el-button>
      </div>
    </el-card>

    <!-- 房间列表卡片样式展示 -->
    <div v-if="!loading && filteredRooms.length > 0" class="save-list">
      <el-row :gutter="24" type="flex">
        <el-col :xs="24" :sm="12" :md="8" :lg="8" :xl="6" v-for="room in filteredRooms" :key="room.id" class="room-col">
          <el-card shadow="hover" class="save-item" body-style="padding: 0; height: 100%; display: flex; flex-direction: column;">
            <div class="save-item-content">
              <h4 class="save-name">
                {{ room.name }}
                <el-tag size="mini" type="success" v-if="room.isRunning" class="running-tag">运行中</el-tag>
              </h4>
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
                  <component :is="'el-icon-time'" class="legacy-icon" /> {{ formatDate(room.updateTime) }}
                </span>
                <span class="save-world-count" v-if="room.worlds">
                  <component :is="'el-icon-s-grid'" class="legacy-icon" /> {{ room.worlds ? room.worlds.length : 0 }} 个世界
                </span>
              </div>
            </div>
            <div class="save-actions">
              <el-button-group>
                <el-button
                  v-if="!room.isRunning"
                  type="success"
                  size="small"
                  @click="startRoom(room)"
                  icon="el-icon-video-play">开启</el-button>
                <el-button
                  v-else
                  type="danger"
                  size="small"
                  @click="stopRoom(room)"
                  icon="el-icon-video-pause">停止</el-button>
                <el-button type="primary" size="small" @click="editRoom(room)" icon="el-icon-edit">编辑</el-button>
              </el-button-group>
              <el-dropdown trigger="click" @command="handleDropdownCommand($event, room)" style="margin-left: 10px;">
                <el-button type="info" size="small">
                  更多操作<component :is="'el-icon-arrow-down'" class="legacy-icon el-icon--right" />
                </el-button>
                <template v-slot:dropdown>
<el-dropdown-menu >
                  <el-dropdown-item command="special-lists">特殊名单</el-dropdown-item>
                  <el-dropdown-item command="token">服务器令牌</el-dropdown-item>
                  <el-dropdown-item command="logs">查看日志</el-dropdown-item>
                  <el-dropdown-item command="backup">备份房间</el-dropdown-item>
                  <el-dropdown-item command="delete" divided>
                    <span style="color: #c94f4f;">删除房间</span>
                  </el-dropdown-item>
                </el-dropdown-menu>
</template>
              </el-dropdown>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 特殊名单对话框 -->
    <el-dialog
      title="特殊名单管理"
      v-model="specialListsVisible"
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
      v-model="serverTokenVisible"
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
      v-model="logViewerVisible"
      width="60%"
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
      v-model="startDialogVisible"
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
import { roomApi, systemApi } from '../../api/index';
import SpecialLists from './SpecialLists.vue';
import ServerToken from './ServerToken.vue';
import LogViewer from '../servers/LogViewer.vue';
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
      serverList: [],
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
        serverMode: '64'
      },
      startLoading: false,
      isRefreshing: false,
      lastRefreshTime: 0
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
    // 在created阶段加载数据
    this.refreshRooms();
  },
  mounted() {
    // 在mounted阶段只检查滚动，不再重复加载数据
    this.$nextTick(() => {
      this.checkScrollable();
    });
    // 窗口大小变化时重新检查滚动
    window.addEventListener('resize', this.checkScrollable);
  },
  beforeUnmount() {
    // 移除事件监听器
    window.removeEventListener('resize', this.checkScrollable);
  },
  methods: {
    formatDate(timestamp) {
      if (!timestamp) return '';
      const date = new Date(timestamp);
      return date.toLocaleString();
    },
    refreshRooms() {
      // 如果正在刷新或者距离上次刷新不足2秒，则不进行刷新
      const now = Date.now();
      if (this.isRefreshing || (now - this.lastRefreshTime < 2000)) {
        return;
      }

      this.isRefreshing = true;
      this.lastRefreshTime = now;
      this.loading = true;

      // 同时读取 v2 房间目录和真实运行状态。
      Promise.all([
        roomApi.getRoomList(),
        systemApi.getTmuxServers()
      ])
        .then(([roomsResponse, serversResponse]) => {
          if (roomsResponse?.status === 200 && Array.isArray(roomsResponse.data)) {
            this.rooms = roomsResponse.data.map(item => ({
              id: item.name,
              roomId: item.id,
              name: item.name,
              savepath: item.savepath || '',
              worlds: (item.worlds || []).map(world => ({
                id: world.id,
                name: world.name,
                type: world.type
              })),
              updateTime: item.updateTime,
              isRunning: item.isRunning === true
            }));

            if (serversResponse?.status === 200) {
              this.serverList = serversResponse.data || [];

              this.rooms.forEach(room => {
                const runningServer = this.serverList.find(server =>
                  server.archive_name === room.name && server.status === 'running'
                );
                room.isRunning = !!runningServer;
              });
            }

            this.$message.success('房间列表已刷新');
            console.log('Refreshed rooms and server status at', new Date().toLocaleTimeString());
          } else {
            throw new Error('获取房间列表失败');
          }
        })
        .catch(error => {
          console.error("获取数据失败:", error);
          this.$message.error('获取数据失败: ' + (error.message || '未知错误'));
        })
        .finally(() => {
          this.loading = false;
          this.isRefreshing = false;
          this.$nextTick(() => this.checkScrollable());
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
      this.startLoading = true;
      const roomId = this.selectedRoom.roomId || this.selectedRoom.id;
      roomApi.getRoomWorlds(roomId)
        .then(worlds => {
          const selectedWorlds = this.startForm.worldType === 'all'
            ? worlds
            : worlds.filter(world => world.type === this.startForm.worldType);
          if (selectedWorlds.length === 0) {
            throw new Error('没有找到符合条件的真实世界');
          }
          return roomApi.startRoom({
            room_id: roomId,
            world_ids: selectedWorlds.map(world => world.id)
          });
        })
        .then(response => {
          this.$message.success(response.msg || `房间 ${this.selectedRoom.name} 的启动任务已提交`);
          this.startDialogVisible = false;
        })
        .catch(error => {
          this.$message.error(`启动房间失败: ${error.message || '未知错误'}`);
        })
        .finally(() => {
          this.startLoading = false;
        });
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
        `${room.worlds[0].name} (${room.worlds[0].type === 'forest' ? '森林' : (room.worlds[0].type === 'cave' ? '洞穴' : '其他')})` : '';
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
        roomApi.backupRoom(room.roomId || room.id)
          .then(response => {
            this.$message.success(response.msg || `房间 ${room.name} 的备份任务已提交`);
          })
          .catch(error => {
            this.$message.error('备份房间失败: ' + (error.message || '未知错误'));
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
        roomApi.deleteRoom(room.roomId || room.id)
          .then(response => {
            this.$message.success(response.msg || `已删除房间 ${room.name}`);
            this.refreshRooms();
          })
          .catch(error => {
            this.$message.error('删除房间失败: ' + (error.message || '未知错误'));
            this.refreshRooms();
          });
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
    },
    // 检查世界列表是否可滚动
    checkScrollable() {
      this.$nextTick(() => {
        const worldsElements = document.querySelectorAll('.save-worlds');
        worldsElements.forEach(el => {
          if (el.scrollHeight > el.clientHeight) {
            el.classList.add('scrollable');
          } else {
            el.classList.remove('scrollable');
          }
        });
      });
    },
    // 停止房间
    stopRoom(room) {
      this.$confirm(`确定要停止房间 "${room.name}" 吗?`, '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        roomApi.stopRoom(room.roomId || room.id)
          .then(response => {
            this.$message.success(response.msg || `房间 ${room.name} 的停止任务已提交`);
          })
          .catch(error => {
            this.$message.error('停止房间失败: ' + (error.message || '未知错误'));
          });
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
  width: 100%;
  min-height: 100%;

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;

    h2 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      line-height: 28px;
      color: var(--text-primary);
      position: relative;
      padding-left: 0;
    }

    .header-actions {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 8px;
      flex-wrap: wrap;

      .search-input {
        width: 250px;
        margin: 0;
      }

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
    padding: 32px 0;

    .loading-page-icon,
    .empty-save-icon,
    .loading-saves-icon {
      font-size: 48px;
      color: var(--primary-color);
      margin-bottom: 16px;
    }

    h4 {
      font-size: 18px;
      margin-bottom: 10px;
      color: var(--text-primary);
    }

    p {
      color: var(--text-regular);
      margin-bottom: 16px;
      font-size: 14px;
    }

    .el-button {
      padding: 8px 16px;
      font-size: 14px;
    }
  }

  .save-list {
    .el-row {
      display: flex;
      flex-wrap: wrap;
    }

    .room-col {
      display: flex;
      margin-bottom: 24px;
    }

    .save-item {
      width: 100%;
      min-height: 320px;
      height: 100% !important;
      margin-bottom: 0;
      display: flex;
      flex-direction: column;
      position: relative;
      overflow: hidden;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
      border-radius: 6px;

      &:hover {
        box-shadow: var(--shadow-card-hover);
        border-color: var(--el-color-primary-light-7);
      }

      &::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 3px;
        background: var(--primary-color);
        z-index: 2;
      }

      .el-card__body {
        height: 100%;
        padding: 0;
        display: flex;
        flex-direction: column;
      }

      .save-item-content {
        flex: 1;
        padding: 16px;
        padding-bottom: 10px;
        display: flex;
        flex-direction: column;
        overflow: hidden;

        .save-name {
          height: 45px;
          margin-top: 5px;
          margin-bottom: 15px;
          font-size: 18px;
          font-weight: bold;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          padding-bottom: 10px;
          border-bottom: 1px solid #f0f0f0;
          position: relative;
          padding-left: 30px;

          &::before {
            content: '\e7a4';
            font-family: 'element-icons';
            position: absolute;
            left: 0;
            top: 0;
            font-size: 20px;
            color: var(--primary-color);
          }
        }

        .save-worlds {
          height: 150px;
          margin: 15px 0;
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          border-radius: 4px;
          position: relative;

          /* 添加渐变阴影提示滚动 */
          &::after {
            content: '';
            position: absolute;
            left: 0;
            right: 0;
            bottom: 0;
            height: 15px;
            background: linear-gradient(to top, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0));
            pointer-events: none;
            opacity: 0.7;
            display: none;
          }

          &.scrollable::after {
            display: block;
          }

          /* 自定义滚动条样式 */
          &::-webkit-scrollbar {
            width: 6px;
          }

          &::-webkit-scrollbar-track {
            background: #f5f5f5;
            border-radius: 4px;
          }

          &::-webkit-scrollbar-thumb {
            background: var(--el-border-color);
            border-radius: 4px;
          }

          &::-webkit-scrollbar-thumb:hover {
            background: #9aa69e;
          }

          .world-category {
            margin-bottom: 12px;

            &:last-child {
              margin-bottom: 0;
            }

            .world-category-title {
              font-size: 14px;
              font-weight: 500;
              color: var(--text-regular);
              margin-right: 10px;
              display: block;
              min-width: 60px;
              position: relative;
              padding-left: 20px;
              margin-bottom: 6px;

              &::before {
                position: absolute;
                left: 0;
                top: 2px;
                font-family: 'element-icons';
                font-size: 14px;
              }
            }

            .world-tags {
              display: flex;
              flex-wrap: wrap;
              width: 100%;

              .world-tag {
                margin-right: 8px;
                margin-bottom: 8px;
                border-radius: 12px;
                padding: 2px 10px;
                max-width: 100%;
                white-space: nowrap;
                text-overflow: ellipsis;
                overflow: hidden;
              }
            }

            &.forest .world-category-title {
              color: var(--primary-color);

              &::before {
                content: '\e79b';
                color: var(--primary-color);
              }
            }

            &.cave .world-category-title {
              color: #4f8a5b;

              &::before {
                content: '\e790';
                color: #4f8a5b;
              }
            }

            &.unknown .world-category-title {
              color: var(--text-secondary);

              &::before {
                content: '\e6f6';
                color: var(--text-secondary);
              }
            }
          }
        }

        .save-info {
          height: 40px;
          margin-top: auto;
          display: flex;
          flex-wrap: wrap;
          font-size: 13px;
          color: var(--text-secondary);
          background-color: #f9f9f9;
          padding: 8px 10px;
          border-radius: 6px;

          .save-date, .save-world-count {
            margin-right: 15px;
            margin-bottom: 5px;

            i {
              margin-right: 5px;
              font-size: 14px;
            }
          }
        }
      }

      .save-actions {
        gap: 8px;
        padding: 12px 16px;
        min-height: 60px;
        height: auto;
        display: flex;
        justify-content: space-between;
        border-top: 1px solid #f0f0f0;
        background-color: #fafafa;
        position: relative;
        z-index: 1;
        margin-top: auto;

        .el-button {
          border-radius: 6px;
          margin-right: 0;

          &.el-button--success {
            background-color: #4f8a5b;
            border-color: #4f8a5b;

            &:hover, &:focus {
              background-color: #6aa876;
              border-color: #6aa876;
            }
          }

          &.el-button--primary {
            background-color: var(--primary-color);
            border-color: var(--primary-color);

            &:hover, &:focus {
              background-color: var(--el-color-primary-light-3);
              border-color: var(--el-color-primary-light-3);
            }
          }

          &.el-button--danger {
            background-color: #c94f4f;
            border-color: #c94f4f;

            &:hover, &:focus {
              background-color: #f78989;
              border-color: #f78989;
            }
          }

          i {
            margin-right: 3px;
          }
        }

        .el-dropdown {
          .el-button {
            background-color: #f4f4f5;
            color: var(--text-regular);
            border-color: #f4f4f5;

            &:hover, &:focus {
              background-color: #e9e9eb;
              border-color: #e9e9eb;
            }
          }
        }
      }
    }
  }

  // 响应式调整
  @media (max-width: 767px) {
    .page-header {
      flex-direction: column;
      align-items: flex-start;

      h2 {
        margin-bottom: 0;
      }

      .header-actions {
        width: 100%;
        display: grid;
        grid-template-columns: 1fr 1fr;

        .search-input {
          margin-bottom: 10px;
          grid-column: 1 / -1;
          width: 100% !important;
          margin-right: 0;
        }

        .el-button {
          width: 100%;
          margin: 0;
        }
      }
    }

    .save-item {
      height: auto;
      min-height: 300px;
    }

    .save-actions {
      align-items: center;
      flex-wrap: wrap;

      .el-button-group {
        flex: 1 1 auto;
      }

      .el-dropdown {
        margin-left: 0 !important;
      }
    }
  }

  .select-save-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

.empty-save-card {
    border-radius: 6px;
    box-shadow: var(--shadow-card);
  }

  .fullheight-dialog {
    :deep(.el-dialog) {
      border-radius: 8px;
      overflow: hidden;
    }

    :deep(.el-dialog__body) {
      max-height: 80vh;
      overflow-y: auto;
    }
  }
}

.el-card.save-item {
  height: 100% !important;

  .el-card__body {
    height: 100%;
    padding: 0;
    display: flex;
    flex-direction: column;
  }
}

.room-col {
  margin-bottom: 24px;
}

/* 运行状态样式 */
.running-tag {
  margin-left: 8px !important;
  border-radius: 10px !important;
  font-size: 11px !important;
  height: 20px !important;
  line-height: 18px !important;
  background-color: #4f8a5b !important;
  border-color: #4f8a5b !important;
  color: #fff !important;
  padding: 0 7px !important;
  display: inline-flex !important;
  align-items: center !important;
  position: relative;

  &::before {
    content: '•';
    display: inline-block;
    margin-right: 4px;
    animation: blink 1.5s infinite;
  }
}

@keyframes blink {
  0% { opacity: 0.2; }
  50% { opacity: 1; }
  100% { opacity: 0.2; }
}
</style>
