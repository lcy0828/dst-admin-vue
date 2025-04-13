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
    
    <!-- 版本信息卡片 -->
    <el-row :gutter="20" class="version-info-row">
      <el-col :span="24">
        <el-card shadow="hover" class="version-card">
          <div class="version-content">
            <div class="version-icon">
              <i class="el-icon-info"></i>
            </div>
            <div class="version-details">
              <div class="version-header">
                <span class="version-title">饥荒服务器版本信息</span>
                <el-button type="text" size="small" icon="el-icon-refresh" @click="getVersionInfo">刷新</el-button>
              </div>
              <div v-if="versionInfo.local && versionInfo.latest" class="version-info">
                <div class="version-boxes">
                  <div class="version-box">
                    <div class="version-box-label">当前版本</div>
                    <div class="version-box-value">{{ versionInfo.local.version }}</div>
                  </div>
                  <div class="version-arrow">
                    <i class="el-icon-arrow-right"></i>
                  </div>
                  <div class="version-box" :class="{'version-box-outdated': isVersionOutdated}">
                    <div class="version-box-label">最新版本</div>
                    <a 
                      :href="versionInfo.latest.update_url" 
                      target="_blank" 
                      class="version-box-value version-link">
                      {{ versionInfo.latest.version }}
                      <i v-if="isVersionOutdated" class="el-icon-warning version-warning-icon"></i>
                    </a>
                    <div class="version-box-date">{{ versionInfo.latest.release_date }} / R{{ versionInfo.latest.build_number }}</div>
                  </div>
                </div>
                <div v-if="isVersionOutdated" class="version-update-notice">
                  <i class="el-icon-warning"></i>
                  <span>检测到新版本可用，请及时更新游戏服务端!</span>
                  <el-button type="primary" size="small" @click="openUpdateLink">查看更新内容</el-button>
                </div>
              </div>
              <div v-else class="version-loading">
                <i class="el-icon-loading"></i>
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
        <i class="el-icon-connection"></i>
        <span>快速访问</span>
      </div>
    </div>
    
    <!-- 快速访问区 -->
    <el-row :gutter="20" class="quick-access-section">
      <el-col :xs="12" :sm="8" :md="6" :lg="4" v-for="(item, index) in quickAccessItems" :key="index">
        <el-card shadow="hover" class="quick-access-card" @click.native="navigateTo(item.path)">
          <div class="quick-access-icon">
            <i :class="item.icon"></i>
          </div>
          <div class="quick-access-title">{{ item.title }}</div>
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
          <div slot="header" class="clearfix server-header">
            <span><i class="el-icon-monitor"></i> 服务器状态监控</span>
            <el-button type="text" icon="el-icon-refresh" @click="getServerList">刷新</el-button>
          </div>
          
          <el-table 
            :data="serverList" 
            style="width: 100%" 
            size="medium"
            :row-class-name="tableRowClassName"
            highlight-current-row
            border>
            <el-table-column prop="status" label="状态" width="90" align="center">
              <template slot-scope="scope">
                <el-tag
                  :type="scope.row.status === 'running' ? 'success' : 'info'"
                  size="medium"
                  effect="dark">
                  {{ scope.row.status === 'running' ? '在线' : '离线' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="archive_name" label="房间名称" min-width="120">
              <template slot-scope="scope">
                <div class="server-name-info">
                  <span class="server-name-text">{{ scope.row.archive_name }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="world_name" label="世界名称" min-width="120">
              <template slot-scope="scope">
                <el-tag 
                  :type="scope.row.world_name.includes('Forest') ? 'warning' : 'primary'" 
                  size="medium"
                  effect="plain">
                  {{ scope.row.world_name }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="启动时间" width="170" align="center">
              <template slot-scope="scope">
                <div class="time-info">
                  <span>{{ scope.row.start_time }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="运行时间" width="90" align="center">
              <template slot-scope="scope">
                <div class="time-info">
                  <span>{{ formatTimeDiff(Date.now() - new Date(scope.row.start_time).getTime()) }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="180" align="center">
              <template slot-scope="scope">
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
            <i class="el-icon-warning-outline"></i>
            <span>暂无服务器实例运行</span>
            <el-button type="primary" size="small" plain @click="$router.push('/servers/create')">创建新服务器</el-button>
          </div>
          
        </el-card>
      </el-col>
      
      <el-col :span="8">
        <el-card shadow="hover" class="system-info">
          <div slot="header" class="clearfix">
            <span>系统资源</span>
            <el-button style="float: right; padding: 3px 0" type="text" @click="refreshSystemStatus">刷新</el-button>
          </div>
          <div v-loading="systemLoading" class="resource-usage">
            <div class="resource-item">
              <div class="resource-label">
                <span>CPU使用率</span>
              </div>
              <el-progress :percentage="systemStatus.cpu_usage && !isNaN(systemStatus.cpu_usage) ? parseFloat(systemStatus.cpu_usage.toFixed(2)) : 0" :color="customColors"></el-progress>
              <div class="resource-detail">
                <span>{{ systemStatus.cpu_model || '未知CPU' }} {{ systemStatus.cpu_mhz ? '(' + systemStatus.cpu_mhz + 'MHz)' : '' }}</span>
                <span>{{ systemStatus.cpu_cores || 0 }}核心 / {{ systemStatus.cpu_threads || 0 }}线程</span>
              </div>
            </div>
            <div class="resource-item">
              <div class="resource-label">
                <span>内存使用率</span>
                <!-- <span class="resource-value">{{ systemStatus.memory_usage ? systemStatus.memory_usage.toFixed(2) + '%' : '0%' }}</span> -->
              </div>
              <el-progress :percentage="systemStatus.memory_usage && !isNaN(systemStatus.memory_usage) ? parseFloat(systemStatus.memory_usage.toFixed(2)) : 0" :color="customColors"></el-progress>
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
              <el-progress :percentage="systemStatus.disk_usage && !isNaN(systemStatus.disk_usage) ? parseFloat(systemStatus.disk_usage.toFixed(2)) : 0" :color="customColors"></el-progress>
              <div class="resource-detail">
                <span>总容量: {{ systemStatus.total_disk ? systemStatus.total_disk.toFixed(2) : 0 }}GB</span>
                <span>已用: {{ systemStatus.used_disk ? systemStatus.used_disk.toFixed(2) : 0 }}GB</span>
                <span>空闲: {{ systemStatus.free_disk ? systemStatus.free_disk.toFixed(2) : 0 }}GB</span>
              </div>
            </div>
            <div class="resource-item">
              <div class="resource-label">
                <span>系统负载</span>
                <!-- <span class="resource-value">{{ systemStatus.cpu_load1 ? systemStatus.cpu_load1.toFixed(2) : '0.00' }}</span> -->
              </div>
              <el-progress :percentage="systemStatus.cpu_load1 && !isNaN(systemStatus.cpu_load1) ? parseFloat(systemStatus.cpu_load1.toFixed(2)) : 0"></el-progress>
              <div class="resource-detail">
                <span>1分钟: {{ systemStatus.cpu_load1 ? systemStatus.cpu_load1.toFixed(2) : '0.00' }}</span>
                <span>5分钟: {{ systemStatus.cpu_load5 ? systemStatus.cpu_load5.toFixed(2) : '0.00' }}</span>
                <span>15分钟: {{ systemStatus.cpu_load15 ? systemStatus.cpu_load15.toFixed(2) : '0.00' }}</span>
              </div>
            </div>
          </div>
          <div class="system-info-footer">
            <div class="system-info-item">
              <i class="el-icon-monitor"></i>
              <span>{{ systemStatus.os_info || '未知系统' }}</span>
            </div>
            <div class="system-info-item">
              <i class="el-icon-time"></i>
              <span>运行时间: {{ systemStatus.uptime_formatted || '未知' }}</span>
            </div>
            <div class="system-info-item">
              <i class="el-icon-refresh"></i>
              <span>更新时间: {{ systemStatus.current_time || '未知' }}</span>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
    
    <div class="section-divider">
      <div class="section-title">
        <i class="el-icon-document"></i>
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
        <i class="el-icon-s-data"></i>
        <span>最近游戏数据</span>
      </div>
    </div>
    
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
            <div class="placeholder-chart">
              <div class="chart-title">玩家活跃度</div>
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
import WorldLog from '@/components/WorldLog.vue';
import { systemApi } from '@/api/index';
import { formatTimeDiff } from '@/utils/dateUtils';

export default {
  name: 'Dashboard',
  components: {
    WorldLog
  },
  data() {
    return {
      formatTimeDiff,
      loading: false,
      serverList: [],
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
      ],
      systemLoading: false,
      systemStatus: {},
      // 快速访问项目
      quickAccessItems: [
        { title: '日志查询', icon: 'el-icon-search', path: '/logs/query' },
        { title: '规则管理', icon: 'el-icon-setting', path: '/logs/rules' },
        { title: '服务器列表', icon: 'el-icon-monitor', path: '/servers/list' },
        { title: '房间列表', icon: 'el-icon-house', path: '/rooms/list' },
        { title: '世界管理', icon: 'el-icon-earth', path: '/worlds/list' },
        { title: '模组管理', icon: 'el-icon-s-grid', path: '/mods/list' }
      ],
      versionInfo: {
        local: null,
        latest: null
      },
      isVersionOutdated: false,
    }
  },
  created() {
    this.refreshData();
    this.refreshSystemStatus();
    this.getServerList();
    this.getVersionInfo();
  },
  methods: {
    getServerList() {
      systemApi.getTmuxServers().then(res => {
        this.serverList = res.data;
      }).catch(err => {
        console.error(err);
      })
    },
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
      if (server.status === 'running') {
        this.$confirm(`确定要停止 "${server.archive_name}" 吗？`, '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }).then(() => {
          systemApi.stopTmuxServer({session_name: server.session_name}).then(res => {
            this.$message.success(res.msg);
            setTimeout(() => {
              this.getServerList();
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
      if (!memory) return '0 MB';
      if (memory < 1024) {
        return memory.toFixed(2) + ' MB';
      } else {
        return (memory / 1024).toFixed(2) + ' GB';
      }
    },
    
    // 快速访问导航
    navigateTo(path) {
      this.$router.push(path);
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
          this.$set(this.versionInfo, 'local', localRes.data);
          this.checkVersionOutdated();
        }
      }).catch(err => {
        console.error('获取本地版本失败:', err);
        this.$message.error('获取本地版本信息失败');
      });
      
      // 获取最新版本
      systemApi.getLatestVersion().then(latestRes => {
        if (latestRes.data && latestRes.status === 200) {
          // 使用Vue.set或对象整体赋值确保响应式更新
          this.$set(this.versionInfo, 'latest', latestRes.data);
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
          // 比较版本号
          const localVersion = parseInt(this.versionInfo.local.version) || 0;
          const latestVersion = parseInt(this.versionInfo.latest.version) || 0;

          this.isVersionOutdated = localVersion < latestVersion;
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
    }
  },
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

:deep(.el-progress) {
  display: flex;
  align-items: center;
}

.resource-label {
  display: flex;
  justify-content: space-between;
  margin-bottom: 5px;
  font-size: 14px;
  color: #606266;
}

.resource-value {
  font-weight: bold;
  color: #303133;
}

.resource-detail {
  display: flex;
  justify-content: space-between;
  margin-top: 5px;
  font-size: 12px;
  color: #909399;
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
  border-top: 1px solid #EBEEF5;
}

.system-info-item {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
  font-size: 13px;
  color: #606266;
}

.system-info-item i {
  margin-right: 8px;
  color: #409EFF;
}

/* 快速访问区域样式 */
.quick-access-section {
  margin-bottom: 20px;
}

.quick-access-card {
  cursor: pointer;
  text-align: center;
  padding: 15px;
  transition: all 0.3s;
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 120px;
}

.quick-access-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 15px rgba(0, 0, 0, 0.1);
}

.quick-access-icon {
  font-size: 36px;
  margin-bottom: 10px;
  color: #409EFF;
}

.quick-access-title {
  font-size: 14px;
  font-weight: bold;
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
  color: #409EFF;
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
  color: #909399;
  margin-top: 3px;
}

.server-footer {
  margin-top: 15px;
  padding-top: 10px;
  border-top: 1px solid #EBEEF5;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #606266;
  font-size: 13px;
}

.server-stats {
  color: #909399;
}

.empty-server {
  padding: 30px 0;
  text-align: center;
  color: #909399;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.empty-server i {
  font-size: 48px;
  margin-bottom: 15px;
  color: #C0C4CC;
}

.empty-server span {
  margin-bottom: 15px;
}

/* 修改表格样式 */
:deep(.el-table--border) {
  border-radius: 4px;
  overflow: hidden;
}

:deep(.el-table__row:hover) {
  background-color: #f5f7fa!important;
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
  background-color: #409EFF;
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

.version-title {
  font-size: 16px;
  font-weight: bold;
  color: #303133;
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
  background-color: #f5f7fa;
  transition: all 0.3s;
}

.version-box-outdated {
  background-color: #fef0f0;
  border: 1px dashed #F56C6C;
}

.version-box-label {
  font-size: 14px;
  color: #909399;
  margin-bottom: 5px;
}

.version-box-value {
  font-size: 20px;
  font-weight: bold;
  color: #303133;
  margin-bottom: 5px;
}

.version-arrow {
  margin: 0 15px;
  color: #909399;
  font-size: 20px;
}

.version-box-date {
  font-size: 12px;
  color: #909399;
}

.version-link {
  color: #409EFF;
  text-decoration: none;
  transition: all 0.3s;
}

.version-link:hover {
  opacity: 0.8;
}

.version-warning-icon {
  margin-left: 5px;
  color: #F56C6C;
  font-size: 16px;
}

.version-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  color: #909399;
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
  color: #F56C6C;
}

.version-update-notice i {
  margin-right: 8px;
  font-size: 16px;
}

.version-update-notice button {
  margin-left: 15px;
}
</style> 