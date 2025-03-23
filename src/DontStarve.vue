<template>
  <div class="dont-starve-admin">
    <div class="sidebar">
      <div class="logo-container">
        <img src="https://cdn2.steamgriddb.com/file/sgdb-cdn/icon/8efb100a295c0c690931222ff4467bb8/32/256x256.png" alt="饥荒图标" class="logo">
        <h1>饥荒管理系统</h1>
      </div>
      <el-menu
        :default-active="activeIndex"
        class="sidebar-menu"
        background-color="#2c3e50"
        text-color="#fff"
        active-text-color="#ffd04b"
        router>
        <el-menu-item index="/">
          <i class="el-icon-s-home"></i>
          <span>控制面板</span>
        </el-menu-item>
        <el-submenu index="2">
          <template slot="title">
            <i class="el-icon-user"></i>
            <span>玩家管理</span>
          </template>
          <el-menu-item index="/players/list">玩家列表</el-menu-item>
          <el-menu-item index="/players/ban">封禁管理</el-menu-item>
        </el-submenu>
        <el-submenu index="3">
          <template slot="title">
            <i class="el-icon-s-cooperation"></i>
            <span>服务器管理</span>
          </template>
          <el-menu-item index="/servers/list">服务器列表</el-menu-item>
          <el-menu-item index="/servers/settings">服务器设置</el-menu-item>
          <el-menu-item index="/servers/saves">存档管理</el-menu-item>
        </el-submenu>
        <el-submenu index="4">
          <template slot="title">
            <i class="el-icon-s-grid"></i>
            <span>模组管理</span>
          </template>
          <el-menu-item index="/mods/list">已安装模组</el-menu-item>
          <el-menu-item index="/mods/settings">模组设置</el-menu-item>
        </el-submenu>
        <el-submenu index="5">
          <template slot="title">
            <i class="el-icon-magic-stick"></i>
            <span>物品管理</span>
          </template>
          <el-menu-item index="/items/list">物品列表</el-menu-item>
          <el-menu-item index="/items/generate">物品生成</el-menu-item>
        </el-submenu>
        <el-menu-item index="/announcements">
          <i class="el-icon-s-claim"></i>
          <span>公告管理</span>
        </el-menu-item>
        <el-menu-item index="/settings">
          <i class="el-icon-s-tools"></i>
          <span>系统设置</span>
        </el-menu-item>
      </el-menu>
    </div>
    
    <div class="main-content">
      <div class="header">
        <div class="breadcrumb">
          <el-breadcrumb separator="/">
            <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
            <el-breadcrumb-item>{{ getActiveMenuTitle() }}</el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <div class="user-info">
          <el-dropdown>
            <span class="el-dropdown-link">
              管理员 <i class="el-icon-arrow-down el-icon--right"></i>
            </span>
            <el-dropdown-menu slot="dropdown">
              <el-dropdown-item>个人信息</el-dropdown-item>
              <el-dropdown-item>修改密码</el-dropdown-item>
              <el-dropdown-item divided>退出登录</el-dropdown-item>
            </el-dropdown-menu>
          </el-dropdown>
        </div>
      </div>
      
      <div class="dashboard" v-loading="loading" element-loading-text="加载中..." element-loading-spinner="el-icon-loading">
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
                    <div class="event-content">创建了新的存档备份</div>
                  </div>
                  <div class="event-item">
                    <div class="event-time">08:12</div>
                    <div class="event-content">更新了3个模组</div>
                  </div>
                  <div class="event-item">
                    <div class="event-time">00:00</div>
                    <div class="event-content">执行了每日维护任务</div>
                  </div>
                </div>
              </div>
            </el-card>
          </el-col>
        </el-row>
        
        <!-- 标题分割线 -->
        <div class="section-divider">
          <div class="section-title">
            <i class="el-icon-user"></i>
            <span>玩家与快捷操作</span>
          </div>
        </div>
        
        <!-- 玩家区域 -->
        <el-row :gutter="20" class="player-section">
          <el-col :span="12">
            <el-card shadow="hover" class="online-players">
              <div slot="header" class="clearfix">
                <span>在线玩家</span>
                <el-button style="float: right; padding: 3px 0" type="text">查看全部</el-button>
              </div>
              <el-table :data="onlinePlayers.slice(0, 5)" style="width: 100%" size="medium">
                <el-table-column width="50">
                  <template slot-scope="scope">
                    <el-avatar :size="30" :src="scope.row.avatar"></el-avatar>
                  </template>
                </el-table-column>
                <el-table-column prop="name" label="玩家名称"></el-table-column>
                <el-table-column prop="role" label="角色" width="100">
                  <template slot-scope="scope">
                    <el-tag size="mini" :type="getRoleType(scope.row.role)">{{ scope.row.role }}</el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="server" label="服务器" width="120"></el-table-column>
                <el-table-column prop="playtime" label="游戏时长" width="120"></el-table-column>
                <el-table-column label="操作" width="150">
                  <template slot-scope="scope">
                    <el-button type="text" size="small" @click="handleMessage(scope.row)">私信</el-button>
                    <el-button type="text" size="small" @click="handleKick(scope.row)">踢出</el-button>
                    <el-button type="text" size="small" class="danger-text" @click="handleBan(scope.row)">封禁</el-button>
                  </template>
                </el-table-column>
              </el-table>
            </el-card>
          </el-col>
          
          <el-col :span="12">
            <el-card shadow="hover" class="quick-actions">
              <div slot="header" class="clearfix">
                <span>快捷操作</span>
              </div>
              <div class="action-grid">
                <el-button type="primary" class="action-btn" @click="showServerDialog">新建服务器</el-button>
                <el-button type="success" class="action-btn" @click="showModDialog">安装模组</el-button>
                <el-button type="warning" class="action-btn" @click="showBackupDialog">创建备份</el-button>
                <el-button type="info" class="action-btn" @click="showSeasonDialog">切换季节</el-button>
                <el-button type="danger" class="action-btn" @click="showResetDialog">重置世界</el-button>
                <el-button class="action-btn" @click="showConsoleDialog">打开控制台</el-button>
                <el-button type="primary" plain class="action-btn" @click="showAnnouncementDialog">发送公告</el-button>
                <el-button type="success" plain class="action-btn" @click="showConfigDialog">配置文件</el-button>
              </div>
            </el-card>
          </el-col>
        </el-row>
      </div>
    </div>
    
    <!-- 对话框区域 -->
    <el-dialog title="服务器配置" :visible.sync="dialogVisible" width="50%">
      <span>这里显示对应的表单内容</span>
      <span slot="footer" class="dialog-footer">
        <el-button @click="dialogVisible = false">取 消</el-button>
        <el-button type="primary" @click="dialogVisible = false">确 定</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
