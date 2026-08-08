<template>
  <div class="dashboard-content" v-loading="loading" element-loading-text="加载中..." element-loading-spinner="el-icon-loading">

    <!-- 版本信息卡片 -->
    <el-row :gutter="20" class="version-info-row">
      <el-col :span="24">
        <el-card shadow="hover" class="version-card">
          <div class="version-content">
            <div class="version-icon">
              <component :is="'el-icon-info'" class="legacy-icon" />
            </div>
            <div class="version-details">
              <div class="version-header">
                <span class="version-title">饥荒服务器版本信息</span>
                <div class="version-actions">
                  <el-button
                    type="success"
                    size="small"
                    @click="updateDstServer"
                    :disabled="updateStatus && updateStatus.is_running"
                    :loading="updateStatus && updateStatus.is_running"
                  >
                    <component v-if="!(updateStatus && updateStatus.is_running)" :is="'el-icon-upload2'" class="legacy-icon" />
                    {{ updateStatus && updateStatus.is_running ? '更新中...' : '更新游戏' }}
                  </el-button>
                  <el-button
                    type="text"
                    size="small"
                    icon="el-icon-refresh"
                    @click="getVersionInfo"
                    :disabled="updateStatus && updateStatus.is_running"
                  >刷新</el-button>
                </div>
              </div>
              <div v-if="versionInfo.local && versionInfo.latest" class="version-info">
                <div class="version-boxes">
                  <div class="version-box">
                    <div class="version-box-label">当前版本</div>
                    <div class="version-box-value">{{ versionInfo.local.version || '--' }}</div>
                  </div>
                  <div class="version-arrow">
                    <component :is="'el-icon-arrow-right'" class="legacy-icon" />
                  </div>
                  <div class="version-box" :class="{'version-box-outdated': isVersionOutdated}">
                    <div class="version-box-label">最新版本</div>
                    <a
                      v-if="versionInfo.latest.update_url"
                      :href="versionInfo.latest.update_url"
                      target="_blank"
                      class="version-box-value version-link">
                      {{ versionInfo.latest.version }}
                      <component v-if="isVersionOutdated" :is="'el-icon-warning'" class="legacy-icon version-warning-icon" />
                    </a>
                    <span v-else class="version-box-value">{{ versionInfo.latest.version || '--' }}</span>
                    <div class="version-box-date">{{ versionInfo.latest.release_date || '--' }} / R{{ versionInfo.latest.build_number || '--' }}</div>
                  </div>
                </div>
                <div v-if="isVersionOutdated" class="version-update-notice">
                  <component :is="'el-icon-warning'" class="legacy-icon" />
                  <span>检测到新版本可用，请及时更新游戏服务端!</span>
                  <el-button type="primary" size="small" @click="openUpdateLink">查看更新内容</el-button>
                </div>
                <div v-if="updateStatus" class="version-update-status">
                  <div class="update-status-header">
                    <component :is="updateStatus.is_running ? 'el-icon-loading' : (updateStatus.is_completed ? 'el-icon-success' : 'el-icon-info')" class="legacy-icon" />
                    <span>更新状态: {{ updateStatus.is_completed ? '已完成' : (updateStatus.is_running ? '进行中' : '尚未开始') }}</span>
                  </div>
                  <el-progress
                    v-if="updateStatus.is_completed || hasMetric(updateStatus.progress)"
                    :percentage="Number(updateStatus.progress)"
                    :status="updateStatus.is_completed ? 'success' : ''"
                  ></el-progress>
                  <div v-else-if="updateStatus.is_running" class="metric-unavailable">进度：--</div>
                  <div v-if="updateStatus.last_output" class="update-output">
                    <div class="output-label">最新输出:</div>
                    <div class="output-content">{{ updateStatus.last_output }}</div>
                  </div>
                  <div v-if="updateStatus.error" class="update-error">
                    <div class="error-label">错误信息:</div>
                    <div class="error-content">{{ updateStatus.error }}</div>
                  </div>
                </div>
              </div>
              <div v-else class="version-loading">
                <component :is="'el-icon-loading'" class="legacy-icon" />
                <span>正在获取版本信息...</span>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>



    <!-- 标题分割线 -->
    <div class="section-divider">
      <div class="section-title">
        <component :is="'el-icon-data-analysis'" class="legacy-icon" />
        <span>服务器状态监控</span>
      </div>
      <div class="refresh-btn">
        <el-button size="small" type="primary" icon="el-icon-refresh" circle @click="refreshData"></el-button>
      </div>
    </div>

    <!-- 服务器监控 -->
    <el-row :gutter="20" class="monitor-section">
      <el-col :xs="24" :sm="24" :md="16" :span="16">
        <el-card shadow="hover" class="server-monitor">
          <template v-slot:header>
<div  class="clearfix server-header">
            <span><component :is="'el-icon-monitor'" class="legacy-icon" /> 服务器状态监控</span>
            <el-button type="text" icon="el-icon-refresh" @click="getServerList">刷新</el-button>
          </div>
