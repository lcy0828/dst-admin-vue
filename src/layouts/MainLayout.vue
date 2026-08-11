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
      <div class="brand-container">
        <router-link class="brand-link" to="/dashboard" aria-label="返回仪表盘">
          <span class="brand-mark" aria-hidden="true">
            <Gamepad2 />
          </span>
          <span class="brand-copy">
            <strong>{{ systemName }}</strong>
            <small>DST SERVER CONSOLE</small>
          </span>
        </router-link>
        <UiButton
          class="mobile-close-btn"
          variant="ghost"
          size="icon-sm"
          aria-label="关闭导航菜单"
          @click="closeMobileSidebar"
        >
          <X />
        </UiButton>
      </div>
      <nav class="sidebar-navigation" aria-label="主导航">
        <section v-for="section in navigationSections" :key="section.label" class="nav-section">
          <p class="nav-section-label">{{ section.label }}</p>
          <ul class="nav-list">
            <li v-for="item in section.items" :key="item.key" class="nav-item">
              <Tooltip v-if="!item.children">
                <TooltipTrigger as-child>
                  <router-link
                    :to="item.to"
                    class="nav-link"
                    :class="{ active: isNavigationActive(item.to) }"
                    :aria-current="isNavigationActive(item.to) ? 'page' : undefined"
                    @click="handleMenuSelect"
                  >
                    <component :is="item.icon" class="nav-icon" />
                    <span class="nav-label">{{ item.label }}</span>
                  </router-link>
                </TooltipTrigger>
                <TooltipContent v-if="isNavigationCollapsed" side="right">{{ item.label }}</TooltipContent>
              </Tooltip>

              <Collapsible
                v-else
                :open="openNavGroups[item.key]"
                @update:open="setNavGroupOpen(item.key, $event)"
              >
                <Tooltip>
                  <TooltipTrigger as-child>
                    <CollapsibleTrigger as-child>
                      <button
                        class="nav-link nav-group-trigger"
                        :class="{ active: isNavigationGroupActive(item) }"
                        type="button"
                        @click="handleCollapsedGroupNavigation(item)"
                      >
                        <component :is="item.icon" class="nav-icon" />
                        <span class="nav-label">{{ item.label }}</span>
                        <ChevronRight class="nav-chevron" />
                      </button>
                    </CollapsibleTrigger>
                  </TooltipTrigger>
                  <TooltipContent v-if="isNavigationCollapsed" side="right">{{ item.label }}</TooltipContent>
                </Tooltip>
                <CollapsibleContent class="nav-submenu-wrap">
                  <ul class="nav-submenu">
                    <li v-for="child in item.children" :key="child.to">
                      <router-link
                        :to="child.to"
                        class="nav-submenu-link"
                        :class="{ active: isNavigationActive(child.to) }"
                        :aria-current="isNavigationActive(child.to) ? 'page' : undefined"
                        @click="handleMenuSelect"
                      >
                        {{ child.label }}
                      </router-link>
                    </li>
                  </ul>
                </CollapsibleContent>
              </Collapsible>
            </li>
          </ul>
        </section>
      </nav>

      <div class="sidebar-footer">
        <div class="runtime-summary" :title="runtimeTarget.name">
          <span class="runtime-dot" :class="{ online: runtimeTarget.online !== false }" aria-hidden="true"></span>
          <span class="runtime-copy">
            <small>{{ runtimeTarget.id === localRuntimeTargetId ? '本机运行时' : '远程运行时' }}</small>
            <strong>{{ runtimeTarget.name || '本机' }}</strong>
          </span>
        </div>
        <Tooltip>
          <TooltipTrigger as-child>
            <UiButton
              class="collapse-btn"
              variant="ghost"
              size="icon-sm"
              :aria-label="isCollapse ? '展开导航菜单' : '折叠导航菜单'"
              @click="toggleCollapse"
            >
              <PanelLeftOpen v-if="isCollapse" />
              <PanelLeftClose v-else />
            </UiButton>
          </TooltipTrigger>
          <TooltipContent side="right">{{ isCollapse ? '展开导航菜单' : '折叠菜单' }}</TooltipContent>
        </Tooltip>
      </div>
    </aside>

    <!-- 主内容区 -->
    <div class="main-container">
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
          <ThemeSwitch />
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
import ThemeSwitch from '@/components/ThemeSwitch.vue'
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
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
import { toast } from 'vue-sonner'
import {
  ArchiveRestore,
  Blocks,
  CalendarClock,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  FileSearch,
  Gamepad2,
  GitFork,
  Globe2,
  House,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu as MenuIcon,
  PanelLeftClose,
  PanelLeftOpen,
  RadioTower,
  ServerCog,
  Settings,
  Settings2,
  TriangleAlert,
  UserRound,
  UsersRound,
  X
} from '@lucide/vue'
import {
  getActiveRuntimeTarget,
  LOCAL_RUNTIME_TARGET_ID,
  RUNTIME_TARGET_CHANGED_EVENT,
  setActiveRuntimeTarget
} from '@/utils/runtimeTarget'
import { getSystemPreferences } from '@/utils/systemPreferences'