export default {
  name: 'DontStarveAdmin',
  data() {
    return {
      loading: false,
      dialogVisible: false,
      activeIndex: '/',
      serverList: [
        {
          name: '主世界服务器',
          status: '在线',
          players: '12/20',
          day: '126',
          season: '夏季',
          uptime: '3天14小时'
        },
        {
          name: '洞穴服务器',
          status: '在线',
          players: '8/12',
          day: '126',
          season: '恒定',
          uptime: '3天12小时'
        },
        {
          name: '模组服务器',
          status: '在线',
          players: '7/16',
          day: '58',
          season: '春季',
          uptime: '1天8小时'
        },
        {
          name: 'PVP服务器',
          status: '离线',
          players: '0/0',
          day: '32',
          season: '秋季',
          uptime: '0'
        },
        {
          name: '测试服务器',
          status: '重启中',
          players: '0/0',
          day: '5',
          season: '冬季',
          uptime: '0'
        }
      ],
      onlinePlayers: [
        {
          avatar: 'https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png',
          name: '猪王爱烤肉',
          role: '薇诺娜',
          server: '主世界服务器',
          playtime: '126小时'
        },
        {
          avatar: 'https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png',
          name: '沃利大厨',
          role: '沃利',
          server: '主世界服务器',
          playtime: '87小时'
        },
        {
          avatar: 'https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png',
          name: '麦斯威尔',
          role: '麦斯威尔',
          server: '洞穴服务器',
          playtime: '215小时'
        },
        {
          avatar: 'https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png',
          name: '温蒂的鬼魂',
          role: '温蒂',
          server: '主世界服务器',
          playtime: '62小时'
        },
        {
          avatar: 'https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png',
          name: '旺达时光机',
          role: '旺达',
          server: '模组服务器',
          playtime: '43小时'
        },
        {
          avatar: 'https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png',
          name: '韦伯蜘蛛窝',
          role: '韦伯',
          server: '洞穴服务器',
          playtime: '178小时'
        }
      ],
      customColors: [
        {color: '#5cb87a', percentage: 20},
        {color: '#e6a23c', percentage: 60},
        {color: '#f56c6c', percentage: 80}
      ]
    };
  },
  created() {
    this.initData();
  },
  methods: {
    initData() {
      this.loading = true;
      setTimeout(() => {
        this.loading = false;
      }, 800);
    },
    getSeasonClass(season) {
      switch(season) {
        case '春季': return 'season-spring';
        case '夏季': return 'season-summer';
        case '秋季': return 'season-autumn';
        case '冬季': return 'season-winter';
        default: return '';
      }
    },
    getRoleType(role) {
      const roles = {
        '薇洛': 'danger',
        '麦斯威尔': 'info',
        '薇诺娜': 'warning',
        '沃利': 'success',
        '温蒂': 'info',
        '旺达': 'warning',
        '韦伯': 'danger'
      };
      return roles[role] || '';
    },
    handleServerAction(row) {
      this.$confirm(`确定要${row.status === '在线' ? '停止' : '启动'}服务器 "${row.name}" 吗?`, '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        this.$message({
          type: 'success',
          message: `${row.status === '在线' ? '停止' : '启动'}服务器操作已执行!`
        });
      }).catch(() => {
        this.$message({
          type: 'info',
          message: '已取消操作'
        });          
      });
    },
    handleRestart(row) {
      this.$confirm(`确定要重启服务器 "${row.name}" 吗?`, '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        this.$message({
          type: 'success',
          message: '重启操作已执行!'
        });
      }).catch(() => {
        this.$message({
          type: 'info',
          message: '已取消操作'
        });          
      });
    },
    handleConfigure(row) {
      this.dialogVisible = true;
    },
    handleMessage(player) {
      this.$prompt(`发送消息给玩家 ${player.name}`, '私信', {
        confirmButtonText: '发送',
        cancelButtonText: '取消',
        inputPlaceholder: '请输入消息内容'
      }).then(({ value }) => {
        this.$message({
          type: 'success',
          message: `消息已发送给 ${player.name}`
        });
      }).catch(() => {
        this.$message({
          type: 'info',
          message: '已取消发送'
        });       
      });
    },
    handleKick(player) {
      this.$confirm(`确定要将玩家 "${player.name}" 踢出服务器吗?`, '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        this.$message({
          type: 'success',
          message: `已将玩家 ${player.name} 踢出服务器!`
        });
      }).catch(() => {
        this.$message({
          type: 'info',
          message: '已取消操作'
        });          
      });
    },
    handleBan(player) {
      this.$confirm(`确定要封禁玩家 "${player.name}" 吗?`, '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        this.$message({
          type: 'success',
          message: `已封禁玩家 ${player.name}!`
        });
      }).catch(() => {
        this.$message({
          type: 'info',
          message: '已取消操作'
        });          
      });
    },
    showServerDialog() {
      this.dialogVisible = true;
    },
    showModDialog() {
      this.dialogVisible = true;
    },
    showBackupDialog() {
      this.dialogVisible = true;
    },
    showSeasonDialog() {
      this.dialogVisible = true;
    },
    showResetDialog() {
      this.dialogVisible = true;
    },
    showConsoleDialog() {
      this.dialogVisible = true;
    },
    showAnnouncementDialog() {
      this.dialogVisible = true;
    },
    showConfigDialog() {
      this.dialogVisible = true;
    },
    refreshData() {
      this.loading = true;
      setTimeout(() => {
        // 模拟数据刷新
        this.serverList.forEach(server => {
          if (server.status === '在线') {
            server.uptime = this.updateUptime(server.uptime);
          }
        });
        this.$message({
          message: '数据已刷新',
          type: 'success',
          duration: 1500
        });
        this.loading = false;
      }, 800);
    },
    updateUptime(uptime) {
      // 简单模拟更新运行时间
      if (uptime.includes('天')) {
        const parts = uptime.split('天');
        const days = parseInt(parts[0]);
        const hours = parseInt(parts[1]);
        return `${days}天${hours + 1}小时`;
      }
      return uptime;
    },
    tableRowClassName({row, rowIndex}) {
      if (row.status === '离线') {
        return 'offline-row';
      } else if (row.status === '重启中') {
        return 'restarting-row';
      }
      return '';
    },
    getActiveMenuTitle() {
      const path = this.$route.path;
      const routes = this.$router.options.routes;
      
      for (const route of routes) {
        if (route.path === path) {
          return route.meta.title;
        }
      }

      return '控制面板';
    }
  }
};
</script>

