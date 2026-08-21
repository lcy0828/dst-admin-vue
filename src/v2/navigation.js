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
    labelKey: 'navigation.sections.overview',
    items: [
      { labelKey: 'navigation.dashboard', to: '/dashboard', icon: LayoutDashboard }
    ]
  },
  {
    labelKey: 'navigation.sections.services',
    items: [
      {
        labelKey: 'navigation.servers',
        icon: ServerCog,
        children: [
          { labelKey: 'navigation.serverWorkspace', to: '/servers/workspace' },
          { labelKey: 'navigation.commandSettings', to: '/servers/commands' },
          { labelKey: 'navigation.gameReleases', to: '/servers/releases' }
        ]
      },
      {
        labelKey: 'navigation.rooms',
        icon: House,
        children: [
          { labelKey: 'navigation.roomList', to: '/rooms/list' },
          { labelKey: 'navigation.roomSettings', to: '/rooms/settings' },
          { labelKey: 'navigation.roomTopology', to: '/rooms/topology' },
          { labelKey: 'navigation.roomDiagnostics', to: '/rooms/diagnostics' },
          { labelKey: 'navigation.specialLists', to: '/rooms/special-lists' },
          { labelKey: 'navigation.serverToken', to: '/rooms/token' }
        ]
      },
      {
        labelKey: 'navigation.worlds',
        icon: Globe2,
        children: [
          { labelKey: 'navigation.worldList', to: '/worlds/list' },
          { labelKey: 'navigation.worldSettings', to: '/worlds/settings' },
          { labelKey: 'navigation.worldState', to: '/worlds/state' },
          { labelKey: 'navigation.worldMaps', to: '/worlds/maps' }
        ]
      }
    ]
  },
  {
    labelKey: 'navigation.sections.content',
    items: [
      {
        labelKey: 'navigation.mods',
        icon: Blocks,
        to: '/mods'
      },
      {
        labelKey: 'navigation.players',
        icon: UsersRound,
        children: [
          { labelKey: 'navigation.playerList', to: '/players/list' },
          { labelKey: 'navigation.bans', to: '/players/bans' }
        ]
      }
    ]
  },
  {
    labelKey: 'navigation.sections.operations',
    items: [
      {
        labelKey: 'navigation.logs',
        icon: FileSearch,
        children: [
          { labelKey: 'navigation.logQuery', to: '/logs/query' },
          { labelKey: 'navigation.logRules', to: '/logs/rules' },
          { labelKey: 'navigation.logParser', to: '/logs/parser' }
        ]
      },
      { labelKey: 'navigation.announcements', to: '/announcements', icon: Megaphone },
      { labelKey: 'navigation.backups', to: '/backups', icon: ArchiveRestore },
      {
        labelKey: 'navigation.schedules',
        icon: CalendarClock,
        children: [
          { labelKey: 'navigation.taskList', to: '/cron/tasks' },
          { labelKey: 'navigation.createTask', to: '/cron/add' },
          { labelKey: 'navigation.taskGroup', to: '/cron/groups' },
          { labelKey: 'navigation.executionLogs', to: '/cron/logs' },
          { labelKey: 'navigation.runtimeStatistics', to: '/cron/charts' },
          { labelKey: 'navigation.importExport', to: '/cron/import-export' }
        ]
      }
    ]
  },
  {
    labelKey: 'navigation.sections.settings',
    items: [
      {
        labelKey: 'navigation.agents',
        icon: RadioTower,
        children: [
          { labelKey: 'navigation.agentList', to: '/agents/list' },
          { labelKey: 'navigation.agentCommands', to: '/agents/command' },
          { labelKey: 'navigation.agentSecurity', to: '/agents/security' }
        ]
      },
      { labelKey: 'navigation.systemSettings', to: '/system/settings', icon: Settings2 }
    ]
  }
]

export function navigationForFeatures(features = {}) {
  return V2_NAVIGATION.map(section => ({
    ...section,
    items: section.items.filter(item => !item.requiresFeature || features[item.requiresFeature] !== false)
  }))
}
