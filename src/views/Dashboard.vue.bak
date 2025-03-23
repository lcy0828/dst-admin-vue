<template>
  <div class="dashboard-content" v-loading="loading" element-loading-text="加载中..." element-loading-spinner="el-icon-loading">
    <!-- 统计卡片 -->
    <el-row :gutter="20" class="stat-cards">
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-icon-container server-icon">
              <i class="el-icon-monitor"></i>
            </div>
            <div class="stat-info">
              <div class="stat-title">在线服务器</div>
              <div class="stat-value">3/5</div>
              <div class="stat-detail">正常运行中</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-icon-container player-icon">
              <i class="el-icon-user"></i>
            </div>
            <div class="stat-info">
              <div class="stat-title">在线玩家</div>
              <div class="stat-value">27</div>
              <div class="stat-detail">峰值: 42</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-icon-container mod-icon">
              <i class="el-icon-s-grid"></i>
            </div>
            <div class="stat-info">
              <div class="stat-title">已安装模组</div>
              <div class="stat-value">24</div>
              <div class="stat-detail">可用: 22</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-icon-container backup-icon">
              <i class="el-icon-document"></i>
            </div>
            <div class="stat-info">
              <div class="stat-title">存档备份</div>
              <div class="stat-value">12</div>
              <div class="stat-detail">最近备份: 1小时前</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
    
    <!-- 标题分割线 -->
    <div class="section-divider">
      <div class="section-title">
        <i class="el-icon-data-analysis"></i>
        <span>服务器状态监控</span>
      </div>
      <div class="refresh-btn">
        <el-button size="small" type="primary" icon="el-icon-refresh" circle @click="refreshData"></el-button>
      </div>
    </div>
    
    <!-- 服务器监控 -->
    <el-row :gutter="20" class="monitor-section">
      <el-col :span="16">
        <el-card shadow="hover" class="server-monitor">
          <el-table 
            :data="serverList" 
            style="width: 100%" 
            size="medium"
            :row-class-name="tableRowClassName"
            highlight-current-row>
            <el-table-column prop="name" label="服务器名称">
              <template slot-scope="scope">
                <div class="server-name">
                  <el-tag
                    :type="scope.row.status === '在线' ? 'success' : scope.row.status === '重启中' ? 'warning' : 'danger'"
                    size="mini"
                    effect="dark">
                    {{ scope.row.status }}
                  </el-tag>
                  <span class="server-title">{{ scope.row.name }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="players" label="玩家" width="100" align="center"></el-table-column>
            <el-table-column prop="day" label="天数" width="80" align="center"></el-table-column>
            <el-table-column prop="season" label="季节" width="100" align="center">
              <template slot-scope="scope">
                <div class="season-badge">
                  <span :class="getSeasonClass(scope.row.season)">{{ scope.row.season }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="uptime" label="运行时间" width="120" align="center"></el-table-column>
            <el-table-column label="操作" width="230" align="center">
              <template slot-scope="scope">
                <el-button
                  size="mini"
                  :type="scope.row.status === '在线' ? 'danger' : 'success'"
                  :disabled="scope.row.status === '重启中'"
                  @click="handleServerAction(scope.row)">
                  {{ scope.row.status === '在线' ? '停止' : '启动' }}
                </el-button>
                <el-button
                  size="mini"
                  type="warning"
                  :disabled="scope.row.status !== '在线'"
                  @click="handleRestart(scope.row)">
                  重启
                </el-button>
                <el-button
                  size="mini"
                  type="info"
                  @click="handleConfigure(scope.row)">
                  配置
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
      
      <el-col :span="8">
        <el-card shadow="hover" class="system-info">
          <div slot="header" class="clearfix">
            <span>系统资源</span>
            <el-button style="float: right; padding: 3px 0" type="text">详情</el-button>
          </div>
          <div class="resource-usage">
            <div class="resource-item">
              <div class="resource-label">CPU使用率</div>
              <el-progress :percentage="45" :color="customColors"></el-progress>
            </div>
            <div class="resource-item">
              <div class="resource-label">内存使用率</div>
              <el-progress :percentage="68" :color="customColors"></el-progress>
            </div>
            <div class="resource-item">
              <div class="resource-label">磁盘使用率</div>
              <el-progress :percentage="32" :color="customColors"></el-progress>
            </div>
            <div class="resource-item">
              <div class="resource-label">网络使用率</div>
              <el-progress :percentage="23" :color="customColors"></el-progress>
            </div>
          </div>
          <div class="system-events">
            <div class="event-header">最近系统事件</div>
            <div class="event-list">
              <div class="event-item">
                <div class="event-time">10:25</div>
                <div class="event-content">服务器#2自动重启完成</div>
              </div>
              <div class="event-item">
                <div class="event-time">09:45</div>
                <div class="event-content">新玩家"森林探险家"加入服务器#1</div>
              </div>
              <div class="event-item">
                <div class="event-time">09:10</div>
                <div class="event-content">已完成每日存档备份</div>
              </div>
              <div class="event-item">
                <div class="event-time">08:30</div>
                <div class="event-content">服务器#3游戏日进入夏季</div>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
    
    <!-- 第二个分割线 -->
    <div class="section-divider">
      <div class="section-title">
        <i class="el-icon-s-data"></i>
        <span>最近游戏数据</span>
      </div>
    </div>
    
    <!-- 游戏数据和公告 -->
    <el-row :gutter="20" class="data-section">
      <el-col :span="12">
        <el-card shadow="hover" class="player-stats">
          <div slot="header" class="clearfix">
            <span>玩家数据统计</span>
            <el-radio-group v-model="timeRange" size="mini" style="float: right;">
              <el-radio-button label="week">周</el-radio-button>
              <el-radio-button label="month">月</el-radio-button>
              <el-radio-button label="year">年</el-radio-button>
            </el-radio-group>
          </div>
          <div class="chart-container">
            <!-- 这里假设使用了一个自定义的图表组件 -->
            <div class="placeholder-chart">
              <div class="chart-title">玩家活跃度</div>
              <!-- 图表占位符 -->
              <div class="chart-placeholder"></div>
            </div>
          </div>
          <div class="player-stats-details">
            <div class="stats-item">
              <div class="stats-label">新增玩家</div>
              <div class="stats-value">42</div>
            </div>
            <div class="stats-item">
              <div class="stats-label">活跃玩家</div>
              <div class="stats-value">157</div>
            </div>
            <div class="stats-item">
              <div class="stats-label">平均游戏时长</div>
              <div class="stats-value">2.4小时</div>
            </div>
            <div class="stats-item">
              <div class="stats-label">总游戏时长</div>
              <div class="stats-value">489小时</div>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :span="12">
        <el-card shadow="hover" class="announcement-card">
          <div slot="header" class="clearfix">
            <span>公告管理</span>
            <el-button style="float: right; padding: 3px 0" type="text" @click="gotoAnnouncement">更多</el-button>
          </div>
          <div class="announcement-list">
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
export default {
  name: 'Dashboard',
  data() {
    return {
      loading: false,
      serverList: [
        {
          name: '主世界服务器',
          players: '12/20',
          day: 128,
          season: '秋季',
          uptime: '3天12小时',
          status: '在线'
        },
        {
          name: '洞穴服务器',
          players: '8/12',
          day: 128,
          season: '无',
          uptime: '3天11小时',
          status: '在线'
        },
        {
          name: 'MOD测试服务器',
          players: '7/15',
          day: 45,
          season: '夏季',
          uptime: '1天8小时',
          status: '在线'
        },
        {
          name: '活动服务器',
          players: '0/20',
          day: 1,
          season: '春季',
          uptime: '0小时',
          status: '离线'
        },
        {
          name: '开发测试服务器',
          players: '0/10',
          day: 215,
          season: '冬季',
          uptime: '0小时',
          status: '重启中'
        }
      ],
      customColors: [
        {color: '#67C23A', percentage: 40},
        {color: '#E6A23C', percentage: 70},
        {color: '#F56C6C', percentage: 90}
      ],
      timeRange: 'week',
      announcements: [
        {
          title: '服务器维护通知',
          content: '我们将于本周六凌晨2点进行服务器维护，预计需要2小时，请各位玩家合理安排游戏时间。',
          time: '1小时前',
          type: '通知'
        },
        {
          title: '新版本更新内容',
          content: '新版本已发布，更新了大量内容，包括新的生物、武器和建筑，欢迎体验。',
          time: '1天前',
          type: '更新'
        },
        {
          title: '周末活动预告',
          content: '本周末将举办首届饥荒生存挑战赛，优胜者将获得丰厚奖励。',
          time: '2天前',
          type: '活动'
        }
      ]
    }
  },
  created() {
    this.refreshData();
  },
  methods: {
    refreshData() {
      this.loading = true;
      
      // 模拟数据加载
      setTimeout(() => {
        this.loading = false;
      }, 800);
    },
    
    tableRowClassName({row}) {
      if (row.status === '离线') {
        return 'server-offline';
      } else if (row.status === '重启中') {
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
      if (server.status === '在线') {
        this.$confirm(`确定要停止 "${server.name}" 吗？当前有 ${server.players.split('/')[0]} 名玩家在线。`, '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }).then(() => {
          server.status = '离线';
          server.uptime = '0小时';
          server.players = `0/${server.players.split('/')[1]}`;
          this.$message({
            type: 'success',
            message: `${server.name} 已停止`
          });
        }).catch(() => {});
      } else {
        server.status = '在线';
        server.uptime = '刚刚启动';
        this.$message({
          type: 'success',
          message: `${server.name} 已启动`
        });
      }
    },
    
    handleRestart(server) {
      this.$confirm(`确定要重启 "${server.name}" 吗？重启过程大约需要2分钟。`, '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        server.status = '重启中';
        setTimeout(() => {
          server.status = '在线';
          server.uptime = '刚刚启动';
          this.$message({
            type: 'success',
            message: `${server.name} 已重启完成`
          });
        }, 5000);
      }).catch(() => {});
    },
    
    handleConfigure(server) {
      this.$router.push('/servers/settings');
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
      // 编辑公告逻辑
    },
    
    publishAnnouncement(announcement) {
      this.$message({
        type: 'success',
        message: `公告"${announcement.title}"已发布到所有服务器`
      });
    },
    
    gotoAnnouncement() {
      this.$router.push('/announcements');
    }
  }
}
</script>

<style scoped>
.dashboard-content {
  padding: 20px;
}

.stat-cards {
  margin-bottom: 20px;
}

.stat-card {
  border-radius: 4px;
  overflow: hidden;
  height: 100%;
  border: none;
  transition: all 0.3s;
}

.stat-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 15px 30px rgba(0, 0, 0, 0.1);
}