<style scoped>
.dont-starve-admin {
  display: flex;
  min-height: 100vh;
  background-color: #f5f7fa;
}

.sidebar {
  width: 250px;
  background-color: #2c3e50;
  color: #fff;
  display: flex;
  flex-direction: column;
  position: fixed;
  height: 100vh;
  box-shadow: 0 0 15px rgba(0, 0, 0, 0.1);
  z-index: 10;
  transition: all 0.3s;
}

.logo-container {
  padding: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  background-color: #1a2530;
}

.logo {
  width: 64px;
  height: 64px;
  margin-bottom: 10px;
  transition: all 0.3s;
}

.logo-container h1 {
  font-size: 18px;
  margin: 0;
  text-align: center;
  transition: all 0.3s;
}

.sidebar-menu {
  border-right: none;
}

.el-menu-item, .el-submenu__title {
  height: 50px;
  line-height: 50px;
}

.main-content {
  flex: 1;
  margin-left: 250px;
  padding: 20px;
  transition: all 0.3s;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  background-color: #fff;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
  border-radius: 4px;
  margin-bottom: 20px;
}

.user-info {
  display: flex;
  align-items: center;
}

.el-dropdown-link {
  cursor: pointer;
  color: #409EFF;
  display: flex;
  align-items: center;
}

