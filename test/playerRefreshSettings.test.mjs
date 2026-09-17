import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const root = new URL('../', import.meta.url)
const source = path => readFile(new URL(path, root), 'utf8')

test('player refresh settings use the built-in room task with a one-minute default', async () => {
  const [view, api] = await Promise.all([
    source('src/views/players/PlayerList.vue'),
    source('src/api/playerApi.js')
  ])

  assert.match(view, /refreshPlayerData[\s\S]*?showPlayerRefreshSettings/)
  assert.match(view, /<Settings2 \/>/)
  assert.match(view, /refreshSettingsForm:[\s\S]*?interval_seconds: '60'/)
  assert.match(view, /UiSwitch id="player-refresh-enabled"/)
  assert.match(view, /player-refresh-room[\s\S]*?archiveOptions/)

  assert.match(api, /60: '\* \* \* \* \*'/)
  assert.match(api, /automationV2API\.tasks\(room\.id\)/)
  assert.match(api, /automationV2API\.updateTask\(data\.room_id, task\.id/)
  assert.match(api, /expectedRevision: task\.revision/)
  assert.match(api, /parameters: task\.parameters \|\| \{\}/)
})
