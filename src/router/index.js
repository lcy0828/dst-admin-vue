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
        component: () => import('@/views/System.vue'),
        name: 'System',
        meta: { title: '系统管理', icon: 'system' }
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
  // 模组管理相关路由
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
  }
]

export default new Router({
  mode: 'history', // 去掉url中的#
  scrollBehavior: () => ({ y: 0 }),
  routes: constantRoutes
}) 