const NAVIGATION_SECTIONS = [
  {
    label: '总览',
    items: [
      { key: 'dashboard', label: '仪表盘', to: '/dashboard', icon: LayoutDashboard }
    ]
  },
  {
    label: '服务与世界',
    items: [
      {
        key: 'servers',
        label: '服务器管理',
        icon: ServerCog,
        children: [
          { label: '服务器工作台', to: '/servers/workspace' },
          { label: '服务器列表', to: '/servers/list' },
          { label: '命令设置', to: '/servers/commands' }
        ]
      },
      {
        key: 'rooms',
        label: '房间管理',
        icon: House,
        children: [
          { label: '房间列表', to: '/rooms/list' },
          { label: '房间设置', to: '/rooms/settings' },
          { label: '特殊名单', to: '/rooms/special-lists' },
          { label: '服务器令牌', to: '/rooms/token' }
        ]
      },
      {
        key: 'worlds',
        label: '世界管理',
        icon: Globe2,
        children: [
          { label: '世界列表', to: '/worlds/list' },
          { label: '世界设置', to: '/worlds/settings' },
          { label: '世界状态', to: '/worlds/state' }
        ]
      }
    ]
  },
  {
    label: '内容与玩家',
    items: [
      {
        key: 'mods',
        label: '模组管理',
        icon: Blocks,
        children: [
          { label: '节点模组库', to: '/mods/library' },
          { label: '房间模组', to: '/mods/list' },
          { label: '模组搜索', to: '/mods/search' }
        ]
      },
      {
        key: 'players',
        label: '玩家管理',
        icon: UsersRound,
        children: [
          { label: '玩家列表', to: '/players/list' },
          { label: '封禁管理', to: '/players/bans' }
        ]
      }
    ]
  },
  {
    label: '运维工具',
    items: [
      {
        key: 'logs',
        label: '日志管理器',
        icon: FileSearch,
        children: [
          { label: '日志查询', to: '/logs/query' },
          { label: '规则管理', to: '/logs/rules' },
          { label: '日志解析器', to: '/logs/parser' }
        ]
      },
      { key: 'announcements', label: '公告管理', to: '/announcements', icon: Megaphone },
      { key: 'backups', label: '备份管理', to: '/backups', icon: ArchiveRestore },
      {
        key: 'scheduled',
        label: '定时任务',
        icon: CalendarClock,
        children: [
          { label: '任务列表', to: '/cron/tasks' },
          { label: '创建任务', to: '/cron/add' },
          { label: '任务组', to: '/cron/groups' },
          { label: '执行日志', to: '/cron/logs' },
          { label: '运行统计', to: '/cron/charts' },
          { label: '导入导出', to: '/cron/import-export' }
        ]
      }
    ]
  },
  {
    label: '连接与设置',
    items: [
      {
        key: 'agents',
        label: 'Agent 管理',
        icon: RadioTower,
        children: [
          { label: 'Agent 列表', to: '/agents/list' },
          { label: '命令管理', to: '/agents/command' },
          { label: '安全设置', to: '/agents/security' }
        ]
      },
      { key: 'system', label: '系统设置', to: '/system', icon: Settings2 }
    ]
  }
]

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
    ChevronRight,
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
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
    Gamepad2,
    UiInput,
    KeyRound,
    LogOut,
    MenuIcon,
    PanelLeftClose,
    PanelLeftOpen,
    RuntimeTargetSwitch,
    ThemeSwitch,
    Separator,
    Settings,
    Spinner,
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
    TriangleAlert,
    UserRound,
    X
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
      localRuntimeTargetId: LOCAL_RUNTIME_TARGET_ID,
      openNavGroups: {
        servers: true,
        rooms: false,
        worlds: false,
        mods: false,
        players: false,
        logs: false,
        scheduled: false,
        agents: false
      },
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
    navigationSections() {
      return NAVIGATION_SECTIONS
    },
    activeMenu() {
      return this.$route.path
    },
    isNavigationCollapsed() {
      return this.isCollapse && !this.isCompactViewport
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
      this.expandActiveNavigationGroup()
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
    this.expandActiveNavigationGroup()
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
      const compact = window.innerWidth <= 900
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
    isNavigationActive(path) {
      return this.activeMenu === path || this.activeMenu.startsWith(`${path}/`)
    },
    isNavigationGroupActive(item) {
      return item.children.some(child => this.isNavigationActive(child.to))
    },
    expandActiveNavigationGroup() {
      for (const section of NAVIGATION_SECTIONS) {
        for (const item of section.items) {
          if (item.children && this.isNavigationGroupActive(item)) {
            this.openNavGroups[item.key] = true
          }
        }
      }
    },
    setNavGroupOpen(key, open) {
      this.openNavGroups[key] = open
    },
    handleCollapsedGroupNavigation(item) {
      if (this.isNavigationCollapsed && item.children?.length) {
        this.$router.push(item.children[0].to)
      }
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
        toast.success('密码已修改，请重新登录')
        await this.$router.push('/login')
      } catch (error) {
        toast.error(error.message || '密码修改失败')
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
  position: relative;
  display: flex;
  width: 100%;
  min-width: 0;
  height: 100vh;
  height: 100svh;
  overflow: hidden;
  background: var(--background);
}

.skip-link {
  position: fixed;
  top: 8px;
  left: 50%;
  z-index: 3000;
  padding: 8px 14px;
  color: var(--primary-foreground);
  background: var(--primary);
  border-radius: var(--radius);
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
  width: 100%;
  height: 100%;
  padding: 0;
  border: 0;
  background: color-mix(in srgb, var(--foreground) 46%, transparent);
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
  z-index: 20;
  display: flex;
  flex: 0 0 256px;
  width: 256px;
  min-width: 0;
  height: 100%;
  flex-direction: column;
  overflow: hidden;
  color: var(--sidebar-foreground);
  background: var(--sidebar);
  border-right: 1px solid var(--sidebar-border);
  transition: width 0.2s ease, flex-basis 0.2s ease, transform 0.2s ease;
}

.sidebar.collapsed {
  flex-basis: 64px;
  width: 64px;
}

.brand-container {
  position: relative;
  display: flex;
  flex: 0 0 68px;
  align-items: center;
  padding: 0 14px;
  border-bottom: 1px solid var(--sidebar-border);
}

.brand-link {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 10px;
  color: inherit;
  text-decoration: none;
}

.brand-mark {
  display: inline-flex;
  flex: 0 0 38px;
  width: 38px;
  height: 38px;
  align-items: center;
  justify-content: center;
  color: var(--sidebar-primary-foreground);
  background: var(--sidebar-primary);
  border-radius: 8px;
}

.brand-mark svg {
  width: 19px;
  height: 19px;
}

.brand-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 2px;
}