.stat-content {
  display: flex;
  align-items: center;
  padding: 5px;
}

.stat-icon-container {
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  margin-right: 15px;
  font-size: 28px;
  color: white;
}

.server-icon {
  background-color: #409EFF;
}

.player-icon {
  background-color: #67C23A;
}

.mod-icon {
  background-color: #E6A23C;
}

.backup-icon {
  background-color: #F56C6C;
}

.stat-info {
  flex: 1;
}

.stat-title {
  font-size: 14px;
  color: #909399;
  margin-bottom: 5px;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #303133;
  margin-bottom: 5px;
}

.stat-detail {
  font-size: 12px;
  color: #909399;
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
  color: #303133;
  display: flex;
  align-items: center;
}

.section-title i {
  margin-right: 8px;
  font-size: 20px;
  color: #409EFF;
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
  color: #303133;
}

.server-offline {
  background-color: #f9f9f9;
  color: #909399;
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
  background-color: #67C23A;
}

.season-summer {
  background-color: #E6A23C;
}

.season-autumn {
  background-color: #F56C6C;
}

.season-winter {
  background-color: #409EFF;
}

.resource-usage {
  margin-bottom: 20px;
}

.resource-item {
  margin-bottom: 15px;
}

.resource-label {
  font-size: 14px;
  color: #606266;
  margin-bottom: 8px;
}

.system-events {
  border-top: 1px solid #EBEEF5;
  padding-top: 15px;
  margin-top: 5px;
}

.event-header {
  font-size: 14px;
  font-weight: bold;
  color: #303133;
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
  color: #909399;
  flex-shrink: 0;
}

.event-content {
  flex: 1;
  color: #606266;
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
  color: #303133;
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
  color: #909399;
  margin-bottom: 5px;
}

.stats-value {
  font-size: 18px;
  font-weight: bold;
  color: #303133;
}

.announcement-list {
  max-height: 320px;
  overflow-y: auto;
}

.announcement-item {
  padding: 15px 0;
  border-bottom: 1px solid #EBEEF5;
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
  color: #303133;
}

.announcement-body {
  font-size: 13px;
  color: #606266;
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
  color: #909399;
}

.announcement-actions {
  display: flex;
  gap: 10px;
}
</style> 