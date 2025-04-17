<template>
  <div class="app-layout">
    <!-- 侧边导航栏 -->
    <div class="sidebar">
      <div class="logo-container">
        <h1 class="logo">饥荒管理</h1>
      </div>
      <el-menu
        :default-active="activeMenu"
        class="el-menu-vertical"
        background-color="#304156"
        text-color="#bfcbd9"
        active-text-color="#409EFF"
        :collapse="isCollapse"
        :unique-opened="true"
        router>

        <el-menu-item index="/dashboard">
          <i class="el-icon-s-home"></i>
          <span slot="title">仪表盘</span>
        </el-menu-item>

        <el-submenu index="/servers">
          <template slot="title">
            <i class="el-icon-s-platform"></i>
            <span>服务器管理</span>
          </template>
          <el-menu-item index="/servers/list">服务器列表</el-menu-item>
          <el-menu-item index="/servers/commands">命令设置</el-menu-item>
        </el-submenu>

        <el-submenu index="/logs">
          <template slot="title">
            <i class="el-icon-document"></i>
            <span>日志管理器</span>
          </template>
          <el-menu-item index="/logs/query">日志查询</el-menu-item>
          <el-menu-item index="/logs/rules">规则管理</el-menu-item>
          <el-menu-item index="/logs/parser">日志解析器</el-menu-item>
          <el-menu-item index="/logs/stats">日志统计</el-menu-item>
        </el-submenu>

        <el-submenu index="/players">
          <template slot="title">
            <i class="el-icon-user"></i>
            <span>玩家管理</span>
          </template>
          <el-menu-item index="/players/list">玩家列表</el-menu-item>
          <el-menu-item index="/players/ban">封禁管理</el-menu-item>
        </el-submenu>

        <el-submenu index="/items">
          <template slot="title">
            <i class="el-icon-goods"></i>
            <span>物品管理</span>
          </template>
          <el-menu-item index="/items/list">物品列表</el-menu-item>
          <el-menu-item index="/items/generator">物品生成器</el-menu-item>
        </el-submenu>

        <el-submenu index="/mods">
          <template slot="title">
            <i class="el-icon-s-operation"></i>
            <span>模组管理</span>
          </template>
          <el-menu-item index="/mods/list">已下载模组</el-menu-item>
          <el-menu-item index="/mods/search">模组搜索</el-menu-item>
        </el-submenu>

        <el-submenu index="/rooms">
          <template slot="title">
            <i class="el-icon-s-grid"></i>
            <span>房间管理</span>
          </template>
          <el-menu-item index="/rooms/list">房间列表</el-menu-item>
          <el-menu-item index="/rooms/settings">房间设置</el-menu-item>
        </el-submenu>

        <el-submenu index="/worlds">
          <template slot="title">
            <i class="el-icon-s-data"></i>
            <span>世界管理</span>
          </template>
          <el-menu-item index="/worlds/list">世界列表</el-menu-item>
          <el-menu-item index="/worlds/settings">世界设置</el-menu-item>
        </el-submenu>

        <el-menu-item index="/backups">
          <i class="el-icon-s-management"></i>
          <span slot="title">备份管理</span>
        </el-menu-item>

        <el-submenu index="/scheduled">
          <template slot="title">
            <i class="el-icon-alarm-clock"></i>
            <span>定时任务</span>
          </template>
          <el-menu-item index="/scheduled/tasks">任务列表</el-menu-item>
          <el-menu-item index="/scheduled/create">创建任务</el-menu-item>
        </el-submenu>

        <el-submenu index="/agents">
          <template slot="title">
            <i class="el-icon-connection"></i>
            <span>Agent管理</span>
          </template>
          <el-menu-item index="/agents/list">Agent列表</el-menu-item>
          <el-menu-item index="/agents/command">命令管理</el-menu-item>
          <el-menu-item index="/agents/security">安全设置</el-menu-item>
        </el-submenu>

        <el-menu-item index="/system">
          <i class="el-icon-setting"></i>
          <span slot="title">系统设置</span>
        </el-menu-item>
      </el-menu>

      <div class="sidebar-footer">
        <el-tooltip content="折叠菜单" placement="right">
          <el-button
            class="collapse-btn"
            type="text"
            @click="toggleCollapse"
            :icon="isCollapse ? 'el-icon-s-unfold' : 'el-icon-s-fold'">
          </el-button>
        </el-tooltip>
      </div>
    </div>

    <!-- 主内容区 -->
    <div class="main-container" :class="{'is-collapsed': isCollapse}">
      <!-- 顶部导航栏 -->
      <header class="header-container">
        <div class="left-menu">
          <el-breadcrumb separator="/">
            <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
            <el-breadcrumb-item v-for="(item, index) in breadcrumbs" :key="index">
              {{item}}
            </el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <div class="right-menu">
          <el-dropdown trigger="click">
            <span class="user-dropdown">
              管理员 <i class="el-icon-arrow-down"></i>
            </span>
            <el-dropdown-menu slot="dropdown">
              <el-dropdown-item>个人资料</el-dropdown-item>
              <el-dropdown-item>修改密码</el-dropdown-item>
              <el-dropdown-item divided>退出登录</el-dropdown-item>
            </el-dropdown-menu>
          </el-dropdown>
        </div>
      </header>

      <!-- 内容区域 -->
      <main class="content-container">
        <router-view></router-view>
      </main>
    </div>
  </div>
