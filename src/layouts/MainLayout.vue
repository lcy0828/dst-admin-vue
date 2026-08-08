<template>
  <TooltipProvider :delay-duration="300">
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
          <UiButton
            class="mobile-menu-btn"
            variant="ghost"
            size="icon"
            aria-label="打开导航菜单"
            aria-controls="primary-navigation"
            :aria-expanded="mobileSidebarOpen"
            @click="openMobileSidebar"
          >
            <MenuIcon />
          </UiButton>
          <Breadcrumb class="header-breadcrumb">
            <BreadcrumbList class="breadcrumb-trail">
              <BreadcrumbItem>
                <BreadcrumbLink as-child>
                  <router-link to="/dashboard">首页</router-link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <template v-for="(item, index) in breadcrumbs" :key="`${item}-${index}`">
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{{ item }}</BreadcrumbPage>
                </BreadcrumbItem>
              </template>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
        <div class="right-menu">
          <RuntimeTargetSwitch @change="handleRuntimeTargetChange" />
          <Tooltip>
            <TooltipTrigger as-child>
              <UiButton class="github-link" variant="ghost" size="icon" as-child>
                <a
                  href="https://github.com/lcy0828/dst-admin-go"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="打开 GitHub 项目"
                >
                  <GitFork />
                </a>
              </UiButton>
            </TooltipTrigger>
            <TooltipContent>查看 GitHub 项目</TooltipContent>
          </Tooltip>
          <DropdownMenu>
            <DropdownMenuTrigger as-child>
              <UiButton
                class="user-dropdown"
                variant="ghost"
                :aria-label="`打开用户菜单，当前用户 ${currentUser.username || '管理员'}`"
              >
                <Avatar size="sm">
                  <AvatarFallback>{{ userInitial }}</AvatarFallback>
                </Avatar>
                <span class="user-name">{{ currentUser.username || '管理员' }}</span>
                <ChevronDown data-icon="inline-end" />
              </UiButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" class="w-52">
              <DropdownMenuGroup>
                <DropdownMenuLabel>
                  <span class="account-menu-label">当前账户</span>
                  <span class="account-menu-name">{{ currentUser.username || '管理员' }}</span>
                </DropdownMenuLabel>
                <DropdownMenuItem @select="handleUserCommand('profile')">
                  <UserRound />
                  个人资料
                </DropdownMenuItem>
                <DropdownMenuItem @select="handleUserCommand('password')">
                  <KeyRound />
                  修改密码
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem variant="destructive" @select="handleUserCommand('logout')">
                  <LogOut />
                  退出登录
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
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
            <Badge :variant="runtimeTarget.online ? 'secondary' : 'destructive'">
              {{ runtimeTarget.online ? 'Agent 在线' : 'Agent 离线' }}
            </Badge>
          </div>
          <Alert>
            <TriangleAlert />
            <AlertTitle>远程领域操作尚未启用</AlertTitle>
            <AlertDescription>
              当前节点的路径配置保持独立。房间、世界、模组和备份操作已锁定，防止请求误落到本机。
            </AlertDescription>
          </Alert>
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
            <UiButton @click="$router.push('/agents/list')">
              <Settings data-icon="inline-start" />
              远程运行时配置
            </UiButton>
            <UiButton variant="outline" @click="switchToLocalRuntime">切换到本机</UiButton>
          </div>
        </section>
        <router-view v-else></router-view>
      </main>
    </div>

      <UiDialog v-model:open="profileVisible">
        <DialogContent class="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>个人资料</DialogTitle>
            <DialogDescription>当前登录账户与权限信息</DialogDescription>
          </DialogHeader>
          <div class="profile-summary">
            <Avatar size="lg">
              <AvatarFallback>{{ userInitial }}</AvatarFallback>
            </Avatar>
            <div class="profile-identity">
              <strong>{{ currentUser.username || '管理员' }}</strong>
              <span>系统管理员</span>
            </div>
          </div>
          <Separator />
          <dl class="profile-details">
            <div>
              <dt>用户名</dt>
              <dd>{{ currentUser.username || '管理员' }}</dd>
            </div>
            <div>
              <dt>账户类型</dt>
              <dd>系统管理员</dd>
            </div>
          </dl>
        </DialogContent>
      </UiDialog>

      <UiDialog v-model:open="passwordVisible" @update:open="handlePasswordDialogChange">
        <DialogContent class="sm:max-w-md">
          <form class="password-form" novalidate @submit.prevent="changePassword">
            <DialogHeader>
              <DialogTitle>修改密码</DialogTitle>
              <DialogDescription>新密码至少 6 位，修改后需要重新登录。</DialogDescription>
            </DialogHeader>
            <FieldGroup>
              <Field :data-invalid="Boolean(passwordErrors.currentPassword)">
                <FieldLabel for="current-password">当前密码</FieldLabel>
                <UiInput
                  id="current-password"
                  v-model="passwordForm.currentPassword"
                  :type="passwordsVisible ? 'text' : 'password'"
                  autocomplete="current-password"
                  :aria-invalid="Boolean(passwordErrors.currentPassword)"
                  @blur="validatePasswordField('currentPassword')"
                />
                <FieldError v-if="passwordErrors.currentPassword">
                  {{ passwordErrors.currentPassword }}
                </FieldError>
              </Field>
              <Field :data-invalid="Boolean(passwordErrors.newPassword)">
                <FieldLabel for="new-password">新密码</FieldLabel>
                <UiInput
                  id="new-password"
                  v-model="passwordForm.newPassword"
                  :type="passwordsVisible ? 'text' : 'password'"
                  autocomplete="new-password"
                  :aria-invalid="Boolean(passwordErrors.newPassword)"
                  @blur="validatePasswordField('newPassword')"
                />
                <FieldError v-if="passwordErrors.newPassword">
                  {{ passwordErrors.newPassword }}
                </FieldError>
              </Field>
              <Field :data-invalid="Boolean(passwordErrors.confirmPassword)">
                <FieldLabel for="confirm-password">确认密码</FieldLabel>
                <UiInput
                  id="confirm-password"
                  v-model="passwordForm.confirmPassword"
                  :type="passwordsVisible ? 'text' : 'password'"
                  autocomplete="new-password"
                  :aria-invalid="Boolean(passwordErrors.confirmPassword)"
                  @blur="validatePasswordField('confirmPassword')"
                />
                <FieldError v-if="passwordErrors.confirmPassword">
                  {{ passwordErrors.confirmPassword }}
                </FieldError>
              </Field>
            </FieldGroup>
            <UiButton class="password-visibility" type="button" variant="ghost" @click="passwordsVisible = !passwordsVisible">
              <EyeOff v-if="passwordsVisible" data-icon="inline-start" />
              <Eye v-else data-icon="inline-start" />
              {{ passwordsVisible ? '隐藏密码' : '显示密码' }}
            </UiButton>
            <DialogFooter>
              <DialogClose as-child>
                <UiButton type="button" variant="outline">取消</UiButton>
              </DialogClose>
              <UiButton type="submit" :disabled="passwordSaving">
                <Spinner v-if="passwordSaving" data-icon="inline-start" />
                {{ passwordSaving ? '正在修改' : '确认修改' }}
              </UiButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </UiDialog>
    </div>
  </TooltipProvider>
