<template>
  <div class="server-list-page">
    <!-- 标题及操作按钮 -->
    <div class="page-header">
      <div class="title-container">
        <i class="el-icon-monitor"></i>
        <span>服务器状态监控</span>
      </div>
      <div class="action-buttons">
        <el-button size="small" icon="el-icon-refresh" @click="refreshData">刷新</el-button>
      </div>
      </div>

    <!-- 服务器分组及筛选区域 -->
    <div class="filter-container">
      <el-tabs v-model="activeTab" @tab-click="handleTabChange">
        <el-tab-pane label="全部服务器" name="all"></el-tab-pane>
        <el-tab-pane label="本机服务器" name="local"></el-tab-pane>
        <el-tab-pane label="Docker服务器 (未来功能)" name="docker" disabled></el-tab-pane>
        <el-tab-pane label="远程服务器 (未来功能)" name="remote" disabled></el-tab-pane>
        <el-tab-pane label="K8s服务器 (未来功能)" name="k8s" disabled></el-tab-pane>
      </el-tabs>

      <div class="filter-options">
        <el-select v-model="roomFilter" placeholder="按存档筛选" size="small" clearable @change="filterServers">
          <el-option
            v-for="room in roomList"
            :key="room.id"
            :label="room.name"
            :value="room.id">
          </el-option>
        </el-select>

        <el-select v-model="typeFilter" placeholder="按类型筛选" size="small" clearable @change="filterServers">
          <el-option label="森林服务器" value="forest"></el-option>
          <el-option label="洞穴服务器" value="cave"></el-option>
        </el-select>

        <el-select v-model="statusFilter" placeholder="按状态筛选" size="small" clearable @change="filterServers">
          <el-option label="在线" value="online"></el-option>
          <el-option label="离线" value="offline"></el-option>
          <el-option label="重启中" value="restarting"></el-option>
        </el-select>

        <el-select v-model="closedTimeFilter" placeholder="按关闭时间筛选" size="small" clearable @change="filterServers">
          <el-option label="显示所有" value="all"></el-option>
          <el-option label="1小时内关闭" value="1"></el-option>
          <el-option label="6小时内关闭" value="6"></el-option>
          <el-option label="12小时内关闭" value="12"></el-option>
          <el-option label="24小时内关闭" value="24"></el-option>
          <el-option label="3天内关闭" value="72"></el-option>
          <el-option label="7天内关闭" value="168"></el-option>
        </el-select>
      </div>
    </div>

    <!-- 服务器列表主体内容 -->
    <div v-loading="loading" class="server-table-container">
        <el-table
          :data="filteredServerList"
          style="width: 100%"
          border
          stripe>
          <el-table-column
          label="服务器名称"
          prop="name"
          min-width="180">
          <template slot-scope="scope">
            <div class="server-name-container">
              <div :class="['server-status', scope.row.status === 'running' ? 'online' : 'offline']"></div>
              <el-tag size="mini" :type="getWorldTypeTagType(scope.row.world_name)" class="server-type-tag">
                {{ getWorldTypeName(scope.row.world_name) }}
              </el-tag>
              <div class="server-room">
                {{ scope.row.archive_name }}
              </div>
            </div>
          </template>
          </el-table-column>

          <el-table-column
          label="玩家"
          width="100">
            <template slot-scope="scope">
            {{ scope.row.players }}
            </template>
          </el-table-column>

          <el-table-column
          label="天数"
          width="70">
          <template slot-scope="scope">
            {{ scope.row.days }}
          </template>
          </el-table-column>

          <el-table-column
          label="季节"
          width="100">
            <template slot-scope="scope">
            <el-tag v-if="scope.row.season" :type="getSeasonType(scope.row.season)" size="medium">
              {{ scope.row.season }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column
          label="服务器模式"
          width="100">
            <template slot-scope="scope">
            <el-tag type="info" size="medium" v-if="scope.row.server_mode">
              {{ getServerModeText(scope.row.server_mode) }}
            </el-tag>
              <span v-else>-</span>
            </template>
          </el-table-column>

          <el-table-column
          label="运行时间"
          min-width="140">
            <template slot-scope="scope">
              <div>{{ formatTimeDiff(Date.now() - new Date(scope.row.start_time).getTime()) }}</div>
          </template>
        </el-table-column>

        <el-table-column
          label="部署方式"
          width="100">
          <template slot-scope="scope">
            <el-tag size="medium">
              本地
            </el-tag>
            </template>
          </el-table-column>

          <el-table-column
            label="操作"
            min-width="200">
            <template slot-scope="scope">
            <div class="operation-buttons">
              <el-button
                size="mini"
                :type="scope.row.status === 'running' ? 'danger' : 'success'"
                @click="handleServerAction(scope.row)">
                {{ scope.row.status === 'running' ? '停止' : '启动' }}
              </el-button>
              <el-button
                size="mini"
                type="info"
                @click="handleConfigure(scope.row)">
                配置
              </el-button>
            </div>
            </template>
          </el-table-column>
        </el-table>

      <!-- 空数据提示 -->
      <div class="empty-block" v-if="filteredServerList.length === 0 && !loading">
        <el-empty description="暂无服务器数据" :image-size="100">
          <div class="empty-description">
            <p>没有发现任何运行中的服务器</p>
            <p>您可以先创建一个房间，然后启动它</p>
        </div>
          <div class="empty-actions">
            <el-button type="primary" @click="navigateToRoomCreation">创建新房间</el-button>
            <el-button type="success" @click="showStartRoomDialog">启动现有房间</el-button>
      </div>
        </el-empty>
      </div>
    </div>

    <!-- 启动房间对话框 -->
    <el-dialog
      title="选择并启动房间"
      :visible.sync="startRoomDialogVisible"
      width="500px">
      <div>
        <el-form label-width="120px" :model="startRoomForm" :rules="rules" ref="startRoomForm">
          <el-form-item label="选择房间">
            <el-select v-model="startRoomForm.roomIndex" placeholder="请选择房间" style="width: 100%">
              <el-option
                v-for="(room, index) in roomList"
                :key="room.id"
                :label="room.name"
                :value="index">
              </el-option>
            </el-select>
          </el-form-item>

          <el-form-item label="选择世界" prop="worldType" v-if="startRoomForm.roomIndex !== ''">
            <el-checkbox-group v-model="startRoomForm.worldType">
              <el-checkbox v-for="world in roomList[startRoomForm.roomIndex].worlds"
              :label="world"
              :key="world.type">
              {{world.name}}
            </el-checkbox>
            </el-checkbox-group>
          </el-form-item>

          <el-form-item label="服务器模式">
            <el-select v-model="startRoomForm.serverMode" placeholder="选择服务器模式">
              <el-option label="32位" value="32"></el-option>
              <el-option label="64位" value="64"></el-option>
              <el-option label="LuaJit" value="luajit"></el-option>
            </el-select>
            <div class="mode-description" v-if="startRoomForm.serverMode === '64'">
              <i class="el-icon-warning-outline"></i> 64位模式使用64位引擎，可能会更耗内存但性能更好
            </div>
            <div class="mode-description" v-else-if="startRoomForm.serverMode === 'luajit'">
              <i class="el-icon-star-on"></i> LuaJit模式使用JIT编译器，可能提供更好的性能
            </div>
            <div class="mode-description" v-else>
              <i class="el-icon-info"></i> 32位模式使用32位引擎，适合大多数服务器
            </div>
          </el-form-item>
        </el-form>
      </div>
      <div slot="footer" class="dialog-footer">
        <el-button @click="startRoomDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleStartRoomFrom('startRoomForm')" :loading="startRoomLoading">启动</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { systemApi, roomApi } from '@/api/index';
import { formatTimeDiff } from '@/utils/dateUtils';

export default {
  name: 'ServerList',
  data() {
    return {
      formatTimeDiff,
      loading: false,
      activeTab: 'all',
      roomFilter: '',
      typeFilter: '',
      statusFilter: '',
      closedTimeFilter: 'all',
      serverList: [],
      roomList: [],
      startRoomDialogVisible: false,
      startRoomForm: {
        roomIndex: '',
        worldType: [],
        serverMode: '32'
      },
      startRoomLoading: false,
      rules: {
        worldType: [
            { type: 'array', required: true, message: '请至少选择一个世界', trigger: 'change' }
          ],
      }
    };
  },
  computed: {
    filteredServerList() {
      let result = this.serverList;

      // 根据标签页筛选
      if (this.activeTab !== 'all' && this.activeTab !== 'local') {
        // 当前只有本机服务器，所以当选择本机服务器标签时，显示所有服务器
        // 其他标签页都是未来功能，已经禁用，不会进入这个分支
        const deploymentMap = {
          'docker': 'Docker',
          'remote': '远程',
          'k8s': 'K8s'
        };
        result = result.filter(server => server.deployment === deploymentMap[this.activeTab]);
      }

      // 根据服务器类型筛选
      if (this.typeFilter) {
        result = result.filter(server => {
          // 根据 world_name 判断服务器类型
          const worldName = server.world_name || '';
          const lowerWorldName = worldName.toLowerCase();

          if (this.typeFilter === 'forest') {
            return lowerWorldName.includes('forest');
          } else if (this.typeFilter === 'cave') {
            return lowerWorldName.includes('cave');
          }

          return false;
        });
      }

      // 根据状态筛选
      if (this.statusFilter) {
        const statusMap = {
          'online': 'running',
          'offline': 'stopped'
        };
        result = result.filter(server => server.status === statusMap[this.statusFilter]);
      }

      // 根据关闭时间筛选
      if (this.closedTimeFilter && this.closedTimeFilter !== 'all') {
        const hours = parseInt(this.closedTimeFilter);
        if (!isNaN(hours)) {
          const now = new Date();
          const cutoffTime = new Date(now.getTime() - hours * 60 * 60 * 1000);

          result = result.filter(server => {
            // 只对离线的服务器进行筛选
            if (server.status !== 'stopped') {
              return true;
            }

            // 提取服务器关闭时间
            const startTime = server.start_time;
            if (!startTime) {
              return true; // 如果没有开始时间，默认显示
            }

            try {
              const serverCloseTime = new Date(startTime);
              // 如果服务器关闭时间在截止时间之后，则显示
              return serverCloseTime >= cutoffTime;
            } catch (e) {
              console.error('解析服务器关闭时间出错:', e);
              return true; // 解析出错时默认显示
            }
          });
        }
      }

      return result;
    }
  },
  created() {
    this.fetchData();
  },
  methods: {
    fetchData() {
      this.loading = true;
      this.serverList = [];
      systemApi.getTmuxServers().then(res => {
        this.serverList = res.data || [];
        this.$message.success(res.msg);
      }).catch(err => {
        console.error(err);
      }).finally(() => {
        this.loading = false;
      });
    },
    fetchRooms() {
      roomApi.getRoomList()
        .then(response => {
          this.roomList = response.data;
        })
        .catch(error => {
          console.error(error);
        });
    },
    refreshData() {
      this.fetchData();
    },
    handleTabChange() {
      // 切换标签页时调整筛选
    },
    filterServers() {
      // 根据筛选条件过滤服务器列表
    },
    navigateToRoomCreation() {
      // 跳转到房间创建页面
      this.$router.push('/rooms/settings');
    },
    navigateToRoom(row) {
    },
    getSeasonType(season) {
      const seasonMap = {
        '秋季': '',
        '冬季': 'info',
        '春季': 'success',
        '夏季': 'warning'
      };
      return seasonMap[season] || '';
    },

    getServerModeText(mode) {
      switch(mode) {
        case '32': return '32位';
        case '64': return '64位';
        case 'luajit': return 'LuaJit';
        default: return mode;
      }
    },

    getWorldTypeTagType(worldName) {
      if (!worldName) return 'info';

      const lowerName = worldName.toLowerCase();
      if (lowerName.includes('forest')) {
        return 'success';
      } else if (lowerName.includes('cave')) {
        return 'warning';
      } else {
        return 'info';
      }
    },

    getWorldTypeName(worldName) {
      if (!worldName) return '未知';

      const lowerName = worldName.toLowerCase();
      if (lowerName.includes('forest')) {
        return '森林';
      } else if (lowerName.includes('cave')) {
        return '洞穴';
      } else {
        return '未知';
      }
    },
    getDeploymentType(deployment) {
      const deploymentMap = {
        '本地': '',
        'Docker': 'success',
        '远程': 'warning',
        'K8s': 'info'
      };
      return deploymentMap[deployment] || '';
    },

    showStartRoomDialog() {
      this.startRoomDialogVisible = true;
      this.fetchRooms();
    },

    handleStartRoomFrom(formName) {
      this.$refs[formName].validate((valid) => {
        if (valid) {
          let promises = [];
          this.startRoomForm.worldType.forEach(world => {
            let params = {
              archive_name: this.roomList[this.startRoomForm.roomIndex].name,
              server_mode: this.startRoomForm.serverMode,
              world_name: world.name,
              world_type: world.type
            }
            promises.push(roomApi.startRoom(params));
          });
          Promise.all(promises).then(res => {
            this.$message.success('启动成功');
            this.startRoomDialogVisible = false;
            this.fetchData();
          }).catch(err => {
            console.error(err);
          });
        } else {
          return false;
        }
      });
    },
    handleServerAction(server) {
      if (server.status === 'running') {
        this.$confirm(`确定要停止 "${server.archive_name}" 吗？`, '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }).then(() => {
          systemApi.stopTmuxServer({session_name: server.session_name}).then(res => {
            this.$message.success(res.msg);
            setTimeout(() => {
              this.fetchData();
            }, 10000);
          }).catch(err => {
            this.$message.error('停止失败!');
          });
        }).catch(() => {
          this.$message({
            type: 'info',
            message: '取消停止'
          });
        });
      }
    },
  }
};
</script>

