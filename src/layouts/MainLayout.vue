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
          <el-menu-item index="/servers/settings">服务器设置</el-menu-item>
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
          <el-menu-item index="/mods/settings">模组配置</el-menu-item>
        </el-submenu>
        
        <el-menu-item index="/backups">
          <i class="el-icon-s-management"></i>
          <span slot="title">备份管理</span>
        </el-menu-item>
        
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
      
      pathParts.forEach(part => {
        switch(part) {
          case 'dashboard':
            this.breadcrumbs.push('仪表盘')
            break
          case 'servers':
            this.breadcrumbs.push('服务器管理')
            break
          case 'list':
            if (pathParts.includes('servers')) {
              this.breadcrumbs.push('服务器列表')
            } else if (pathParts.includes('players')) {
              this.breadcrumbs.push('玩家列表')
            } else if (pathParts.includes('items')) {
              this.breadcrumbs.push('物品列表')
            } else if (pathParts.includes('mods')) {
              this.breadcrumbs.push('模组列表')
            }
            break
          case 'settings':
            if (pathParts.includes('servers')) {
              this.breadcrumbs.push('服务器设置')
            } else if (pathParts.includes('mods')) {
              this.breadcrumbs.push('模组配置')
            } else {
              this.breadcrumbs.push('设置')
            }
            break
          case 'players':
            this.breadcrumbs.push('玩家管理')
            break
          case 'ban':
            this.breadcrumbs.push('封禁管理')
            break
          case 'items':
            this.breadcrumbs.push('物品管理')
            break
          case 'generator':
            this.breadcrumbs.push('物品生成器')
            break
          case 'mods':
            this.breadcrumbs.push('模组管理')
            break
          case 'backups':
            this.breadcrumbs.push('备份管理')
            break
          case 'system':
            this.breadcrumbs.push('系统设置')
            break
          default:
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
  width: 220px;
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
  padding: 20px;
  background-color: #f0f2f5;
}
</style> 