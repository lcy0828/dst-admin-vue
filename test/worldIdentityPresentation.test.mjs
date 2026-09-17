import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { runInNewContext } from 'node:vm'
import { babelParse, parse } from '@vue/compiler-sfc'
import { compareWorldRoles } from '../src/lib/worldRuntimeStatus.mjs'

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8')

test('world configuration tabs prioritize the main shard and preserve numeric secondary ordering', async () => {
  const script = parse(await read('src/views/worlds/WorldSettings.vue')).descriptor.script.content
  const component = babelParse(script, { sourceType: 'module' }).program.body
    .find(node => node.type === 'ExportDefaultDeclaration').declaration
  const getter = component.properties.find(node => node.key.name === 'computed').value.properties
    .find(node => node.key.name === 'sortedRoomWorlds')
  const sort = runInNewContext(`({ ${script.slice(getter.start, getter.end)} }).sortedRoomWorlds`, { compareWorldRoles })
  const worlds = [
    { id: 'ten', name: 'Forest 10', role: 'custom', type: 'forest' },
    { id: 'two', name: 'Forest 2', role: 'custom', type: 'forest' },
    { id: 'main', name: 'Caves 99', role: 'master', type: 'cave' }
  ]
  assert.deepEqual([...sort.call({ roomWorlds: worlds })].map(world => world.id), ['main', 'two', 'ten'])
  assert.deepEqual(worlds.map(world => world.id), ['ten', 'two', 'main'])
})

test('room catalog projection sorts worlds by role without losing telemetry fields', async () => {
  const code = await read('src/api/v2LegacyAdapters.js')
  const nodes = babelParse(code, { sourceType: 'module' }).program.body
    .filter(node => node.type === 'FunctionDeclaration' && ['mapRoom', 'mapWorld', 'worldType'].includes(node.id.name))
  const mapRoom = runInNewContext(`${nodes.map(node => code.slice(node.start, node.end)).join('\n')}; mapRoom`, { compareWorldRoles })
  const worlds = [{ id: 'caves', name: 'Caves', role: 'caves' }, { id: 'master', name: 'Z Prime', role: 'master' }]
  const room = mapRoom({ id: 'room' }, worlds, [{ worldId: 'master', season: 'summer', cycles: 200 }])
  assert.deepEqual([...room.worlds].map(world => world.id), ['master', 'caves'])
  assert.equal(room.worlds[0].season, 'summer')
  assert.equal(room.worlds[0].day, 200)
  assert.deepEqual(worlds.map(world => world.id), ['caves', 'master'])
})

test('world type and shard role remain separate concepts', async () => {
  const [adapter, list, details, settings, messages, workspace, logs] = await Promise.all([
    read('src/api/v2LegacyAdapters.js'),
    read('src/views/worlds/WorldList.vue'),
    read('src/views/worlds/WorldDetails.vue'),
    read('src/views/worlds/WorldSettings.vue'),
    read('src/i18n/worldsMessages.js'),
    read('src/views/servers/ServerWorkspace.vue'),
    read('src/api/logApi.js')
  ])

  assert.match(adapter, /worldType\(world\.type, world\.role\)/)
  assert.match(list, /worlds\.types\.forest/)
  assert.match(list, /worlds\.roles\.master/)
  assert.match(details, /worlds\.details\.fields\.role/)
  assert.match(settings, /serverIni\.shard\.is_master \? 'worlds\.roles\.master' : 'worlds\.roles\.secondary'/)
  assert.doesNotMatch(settings, /v-model="serverIni\.shard\.is_master"/)
  assert.match(messages, /forest: '森林'/)
  assert.match(messages, /master: '主世界'/)
  assert.match(workspace, /worldIsMaster\(world\)/)
  assert.match(workspace, /worldType\(world\)/)
  assert.match(logs, /world\.type === 'forest' \? 'Forest' : world\.type === 'cave' \? 'Caves'/)
  assert.doesNotMatch(adapter, /role === 'master'\) return 'forest'/)
})
