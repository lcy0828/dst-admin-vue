import { createRouter, createWebHistory } from 'vue-router'
import MainLayout from '../layouts/MainLayout.vue'
import MainLayoutV2 from '../layouts/MainLayoutV2.vue'

function createV2Route(path, component, name, title, parentTitle) {
  return {
    path,
    component,
    name,
    meta: { title, parentTitle }
  }
}

const v2FeatureRoutes = [
  createV2Route('servers/workspace', () => import('@/views/servers/ServerWorkspace.vue'), 'V2ServerWorkspace', '服务器工作台', '服务器管理'),
  createV2Route('servers/list', () => import('@/views/servers/ServerList.vue'), 'V2ServerList', '服务器列表', '服务器管理'),
  createV2Route('servers/commands', () => import('@/views/servers/CommandManager.vue'), 'V2CommandManager', '命令设置', '服务器管理'),
  createV2Route('logs/query', () => import('@/views/LogQueryView.vue'), 'V2LogQuery', '日志查询', '日志管理器'),
  createV2Route('logs/rules', () => import('@/views/RuleManagementView.vue'), 'V2RuleManagement', '规则管理', '日志管理器'),
  createV2Route('logs/parser', () => import('@/views/logs/LogParser.vue'), 'V2LogParser', '日志解析器', '日志管理器'),
  createV2Route('rooms/list', () => import('@/views/rooms/RoomList.vue'), 'V2RoomList', '房间列表', '房间管理'),
  createV2Route('rooms/settings', () => import('@/views/rooms/RoomSettings.vue'), 'V2RoomSettings', '房间设置', '房间管理'),
  createV2Route('rooms/special-lists', () => import('@/views/rooms/SpecialLists.vue'), 'V2SpecialLists', '特殊名单', '房间管理'),
  createV2Route('rooms/token', () => import('@/views/rooms/ServerToken.vue'), 'V2ServerToken', '服务器令牌', '房间管理'),
  createV2Route('agents/list', () => import('@/views/agents/AgentList.vue'), 'V2AgentList', 'Agent 列表', 'Agent 管理'),
  createV2Route('agents/command', () => import('@/views/agents/AgentCommand.vue'), 'V2AgentCommand', '命令管理', 'Agent 管理'),
  createV2Route('agents/security', () => import('@/views/agents/AgentSecurity.vue'), 'V2AgentSecurity', '安全配置', 'Agent 管理'),
  createV2Route('players/list', () => import('@/views/players/PlayerList.vue'), 'V2PlayerList', '玩家列表', '玩家管理'),
  createV2Route('players/bans', () => import('@/views/players/BanList.vue'), 'V2BanList', '封禁管理', '玩家管理'),
  createV2Route('cron/tasks', () => import('@/views/cron/TaskList.vue'), 'V2TaskList', '任务列表', '定时任务'),
  createV2Route('cron/add', () => import('@/views/cron/TaskForm.vue'), 'V2AddTask', '添加任务', '定时任务'),
  createV2Route('cron/edit/:id', () => import('@/views/cron/TaskForm.vue'), 'V2EditTask', '编辑任务', '定时任务'),
  createV2Route('cron/groups', () => import('@/views/cron/TaskGroups.vue'), 'V2TaskGroups', '任务组管理', '定时任务'),
  createV2Route('cron/group/add', () => import('@/views/cron/TaskGroupForm.vue'), 'V2AddTaskGroup', '添加任务组', '定时任务'),
  createV2Route('cron/group/edit/:id', () => import('@/views/cron/TaskGroupForm.vue'), 'V2EditTaskGroup', '编辑任务组', '定时任务'),
  createV2Route('cron/group/:id', () => import('@/views/cron/TaskGroupDetail.vue'), 'V2TaskGroupDetail', '任务组详情', '定时任务'),
  createV2Route('cron/logs', () => import('@/views/cron/TaskLogs.vue'), 'V2TaskLogs', '执行日志', '定时任务'),
  createV2Route('cron/logs/:id', () => import('@/views/cron/TaskLogDetail.vue'), 'V2TaskLogDetail', '日志详情', '定时任务'),
  createV2Route('cron/execution/:id', () => import('@/views/cron/TaskExecutionResult.vue'), 'V2TaskExecutionResult', '任务执行结果', '定时任务'),
  createV2Route('cron/charts', () => import('@/views/cron/TaskCharts.vue'), 'V2TaskCharts', '统计图表', '定时任务'),
  createV2Route('cron/import-export', () => import('@/views/cron/TaskImportExport.vue'), 'V2TaskImportExport', '导入导出', '定时任务'),
  createV2Route('mods/list', () => import('@/views/mods/ModList.vue'), 'V2ModList', '已下载模组', '模组管理'),
  createV2Route('mods/search', () => import('@/views/mods/ModSearch.vue'), 'V2ModSearch', '搜索模组', '模组管理'),
  createV2Route('worlds/list', () => import('@/views/worlds/WorldList.vue'), 'V2WorldList', '世界列表', '世界管理'),
  createV2Route('worlds/settings', () => import('@/views/worlds/WorldSettings.vue'), 'V2WorldSettings', '世界设置', '世界管理'),
  createV2Route('worlds/details', () => import('@/views/worlds/WorldDetails.vue'), 'V2WorldDetails', '世界详情', '世界管理'),
  createV2Route('worlds/state', () => import('@/views/worlds/WorldState.vue'), 'V2WorldState', '世界状态', '世界管理'),
  createV2Route('system/settings', () => import('@/views/SystemSettings.vue'), 'V2SystemSettings', '系统设置', '连接与设置'),
  createV2Route('backups', () => import('@/views/Backups.vue'), 'V2Backups', '备份管理', '运维工具'),
  createV2Route('announcements', () => import('@/views/Announcements.vue'), 'V2Announcements', '公告管理', '运维工具')
]

