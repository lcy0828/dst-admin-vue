<template>
  <div class="app-layout">
    <a class="skip-link" href="#main-content">跳到主要内容</a>

    <button
      class="sidebar-overlay"
      :class="{ visible: mobileSidebarOpen }"
      type="button"
      aria-label="关闭导航菜单"
      :tabindex="mobileSidebarOpen ? 0 : -1"
      @click="closeMobileSidebar"
    ></button>

    <!-- 侧边导航栏 -->
    <aside
      id="primary-navigation"
      class="sidebar"
      :class="{ collapsed: isCollapse && !isCompactViewport, 'mobile-open': mobileSidebarOpen }"
      :aria-hidden="isCompactViewport && !mobileSidebarOpen"
    >
      <div class="logo-container">
        <h1 class="logo">
          <span class="logo-full">{{ systemName }}</span>
          <span class="logo-compact">饥</span>
        </h1>
        <el-button
          class="mobile-close-btn"
          text
          circle
          aria-label="关闭导航菜单"
          @click="closeMobileSidebar"
        >
          <component :is="'el-icon-close'" class="header-icon" />
        </el-button>
      </div>
      <el-menu
        :default-active="activeMenu"
        class="el-menu-vertical"
        background-color="var(--sidebar-color)"
        text-color="var(--sidebar-text)"
        active-text-color="var(--sidebar-active)"
        :collapse="isCollapse && !isCompactViewport"
        :unique-opened="true"
        router
        @select="handleMenuSelect">

        <el-menu-item index="/dashboard">
          <component :is="'el-icon-s-home'" class="legacy-icon" />
          <span>仪表盘</span>
        </el-menu-item>

        <el-sub-menu index="/servers">
          <template #title>
            <component :is="'el-icon-s-platform'" class="legacy-icon" />
            <span>服务器管理</span>
          </template>
          <el-menu-item index="/servers/workspace">服务器工作台</el-menu-item>
          <el-menu-item index="/servers/list">服务器列表</el-menu-item>
          <el-menu-item index="/servers/commands">命令设置</el-menu-item>
        </el-sub-menu>

        <el-sub-menu index="/logs">
          <template #title>
            <component :is="'el-icon-document'" class="legacy-icon" />
            <span>日志管理器</span>
          </template>
          <el-menu-item index="/logs/query">日志查询</el-menu-item>
          <el-menu-item index="/logs/rules">规则管理</el-menu-item>
          <el-menu-item index="/logs/parser">日志解析器</el-menu-item>
        </el-sub-menu>

        <el-sub-menu index="/players">
          <template #title>
            <component :is="'el-icon-user'" class="legacy-icon" />
            <span>玩家管理</span>
          </template>
          <el-menu-item index="/players/list">玩家列表</el-menu-item>
        </el-sub-menu>



        <el-sub-menu index="/mods">
          <template #title>
            <component :is="'el-icon-s-operation'" class="legacy-icon" />
            <span>模组管理</span>
          </template>
          <el-menu-item index="/mods/list">已下载模组</el-menu-item>
          <el-menu-item index="/mods/search">模组搜索</el-menu-item>
        </el-sub-menu>

        <el-sub-menu index="/rooms">
          <template #title>
            <component :is="'el-icon-s-grid'" class="legacy-icon" />
            <span>房间管理</span>
          </template>
          <el-menu-item index="/rooms/list">房间列表</el-menu-item>
          <el-menu-item index="/rooms/settings">房间设置</el-menu-item>
        </el-sub-menu>

        <el-sub-menu index="/worlds">
          <template v-slot:title>
            <component :is="'el-icon-s-data'" class="legacy-icon" />
            <span>世界管理</span>
          </template>
          <el-menu-item index="/worlds/list">世界列表</el-menu-item>
          <el-menu-item index="/worlds/settings">世界设置</el-menu-item>
          <el-menu-item index="/worlds/state">世界状态</el-menu-item>
        </el-sub-menu>

        <el-menu-item index="/backups">
          <component :is="'el-icon-s-management'" class="legacy-icon" />
          <span>备份管理</span>
        </el-menu-item>

        <el-sub-menu index="/scheduled">
          <template #title>
            <component :is="'el-icon-alarm-clock'" class="legacy-icon" />
            <span>定时任务</span>
          </template>
          <el-menu-item index="/scheduled/tasks">任务列表</el-menu-item>
          <el-menu-item index="/scheduled/create">创建任务</el-menu-item>
        </el-sub-menu>

        <el-sub-menu index="/agents">
          <template #title>
            <component :is="'el-icon-connection'" class="legacy-icon" />
            <span>Agent管理</span>
          </template>
          <el-menu-item index="/agents/list">Agent列表</el-menu-item>
          <el-menu-item index="/agents/command">命令管理</el-menu-item>
          <el-menu-item index="/agents/security">安全设置</el-menu-item>
        </el-sub-menu>

        <el-menu-item index="/system">
          <component :is="'el-icon-setting'" class="legacy-icon" />
          <span>系统设置</span>
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
    </aside>

    <!-- 主内容区 -->
    <div class="main-container" :class="{'is-collapsed': isCollapse}">
      <!-- 顶部导航栏 -->
      <header class="header-container">
        <div class="left-menu">
          <el-button
            class="mobile-menu-btn"
            text
            circle
            aria-label="打开导航菜单"
            aria-controls="primary-navigation"
            :aria-expanded="mobileSidebarOpen"
            @click="openMobileSidebar"
          >
            <component :is="'el-icon-s-fold'" class="header-icon" />
          </el-button>
          <el-breadcrumb separator="/">
            <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
            <el-breadcrumb-item v-for="(item, index) in breadcrumbs" :key="index">
              {{item}}
            </el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <div class="right-menu">
          <RuntimeTargetSwitch @change="handleRuntimeTargetChange" />
          <a
            href="https://github.com/lcy0828/dst-admin-go"
            target="_blank"
            rel="noopener noreferrer"
            class="github-link"
            aria-label="打开 GitHub 项目"
          >
            <i class="fab fa-github"></i>
          </a>
          <el-dropdown trigger="click" @command="handleUserCommand">
            <button type="button" class="user-dropdown" aria-label="打开用户菜单">
              <component :is="'el-icon-user-solid'" class="user-icon" />
              <span class="user-name">{{ currentUser.username || '管理员' }}</span>
              <component :is="'el-icon-arrow-down'" class="dropdown-arrow" />
            </button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile">个人资料</el-dropdown-item>
                <el-dropdown-item command="password">修改密码</el-dropdown-item>
                <el-dropdown-item command="logout" divided>退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </header>

      <!-- 内容区域 -->
      <main id="main-content" class="content-container" tabindex="-1">
        <section v-if="remoteContextBlocked" class="remote-context-state">
          <div class="remote-state-header">
            <div>
              <p class="remote-state-label">当前管理目标</p>
              <h2>{{ runtimeTarget.name }}</h2>
            </div>
            <el-tag :type="runtimeTarget.online ? 'success' : 'danger'" effect="plain">
              {{ runtimeTarget.online ? 'Agent 在线' : 'Agent 离线' }}
            </el-tag>
          </div>
          <el-alert
            type="warning"
            :closable="false"
            show-icon
            title="远程领域操作尚未启用"
            description="当前节点的路径配置保持独立。房间、世界、模组和备份操作已锁定，防止请求误落到本机。"
          />
          <dl class="remote-runtime-summary">
            <div>
              <dt>主机</dt>
              <dd>{{ runtimeTarget.hostname || '-' }}</dd>
            </div>
            <div>
              <dt>系统</dt>
              <dd>{{ runtimeTarget.os || '-' }} {{ runtimeTarget.arch || '' }}</dd>
            </div>
            <div>
              <dt>存档路径</dt>
              <dd>{{ runtimeTarget.config?.savePath || '未配置' }}</dd>
            </div>
            <div>
              <dt>服务端路径</dt>
              <dd>{{ runtimeTarget.config?.serverPath || '未配置' }}</dd>
            </div>
          </dl>
          <div class="remote-state-actions">
            <el-button type="primary" @click="$router.push('/agents/list')">远程运行时配置</el-button>
            <el-button @click="switchToLocalRuntime">切换到本机</el-button>
          </div>
        </section>
        <router-view v-else></router-view>
      </main>
    </div>

    <el-dialog title="个人资料" v-model="profileVisible" width="420px">
      <el-descriptions :column="1" border>
        <el-descriptions-item label="用户名">{{ currentUser.username || '管理员' }}</el-descriptions-item>
        <el-descriptions-item label="账户类型">系统管理员</el-descriptions-item>
      </el-descriptions>
    </el-dialog>

    <el-dialog title="修改密码" v-model="passwordVisible" width="460px">
      <el-form ref="passwordForm" :model="passwordForm" :rules="passwordRules" label-width="100px">
        <el-form-item label="当前密码" prop="currentPassword">
          <el-input v-model="passwordForm.currentPassword" type="password" show-password autocomplete="current-password" />
        </el-form-item>
        <el-form-item label="新密码" prop="newPassword">
          <el-input v-model="passwordForm.newPassword" type="password" show-password autocomplete="new-password" />
        </el-form-item>
        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input v-model="passwordForm.confirmPassword" type="password" show-password autocomplete="new-password" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="passwordVisible = false">取消</el-button>
        <el-button type="primary" :loading="passwordSaving" @click="changePassword">确认修改</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { authAPI } from '@/api/v2'