.brand-copy strong {
  overflow: hidden;
  color: var(--sidebar-foreground);
  font-size: 15px;
  font-weight: 700;
  line-height: 20px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.brand-copy small {
  color: color-mix(in srgb, var(--sidebar-foreground) 58%, transparent);
  font-size: 9px;
  font-weight: 600;
  line-height: 12px;
  letter-spacing: 0;
  white-space: nowrap;
}

.mobile-close-btn,
.mobile-menu-btn {
  display: none;
}

.sidebar-navigation {
  flex: 1 1 auto;
  min-height: 0;
  padding: 14px 10px 18px;
  overflow-x: hidden;
  overflow-y: auto;
  scrollbar-width: thin;
}

.nav-section + .nav-section {
  margin-top: 16px;
}

.nav-section-label {
  margin: 0 0 6px;
  padding: 0 10px;
  overflow: hidden;
  color: color-mix(in srgb, var(--sidebar-foreground) 55%, transparent);
  font-size: 11px;
  font-weight: 600;
  line-height: 22px;
  white-space: nowrap;
}

.nav-list,
.nav-submenu {
  padding: 0;
  margin: 0;
  list-style: none;
}

.nav-item + .nav-item {
  margin-top: 4px;
}

.nav-link {
  position: relative;
  display: flex;
  width: 100%;
  height: 40px;
  align-items: center;
  gap: 10px;
  padding: 0 10px;
  color: color-mix(in srgb, var(--sidebar-foreground) 82%, transparent);
  background: transparent;
  border: 0;
  border-radius: 8px;
  outline: none;
  font: inherit;
  text-align: left;
  text-decoration: none;
  cursor: pointer;
  transition: color 0.15s ease, background-color 0.15s ease;
}

.nav-link:hover,
.nav-link:focus-visible {
  color: var(--sidebar-accent-foreground);
  background: var(--sidebar-accent);
}

.nav-link:focus-visible {
  box-shadow: 0 0 0 2px var(--sidebar-ring);
}

.nav-link.active {
  color: var(--sidebar-primary);
  background: color-mix(in srgb, var(--sidebar-primary) 14%, var(--sidebar-accent));
  font-weight: 600;
}

.nav-link.active::before {
  display: none;
}

.nav-icon {
  flex: 0 0 18px;
  width: 18px;
  height: 18px;
  color: currentColor;
}

.nav-label {
  min-width: 0;
  overflow: hidden;
  line-height: 20px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.nav-chevron {
  width: 14px;
  height: 14px;
  margin-left: auto;
  transition: transform 0.18s ease;
}

[data-slot='collapsible'][data-state='open'] .nav-chevron {
  transform: rotate(90deg);
}

.nav-submenu-wrap {
  overflow: hidden;
}

.nav-submenu {
  margin: 5px 0 6px 20px;
  padding-left: 16px;
  border-left: 1px solid var(--sidebar-border);
}

.nav-submenu-link {
  position: relative;
  display: flex;
  min-width: 0;
  min-height: 34px;
  align-items: center;
  padding: 0 9px;
  overflow: hidden;
  color: color-mix(in srgb, var(--sidebar-foreground) 67%, transparent);
  border-radius: 7px;
  font-size: 13px;
  line-height: 18px;
  text-decoration: none;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: color 0.15s ease, background-color 0.15s ease;
}

.nav-submenu-link:hover,
.nav-submenu-link:focus-visible,
.nav-submenu-link.active {
  color: var(--sidebar-accent-foreground);
  background: var(--sidebar-accent);
}

.nav-submenu-link.active {
  color: var(--sidebar-primary);
  background: color-mix(in srgb, var(--sidebar-primary) 12%, transparent);
  font-weight: 600;
}

.sidebar-footer {
  display: flex;
  flex: 0 0 68px;
  align-items: center;
  gap: 8px;
  padding: 12px 12px 12px 16px;
  border-top: 1px solid var(--sidebar-border);
}

.runtime-summary {
  display: flex;
  min-width: 0;
  flex: 1;
  align-items: center;
  gap: 9px;
}

.runtime-dot {
  flex: 0 0 8px;
  width: 8px;
  height: 8px;
  background: var(--muted-foreground);
  border: 2px solid var(--sidebar);
  border-radius: 50%;
  box-shadow: 0 0 0 1px var(--sidebar-border);
}

.runtime-dot.online {
  background: var(--chart-2);
}

.runtime-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 1px;
}

.runtime-copy small {
  color: color-mix(in srgb, var(--sidebar-foreground) 54%, transparent);
  font-size: 10px;
  line-height: 14px;
}

.runtime-copy strong {
  overflow: hidden;
  color: var(--sidebar-foreground);
  font-size: 12px;
  font-weight: 550;
  line-height: 16px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.collapse-btn {
  flex: 0 0 auto;
  color: var(--sidebar-foreground);
}

.sidebar.collapsed .brand-container {
  padding: 0 14px;
}

.sidebar.collapsed .brand-copy,
.sidebar.collapsed .nav-section-label,
.sidebar.collapsed .nav-label,
.sidebar.collapsed .nav-chevron,
.sidebar.collapsed .nav-submenu-wrap,
.sidebar.collapsed .runtime-copy {
  display: none;
}

.sidebar.collapsed .sidebar-navigation {
  padding-right: 8px;
  padding-left: 8px;
}

.sidebar.collapsed .nav-section + .nav-section {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--sidebar-border);
}

.sidebar.collapsed .nav-link {
  width: 40px;
  height: 40px;
  justify-content: center;
  padding: 0;
}

.sidebar.collapsed .nav-link.active::before {
  top: 10px;
}

.sidebar.collapsed .sidebar-footer {
  flex-direction: column;
  justify-content: center;
  gap: 4px;
  height: 80px;
  padding: 8px;
}

.sidebar.collapsed .runtime-summary {
  flex: 0 0 auto;
}

.main-container {
  display: flex;
  flex: 1 1 auto;
  min-width: 0;
  flex-direction: column;
  overflow: hidden;
}

.header-container {
  position: relative;
  z-index: 10;
  display: flex;
  flex: 0 0 64px;
  height: 64px;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 0 28px;
  background: var(--surface-color);
  border-bottom: 1px solid var(--border-color);
}

.left-menu,
.right-menu {
  display: flex;
  min-width: 0;
  align-items: center;
}

.left-menu {
  flex: 1;
  overflow: hidden;
}

.right-menu {
  flex: 0 0 auto;
  gap: 10px;
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
  flex: 1 1 auto;
  min-width: 0;
  overflow: auto;
  padding: 26px 28px 32px;
  background: var(--bg-color);
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

@media (max-width: 900px) {
  .sidebar {
    position: fixed;
    top: 0;
    bottom: 0;
    left: 0;
    z-index: 1010;
    width: 280px;
    max-width: calc(100vw - 44px);
    flex-basis: 280px;
    border-right-color: var(--sidebar-border);
    box-shadow: var(--shadow-overlay);
    transform: translateX(-100%);
  }

  .sidebar.mobile-open {
    transform: translateX(0);
  }

  .brand-container {
    padding-right: 52px;
  }

  .mobile-close-btn {
    position: absolute;
    top: 16px;
    right: 12px;
    display: inline-flex;
    color: var(--sidebar-foreground);
  }

  .sidebar-footer {
    height: 62px;
  }

  .collapse-btn {
    display: none;
  }

  .header-container {
    flex-basis: 56px;
    height: 56px;
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
