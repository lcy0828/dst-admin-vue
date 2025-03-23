<template>
  <div class="room-list-page">
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
        <el-button type="primary" icon="el-icon-plus" @click="createRoom">创建房间</el-button>
      </div>
    </div>
    
    <el-card shadow="hover" class="room-list-card">
      <div slot="header" class="card-header">
        <span>所有房间</span>
        <div>
          <el-button style="margin-left: 10px;" size="small" icon="el-icon-refresh" @click="refreshRooms">刷新</el-button>
        </div>
      </div>
      
      <el-table
        :data="filteredRooms"
        style="width: 100%"
        v-loading="loading"
        @row-click="handleRowClick">
        <el-table-column prop="name" label="房间名称" min-width="150"></el-table-column>
        <el-table-column prop="savepath" label="保存路径" min-width="300"></el-table-column>
        <el-table-column label="操作" width="320" fixed="right">
          <template slot-scope="scope">
            <el-button 
              type="success" 
              size="mini" 
              @click.stop="startRoom(scope.row)">开启</el-button>
            <el-button 
              type="primary" 
              size="mini" 
              @click.stop="editRoom(scope.row)">编辑</el-button>
            <el-dropdown trigger="click" @command="handleRoomSettings($event, scope.row)" @click.stop>
              <el-button type="info" size="mini">
                设置<i class="el-icon-arrow-down el-icon--right"></i>
              </el-button>
              <el-dropdown-menu slot="dropdown">
                <el-dropdown-item command="special-lists">特殊名单</el-dropdown-item>
                <el-dropdown-item command="token">服务器令牌</el-dropdown-item>
              </el-dropdown-menu>
            </el-dropdown>
            <el-dropdown trigger="click" @command="handleMoreCommands($event, scope.row)" @click.stop>
              <el-button size="mini">
                更多<i class="el-icon-arrow-down el-icon--right"></i>
              </el-button>
              <el-dropdown-menu slot="dropdown">
                <el-dropdown-item command="duplicate">复制房间</el-dropdown-item>
                <el-dropdown-item command="backup">备份房间</el-dropdown-item>
                <el-dropdown-item command="delete" divided>
                  <span style="color: #F56C6C;">删除房间</span>
                </el-dropdown-item>
              </el-dropdown-menu>
            </el-dropdown>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
    
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
  </div>
</template>

<script>
import { roomApi } from '../../api/index';
import SpecialLists from './SpecialLists.vue';
import ServerToken from './ServerToken.vue';

export default {
  name: 'RoomList',
  components: {
    SpecialLists,
    ServerToken
  },
  data() {
    return {
      loading: false,
      searchQuery: '',
      rooms: [],
      specialListsVisible: false,
      serverTokenVisible: false,
      selectedSavename: ''
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
  methods: {
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
              ...item
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
                ...item
              }));
            } 
            // 检查data.data是否为数组(嵌套数据结构)
            else if (response.data.data && Array.isArray(response.data.data)) {
              this.rooms = response.data.data.map(item => ({
                id: item.name,
                ...item
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
    handleRowClick(row) {
      // 点击行跳转到详情页
      this.$router.push({
        path: '/rooms/settings',
        query: { id: row.id }
      });
    },
    handleMoreCommands(command, room) {
      switch (command) {
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
    // 处理房间设置下拉菜单命令
    handleRoomSettings(command, room) {
      // 设置当前选中的存档名称
      this.selectedSavename = this.getSaveName(room);
      
      switch (command) {
        case 'special-lists':
          this.openSpecialListsDialog();
          break;
        case 'token':
          this.openServerTokenDialog();
          break;
      }
    },
    // 从房间信息中获取存档名称
    getSaveName(room) {
      // 如果savename直接存在，则使用它
      if (room.savename) {
        return room.savename;
      }
      
      // 否则从savepath中提取存档名称
      if (room.savepath) {
        // 假设savepath的格式为"/path/to/savename"
        const pathParts = room.savepath.split('/');
        return pathParts[pathParts.length - 1];
      }
      
      // 如果都不存在，使用房间名称作为存档名称
      return room.name;
    },
    // 打开特殊名单对话框
    openSpecialListsDialog() {
      this.specialListsVisible = true;
    },
    // 打开服务器令牌对话框
    openServerTokenDialog() {
      this.serverTokenVisible = true;
    },
    // 关闭特殊名单对话框
    closeSpecialListsDialog() {
      this.specialListsVisible = false;
    },
    // 关闭服务器令牌对话框
    closeServerTokenDialog() {
      this.serverTokenVisible = false;
    },
    duplicateRoom(room) {
      this.$prompt('请输入新房间名称', '复制房间', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        inputPattern: /^[a-zA-Z0-9_\.]+$/,
        inputErrorMessage: '房间名称只能包含字母、数字、下划线和点'
      }).then(({ value }) => {
        this.loading = true;
        roomApi.duplicateRoom(room.id, { name: value })
          .then(() => {
            this.$message({
              type: 'success',
              message: `已复制房间 ${room.name} 到 ${value}`,
            });
            this.refreshRooms(); // 刷新列表以显示新房间
          })
          .catch(error => {
            this.$message.error(`复制房间失败: ${error.message}`);
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
    backupRoom(room) {
      this.$confirm(`确定要备份房间 "${room.name}" 吗?`, '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'info'
      }).then(() => {
        this.loading = true;
        roomApi.backupRoom(room.id)
          .then(() => {
            this.$message({
              type: 'success',
              message: `房间 ${room.name} 备份已创建`
            });
          })
          .catch(error => {
            this.$message.error(`备份房间失败: ${error.message}`);
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
    deleteRoom(room) {
      this.$confirm(`确定要删除房间 "${room.name}" 吗？此操作不可恢复!`, '警告', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        this.loading = true;
        roomApi.deleteRoom(room.id)
          .then(() => {
            // 从本地列表中移除
            this.rooms = this.rooms.filter(r => r.id !== room.id);
            this.$message({
              type: 'success',
              message: `房间 ${room.name} 已删除`
            });
          })
          .catch(error => {
            this.$message.error(`删除房间失败: ${error.message}`);
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
    }
  },
  mounted() {
    this.refreshRooms();
  }
}
</script>

<style scoped>
.room-list-page {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header-actions {
  display: flex;
  align-items: center;
}

.search-input {
  width: 250px;
  margin-right: 15px;
}

.room-list-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* 表格行悬停样式 */
.el-table >>> .el-table__row {
  cursor: pointer;
}

.el-table >>> .el-table__row:hover {
  background-color: #f5f7fa;
}

/* 弹窗样式 */
.fullheight-dialog >>> .el-dialog {
  display: flex;
  flex-direction: column;
  margin-top: 5vh !important;
  margin-bottom: 5vh !important;
  height: 90vh;
}

.fullheight-dialog >>> .el-dialog .el-dialog__body {
  flex: 1;
  overflow: auto;
  padding: 0;
}
</style> 