import RuntimeTargetSwitch from '@/components/RuntimeTargetSwitch.vue'
import {
  getActiveRuntimeTarget,
  LOCAL_RUNTIME_TARGET_ID,
  RUNTIME_TARGET_CHANGED_EVENT,
  setActiveRuntimeTarget
} from '@/utils/runtimeTarget'
import { getSystemPreferences } from '@/utils/systemPreferences'

export default {
  name: 'MainLayout',
  components: { RuntimeTargetSwitch },
  data() {
    return {
      systemName: getSystemPreferences().systemName,
      isCollapse: false,
      isCompactViewport: false,
      mobileSidebarOpen: false,
      breadcrumbs: [],
      currentUser: {},
      runtimeTarget: getActiveRuntimeTarget(),
      profileVisible: false,
      passwordVisible: false,
      passwordSaving: false,
      passwordForm: {
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      },
      passwordRules: {
        currentPassword: [{ required: true, message: '请输入当前密码', trigger: 'blur' }],
        newPassword: [
          { required: true, message: '请输入新密码', trigger: 'blur' },
          { min: 6, message: '密码长度不少于 6 位', trigger: 'blur' }
        ],
        confirmPassword: [{ required: true, message: '请再次输入新密码', trigger: 'blur' }]
      }
    }
  },
  computed: {
    activeMenu() {
      return this.$route.path
    },
    remoteContextBlocked() {
      return this.runtimeTarget.id !== LOCAL_RUNTIME_TARGET_ID && !this.$route.path.startsWith('/agents')
    }
  },
  watch: {
    '$route'() {
      this.updateBreadcrumbs()
      this.closeMobileSidebar()
    }
  },
  mounted() {
    window.addEventListener('system-preferences-updated', this.updateSystemName)
    window.addEventListener('resize', this.updateViewportMode)
    window.addEventListener('keydown', this.handleGlobalKeydown)
    window.addEventListener(RUNTIME_TARGET_CHANGED_EVENT, this.handleRuntimeTargetEvent)
    this.updateViewportMode()
    this.updateBreadcrumbs()
    this.loadCurrentUser()
  },
  beforeUnmount() {
    window.removeEventListener('system-preferences-updated', this.updateSystemName)
    window.removeEventListener('resize', this.updateViewportMode)
    window.removeEventListener('keydown', this.handleGlobalKeydown)
    window.removeEventListener(RUNTIME_TARGET_CHANGED_EVENT, this.handleRuntimeTargetEvent)
  },
  methods: {
    updateViewportMode() {
      const compact = window.innerWidth <= 768
      this.isCompactViewport = compact
      if (!compact) this.mobileSidebarOpen = false
    },
    openMobileSidebar() {
      if (this.isCompactViewport) this.mobileSidebarOpen = true
    },
    closeMobileSidebar() {
      this.mobileSidebarOpen = false
    },
    handleRuntimeTargetChange(target) {
      this.runtimeTarget = target
    },
    handleRuntimeTargetEvent(event) {
      this.runtimeTarget = event.detail || getActiveRuntimeTarget()
    },
    switchToLocalRuntime() {
      setActiveRuntimeTarget()
    },
    handleMenuSelect() {
      if (this.isCompactViewport) this.closeMobileSidebar()
    },
    handleGlobalKeydown(event) {
      if (event.key === 'Escape') this.closeMobileSidebar()
    },
    updateSystemName(event) {
      this.systemName = event.detail?.systemName || getSystemPreferences().systemName
    },
    async loadCurrentUser() {
      try {
        const session = await authAPI.session()
        this.currentUser = session.user || {}
      } catch {
        this.currentUser = {}
      }
    },
    async handleUserCommand(command) {
      if (command === 'logout') {
        try {
          await authAPI.logout()
        } finally {
          await this.$router.push('/login')
        }
        return
      }
      if (command === 'profile') this.profileVisible = true
      if (command === 'password') this.passwordVisible = true
    },
    async changePassword() {
      const valid = await this.$refs.passwordForm.validate().catch(() => false)
      if (!valid) return
      if (this.passwordForm.newPassword !== this.passwordForm.confirmPassword) {
        this.$message.error('两次输入的新密码不一致')
        return
      }

      this.passwordSaving = true
      try {
        await authAPI.changePassword(this.passwordForm.currentPassword, this.passwordForm.newPassword)
        this.passwordVisible = false
        this.$message.success('密码已修改，请重新登录')
        await this.$router.push('/login')
      } catch (error) {
        this.$message.error(error.message || '密码修改失败')
      } finally {
        this.passwordSaving = false
      }
    },
    toggleCollapse() {
      if (!this.isCompactViewport) this.isCollapse = !this.isCollapse
    },
    updateBreadcrumbs() {
      const titles = this.$route.matched
        .map(record => record.meta?.title)
        .filter(Boolean)
      this.breadcrumbs = [...new Set(titles)]
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
  background-color: var(--sidebar-color);
  transition: width 0.3s;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sidebar.collapsed {
  width: 64px;
}

.logo-container {
  height: 54px;
  line-height: 54px;
  text-align: center;
  background-color: var(--sidebar-color-deep);
}

.logo {
  margin: 0;
  color: #fff;
  padding: 0 10px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 18px;
  font-weight: 600;
}

.logo-compact {
  display: none;
}

.sidebar.collapsed .logo-full {
  display: none;
}

.sidebar.collapsed .logo-compact {
  display: inline;
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
  background-color: var(--sidebar-color-deep);
  padding: 0 10px;
  display: flex;
  justify-content: flex-end;
}

.sidebar.collapsed .sidebar-footer {
  justify-content: center;
  padding: 0;
}

.collapse-btn {
  color: var(--sidebar-text);
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
  margin-left: 0;
}

.header-container {
  height: 54px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  border-bottom: 1px solid var(--border-color);
  box-shadow: 0 1px 2px rgba(38, 53, 46, 0.04);
  background-color: var(--surface-color);
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
  color: var(--text-regular);
}

.github-link {
  margin-right: 20px;
  font-size: 22px;
  color: var(--text-regular);
  transition: color 0.3s;
}

.github-link:hover {
  color: var(--primary-color);
}

.content-container {
  flex: 1;
  overflow: auto;
  padding: 10px;
  background-color: var(--bg-color);
  min-width: 800px;
}

@media (max-width: 768px) {
  .header-container {
    padding: 0 10px;
  }

  .left-menu {
    min-width: 0;
    overflow: hidden;
  }

  .right-menu {
    flex: 0 0 auto;
    margin-left: 8px;
  }

  .github-link {
    margin-right: 12px;
  }

  .user-dropdown {
    white-space: nowrap;
  }

  .content-container {
    min-width: 0;
    padding: 8px;
  }

  :deep(.el-dialog) {
    max-width: calc(100vw - 24px);
  }
}

/* Responsive application shell */
.app-layout {
  position: relative;
  min-width: 0;
}

.skip-link {
  position: fixed;
  top: 8px;
  left: 50%;
  z-index: 3000;
  padding: 8px 14px;
  color: #fff;
  background: var(--primary-color);
  border-radius: 4px;
  transform: translate(-50%, -160%);
  transition: transform 0.2s ease;
}

.skip-link:focus {
  transform: translate(-50%, 0);
}

.sidebar-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: block;
  width: 100%;
  height: 100%;
  padding: 0;
  border: 0;
  background: rgba(22, 31, 26, 0.46);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease;
}

.sidebar-overlay.visible {
  opacity: 1;
  pointer-events: auto;
}

.sidebar {
  position: relative;
  z-index: 2;
  flex: 0 0 200px;
  width: 200px;
  box-shadow: 1px 0 0 rgba(255, 255, 255, 0.06);
  transition: width 0.2s ease, flex-basis 0.2s ease, transform 0.2s ease;
}

.sidebar.collapsed {
  flex-basis: 64px;
}

.logo-container {
  position: relative;
  display: flex;
  flex: 0 0 54px;
  align-items: center;
  justify-content: center;
  line-height: normal;
}

.logo {
  width: 100%;
  padding: 0 16px;
  font-size: 16px;
  line-height: 24px;
  letter-spacing: 0;
  text-align: left;
}

.sidebar.collapsed .logo-container {
  justify-content: center;
}

.sidebar.collapsed .logo {
  padding: 0;
  text-align: center;
}

.mobile-close-btn,
.mobile-menu-btn {
  display: none;
}

.header-icon {
  width: 18px;
  height: 18px;
}

.el-menu-vertical {
  padding: 6px 0;
}

:deep(.el-menu-item),
:deep(.el-sub-menu__title) {
  width: calc(100% - 16px);
  height: 40px;
  margin: 1px 8px;
  border-radius: 2px;
  line-height: 40px;
  transition: color 0.15s ease, background-color 0.15s ease;
}

:deep(.el-menu-item:hover),
:deep(.el-sub-menu__title:hover) {
  background-color: rgba(255, 255, 255, 0.09) !important;
}

:deep(.el-menu-item.is-active) {
  position: relative;
  background-color: var(--sidebar-active-bg) !important;
  font-weight: 500;
}

:deep(.el-menu-item.is-active::before) {
  position: absolute;
  top: 8px;
  left: 0;
  width: 2px;
  height: 24px;
  background: var(--sidebar-active);
  border-radius: 0 2px 2px 0;
  content: '';
}

.sidebar.collapsed :deep(.el-menu-item),
.sidebar.collapsed :deep(.el-sub-menu__title) {
  width: calc(100% - 12px);
  margin-right: 6px;
  margin-left: 6px;
}

.sidebar-footer {
  flex: 0 0 46px;
  height: 46px;
  padding: 0 12px;
  align-items: center;
  line-height: normal;
}

.collapse-btn:hover,
.collapse-btn:focus-visible {
  color: #fff;
  background: rgba(255, 255, 255, 0.1);
}

.main-container {
  min-width: 0;
  transition: none;
}

.header-container {
  position: relative;
  z-index: 10;
  flex: 0 0 54px;
  gap: 16px;
  padding: 0 18px;
}

.left-menu {
  min-width: 0;
  overflow: hidden;
}

.right-menu {
  flex: 0 0 auto;
  gap: 8px;
}

.user-dropdown {
  display: inline-flex;
  min-height: 36px;
  align-items: center;
  gap: 7px;
  padding: 0 9px;
  border: 0;
  border-radius: 6px;
  background: transparent;
}

.user-dropdown:hover,
.user-dropdown:focus-visible {
  color: var(--primary-color);
  background: var(--el-color-primary-light-9);
}

.user-icon {
  width: 18px;
  height: 18px;
}

.dropdown-arrow {
  width: 12px;
  height: 12px;
}

.github-link {
  display: inline-flex;
  width: 36px;
  height: 36px;
  align-items: center;
  justify-content: center;
  margin-right: 0;
  border-radius: 4px;
  transition: color 0.15s ease, background-color 0.15s ease;
}

.github-link:hover,
.github-link:focus-visible {
  background: var(--el-color-primary-light-9);
}

.content-container {
  min-width: 0;
  padding: 18px;
  scroll-behavior: smooth;
}

.content-container:focus {
  outline: none;
}

.remote-context-state {
  width: min(760px, 100%);
  margin: 28px auto 0;
}

.remote-state-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.remote-state-label {
  margin: 0 0 4px;
  color: var(--text-secondary);
  font-size: 12px;
}

.remote-state-header h2 {
  margin: 0;
  color: var(--text-primary);
  font-size: 22px;
  font-weight: 600;
  letter-spacing: 0;
}

.remote-runtime-summary {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin: 22px 0;
  border-top: 1px solid var(--border-color);
  border-bottom: 1px solid var(--border-color);
}

.remote-runtime-summary > div {
  min-width: 0;
  padding: 14px 0;
}

.remote-runtime-summary > div:nth-child(odd) {
  padding-right: 18px;
}

.remote-runtime-summary dt {
  margin-bottom: 5px;
  color: var(--text-secondary);
  font-size: 12px;
}

.remote-runtime-summary dd {
  margin: 0;
  overflow-wrap: anywhere;
  color: var(--text-primary);
  font-size: 14px;
}

.remote-state-actions {
  display: flex;
  gap: 8px;
}

@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    top: 0;
    bottom: 0;
    left: 0;
    z-index: 1010;
    width: 240px;
    max-width: calc(100vw - 48px);
    flex-basis: 240px;
    box-shadow: 8px 0 28px rgba(22, 31, 26, 0.2);
    transform: translateX(-100%);
  }

  .sidebar.mobile-open {
    transform: translateX(0);
  }

  .logo-container {
    justify-content: flex-start;
    padding-right: 52px;
  }

  .logo {
    text-align: left;
  }

  .mobile-close-btn {
    position: absolute;
    top: 10px;
    right: 10px;
    display: inline-flex;
    color: var(--sidebar-text);
  }

  .mobile-close-btn:hover,
  .mobile-close-btn:focus-visible {
    color: #fff;
    background: rgba(255, 255, 255, 0.1);
  }

  .sidebar-footer {
    display: none;
  }

  .header-container {
    height: 56px;
    flex-basis: 56px;
    gap: 8px;
    padding: 0 10px;
  }

  .left-menu {
    flex: 1;
  }

  .mobile-menu-btn {
    display: inline-flex;
    flex: 0 0 40px;
    width: 40px;
    margin-right: 4px;
    color: var(--text-primary);
  }

  .mobile-menu-btn:hover,
  .mobile-menu-btn:focus-visible {
    color: var(--primary-color);
    background: var(--el-color-primary-light-9);
  }

  :deep(.el-breadcrumb) {
    min-width: 0;
    overflow: hidden;
    white-space: nowrap;
  }

  :deep(.el-breadcrumb__item:not(:last-child)) {
    display: none;
  }

  :deep(.el-breadcrumb__item:last-child .el-breadcrumb__inner) {
    display: block;
    max-width: 150px;
    overflow: hidden;
    color: var(--text-primary);
    font-weight: 600;
    text-overflow: ellipsis;
  }

  .github-link {
    display: none;
  }

  .user-dropdown {
    width: 40px;
    height: 40px;
    justify-content: center;
    padding: 0;
  }

  .user-name,
  .dropdown-arrow {
    display: none;
  }

  .content-container {
    padding: 12px;
    scroll-behavior: auto;
  }

  .remote-context-state {
    margin-top: 12px;
  }

  .remote-runtime-summary {
    grid-template-columns: 1fr;
  }

  .remote-runtime-summary > div,
  .remote-runtime-summary > div:nth-child(odd) {
    padding-right: 0;
  }

  :deep(.el-dialog) {
    width: calc(100vw - 24px) !important;
    max-width: 520px;
  }
}

@media (max-width: 600px) {
  .left-menu :deep(.el-breadcrumb) {
    display: none;
  }

  .remote-state-actions {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