</template>

<script>
export default {
  name: 'MainLayout',
  data() {
    return {
      isCollapse: false,
      breadcrumbs: []
    }
  },
  computed: {
    activeMenu() {
      return this.$route.path
    }
  },
  watch: {
    '$route'() {
      this.updateBreadcrumbs()
    }
  },
  mounted() {
    this.updateBreadcrumbs()
  },
  methods: {
    toggleCollapse() {
      this.isCollapse = !this.isCollapse
    },
    updateBreadcrumbs() {
      this.breadcrumbs = []
      const path = this.$route.path
      const pathParts = path.split('/').filter(Boolean)

      // 路径映射对象
      const pathMap = {
        dashboard: '仪表盘',
        servers: '服务器管理',
        logs: '日志管理器',
        players: '玩家管理',
        items: '物品管理',
        mods: '模组管理',
        rooms: '房间管理',
        backups: '备份管理',
        scheduled: '定时任务',
        system: '系统设置',
        ban: '封禁管理',
        generator: '物品生成器',
        search: '模组搜索',
        agents: 'Agent管理',
        security: '安全设置',
        parser: '日志解析器',
        stats: '日志统计'
      }

      // 子页面映射
      const subPageMap = {
        list: {
          servers: '服务器列表',
          players: '玩家列表',
          items: '物品列表',
          mods: '已下载模组',
          rooms: '房间列表',
          agents: 'Agent列表',
          logs: '日志和规则管理'
        },
        settings: {
          servers: '服务器设置',
          mods: '模组配置',
          rooms: '房间设置',
          default: '设置'
        },
        tasks: {
          scheduled: '任务列表'
        },
        create: {
          scheduled: '创建任务'
        },
        saves: {
          servers: '存档管理'
        },
        commands: {
          servers: '命令设置'
        },
        query: {
          logs: '日志查询'
        },
        rules: {
          logs: '规则管理'
        }
      }

      // 处理面包屑
      pathParts.forEach((part, index) => {
        // 直接映射
        if (pathMap[part]) {
          this.breadcrumbs.push(pathMap[part])
        }
        // 处理列表页面
        else if (part === 'list' && index > 0) {
          const parentPath = pathParts[index - 1]
          this.breadcrumbs.push(subPageMap.list[parentPath] || part)
        }
        // 处理设置页面
        else if (part === 'settings' && index > 0) {
          const parentPath = pathParts[index - 1]
          this.breadcrumbs.push(subPageMap.settings[parentPath] || subPageMap.settings.default)
        }
        // 默认处理
        else if (!['list', 'settings'].includes(part)) {
          this.breadcrumbs.push(part)
        }
      })
    }
  }
}
</script>

<style scoped>
.app-layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

.sidebar {
  width: 180px;
  height: 100%;
  background-color: #304156;
  transition: width 0.3s;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sidebar.collapsed {
  width: 64px;
}

.logo-container {
  height: 60px;
  line-height: 60px;
  text-align: center;
  background-color: #263445;
}

.logo {
  margin: 0;
  color: #fff;
  font-size: 18px;
  font-weight: 600;
}

.el-menu-vertical {
  border-right: none;
  flex: 1;
  overflow-y: auto;
}

.el-menu-vertical::-webkit-scrollbar {
  width: 0;
  height: 0;
}

.sidebar-footer {
  height: 50px;
  line-height: 50px;
  text-align: center;
  background-color: #263445;
  padding: 0 10px;
  display: flex;
  justify-content: flex-end;
}

.collapse-btn {
  color: #bfcbd9;
  font-size: 20px;
}

.main-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: margin-left 0.3s;
}

.main-container.is-collapsed {
  margin-left: -156px;
}

.header-container {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.08);
  background-color: #fff;
}

.left-menu {
  display: flex;
  align-items: center;
}

.right-menu {
  display: flex;
  align-items: center;
}

.user-dropdown {
  cursor: pointer;
  color: #606266;
}

.content-container {
  flex: 1;
  overflow: auto;
  padding: 10px;
  background-color: #f0f2f5;
  min-width: 800px;
}
</style>