</template>

<script>
import { authAPI } from '@/api/v2'
import RuntimeTargetSwitch from '@/components/RuntimeTargetSwitch.vue'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from '@/components/ui/breadcrumb'
import { Button as UiButton } from '@/components/ui/button'
import {
  Dialog as UiDialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input as UiInput } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Spinner } from '@/components/ui/spinner'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  ChevronDown,
  Eye,
  EyeOff,
  GitFork,
  KeyRound,
  LogOut,
  Menu as MenuIcon,
  Settings,
  TriangleAlert,
  UserRound
} from '@lucide/vue'
import {
  getActiveRuntimeTarget,
  LOCAL_RUNTIME_TARGET_ID,
  RUNTIME_TARGET_CHANGED_EVENT,
  setActiveRuntimeTarget
} from '@/utils/runtimeTarget'
import { getSystemPreferences } from '@/utils/systemPreferences'

export default {
  name: 'MainLayout',
  components: {
    Alert,
    AlertDescription,
    AlertTitle,
    Avatar,
    AvatarFallback,
    Badge,
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
    UiButton,
    ChevronDown,
    UiDialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    Eye,
    EyeOff,
    Field,
    FieldError,
    FieldGroup,
    FieldLabel,
    GitFork,
    UiInput,
    KeyRound,
    LogOut,
    MenuIcon,
    RuntimeTargetSwitch,
    Separator,
    Settings,
    Spinner,
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
    TriangleAlert,
    UserRound
  },
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
      passwordsVisible: false,
      passwordForm: {
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      },
      passwordErrors: {
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }
    }
  },
  computed: {
    activeMenu() {
      return this.$route.path
    },
    remoteContextBlocked() {
      return this.runtimeTarget.id !== LOCAL_RUNTIME_TARGET_ID && !this.$route.path.startsWith('/agents')
    },
    userInitial() {
      return (this.currentUser.username || '管').trim().slice(0, 1).toUpperCase()
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
    handlePasswordDialogChange(open) {
      if (!open) this.resetPasswordForm()
    },
    resetPasswordForm() {
      this.passwordForm = {
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }
      this.passwordErrors = {
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }
      this.passwordsVisible = false
    },
    validatePasswordField(field) {
      const value = this.passwordForm[field]
      let message = ''
      if (!value) {
        message = field === 'currentPassword' ? '请输入当前密码' : '请输入新密码'
        if (field === 'confirmPassword') message = '请再次输入新密码'
      } else if (field === 'newPassword' && value.length < 6) {
        message = '密码长度不少于 6 位'
      } else if (field === 'confirmPassword' && value !== this.passwordForm.newPassword) {
        message = '两次输入的新密码不一致'
      }
      this.passwordErrors[field] = message
      if (field === 'newPassword' && this.passwordForm.confirmPassword) {
        this.validatePasswordField('confirmPassword')
      }
      return !message
    },
    validatePasswordForm() {
      return ['currentPassword', 'newPassword', 'confirmPassword']
        .map(field => this.validatePasswordField(field))
        .every(Boolean)
    },
    async changePassword() {
      if (!this.validatePasswordForm()) return

      this.passwordSaving = true
      try {
        await authAPI.changePassword(this.passwordForm.currentPassword, this.passwordForm.newPassword)
        this.passwordVisible = false
        this.resetPasswordForm()
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
  max-width: 190px;
}

.github-link {
  flex: 0 0 auto;
}

.user-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
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

.account-menu-label,
.account-menu-name {
  display: block;
}

.account-menu-label {
  color: var(--muted-foreground);
  font-size: 11px;
  font-weight: 400;
}

.account-menu-name {
  max-width: 180px;
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.profile-summary {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 4px 0;
}

.profile-identity {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 2px;
}

.profile-identity strong {
  overflow: hidden;
  text-overflow: ellipsis;
}

.profile-identity span,
.profile-details dt {
  color: var(--muted-foreground);
  font-size: 12px;
}

.profile-details {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.profile-details > div {
  display: grid;
  grid-template-columns: 88px minmax(0, 1fr);
  gap: 12px;
}

.profile-details dd {
  margin: 0;
  overflow-wrap: anywhere;
}

.password-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.password-visibility {
  align-self: flex-start;
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
  color: var(--sidebar-foreground);
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
  }

  .header-breadcrumb {
    min-width: 0;
    overflow: hidden;
  }

  .breadcrumb-trail :deep([data-slot='breadcrumb-item']:not(:last-child)),
  .breadcrumb-trail :deep([data-slot='breadcrumb-separator']) {
    display: none;
  }

  .breadcrumb-trail :deep([data-slot='breadcrumb-item']:last-child) {
    display: block;
    max-width: 150px;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .github-link {
    display: none;
  }

  .user-dropdown {
    width: 36px;
    height: 36px;
    justify-content: center;
    padding: 0;
  }

  .user-name,
  .user-dropdown > [data-icon='inline-end'] {
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
  .header-breadcrumb {
    display: none;
  }

  .remote-state-actions {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