// 公共路由
export const constantRoutes = [
  {
    path: '/login',
    component: () => import('@/views/Login.vue'),
    hidden: true
  },
  {
    path: '/preview-v2',
    component: MainLayoutV2,
    children: [
      {
        path: '',
        component: () => import('@/views/v2/DashboardV2.vue'),
        name: 'DashboardV2',
        meta: { title: '服务总览' }
      },
      { path: 'servers', redirect: '/preview-v2/servers/workspace' },
      { path: 'logs', redirect: '/preview-v2/logs/query' },
      { path: 'rooms', redirect: '/preview-v2/rooms/list' },
      { path: 'agents', redirect: '/preview-v2/agents/list' },
      { path: 'players', redirect: '/preview-v2/players/list' },
      { path: 'cron', redirect: '/preview-v2/cron/tasks' },
      { path: 'mods', redirect: '/preview-v2/mods/list' },
      { path: 'worlds', redirect: '/preview-v2/worlds/list' },
      { path: 'system', redirect: '/preview-v2/system/settings' },
      ...v2FeatureRoutes
    ]
  },
  {
    path: '/',
    component: MainLayout,
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        component: () => import('@/views/Dashboard.vue'),
        name: 'Dashboard',
        meta: { title: '仪表盘', icon: 'dashboard', affix: true }
      },
      {
        path: 'system',
        redirect: '/system/settings'
      },
      {
        path: 'system/settings',
        component: () => import('@/views/SystemSettings.vue'),
        name: 'SystemSettings',
        meta: { title: '系统设置', icon: 'settings' }
      },
      {
        path: 'backups',
        component: () => import('@/views/Backups.vue'),
        name: 'Backups',
        meta: { title: '备份管理', icon: 'backup' }
      },
      {
        path: 'announcements',
        component: () => import('@/views/Announcements.vue'),
        name: 'Announcements',
        meta: { title: '公告管理', icon: 'announcement' }
      }
    ]
  },
  {
    path: '/servers',
    component: MainLayout,
    redirect: '/servers/workspace',
    name: 'Servers',
    meta: { title: '服务器管理', icon: 'server' },
    children: [
      {
        path: 'workspace',
        component: () => import('@/views/servers/ServerWorkspace.vue'),
        name: 'ServerWorkspace',
        meta: { title: '服务器工作台', icon: 'monitor' }
      },
      {
        path: 'list',
        component: () => import('@/views/servers/ServerList.vue'),
        name: 'ServerList',
        meta: { title: '服务器列表', icon: 'list' }
      },
      {
        path: 'commands',
        component: () => import('@/views/servers/CommandManager.vue'),
        name: 'CommandManager',
        meta: { title: '命令设置', icon: 'terminal' }
      }
    ]
  },
  {
    path: '/logs',
    component: MainLayout,
    redirect: '/logs/query',
    name: 'Logs',
    meta: { title: '日志管理器', icon: 'document' },
    children: [
      {
        path: 'query',
        component: () => import('@/views/LogQueryView.vue'),
        name: 'LogQuery',
        meta: { title: '日志查询', icon: 'search' }
      },
      {
        path: 'rules',
        component: () => import('@/views/RuleManagementView.vue'),
        name: 'RuleManagement',
        meta: { title: '规则管理', icon: 'setting' }
      },
      {
        path: 'list',
        redirect: '/logs/query',
        meta: { hidden: true }
      },
      {
        path: 'parser',
        component: () => import('@/views/logs/LogParser.vue'),
        name: 'LogParser',
        meta: { title: '日志解析器', icon: 'view' }
      }
    ]
  },
  {
    path: '/rooms',
    component: MainLayout,
    redirect: '/rooms/list',
    name: 'Rooms',
    meta: { title: '房间管理', icon: 'house' },
    children: [
      {
        path: 'list',
        component: () => import('@/views/rooms/RoomList.vue'),
        name: 'RoomList',
        meta: { title: '房间列表', icon: 'list' }
      },
      {
        path: 'settings',
        component: () => import('@/views/rooms/RoomSettings.vue'),
        name: 'RoomSettingsPage',
        meta: { title: '房间设置', icon: 'setting' }
      },
      {
        path: 'special-lists',
        component: () => import('@/views/rooms/SpecialLists.vue'),
        name: 'SpecialLists',
        meta: { title: '特殊名单', icon: 'user-solid' }
      },
      {
        path: 'token',
        component: () => import('@/views/rooms/ServerToken.vue'),
        name: 'ServerToken',
        meta: { title: '服务器令牌', icon: 'key' }
      }
    ]
  },
  {
    path: '/agents',
    component: MainLayout,
    redirect: '/agents/list',
    name: 'Agents',
    meta: { title: 'Agent管理', icon: 'connection' },
    children: [
      {
        path: 'list',
        component: () => import('@/views/agents/AgentList.vue'),
        name: 'AgentList',
        meta: { title: 'Agent列表', icon: 'list' }
      },
      {
        path: 'command',
        component: () => import('@/views/agents/AgentCommand.vue'),
        name: 'AgentCommand',
        meta: { title: '命令管理', icon: 'terminal' }
      },
      {
        path: 'security',
        component: () => import('@/views/agents/AgentSecurity.vue'),
        name: 'AgentSecurity',
        meta: { title: '安全配置', icon: 'lock' }
      }
    ]
  },
  {
    path: '/players',
    component: MainLayout,
    redirect: '/players/list',
    name: 'Players',
    meta: { title: '玩家管理', icon: 'user' },
    children: [
      {
        path: 'list',
        component: () => import('@/views/players/PlayerList.vue'),
        name: 'PlayerList',
        meta: { title: '玩家列表', icon: 'list' }
      },
      {
        path: 'bans',
        component: () => import('@/views/players/BanList.vue'),
        name: 'BanList',
        meta: { title: '封禁管理', icon: 'shield-off' }
      }
    ]
  },

  {
    path: '/cron',
    component: MainLayout,
    redirect: '/cron/tasks',
    name: 'CronTasks',
    meta: { title: '定时任务', icon: 'timer' },
    children: [
      {
        path: 'tasks',
        component: () => import('@/views/cron/TaskList.vue'),
        name: 'TaskList',
        meta: { title: '任务列表', icon: 'list' }
      },
      {
        path: 'add',
        component: () => import('@/views/cron/TaskForm.vue'),
        name: 'AddTask',
        meta: { title: '添加任务', icon: 'plus' }
      },
      {
        path: 'edit/:id',
        component: () => import('@/views/cron/TaskForm.vue'),
        name: 'EditTask',
        meta: { title: '编辑任务', icon: 'edit', hidden: true }
      },
      {
        path: 'groups',
        component: () => import('@/views/cron/TaskGroups.vue'),
        name: 'TaskGroups',
        meta: { title: '任务组管理', icon: 'folder' }
      },
      {
        path: 'group/add',
        component: () => import('@/views/cron/TaskGroupForm.vue'),
        name: 'AddTaskGroup',
        meta: { title: '添加任务组', icon: 'plus', hidden: true }
      },
      {
        path: 'group/edit/:id',
        component: () => import('@/views/cron/TaskGroupForm.vue'),
        name: 'EditTaskGroup',
        meta: { title: '编辑任务组', icon: 'edit', hidden: true }
      },
      {
        path: 'group/:id',
        component: () => import('@/views/cron/TaskGroupDetail.vue'),
        name: 'TaskGroupDetail',
        meta: { title: '任务组详情', icon: 'folder-opened', hidden: true }
      },
      {
        path: 'logs',
        component: () => import('@/views/cron/TaskLogs.vue'),
        name: 'TaskLogs',
        meta: { title: '执行日志', icon: 'document' }
      },
      {
        path: 'logs/:id',
        component: () => import('@/views/cron/TaskLogDetail.vue'),
        name: 'TaskLogDetail',
        meta: { title: '日志详情', icon: 'document', hidden: true }
      },
      {
        path: 'execution/:id',
        component: () => import('@/views/cron/TaskExecutionResult.vue'),
        name: 'TaskExecutionResult',
        meta: { title: '任务执行结果', icon: 'video-play', hidden: true }
      },
      {
        path: 'charts',
        component: () => import('@/views/cron/TaskCharts.vue'),
        name: 'TaskCharts',
        meta: { title: '统计图表', icon: 'pie-chart' }
      },
      {
        path: 'import-export',
        component: () => import('@/views/cron/TaskImportExport.vue'),
        name: 'TaskImportExport',
        meta: { title: '导入导出', icon: 'upload' }
      }
    ]
  },
  {
    path: '/mods',
    component: MainLayout,
    redirect: '/mods/list',
    name: 'Mods',
    meta: { title: '模组管理', icon: 'component' },
    children: [
      {
        path: 'list',
        component: () => import('@/views/mods/ModList.vue'),
        name: 'ModList',
        meta: { title: '已下载模组', icon: 'list' }
      },
      {
        path: 'search',
        component: () => import('@/views/mods/ModSearch.vue'),
        name: 'ModSearch',
        meta: { title: '搜索模组', icon: 'search' }
      }
    ]
  },
  {
    path: '/worlds',
    component: MainLayout,
    redirect: '/worlds/list',
    name: 'Worlds',
    meta: { title: '世界管理', icon: 'earth' },
    children: [
      {
        path: 'list',
        component: () => import('@/views/worlds/WorldList.vue'),
        name: 'WorldList',
        meta: { title: '世界列表', icon: 'list' }
      },
      {
        path: 'settings',
        component: () => import('@/views/worlds/WorldSettings.vue'),
        name: 'WorldSettings',
        meta: { title: '世界设置', icon: 'setting' }
      },
      {
        path: 'details',
        component: () => import('@/views/worlds/WorldDetails.vue'),
        name: 'WorldDetails',
        meta: { title: '世界详情', icon: 'document' }
      },
      {
        path: 'state',
        component: () => import('@/views/worlds/WorldState.vue'),
        name: 'WorldState',
        meta: { title: '世界状态', icon: 'data-analysis' }
      }
    ]
  },
  {
    path: '/scheduled',
    redirect: '/cron/tasks'
  },
  {
    path: '/scheduled/tasks',
    redirect: '/cron/tasks'
  },
  {
    path: '/scheduled/create',
    redirect: '/cron/add'
  }
]

const router = createRouter({
  history: createWebHistory(),
  scrollBehavior: () => ({ top: 0 }),
  routes: constantRoutes
})

const v2ManagedPaths = [
  '/servers',
  '/logs',
  '/rooms',
  '/agents',
  '/players',
  '/cron',
  '/mods',
  '/worlds',
  '/system',
  '/backups',
  '/announcements'
]

router.beforeEach((to, from) => {
  const leavingV2ForManagedPage = from.path.startsWith('/preview-v2')
    && !to.path.startsWith('/preview-v2')
    && v2ManagedPaths.some(path => to.path === path || to.path.startsWith(`${path}/`))

  if (!leavingV2ForManagedPage) return true

  return {
    path: `/preview-v2${to.path}`,
    query: to.query,
    hash: to.hash,
    replace: to.replace
  }
})

export default router
