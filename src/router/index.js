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
        path: 'settings',
        component: () => import('@/views/servers/ServerSettings.vue'),
        name: 'ServerSettings',
        meta: { title: '服务器设置', icon: 'setting' }
      },
      {
        path: 'saves',
        component: () => import('@/views/servers/SaveManager.vue'),
        name: 'SaveManager',
        meta: { title: '存档管理', icon: 'save' }
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
        path: 'ban',
        component: () => import('@/views/players/BanList.vue'),
        name: 'BanList',
        meta: { title: '封禁管理', icon: 'ban' }
      }
    ]
  },
  {
    path: '/items',
    component: MainLayout,
    redirect: '/items/list',
    name: 'Items',
    meta: { title: '物品管理', icon: 'item' },
    children: [
      {
        path: 'list',
        component: () => import('@/views/items/ItemList.vue'),
        name: 'ItemList',
        meta: { title: '物品列表', icon: 'list' }
      },
      {
        path: 'generator',
        component: () => import('@/views/items/ItemGenerator.vue'),
        name: 'ItemGenerator',
        meta: { title: '物品生成器', icon: 'create' }
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
      },
      {
        path: 'settings',
        component: () => import('@/views/mods/ModSettings.vue'),
        name: 'ModSettings',
        meta: { title: '模组设置', icon: 'setting' }
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
      }
    ]
  },
  {
    path: '/scheduled',
    component: MainLayout,
    redirect: '/scheduled/tasks',
    name: 'Scheduled',
    meta: { title: '定时任务', icon: 'time' },
    children: [
      {
        path: 'tasks',
        component: () => import('@/views/scheduled/ScheduledTasks.vue'),
        name: 'ScheduledTasks',
        meta: { title: '任务列表', icon: 'list' }
      },
      {
        path: 'create',
        component: () => import('@/views/scheduled/CreateTask.vue'),
        name: 'CreateTask',
        meta: { title: '创建任务', icon: 'plus' }
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
        meta: { title: 'Agent列表', icon: 'monitor' }
      },
      {
        path: 'security',
        component: () => import('@/views/agents/AgentSecurity.vue'),
        name: 'AgentSecurity',
        meta: { title: '安全设置', icon: 'lock' }
      }
    ]
  }
]

export default new Router({
  mode: 'history', // 去掉url中的#
  scrollBehavior: () => ({ y: 0 }),
  routes: constantRoutes
})