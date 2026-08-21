import { createRouter, createWebHistory } from 'vue-router'
import MainLayoutV2 from '../layouts/MainLayoutV2.vue'

// 公共路由
export const constantRoutes = [
  {
    path: '/login',
    component: () => import('@/views/Login.vue'),
    hidden: true
  },
  {
    path: '/preview-v2',
    redirect: '/dashboard'
  },
  {
    path: '/preview-v2/:pathMatch(.*)*',
    redirect: to => ({
      path: `/${Array.isArray(to.params.pathMatch) ? to.params.pathMatch.join('/') : to.params.pathMatch}`,
      query: to.query,
      hash: to.hash
    })
  },
  {
    path: '/',
    component: MainLayoutV2,
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        component: () => import('@/views/v2/DashboardV2.vue'),
        name: 'Dashboard',
        meta: { title: '服务总览', titleKey: 'navigation.dashboard', icon: 'dashboard', affix: true }
      },
      {
        path: 'system',
        redirect: '/system/settings'
      },
      {
        path: 'system/settings',
        component: () => import('@/views/SystemSettings.vue'),
        name: 'SystemSettings',
        meta: { title: '系统设置', titleKey: 'navigation.systemSettings', icon: 'settings' }
      },
      {
        path: 'backups',
        component: () => import('@/views/Backups.vue'),
        name: 'Backups',
        meta: { title: '备份管理', titleKey: 'navigation.backups', icon: 'backup' }
      },
      {
        path: 'announcements',
        component: () => import('@/views/Announcements.vue'),
        name: 'Announcements',
        meta: { title: '公告管理', titleKey: 'navigation.announcements', icon: 'announcement' }
      }
    ]
  },
  {
    path: '/servers',
    component: MainLayoutV2,
    redirect: '/servers/workspace',
    name: 'Servers',
    meta: { title: '服务器管理', titleKey: 'navigation.servers', icon: 'server' },
    children: [
      {
        path: 'workspace',
        component: () => import('@/views/servers/ServerWorkspace.vue'),
        name: 'ServerWorkspace',
        meta: { title: '服务器工作台', titleKey: 'navigation.serverWorkspace', icon: 'monitor' }
      },
      {
        path: 'list',
        component: () => import('@/views/servers/ServerList.vue'),
        name: 'ServerList',
        meta: { title: '服务器列表', titleKey: 'navigation.serverList', icon: 'list' }
      },
      {
        path: 'commands',
        component: () => import('@/views/servers/CommandManager.vue'),
        name: 'CommandManager',
        meta: { title: '命令设置', titleKey: 'navigation.commandSettings', icon: 'terminal' }
      },
      {
        path: 'releases',
        component: () => import('@/views/servers/GameReleases.vue'),
        name: 'GameReleases',
        meta: { title: '游戏版本发布', titleKey: 'navigation.gameReleases', icon: 'package' }
      }
    ]
  },
  {
    path: '/logs',
    component: MainLayoutV2,
    redirect: '/logs/query',
    name: 'Logs',
    meta: { title: '日志管理器', titleKey: 'navigation.logs', icon: 'document' },
    children: [
      {
        path: 'query',
        component: () => import('@/views/LogQueryView.vue'),
        name: 'LogQuery',
        meta: { title: '日志查询', titleKey: 'navigation.logQuery', icon: 'search' }
      },
      {
        path: 'rules',
        component: () => import('@/views/RuleManagementView.vue'),
        name: 'RuleManagement',
        meta: { title: '规则管理', titleKey: 'navigation.logRules', icon: 'setting' }
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
        meta: { title: '运行中日志', titleKey: 'navigation.logParser', icon: 'view' }
      }
    ]
  },
  {
    path: '/rooms',
    component: MainLayoutV2,
    redirect: '/rooms/list',
    name: 'Rooms',
    meta: { title: '房间管理', titleKey: 'navigation.rooms', icon: 'house' },
    children: [
      {
        path: 'list',
        component: () => import('@/views/rooms/RoomList.vue'),
        name: 'RoomList',
        meta: { title: '房间列表', titleKey: 'navigation.roomList', icon: 'list' }
      },
      {
        path: 'settings',
        component: () => import('@/views/rooms/RoomSettings.vue'),
        name: 'RoomSettingsPage',
        meta: { title: '房间设置', titleKey: 'navigation.roomSettings', icon: 'setting' }
      },
      {
        path: 'topology',
        component: () => import('@/views/rooms/RoomTopology.vue'),
        name: 'RoomTopology',
        meta: { title: '运行拓扑', titleKey: 'navigation.roomTopology', icon: 'connection' }
      },
      {
        path: 'diagnostics',
        component: () => import('@/views/rooms/RoomDiagnostics.vue'),
        name: 'RoomDiagnostics',
        meta: { title: '集中诊断', titleKey: 'navigation.roomDiagnostics', icon: 'activity' }
      },
      {
        path: 'special-lists',
        component: () => import('@/views/rooms/SpecialLists.vue'),
        name: 'SpecialLists',
        meta: { title: '特殊名单', titleKey: 'navigation.specialLists', icon: 'user-solid' }
      },
      {
        path: 'token',
        component: () => import('@/views/rooms/ServerToken.vue'),
        name: 'ServerToken',
        meta: { title: '服务器令牌', titleKey: 'navigation.serverToken', icon: 'key' }
      }
    ]
  },
  {
    path: '/agents',
    component: MainLayoutV2,
    redirect: '/agents/list',
    name: 'Agents',
    meta: { title: 'Agent管理', titleKey: 'navigation.agents', icon: 'connection' },
    children: [
      {
        path: 'list',
        component: () => import('@/views/agents/AgentList.vue'),
        name: 'AgentList',
        meta: { title: 'Agent列表', titleKey: 'navigation.agentList', icon: 'list' }
      },
      {
        path: 'command',
        component: () => import('@/views/agents/AgentCommand.vue'),
        name: 'AgentCommand',
        meta: { title: '命令管理', titleKey: 'navigation.agentCommands', icon: 'terminal' }
      },
      {
        path: 'security',
        component: () => import('@/views/agents/AgentSecurity.vue'),
        name: 'AgentSecurity',
        meta: { title: '安全配置', titleKey: 'navigation.agentSecurity', icon: 'lock' }
      }
    ]
  },
  {
    path: '/players',
    component: MainLayoutV2,
    redirect: '/players/list',
    name: 'Players',
    meta: { title: '玩家管理', titleKey: 'navigation.players', icon: 'user' },
    children: [
      {
        path: 'list',
        component: () => import('@/views/players/PlayerList.vue'),
        name: 'PlayerList',
        meta: { title: '玩家列表', titleKey: 'navigation.playerList', icon: 'list' }
      },
      {
        path: 'bans',
        component: () => import('@/views/players/BanList.vue'),
        name: 'BanList',
        meta: { title: '封禁管理', titleKey: 'navigation.bans', icon: 'shield-off' }
      }
    ]
  },

  {
    path: '/cron',
    component: MainLayoutV2,
    redirect: '/cron/tasks',
    name: 'CronTasks',
    meta: { title: '定时任务', titleKey: 'navigation.schedules', icon: 'timer' },
    children: [
      {
        path: 'tasks',
        component: () => import('@/views/cron/TaskList.vue'),
        name: 'TaskList',
        meta: { title: '任务列表', titleKey: 'navigation.taskList', icon: 'list' }
      },
      {
        path: 'add',
        component: () => import('@/views/cron/TaskForm.vue'),
        name: 'AddTask',
        meta: { title: '添加任务', titleKey: 'navigation.addTask', icon: 'plus' }
      },
      {
        path: 'edit/:id',
        component: () => import('@/views/cron/TaskForm.vue'),
        name: 'EditTask',
        meta: { title: '编辑任务', titleKey: 'navigation.editTask', icon: 'edit', hidden: true }
      },
      {
        path: 'groups',
        component: () => import('@/views/cron/TaskGroups.vue'),
        name: 'TaskGroups',
        meta: { title: '任务组管理', titleKey: 'navigation.taskGroups', icon: 'folder' }
      },
      {
        path: 'group/add',
        component: () => import('@/views/cron/TaskGroupForm.vue'),
        name: 'AddTaskGroup',
        meta: { title: '添加任务组', titleKey: 'navigation.addTaskGroup', icon: 'plus', hidden: true }
      },
      {
        path: 'group/edit/:id',
        component: () => import('@/views/cron/TaskGroupForm.vue'),
        name: 'EditTaskGroup',
        meta: { title: '编辑任务组', titleKey: 'navigation.editTaskGroup', icon: 'edit', hidden: true }
      },
      {
        path: 'group/:id',
        component: () => import('@/views/cron/TaskGroupDetail.vue'),
        name: 'TaskGroupDetail',
        meta: { title: '任务组详情', titleKey: 'navigation.taskGroupDetails', icon: 'folder-opened', hidden: true }
      },
      {
        path: 'logs',
        component: () => import('@/views/cron/TaskLogs.vue'),
        name: 'TaskLogs',
        meta: { title: '执行日志', titleKey: 'navigation.executionLogs', icon: 'document' }
      },
      {
        path: 'logs/:id',
        component: () => import('@/views/cron/TaskLogDetail.vue'),
        name: 'TaskLogDetail',
        meta: { title: '日志详情', titleKey: 'navigation.logDetails', icon: 'document', hidden: true }
      },
      {
        path: 'execution/:id',
        component: () => import('@/views/cron/TaskExecutionResult.vue'),
        name: 'TaskExecutionResult',
        meta: { title: '任务执行结果', titleKey: 'navigation.taskResult', icon: 'video-play', hidden: true }
      },
      {
        path: 'charts',
        component: () => import('@/views/cron/TaskCharts.vue'),
        name: 'TaskCharts',
        meta: { title: '统计图表', titleKey: 'navigation.statistics', icon: 'pie-chart' }
      },
      {
        path: 'import-export',
        component: () => import('@/views/cron/TaskImportExport.vue'),
        name: 'TaskImportExport',
        meta: { title: '导入导出', titleKey: 'navigation.importExport', icon: 'upload' }
      }
    ]
  },
  {
    path: '/mods',
    component: MainLayoutV2,
    name: 'Mods',
    meta: { title: '模组管理', titleKey: 'navigation.mods', icon: 'component' },
    children: [
      {
        path: '',
        component: () => import('@/views/mods/ModManagement.vue'),
        name: 'ModManagement',
        meta: { title: '模组管理', titleKey: 'navigation.mods', icon: 'component' }
      },
      {
        path: 'library',
        redirect: to => ({ path: '/mods', query: { ...to.query, scope: 'downloaded' } })
      },
      {
        path: 'list',
        redirect: to => ({ path: '/mods', query: { ...to.query, tab: 'room' } })
      },
      {
        path: 'search',
        redirect: to => ({ path: '/mods', query: { ...to.query } })
      }
    ]
  },
  {
    path: '/worlds',
    component: MainLayoutV2,
    redirect: '/worlds/list',
    name: 'Worlds',
    meta: { title: '世界管理', titleKey: 'navigation.worlds', icon: 'earth' },
    children: [
      {
        path: 'list',
        component: () => import('@/views/worlds/WorldList.vue'),
        name: 'WorldList',
        meta: { title: '世界列表', titleKey: 'navigation.worldList', icon: 'list' }
      },
      {
        path: 'settings',
        component: () => import('@/views/worlds/WorldSettings.vue'),
        name: 'WorldSettings',
        meta: { title: '世界设置', titleKey: 'navigation.worldSettings', icon: 'setting' }
      },
      {
        path: 'details',
        component: () => import('@/views/worlds/WorldDetails.vue'),
        name: 'WorldDetails',
        meta: { title: '世界详情', titleKey: 'navigation.worldDetails', icon: 'document' }
      },
      {
        path: 'state',
        component: () => import('@/views/worlds/WorldState.vue'),
        name: 'WorldState',
        meta: { title: '世界状态', titleKey: 'navigation.worldState', icon: 'data-analysis' }
      },
      {
        path: 'maps',
        component: () => import('@/views/worlds/WorldMaps.vue'),
        name: 'WorldMaps',
        meta: { title: '地图与 Session', titleKey: 'navigation.worldMaps', icon: 'map' }
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

export default router
