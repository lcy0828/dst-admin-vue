import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { runInNewContext } from 'node:vm'
import {
  filterManagementTargets,
  filterManagementRooms,
  getManagementScope,
  managementScopeIncludesTarget,
  managementScopeRequest,
  managementScopeTargetId,
  setManagementScope
} from '../src/lib/managementScope.mjs'

test('management scope defaults to the fleet and filters only when a target is selected', () => {
  setManagementScope({ kind: 'all' })
  assert.deepEqual(getManagementScope(), { kind: 'all', targetId: '', targetName: '' })
  assert.equal(managementScopeTargetId(), '')
  assert.deepEqual(managementScopeRequest(), {})
  assert.equal(managementScopeIncludesTarget('agent:node-a'), true)

  setManagementScope({ kind: 'target', targetId: 'agent:node-a', targetName: 'Node A', online: false })
  assert.equal(managementScopeTargetId(), 'agent:node-a')
  assert.deepEqual(managementScopeRequest(), { targetIds: ['agent:node-a'] })
  assert.equal(managementScopeIncludesTarget('agent:node-a'), true)
  assert.equal(managementScopeIncludesTarget('local'), false)
  assert.deepEqual(
    filterManagementTargets([{ targetId: 'local' }, { targetId: 'agent:node-a' }]),
    [{ targetId: 'agent:node-a' }]
  )
  assert.deepEqual(
    filterManagementRooms([
      { id: 'local-room', targetIds: ['local'] },
      { id: 'split-room', targetIds: ['local', 'agent:node-a'] }
    ]).map(room => room.id),
    ['split-room']
  )
})

test('invalid target scopes fall back to the fleet', () => {
  setManagementScope({ kind: 'target', targetId: '  ' })
  assert.equal(getManagementScope().kind, 'all')
})

test('machine preference survives a new session, migrates old session storage, and tolerates unavailable storage', async () => {
  const source = (await readFile(new URL('../src/lib/managementScope.mjs', import.meta.url), 'utf8')).replace(/^export /gm, '')
  const stored = new Map()
  const localStorage = { getItem: key => stored.get(key), setItem: (key, value) => stored.set(key, value) }
  function load(sessionStorage = {}) {
    return runInNewContext(`${source}; ({ getManagementScope, setManagementScope })`, {
      window: { localStorage, sessionStorage, dispatchEvent() {} },
      CustomEvent: class {}
    })
  }
  const legacy = load({ getItem: () => JSON.stringify({ kind: 'target', targetId: 'agent:debian', targetName: 'Debian' }) })
  assert.equal(legacy.getManagementScope().targetId, 'agent:debian')
  legacy.setManagementScope({ kind: 'target', targetId: 'agent:debian', targetName: 'Debian', online: false })
  const fresh = load({ getItem: () => null })
  assert.equal(fresh.getManagementScope().targetId, 'agent:debian')
  assert.doesNotMatch(stored.get('dstManagementScope'), /online|configured/)
  localStorage.getItem = () => { throw Error('denied') }
  localStorage.setItem = () => { throw Error('quota') }
  const unavailable = load()
  assert.equal(unavailable.getManagementScope().kind, 'all')
  assert.doesNotThrow(() => unavailable.setManagementScope({ kind: 'target', targetId: 'local' }))
  assert.equal(unavailable.getManagementScope().targetId, 'local')
})

test('the formal layout exposes one searchable fleet and machine scope switcher', async () => {
  const component = await readFile(new URL('../src/components/layout/ManagementScopeSwitch.vue', import.meta.url), 'utf8')
  const layout = await readFile(new URL('../src/layouts/MainLayoutV2.vue', import.meta.url), 'utf8')

  assert.match(layout, /<ManagementScopeSwitch v-if="hasMachineScope"/)
  assert.match(layout, /<RouterView :key="`\$\{\['\/mods', '\/dashboard'\]\.includes\(route\.path\) \? route\.path : route\.fullPath\}:\$\{route\.path === '\/dashboard' \? '' : managementScopeRevision\}`"/)
  assert.match(layout, /<RoomManagementScopeNotice v-if="hasMachineScope && route\.path\.startsWith\('\/rooms'\)"/)
  assert.match(component, /runtimeTargetsV2API\.list\(\)/)
  assert.match(component, /targets\.value\.length === 1/)
  assert.match(component, /const hasMultipleTargets = computed/)
  assert.match(component, /<InputGroup v-if="hasMultipleTargets">/)
  assert.match(component, /<template v-if="hasMultipleTargets">/)
  assert.match(component, /<Popover\b/)
  assert.match(component, /<InputGroupInput v-model="query"/)
  assert.match(component, /RUNTIME_TARGETS_UPDATED_EVENT/)
  assert.match(component, /scope\.targetId === target\.id \? 'secondary' : 'ghost'/)
  assert.match(component, /app\.remote\.allTargets/)
  assert.match(component, /app\.remote\.manageTargets/)
  assert.doesNotMatch(component, /setActiveRuntimeTarget/)
  assert.match(component, /fleetOverviewV2API\.get\('', \{ detail: 'inventory' \}\)/)
  assert.match(component, /if \(activityLoading\.value\) return/)
  assert.doesNotMatch(component, /setInterval|setTimeout|scopeDescription|allTargetsDescription|h-72/)
  assert.match(layout, /if \(targetId === selectedScopeTargetId\) return/)
})

test('workspace uses remembered selection before the running-room fallback and preserves explicit room navigation', async () => {
  const workspace = await readFile(new URL('../src/views/servers/ServerWorkspace.vue', import.meta.url), 'utf8')
  assert.match(workspace, /selectWorkspaceRoom\(this\.rooms, roomId, this\.preferRunningRoom\)/)
  assert.match(workspace, /this\.preferRunningRoom = false/)
  assert.match(workspace, /this\.preferRunningRoom = !preferred\.roomId/)
  assert.match(workspace, /query\.targetId != null && query\.targetId !== managementScopeTargetId\(this\.managementScope\)/)
  assert.match(workspace, /query: \{ \.\.\.this\.\$route\.query, roomId, worldId, targetId \}/)
  assert.match(workspace, /'\$route\.query'\(query\)/)
})

test('room views preserve topology context and machine management reveals the selected target', async () => {
  const [notice, agents] = await Promise.all([
    readFile(new URL('../src/components/layout/RoomManagementScopeNotice.vue', import.meta.url), 'utf8'),
    readFile(new URL('../src/views/agents/AgentList.vue', import.meta.url), 'utf8')
  ])

  assert.match(notice, /MANAGEMENT_SCOPE_CHANGED_EVENT/)
  assert.match(notice, /app\.remote\.roomScopeTarget/)
  assert.match(notice, /to="\/rooms\/topology"/)
  assert.match(agents, /:data-state="isCurrentManagementTarget\(localRuntimeTarget\.id\) \? 'selected' : undefined"/)
  assert.match(agents, /:data-state="isCurrentManagementTarget\(runtimeFor\(agent\)\.id\) \? 'selected' : undefined"/)
  assert.match(agents, /revealManagementTarget\(true\)/)
  assert.match(agents, /scrollIntoView/)
})
