import Vue from 'vue'
import Router from 'vue-router'
import MainLayout from '../layouts/MainLayout.vue'

Vue.use(Router)

// 公共路由
export const constantRoutes = [
  {
    path: '/login',
    component: () => import('@/views/Login.vue'),
    hidden: true
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
    redirect: '/servers/list',
    name: 'Servers',
    meta: { title: '服务器管理', icon: 'server' },
    children: [
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
        component: () => import('@/views/logs/LogsList.vue'),
        name: 'LogsList',
        meta: { title: '日志和规则管理', icon: 'document', hidden: true }
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
    component: MainLayout,
    redirect: '/scheduled/tasks',
    name: 'ScheduledTasks',
    meta: { title: '定时任务', icon: 'alarm-clock' },
    children: [
      {
        path: 'tasks',
        component: () => import('@/views/cron/TaskList.vue'),
        name: 'ScheduledTaskList',
        meta: { title: '任务列表', icon: 'list' }
      },
      {
        path: 'create',
        component: () => import('@/views/cron/TaskForm.vue'),
        name: 'CreateScheduledTask',
        meta: { title: '创建任务', icon: 'plus' }
      }
    ]
  }
]

export default new Router({
  mode: 'history', // 去掉url中的#
  scrollBehavior: () => ({ y: 0 }),
  routes: constantRoutes
})