.dashboard {
  margin-top: 20px;
  padding: 0 5px;
}

.stat-cards {
  margin-bottom: 30px;
}

.stat-card {
  height: 120px;
  position: relative;
  overflow: hidden;
  border-radius: 8px;
  transition: all 0.3s;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  margin-bottom: 10px;
}

.stat-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
}

.stat-content {
  display: flex;
  align-items: center;
  height: 100%;
  padding: 0 10px;
}

.stat-icon-container {
  width: 70px;
  height: 70px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30px;
  margin-right: 15px;
  color: white;
  box-shadow: 0 5px 10px rgba(0, 0, 0, 0.1);
}

.server-icon {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.player-icon {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}

.mod-icon {
  background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
}

.backup-icon {
  background: linear-gradient(135deg, #ff9a9e 0%, #fad0c4 100%);
}

.stat-info {
  flex: 1;
}

.stat-title {
  font-size: 14px;
  color: #909399;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 28px;
  font-weight: bold;
  color: #303133;
  margin-bottom: 8px;
  line-height: 1;
}

.stat-detail {
  font-size: 12px;
  color: #606266;
}

.monitor-section, .player-section {
  margin-bottom: 20px;
}

.server-name {
  display: flex;
  align-items: center;
}

.server-name .el-tag {
  margin-right: 10px;
}

.server-title {
  font-weight: 500;
}

.offline-row {
  background-color: rgba(245, 245, 245, 0.6);
  color: #909399;
}

.restarting-row {
  background-color: rgba(250, 236, 216, 0.4);
}

.season-badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 12px;
  font-weight: 500;
}

.season-spring {
  color: #67C23A;
  background-color: rgba(103, 194, 58, 0.1);
}

.season-summer {
  color: #E6A23C;
  background-color: rgba(230, 162, 60, 0.1);
}

.season-autumn {
  color: #F56C6C;
  background-color: rgba(245, 108, 108, 0.1);
}

.season-winter {
  color: #409EFF;
  background-color: rgba(64, 158, 255, 0.1);
}

.resource-usage {
  margin-bottom: 20px;
}

.resource-item {
  margin-bottom: 15px;
}

.resource-label {
  margin-bottom: 5px;
  font-size: 14px;
  color: #606266;
}

.system-events {
  border-top: 1px solid #EBEEF5;
  padding-top: 15px;
}

.event-header {
  font-size: 14px;
  font-weight: bold;
  margin-bottom: 10px;
  color: #303133;
}

.event-item {
  display: flex;
  margin-bottom: 10px;
  font-size: 13px;
}

.event-time {
  width: 50px;
  color: #909399;
}

.event-content {
  flex: 1;
  color: #606266;
}

.action-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 15px;
}