<style scoped>
.server-list-page {
  padding: 15px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.title-container {
  display: flex;
  align-items: center;
  font-size: 18px;
  font-weight: bold;
}

.title-container i {
  margin-right: 8px;
  font-size: 22px;
}

.filter-container {
  margin-bottom: 15px;
  background-color: #fff;
  border-radius: 4px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
  padding: 12px;
}

.filter-options {
  display: flex;
  margin-top: 12px;
  flex-wrap: wrap;
}

.filter-options .el-select {
  margin-right: 12px;
  margin-bottom: 8px;
  width: 140px;
}

.server-table-container {
  background-color: #fff;
  border-radius: 4px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
  padding: 12px;
}

.server-name-container {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
}

.server-status {
  min-width: 8px;
  min-height: 8px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 6px;
  flex-shrink: 0;
}

.server-status.online {
  background-color: #67C23A;
}

.server-status.offline {
  background-color: #F56C6C;
}

.server-status.restarting {
  background-color: #E6A23C;
}

.server-name {
  font-weight: bold;
  margin-right: 6px;
  word-break: break-all;
}

.server-type-tag {
  margin-left: 4px;
  margin-bottom: 2px;
}

.server-room {
  font-size: 12px;
  color: #909399;
  margin-left: 4px;
}

.operation-buttons {
  display: flex;
  justify-content: flex-start;
  flex-wrap: wrap;
}

.operation-buttons .el-button {
  margin-right: 5px;
  margin-bottom: 5px;
}

.operation-dropdown {
  margin-right: 0;
}

.empty-block {
  padding: 30px 0;
}

.empty-description {
  margin-bottom: 15px;
  color: #909399;
}

.empty-description p {
  margin: 5px 0;
}

.empty-actions {
  margin-top: 15px;
}

/* 响应式调整 */
@media (max-width: 1200px) {
  .operation-buttons {
  flex-direction: column;
    align-items: flex-start;
  }

  .operation-buttons .el-button {
    margin-bottom: 5px;
  }
}

@media (max-width: 768px) {
  .filter-options {
    flex-direction: column;
  }

  .filter-options .el-select {
    width: 100%;
    margin-right: 0;
  }
}

.server-offline {
  color: #909399;
  font-style: italic;
}

.mode-description {
  font-size: 12px;
  color: #909399;
  margin-top: 5px;
  line-height: 1.4;
}

/* 禁用标签的样式 */
.el-tabs__item.is-disabled {
  color: #c0c4cc;
  cursor: not-allowed;
  position: relative;
}

.el-tabs__item.is-disabled::after {
  content: '\1F512'; /* 锁定图标 Unicode */
  font-size: 12px;
  margin-left: 4px;
  position: absolute;
  top: 0;
  right: -15px;
}
</style>