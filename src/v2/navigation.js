import {
  ArchiveRestore,
  Blocks,
  CalendarClock,
  FileSearch,
  Globe2,
  House,
  LayoutDashboard,
  Megaphone,
  RadioTower,
  ServerCog,
  Settings2,
  UsersRound
} from '@lucide/vue'

export const V2_NAVIGATION = [
  {
    label: '总览',
    items: [
      { label: '服务总览', to: '/dashboard', icon: LayoutDashboard }
    ]
  },
  {
    label: '服务与世界',
    items: [
      {
        label: '服务器管理',
        icon: ServerCog,
        children: [
          { label: '服务器工作台', to: '/servers/workspace' },
          { label: '服务器列表', to: '/servers/list' },
          { label: '命令设置', to: '/servers/commands' }
        ]
      },
      {
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
        label: '世界管理',
        icon: Globe2,
        children: [
          { label: '世界列表', to: '/worlds/list' },
          { label: '世界设置', to: '/worlds/settings' },
          { label: '世界状态', to: '/worlds/state' },
          { label: '地图与 Session', to: '/worlds/maps' }
        ]
      }
    ]
  },
  {
    label: '内容与玩家',
    items: [
      {
        label: '模组管理',
        icon: Blocks,
        children: [
          { label: '已下载模组', to: '/mods/list' },
          { label: '模组搜索', to: '/mods/search' }
        ]
      },
      {
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
        label: '日志管理器',
        icon: FileSearch,
        children: [
          { label: '日志查询', to: '/logs/query' },
          { label: '规则管理', to: '/logs/rules' },
          { label: '日志解析器', to: '/logs/parser' }
        ]
      },
      { label: '公告管理', to: '/announcements', icon: Megaphone },
      { label: '备份管理', to: '/backups', icon: ArchiveRestore },
      {
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
        label: 'Agent 管理',
        icon: RadioTower,
        children: [
          { label: 'Agent 列表', to: '/agents/list' },
          { label: '命令管理', to: '/agents/command' },
          { label: '安全设置', to: '/agents/security' }
        ]
      },
      { label: '系统设置', to: '/system/settings', icon: Settings2 }
    ]
  }
]