</template>

          <el-table
            :data="serverList"
            style="width: 100%"
            size="medium"
            :row-class-name="tableRowClassName"
            highlight-current-row
            border>
            <el-table-column prop="status" label="状态" width="90" align="center">
              <template v-slot="scope">
                <el-tag
                  :type="getServerStatusTag(scope.row.status)"
                  size="medium"
                  effect="dark">
                  {{ getServerStatusName(scope.row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="archive_name" label="房间名称" min-width="120">
              <template v-slot="scope">
                <div class="server-name-info">
                  <span class="server-name-text">{{ scope.row.archive_name }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="world_name" label="世界名称" min-width="120">
              <template v-slot="scope">
                <el-tag
                  :type="scope.row.world_type === 'forest' ? 'warning' : (scope.row.world_type === 'cave' ? 'primary' : 'info')"
                  size="medium"
                  effect="plain">
                  {{ scope.row.world_name }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="启动时间" width="170" align="center">
              <template v-slot="scope">
                <div class="time-info">
                  <span>{{ scope.row.start_time || '--' }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="运行时间" width="90" align="center">
              <template v-slot="scope">
                <div class="time-info">
                  <span>{{ formatServerUptime(scope.row.start_time) }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="180" align="center">
              <template v-slot="scope">
                <el-button-group>
                  <el-button
                    size="mini"
                    :type="scope.row.status === 'running' ? 'danger' : 'success'"
                    :icon="scope.row.status === 'running' ? 'el-icon-video-pause' : 'el-icon-video-play'"
                    @click="handleServerAction(scope.row)">
                    {{ scope.row.status === 'running' ? '停止' : '启动' }}
                  </el-button>
                  <el-button
                    size="mini"
                    type="primary"
                    icon="el-icon-setting"
                    @click="handleConfigure(scope.row)">
                    配置
                  </el-button>
                </el-button-group>
              </template>
            </el-table-column>
          </el-table>

          <div class="server-footer" v-if="serverList.length > 0">
            <span class="server-stats">共 {{ serverList.length }} 个服务器实例，{{ serverList.filter(s => s.status === 'running').length }} 个运行中</span>
          </div>

          <div class="empty-server" v-if="serverList.length === 0">
            <component :is="'el-icon-warning-outline'" class="legacy-icon" />
            <span>暂无服务器实例运行</span>
            <el-button type="primary" size="small" plain @click="openStartRoomDialog">启动现有房间</el-button>
          </div>

          <!-- 启动房间对话框 -->
          <el-dialog
            title="启动房间"
            v-model="startRoomDialogVisible"
            width="500px"
            :close-on-click-modal="false"
            :close-on-press-escape="false">
            <div v-loading="startRoomLoading" class="dialog-content">
              <el-form :model="startRoomForm" label-width="100px" :rules="startRoomRules" ref="startRoomForm">
                <el-form-item label="选择房间" prop="roomId">
                  <el-select
                    v-model="startRoomForm.roomId"
                    placeholder="请选择房间"
                    style="width: 100%"
                    @change="fetchRoomWorlds"
                  >
                    <el-option
                      v-for="(room, index) in roomList"
                      :key="room.id || index"
                      :label="room.name"
                      :value="index">
                    </el-option>
                  </el-select>
                </el-form-item>
              <el-form-item label="选择世界" prop="selectedWorlds">
                <div v-if="currentRoomWorlds.length > 0" class="world-selection">
                  <el-checkbox-group v-model="startRoomForm.selectedWorlds">
                    <el-checkbox
                      v-for="world in currentRoomWorlds"
                      :key="world.name"
                      :label="world.name">
                      {{ world.name }}
                      <el-tag size="mini" :type="getWorldTagType(world.type)">
                        {{ getWorldTypeName(world.type) }}
                      </el-tag>
                    </el-checkbox>
                  </el-checkbox-group>
                  <div class="world-selection-actions">
                    <el-button type="text" size="small" @click="selectAllWorlds">全选</el-button>
                    <el-button type="text" size="small" @click="unselectAllWorlds">取消全选</el-button>
                  </div>
                </div>
                <div v-else class="no-worlds-tip">
                  <component :is="'el-icon-warning-outline'" class="legacy-icon" />
                  <span>该房间没有可用的世界</span>
                </div>
              </el-form-item>
              <el-form-item label="服务器模式">
                <el-radio-group v-model="startRoomForm.serverMode">
                  <el-radio label="32" disabled>32位</el-radio>
                  <el-radio label="64" disabled>64位</el-radio>
                  <el-radio label="luajit" disabled>LuaJit</el-radio>
                </el-radio-group>
                <span class="mode-hint">v2 使用系统设置中的服务端位数</span>
              </el-form-item>
            </el-form>
            </div>
            <template v-slot:footer>
<div  class="dialog-footer">
              <el-button @click="startRoomDialogVisible = false" :disabled="startRoomLoading">取消</el-button>
              <el-button type="primary" @click="startRoom" :loading="startRoomLoading" :disabled="roomList.length === 0">启动</el-button>
            </div>
</template>
          </el-dialog>

        </el-card>
      </el-col>

      <el-col :xs="24" :sm="24" :md="8" :span="8">
        <el-card shadow="hover" class="system-info">
          <template v-slot:header>
<div  class="clearfix">
            <span>系统资源</span>
            <el-button style="float: right; padding: 3px 0" type="text" @click="refreshSystemStatus">刷新</el-button>
          </div>
</template>
          <div v-loading="systemLoading" class="resource-usage">
            <div class="resource-item">
              <div class="resource-label">
                <span>CPU使用率</span>
              </div>
              <el-progress v-if="hasMetric(systemStatus.cpu_usage)" :percentage="metricPercentage(systemStatus.cpu_usage)" :color="customColors"></el-progress>
              <div v-else class="metric-unavailable">--</div>
              <div class="resource-detail">
                <span>{{ systemStatus.cpu_model || '--' }} {{ systemStatus.cpu_mhz ? '(' + systemStatus.cpu_mhz + 'MHz)' : '' }}</span>
                <span>{{ displayMetric(systemStatus.cpu_cores) }}核心 / {{ displayMetric(systemStatus.cpu_threads) }}线程</span>
              </div>
            </div>
            <div class="resource-item">
              <div class="resource-label">
                <span>内存使用率</span>
                <!-- <span class="resource-value">{{ systemStatus.memory_usage ? systemStatus.memory_usage.toFixed(2) + '%' : '0%' }}</span> -->
              </div>
              <el-progress v-if="hasMetric(systemStatus.memory_usage)" :percentage="metricPercentage(systemStatus.memory_usage)" :color="customColors"></el-progress>
              <div v-else class="metric-unavailable">--</div>
              <div class="resource-detail">
                <span>总内存: {{ formatMemory(systemStatus.total_memory) }}</span>
                <span>已用: {{ formatMemory(systemStatus.used_memory) }}</span>
                <span>空闲: {{ formatMemory(systemStatus.free_memory) }}</span>
              </div>
            </div>
            <div class="resource-item">
              <div class="resource-label">
                <span>磁盘使用率</span>
                <!-- <span class="resource-value">{{ systemStatus.disk_usage ? systemStatus.disk_usage.toFixed(2) + '%' : '0%' }}</span> -->
              </div>
              <el-progress v-if="hasMetric(systemStatus.disk_usage)" :percentage="metricPercentage(systemStatus.disk_usage)" :color="customColors"></el-progress>
              <div v-else class="metric-unavailable">--</div>
              <div class="resource-detail">
                <span>总容量: {{ formatDisk(systemStatus.total_disk) }}</span>
                <span>已用: {{ formatDisk(systemStatus.used_disk) }}</span>
                <span>空闲: {{ formatDisk(systemStatus.free_disk) }}</span>
              </div>
            </div>
            <div class="resource-item">
              <div class="resource-label">
                <span>系统负载</span>
                <!-- <span class="resource-value">{{ systemStatus.cpu_load1 ? systemStatus.cpu_load1.toFixed(2) : '0.00' }}</span> -->
              </div>
              <el-progress v-if="hasMetric(systemStatus.cpu_load1)" :percentage="metricPercentage(systemStatus.cpu_load1)"></el-progress>
              <div v-else class="metric-unavailable">--</div>
              <div class="resource-detail">
                <span>1分钟: {{ formatDecimal(systemStatus.cpu_load1) }}</span>
                <span>5分钟: {{ formatDecimal(systemStatus.cpu_load5) }}</span>
                <span>15分钟: {{ formatDecimal(systemStatus.cpu_load15) }}</span>
              </div>
            </div>
          </div>
          <div class="system-info-footer">
            <div class="system-info-item">
              <component :is="'el-icon-monitor'" class="legacy-icon" />
              <span>{{ systemStatus.os_info || '--' }}</span>
            </div>
            <div class="system-info-item">
              <component :is="'el-icon-time'" class="legacy-icon" />
              <span>运行时间: {{ systemStatus.uptime_formatted || '--' }}</span>
            </div>
            <div class="system-info-item">
              <component :is="'el-icon-refresh'" class="legacy-icon" />
              <span>更新时间: {{ systemStatus.current_time || '--' }}</span>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <div class="section-divider">
      <div class="section-title">
        <component :is="'el-icon-document'" class="legacy-icon" />
        <span>世界日志</span>
      </div>
    </div>

    <el-row :gutter="20" class="log-section">
      <el-col :span="24">
        <div class="world-log-wrapper">
          <world-log ref="worldLog" style="height: 400px;"></world-log>
        </div>
      </el-col>
    </el-row>

    <div class="section-divider">
      <div class="section-title">
        <component :is="'el-icon-s-data'" class="legacy-icon" />
        <span>最近游戏数据</span>
      </div>
    </div>

    <el-row :gutter="20" class="data-section">
      <el-col :xs="24" :sm="24" :md="12" :span="12">
        <el-card shadow="hover" class="player-stats">
          <template v-slot:header>
<div  class="clearfix">
            <span>玩家数据统计</span>
            <el-radio-group v-model="timeRange" size="mini" style="float: right;">
              <el-radio-button label="week">周</el-radio-button>
              <el-radio-button label="month">月</el-radio-button>
              <el-radio-button label="year">年</el-radio-button>
            </el-radio-group>
          </div>
</template>
          <div class="chart-container">
            <div class="placeholder-chart">
              <div class="chart-title">玩家活跃度</div>
              <div class="chart-placeholder"></div>
            </div>
          </div>
          <div class="player-stats-details">
            <div class="stats-item">
              <div class="stats-label">新增玩家</div>
              <div class="stats-value">--</div>
            </div>
            <div class="stats-item">
              <div class="stats-label">活跃玩家</div>
              <div class="stats-value">--</div>
            </div>
            <div class="stats-item">
              <div class="stats-label">平均游戏时长</div>
              <div class="stats-value">--</div>
            </div>
            <div class="stats-item">
              <div class="stats-label">总游戏时长</div>
              <div class="stats-value">--</div>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :xs="24" :sm="24" :md="12" :span="12">
        <el-card shadow="hover" class="announcement-card">
          <template v-slot:header>
<div  class="clearfix">
            <span>公告管理</span>
            <el-button style="float: right; padding: 3px 0" type="text" @click="gotoAnnouncement">更多</el-button>
          </div>
</template>
          <div class="announcement-list">
            <el-alert
              v-if="announcementsError"
              :title="announcementsError"
              type="warning"
              :closable="false"
              show-icon />
            <div class="announcement-item" v-for="(item, index) in announcements" :key="index">
              <div class="announcement-title">
                <el-tag size="mini" :type="getAnnouncementTagType(item.type)">{{ item.type }}</el-tag>
                <span>{{ item.title }}</span>
              </div>
              <div class="announcement-body">{{ item.content }}</div>
              <div class="announcement-footer">
                <span class="announcement-time">{{ item.time }}</span>
                <div class="announcement-actions">
                  <el-button type="text" size="mini" @click="editAnnouncement(item)">编辑</el-button>
                  <el-button type="text" size="mini" @click="publishAnnouncement(item)">发布</el-button>
                </div>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script>
import WorldLog from '@/components/WorldLog.vue';
import { systemApi, roomApi } from '@/api/index';
import { formatTimeDiff } from '@/utils/dateUtils';

export default {
  name: 'DashboardView',
  components: {
    WorldLog
  },
  data() {
    return {
      formatTimeDiff,
      loading: false,
      serverList: [],
      customColors: [
        {color: '#4f8a5b', percentage: 40},
        {color: '#d99b32', percentage: 70},
        {color: '#c94f4f', percentage: 90}
      ],
      timeRange: 'week',
      announcements: [],
      announcementsError: '',
      systemLoading: false,
      systemStatus: {},

      versionInfo: {
        local: null,
        latest: null
      },
      isVersionOutdated: false,
      updateStatus: null,
      updateStatusTimer: null,
      updateSessionName: null,
      // 启动房间相关
      roomList: [],
      startRoomDialogVisible: false,
      startRoomForm: {
        roomId: '',
        selectedWorlds: [], // 选中的世界列表
        serverMode: '64'
      },
      currentRoomWorlds: [], // 当前房间的世界列表
      startRoomRules: {
        roomId: [
          { required: true, message: '请选择要启动的房间', trigger: 'change' }
        ],
        selectedWorlds: [
          { type: 'array', required: true, message: '请至少选择一个世界', trigger: 'change' }
        ]
      },
      startRoomLoading: false,
    }
  },
  created() {
    this.refreshData();
    this.refreshSystemStatus();
    this.getServerList();
    this.getVersionInfo();
    this.checkOngoingUpdate();
    this.fetchRooms(); // 获取房间列表
  },

  beforeUnmount() {
    // 清除定时器
    this.stopUpdateStatusPolling();
  },
  methods: {
    getServerList() {
      return systemApi.getTmuxServers().then(res => {
        this.serverList = Array.isArray(res.data) ? res.data : [];
      }).catch(err => {
        this.serverList = [];
        console.error(err);
        this.$message.error(`获取服务器状态失败：${err.message || '未知错误'}`);
      })
    },
    refreshData() {
      this.loading = true;
      systemApi.getAnnouncements()
        .then(response => {
          this.announcements = Array.isArray(response.data) ? response.data : [];
          this.announcementsError = '';
        })
        .catch(error => {
          this.announcements = [];
          this.announcementsError = error.message;
        })
        .finally(() => {
          this.loading = false;
        });
    },

    tableRowClassName({row}) {
      if (row.status === 'stopped') {
        return 'server-offline';
      } else if (row.status === 'restarting') {
        return 'server-restarting';
      }
      return '';
    },

    getSeasonClass(season) {
      switch (season) {
        case '春季': return 'season-spring';
        case '夏季': return 'season-summer';
        case '秋季': return 'season-autumn';
        case '冬季': return 'season-winter';
        default: return '';
      }
    },

    handleServerAction(server) {
      const isRunning = server.status === 'running';
      const action = isRunning ? '停止' : '启动';
      this.$confirm(`确定要${action} "${server.archive_name} / ${server.world_name}" 吗？`, '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }).then(() => {
          const request = { room_id: server.room_id, world_id: server.world_id };
          const operation = isRunning ? roomApi.stopRoom(request) : roomApi.startRoom(request);
          operation.then(res => {
            this.$message.success(res.msg || `${action}任务已提交`);
          }).catch(err => {
            this.$message.error(`${action}失败：${err.message || '未知错误'}`);
          });
        }).catch(() => {
          this.$message({
            type: 'info',
            message: `已取消${action}`
          });
        });
    },

    handleConfigure(server) {
      // 跳转到对应的世界管理编辑页面
      this.$router.push({
        path: '/worlds/settings',
        query: {
          roomName: server.archive_name,
          worldName: server.world_name,
          roomId: server.room_id,
          worldId: server.world_id,
          worldType: server.world_type
        }
      });
    },

    getAnnouncementTagType(type) {
      switch (type) {
        case '通知': return 'info';
        case '更新': return 'success';
        case '活动': return 'warning';
        default: return '';
      }
    },

    editAnnouncement(announcement) {
      this.$router.push({ path: '/announcements', query: { id: announcement.id } });
    },

    publishAnnouncement(announcement) {
      systemApi.updateAnnouncement(announcement.id, { ...announcement, published: true })
        .then(() => this.$message.success(`公告"${announcement.title}"已发布`))
        .catch(error => this.$message.error(error.message));
    },

    gotoAnnouncement() {
      this.$router.push('/announcements');
    },

    refreshSystemStatus() {
      this.systemLoading = true;

      systemApi.getDashboardStatus()
        .then(response => {
          if (response && response.data && response.status === 200) {
            this.systemStatus = response.data;
            // 处理一些字段格式化
            if (typeof this.systemStatus.memory_usage === 'number') {
              this.systemStatus.memory_usage = parseFloat(this.systemStatus.memory_usage);
            }
            if (typeof this.systemStatus.cpu_usage === 'number') {
              this.systemStatus.cpu_usage = parseFloat(this.systemStatus.cpu_usage);
            }
            if (typeof this.systemStatus.disk_usage === 'number') {
              this.systemStatus.disk_usage = parseFloat(this.systemStatus.disk_usage);
            }

            // 确保负载值为数字类型
            if (this.systemStatus.cpu_load1) {
              this.systemStatus.cpu_load1 = parseFloat(this.systemStatus.cpu_load1);
            }
            if (this.systemStatus.cpu_load5) {
              this.systemStatus.cpu_load5 = parseFloat(this.systemStatus.cpu_load5);
            }
            if (this.systemStatus.cpu_load15) {
              this.systemStatus.cpu_load15 = parseFloat(this.systemStatus.cpu_load15);
            }

            // 确保磁盘容量为数字类型
            if (this.systemStatus.total_disk) {
              this.systemStatus.total_disk = parseFloat(this.systemStatus.total_disk);
            }
            if (this.systemStatus.used_disk) {
              this.systemStatus.used_disk = parseFloat(this.systemStatus.used_disk);
            }
            if (this.systemStatus.free_disk) {
              this.systemStatus.free_disk = parseFloat(this.systemStatus.free_disk);
            }

            // 确保内存值为数字类型
            if (this.systemStatus.total_memory) {
              this.systemStatus.total_memory = parseFloat(this.systemStatus.total_memory);
            }
            if (this.systemStatus.used_memory) {
              this.systemStatus.used_memory = parseFloat(this.systemStatus.used_memory);
            }
            if (this.systemStatus.free_memory) {
              this.systemStatus.free_memory = parseFloat(this.systemStatus.free_memory);
            }
          } else {
            this.$message.error('获取系统状态数据失败');
          }
        })
        .catch(error => {
          this.$message.error('获取系统状态数据失败: ' + (error.message || '未知错误'));
        })
        .finally(() => {
          this.systemLoading = false;
        });
    },

    formatMemory(memory) {
      if (!this.hasMetric(memory)) return '--';
      if (memory < 1024) {
        return memory.toFixed(2) + ' MB';
      } else {
        return (memory / 1024).toFixed(2) + ' GB';
      }
    },
    formatDisk(value) {
      return this.hasMetric(value) ? `${Number(value).toFixed(2)}GB` : '--';
    },
    formatDecimal(value) {
      return this.hasMetric(value) ? Number(value).toFixed(2) : '--';
    },
    hasMetric(value) {
      return value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));
    },
    metricPercentage(value) {
      return Math.min(100, Math.max(0, Number(value)));
    },
    displayMetric(value) {
      return this.hasMetric(value) ? value : '--';
    },
    formatServerUptime(startTime) {
      if (!startTime) return '--';
      const timestamp = new Date(startTime).getTime();
      if (!Number.isFinite(timestamp)) return '--';
      return formatTimeDiff(Date.now() - timestamp);
    },
    getServerStatusName(status) {
      if (status === 'running') return '在线';
      if (status === 'stopped') return '离线';
      return '未知';
    },
    getServerStatusTag(status) {
      if (status === 'running') return 'success';
      if (status === 'stopped') return 'info';
      return 'warning';
    },



    getVersionInfo() {
      // 重置版本信息
      this.versionInfo = {
        local: null,
        latest: null
      };

      // 获取本地版本
      systemApi.getLocalVersion().then(localRes => {
        this.$message.info(localRes.msg);
        if (localRes.data && localRes.status === 200) {
          this.versionInfo.local = localRes.data;
          this.checkVersionOutdated();
        }
      }).catch(err => {
        console.error('获取本地版本失败:', err);
        this.$message.error('获取本地版本信息失败');
      });

      // 获取最新版本
      systemApi.getLatestVersion().then(latestRes => {
        if (latestRes.data && latestRes.status === 200) {
          this.versionInfo.latest = latestRes.data;
          this.checkVersionOutdated();
        }
      }).catch(err => {
        console.error('获取最新版本失败:', err);
        this.$message.error('获取最新版本信息失败');
      });
    },

    checkVersionOutdated() {
      if (this.versionInfo.local && this.versionInfo.latest) {
        try {
          if (typeof this.versionInfo.latest.up_to_date === 'boolean') {
            this.isVersionOutdated = !this.versionInfo.latest.up_to_date;
            return;
          }
          const localVersion = Number(this.versionInfo.local.version);
          const latestVersion = Number(this.versionInfo.latest.version);
          this.isVersionOutdated = Number.isFinite(localVersion) &&
            Number.isFinite(latestVersion) && localVersion < latestVersion;
        } catch (err) {
          console.error('比较版本号时出错:', err);
          this.isVersionOutdated = false;
        }
      } else {
        this.isVersionOutdated = false;
      }
    },

    openUpdateLink() {
      if (this.versionInfo.latest && this.versionInfo.latest.update_url) {
        window.open(this.versionInfo.latest.update_url, '_blank');
      }
    },

    // 更新饥荒服务器
    updateDstServer() {
      this.$confirm('确定要更新饥荒服务器吗？更新过程中服务器将无法使用。', '更新确认', {
        confirmButtonText: '确定更新',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        // 发起更新请求
        systemApi.updateDstServer({ force: true }).then(res => {
          if (res.status === 200 && res.data) {
            this.$message.success(res.msg || '更新已开始');
            // 保存会话名称用于查询状态
            this.updateSessionName = res.data.session_name;
            // 将会话名称保存到本地存储，以便页面刷新后仍能继续查询状态
            sessionStorage.setItem('dstUpdateSessionName', this.updateSessionName);
            // 开始轮询更新状态
            this.startUpdateStatusPolling();
          } else {
            this.$message.error(res.msg || '更新失败');
          }
        }).catch(err => {
          console.error('更新饥荒服务器失败:', err);
          this.$message.error('更新饥荒服务器失败: ' + (err.message || '未知错误'));
        });
      }).catch(() => {
        this.$message.info('已取消更新');
      });
    },

    // 开始轮询更新状态
    startUpdateStatusPolling() {
      // 清除可能存在的定时器
      this.stopUpdateStatusPolling();

      // 立即获取一次状态
      this.getUpdateStatus();

      // 设置定时器，每3秒轮询一次
      this.updateStatusTimer = setInterval(() => {
        this.getUpdateStatus();
      }, 3000);
    },

    // 停止轮询更新状态
    stopUpdateStatusPolling() {
      if (this.updateStatusTimer) {
        clearInterval(this.updateStatusTimer);
        this.updateStatusTimer = null;
      }
    },

    // 获取更新状态
    // 检查是否有正在进行的更新
    checkOngoingUpdate() {
      // 尝试从本地存储中获取上次更新的会话名称
      try {
        const savedSession = sessionStorage.getItem('dstUpdateSessionName');
        if (savedSession) {
          this.updateSessionName = savedSession;
          // 获取更新状态
          this.getUpdateStatus();
          // 如果更新仍在进行中，开始轮询
          if (this.updateStatus && this.updateStatus.is_running) {
            this.startUpdateStatusPolling();
          }
        }
      } catch (err) {
        console.error('检查正在进行的更新失败:', err);
      }
    },

    getUpdateStatus() {
      // 如果没有会话名称，则不进行查询
      if (!this.updateSessionName) {
        console.warn('没有更新会话名称，无法查询更新状态');
        return;
      }

      systemApi.getDstUpdateStatus(this.updateSessionName).then(res => {
        if (res.status === 200) {
          this.updateStatus = res.data;

          // 如果更新已完成或出错，停止轮询
          if (this.updateStatus && (this.updateStatus.is_completed || this.updateStatus.error)) {
            this.stopUpdateStatusPolling();
            // 清除存储的会话名称
            sessionStorage.removeItem('dstUpdateSessionName');

            // 如果更新完成，刷新版本信息
            if (this.updateStatus.is_completed && !this.updateStatus.error) {
              // 等待一下再刷新，确保服务器已完全更新
              setTimeout(() => {
                this.getVersionInfo();
              }, 3000);
            }
          }
        }
      }).catch(err => {
        console.error('获取更新状态失败:', err);
      });
    },

    // 获取房间列表
    fetchRooms() {
      roomApi.getRoomList()
        .then(response => {
          console.log('房间列表响应:', response);
          if (response && response.status === 200) {
            // 直接使用 response.data 而不是 response.data.data
            this.roomList = response.data || [];
            console.log('处理后的房间列表:', this.roomList);
          } else {
            console.warn('房间列表响应不符合预期:', response);
          }
        })
        .catch(error => {
          console.error('获取房间列表失败:', error);
          this.$message.error('获取房间列表失败');
        });
    },

    // 打开启动房间对话框
    openStartRoomDialog() {
      // 重置表单
      this.startRoomForm = {
        roomId: '',
        selectedWorlds: [],
        serverMode: '64'
      };
      this.currentRoomWorlds = [];

      // 打开对话框并显示加载状态
      this.startRoomDialogVisible = true;
      this.startRoomLoading = true;

      // 获取房间列表
      roomApi.getRoomList()
        .then(response => {
          console.log('打开对话框时获取房间列表:', response);
          if (response && response.status === 200) {
            this.roomList = response.data || [];
            if (this.roomList.length === 0) {
              this.$message.warning('没有找到可用的房间');
            }
          } else {
            this.$message.error('获取房间列表失败');
          }
        })
        .catch(error => {
          console.error('获取房间列表失败:', error);
          this.$message.error('获取房间列表失败');
        })
        .finally(() => {
          this.startRoomLoading = false;
        });
    },

    // 当选择房间变化时获取该房间的世界列表
    fetchRoomWorlds(roomIndex) {
      if (roomIndex === '' || roomIndex === null || roomIndex === undefined) {
        this.currentRoomWorlds = [];
        this.startRoomForm.selectedWorlds = [];
        return;
      }

      const selectedRoom = this.roomList[roomIndex];
      if (!selectedRoom) {
        this.currentRoomWorlds = [];
        this.startRoomForm.selectedWorlds = [];
        return;
      }

      this.startRoomLoading = true;

      // 直接使用房间对象中的世界列表
      if (selectedRoom.worlds && Array.isArray(selectedRoom.worlds)) {
        this.currentRoomWorlds = selectedRoom.worlds;
        this.startRoomForm.selectedWorlds = this.currentRoomWorlds
          .map(world => world.name);
        this.startRoomLoading = false;
      } else {
        // 如果房间对象中没有世界列表，则调用API获取
        roomApi.getRoomWorlds(selectedRoom.name)
          .then(worlds => {
            this.currentRoomWorlds = worlds || [];
            this.startRoomForm.selectedWorlds = this.currentRoomWorlds
              .map(world => world.name);
          })
          .catch(error => {
            console.error('获取房间世界列表失败:', error);
            this.$message.error('获取房间世界列表失败');
            this.currentRoomWorlds = [];
            this.startRoomForm.selectedWorlds = [];
          })
          .finally(() => {
            this.startRoomLoading = false;
          });
      }
    },

    // 选择所有世界
    selectAllWorlds() {
      this.startRoomForm.selectedWorlds = this.currentRoomWorlds
        .map(world => world.name);
    },

    // 取消选择所有世界
    unselectAllWorlds() {
      this.startRoomForm.selectedWorlds = [];
    },

    // 获取世界类型的标签类型
    getWorldTagType(type) {
      switch(type) {
        case 'forest': return 'success';
        case 'cave': return 'warning';
        case 'unknown': return 'info';
        default: return 'info';
      }
    },

    // 获取世界类型的名称
    getWorldTypeName(type) {
      switch(type) {
        case 'forest': return '森林';
        case 'cave': return '洞穴';
        case 'unknown': return '未知';
        default: return '未知';
      }
    },

    // 启动房间
    startRoom() {
      this.$refs.startRoomForm.validate((valid) => {
        if (valid) {
          this.startRoomLoading = true;
          const selectedRoom = this.roomList[this.startRoomForm.roomId];
          console.log('选中的房间:', selectedRoom);
          console.log('选中的世界:', this.startRoomForm.selectedWorlds);

          if (!selectedRoom) {
            this.$message.error('无法获取房间信息，请重新选择');
            this.startRoomLoading = false;
            return;
          }

          if (this.startRoomForm.selectedWorlds.length === 0) {
            this.$message.error('请至少选择一个世界');
            this.startRoomLoading = false;
            return;
          }

          const { selectedWorlds } = this.startRoomForm;

          // 获取选中世界的详细信息
          const worldsToStart = this.currentRoomWorlds.filter(world =>
            selectedWorlds.includes(world.name)
          );

          if (worldsToStart.length === 0) {
            this.$message.error('无法获取选中世界的信息');
            this.startRoomLoading = false;
            return;
          }

          roomApi.startRoom({
            room_id: selectedRoom.id,
            world_ids: worldsToStart.map(world => world.id)
          })
            .then(() => {
              this.$message.success(`房间 ${selectedRoom.name} 的启动任务已提交`);
              this.startRoomDialogVisible = false;
            })
            .catch(error => {
              this.$message.error(`启动房间失败: ${error.message || '未知错误'}`);
            })
            .finally(() => {
              this.startRoomLoading = false;
            });
        }
      });
    }

  },
}
</script>

<style scoped>
.dashboard-content {
  padding: 20px;
}



.section-divider {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 30px 0 20px;
}

.section-title {
  font-size: 18px;
  font-weight: bold;
  color: var(--text-primary);
  display: flex;
  align-items: center;
}

.section-title i {
  margin-right: 8px;
  font-size: 20px;
  color: var(--primary-color);
}

.monitor-section, .data-section {
  margin-bottom: 20px;
}

.server-monitor, .system-info, .player-stats, .announcement-card {
  height: 100%;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  border-radius: 4px;
}

.server-name {
  display: flex;
  align-items: center;
}

.server-title {
  margin-left: 10px;
  font-weight: 500;
  color: var(--text-primary);
}

.server-offline {
  background-color: #f9f9f9;
  color: var(--text-secondary);
}

.server-restarting {
  background-color: #fff9ed;
}

.season-badge {
  display: inline-block;
  padding: 5px 8px;
  border-radius: 3px;
  font-size: 12px;
  color: white;
}

.season-spring {
  background-color: #4f8a5b;
}

.season-summer {
  background-color: #d99b32;
}

.season-autumn {
  background-color: #c94f4f;
}

.season-winter {
  background-color: var(--primary-color);
}

.resource-usage {
  margin-bottom: 20px;
}

.resource-item {
  margin-bottom: 15px;
}

.metric-unavailable {
  height: 16px;
  line-height: 16px;
  color: #909399;
}

.mode-hint {
  margin-left: 12px;
  color: #909399;
  font-size: 12px;
}

:deep(.el-progress) {
  display: flex;
  align-items: center;
}

.resource-label {
  display: flex;
  justify-content: space-between;
  margin-bottom: 5px;
  font-size: 14px;
  color: var(--text-regular);
}

.resource-value {
  font-weight: bold;
  color: var(--text-primary);
}

.resource-detail {
  display: flex;
  justify-content: space-between;
  margin-top: 5px;
  font-size: 12px;
  color: var(--text-secondary);
}

.system-events {
  border-top: 1px solid var(--border-color);
  padding-top: 15px;
  margin-top: 5px;
}

.event-header {
  font-size: 14px;
  font-weight: bold;
  color: var(--text-primary);
  margin-bottom: 10px;
}

.event-list {
  max-height: 150px;
  overflow-y: auto;
}

.event-item {
  display: flex;
  margin-bottom: 10px;
  font-size: 13px;
}

.event-time {
  width: 45px;
  color: var(--text-secondary);
  flex-shrink: 0;
}

.event-content {
  flex: 1;
  color: var(--text-regular);
}

.chart-container {
  height: 200px;
  margin-bottom: 20px;
}

.placeholder-chart {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.chart-title {
  font-size: 14px;
  margin-bottom: 10px;
  color: var(--text-primary);
}

.chart-placeholder {
  flex: 1;
  background: linear-gradient(to right, #e8f1ff, #f0f0f0);
  border-radius: 4px;
  position: relative;
  overflow: hidden;
}

.chart-placeholder::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(to right,
    transparent 0%, rgba(255, 255, 255, 0.5) 50%, transparent 100%);
  animation: shimmer 2s infinite;
}

@keyframes shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

.player-stats-details {
  display: flex;
  flex-wrap: wrap;
}

.stats-item {
  width: 50%;
  margin-bottom: 15px;
}

.stats-label {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 5px;
}

.stats-value {
  font-size: 18px;
  font-weight: bold;
  color: var(--text-primary);
}

.announcement-list {
  max-height: 320px;
  overflow-y: auto;
}

.announcement-item {
  padding: 15px 0;
  border-bottom: 1px solid var(--border-color);
}

.announcement-item:last-child {
  border-bottom: none;
}

.announcement-title {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}

.announcement-title .el-tag {
  margin-right: 10px;
}

.announcement-title span {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.announcement-body {
  font-size: 13px;
  color: var(--text-regular);
  margin-bottom: 10px;
  line-height: 1.5;
}

.announcement-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
}

.announcement-time {
  color: var(--text-secondary);
}

.announcement-actions {
  display: flex;
  gap: 10px;
}

.log-section {
  margin-bottom: 20px;
}

.world-log-wrapper {
  height: 400px;
  border-radius: 4px;
  overflow: hidden;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.system-info-footer {
  display: flex;
  flex-direction: column;
  padding-top: 15px;
  margin-top: 15px;
  border-top: 1px solid var(--border-color);
}

.system-info-item {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
  font-size: 13px;
  color: var(--text-regular);
}

.system-info-item i {
  margin-right: 8px;
  color: var(--primary-color);
}



/* 服务器监控相关样式 */
.server-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.server-header span {
  font-size: 16px;
  font-weight: bold;
}

.server-header i {
  margin-right: 8px;
  color: var(--primary-color);
}

.server-name-info {
  display: flex;
  align-items: center;
}

.server-name-text {
  font-weight: 500;
  margin-left: 5px;
}

.time-info {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.time-info span:first-child {
  font-weight: 500;
}

.time-info span:last-child {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 3px;
}

.server-footer {
  margin-top: 15px;
  padding-top: 10px;
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: var(--text-regular);
  font-size: 13px;
}

.server-stats {
  color: var(--text-secondary);
}

.empty-server {
  padding: 30px 0;
  text-align: center;
  color: var(--text-secondary);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.empty-server i {
  font-size: 48px;
  margin-bottom: 15px;
  color: #9aa69e;
}

.empty-server span {
  margin-bottom: 15px;
}

/* 启动房间对话框相关样式 */
.el-dialog__body {
  padding: 20px 30px;
}

.dialog-content {
  min-height: 200px;
}

.dialog-footer {
  text-align: right;
  margin-top: 20px;
}

.world-selection {
  margin-bottom: 10px;
}

.world-selection .el-checkbox {
  display: block;
  margin-left: 0;
  margin-bottom: 10px;
}

.world-selection .el-tag {
  margin-left: 5px;
}

.world-selection-actions {
  margin-top: 10px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.no-worlds-tip {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  color: var(--text-secondary);
  background-color: var(--surface-muted);
  border-radius: 4px;
}

.no-worlds-tip i {
  margin-right: 8px;
  font-size: 18px;
  color: #d99b32;
}

/* 修改表格样式 */
:deep(.el-table--border) {
  border-radius: 4px;
  overflow: hidden;
}

:deep(.el-table__row:hover) {
  background-color: var(--surface-muted)!important;
}

:deep(.el-table__row.server-offline) {
  background-color: #fafafa;
}

:deep(.el-table__row.server-offline:hover) {
  background-color: #f5f5f5!important;
}

.version-info-row {
  margin-bottom: 20px;
}

.version-card {
  height: 100%;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  border-radius: 4px;
}

.version-content {
  display: flex;
  align-items: center;
  padding: 15px;
}

.version-icon {
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  margin-right: 15px;
  font-size: 24px;
  color: white;
  background-color: var(--primary-color);
}

.version-details {
  flex: 1;
}

.version-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.version-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.version-title {
  font-size: 16px;
  font-weight: bold;
  color: var(--text-primary);
}

.version-info {
  margin-bottom: 10px;
}

.version-boxes {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 15px;
}

.version-box {
  flex: 1;
  text-align: center;
  padding: 10px;
  border-radius: 4px;
  background-color: var(--surface-muted);
  transition: all 0.3s;
}

.version-box-outdated {
  background-color: #fef0f0;
  border: 1px dashed #c94f4f;
}

.version-box-label {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 5px;
}

.version-box-value {
  font-size: 20px;
  font-weight: bold;
  color: var(--text-primary);
  margin-bottom: 5px;
}

.version-arrow {
  margin: 0 15px;
  color: var(--text-secondary);
  font-size: 20px;
}

.version-box-date {
  font-size: 12px;
  color: var(--text-secondary);
}

.version-link {
  color: var(--primary-color);
  text-decoration: none;
  transition: all 0.3s;
}

.version-link:hover {
  opacity: 0.8;
}

.version-warning-icon {
  margin-left: 5px;
  color: #c94f4f;
  font-size: 16px;
}

.version-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  color: var(--text-secondary);
}

.version-loading i {
  margin-right: 10px;
  font-size: 16px;
}

.version-update-notice {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px;
  background-color: #fef0f0;
  border-radius: 4px;
  color: #c94f4f;
}

.version-update-notice i {
  margin-right: 8px;
  font-size: 16px;
}

.version-update-notice button {
  margin-left: 15px;
}

.version-update-status {
  margin-top: 15px;
  padding: 10px;
  background-color: var(--surface-muted);
  border-radius: 4px;
}

.update-status-header {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
  font-weight: bold;
}

.update-status-header i {
  margin-right: 8px;
  font-size: 16px;
}

.update-output, .update-error {
  margin-top: 10px;
  font-size: 13px;
}

.output-label, .error-label {
  font-weight: bold;
  margin-bottom: 5px;
}

.output-content {
  padding: 5px;
  background-color: #f0f9eb;
  border-radius: 3px;
  word-break: break-all;
}

.error-content {
  padding: 5px;
  background-color: #fef0f0;
  border-radius: 3px;
  color: #c94f4f;
  word-break: break-all;
}

@media (max-width: 991px) {
  .monitor-section > :deep(.el-col:first-child),
  .data-section > :deep(.el-col:first-child) {
    margin-bottom: 20px;
  }
}

@media (max-width: 768px) {
  .dashboard-content {
    padding: 4px 0 12px;
  }

  .section-divider {
    margin: 24px 0 14px;
  }

  .version-content {
    display: grid;
    grid-template-columns: 36px minmax(0, 1fr);
    gap: 10px;
    align-items: start;
    padding: 4px;
  }

  .version-icon {
    width: 36px;
    height: 36px;
    margin-right: 0;
    font-size: 18px;
  }

  .version-details {
    min-width: 0;
  }

  .version-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .version-actions {
    width: 100%;
    flex-wrap: wrap;
  }

  .version-boxes {
    align-items: stretch;
  }

  .version-arrow {
    margin: 0 6px;
  }

  .version-box-value {
    font-size: 16px;
  }

  .resource-detail {
    flex-wrap: wrap;
    gap: 4px 12px;
  }
}
</style>