.action-btn {
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.danger-text {
  color: #F56C6C;
}

.danger-text:hover {
  color: #f78989;
}

/* 响应式调整 */
@media (max-width: 1400px) {
  .stat-icon-container {
    width: 60px;
    height: 60px;
    font-size: 26px;
  }
  
  .stat-value {
    font-size: 26px;
  }
}

@media (max-width: 1200px) {
  .stat-cards .el-col {
    width: 50%;
    padding-bottom: 10px;
  }
  
  .stat-card {
    margin-bottom: 10px;
  }
  
  .action-grid {
    grid-template-columns: 1fr;
  }
  
  .monitor-section .el-col,
  .player-section .el-col {
    width: 100%;
    margin-bottom: 20px;
  }
}

@media (max-width: 992px) {
  .sidebar {
    width: 64px;
  }
  
  .main-content {
    margin-left: 64px;
  }
  
  .logo {
    width: 40px;
    height: 40px;
    margin-bottom: 5px;
  }
  
  .logo-container h1 {
    display: none;
  }
  
  .stat-value {
    font-size: 24px;
  }
  
  .monitor-section .el-col, 
  .player-section .el-col {
    width: 100%;
    margin-bottom: 20px;
  }
}

@media (max-width: 768px) {
  .stat-cards .el-col {
    width: 100%;
  }
  
  .stat-card {
    height: 100px;
  }
  
  .stat-icon-container {
    width: 60px;
    height: 60px;
    font-size: 24px;
  }
}

.section-divider {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 0;
  margin: 25px 0 15px 0;
  border-bottom: 1px solid #EBEEF5;
}

.section-title {
  display: flex;
  align-items: center;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.section-title i {
  margin-right: 8px;
  font-size: 18px;
  color: #409EFF;
}

.refresh-btn {
  display: flex;
  align-items: center;
}

/* 服务器监控表格样式优化 */
.server-monitor .el-table {
  border-radius: 8px;
  overflow: hidden;
}

.server-monitor .el-table th {
  background-color: #f5f7fa !important;
  color: #606266 !important;
  font-weight: 600;
  padding: 12px 0;
}

.server-monitor .el-table td {
  padding: 12px 0;
}
</style> 