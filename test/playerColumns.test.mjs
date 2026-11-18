import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import {
  DEFAULT_VISIBLE_PLAYER_COLUMNS,
  PLAYER_COLUMN_DEFINITIONS,
  PLAYER_LIST_COLUMNS_STORAGE_KEY,
  normalizeVisiblePlayerColumns,
  readVisiblePlayerColumns,
  saveVisiblePlayerColumns,
  togglePlayerColumn
} from '../src/lib/playerColumns.mjs'

const source = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8')

function createMemoryStorage() {
  const store = new Map()
  return {
    getItem: key => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value))
  }
}

test('player column settings default to 6 focused columns and keep locked columns', () => {
  assert.deepEqual(DEFAULT_VISIBLE_PLAYER_COLUMNS, [
    'roomAndWorld',
    'playerName',
    'character',
    'days',
    'status',
    'action'
  ])
  assert.equal(PLAYER_COLUMN_DEFINITIONS.length, 11)
  assert.deepEqual(normalizeVisiblePlayerColumns('invalid'), DEFAULT_VISIBLE_PLAYER_COLUMNS)
  assert.deepEqual(normalizeVisiblePlayerColumns([]), ['playerName', 'action'])
  assert.deepEqual(normalizeVisiblePlayerColumns(['lastSeen', 'kuId', 'unknown']), [
    'playerName',
    'kuId',
    'lastSeen',
    'action'
  ])
})

test('toggling player columns updates order cleanly and preserves locked columns', () => {
  const withKuId = togglePlayerColumn(DEFAULT_VISIBLE_PLAYER_COLUMNS, 'kuId', true)
  assert.deepEqual(withKuId, [
    'roomAndWorld',
    'playerName',
    'kuId',
    'character',
    'days',
    'status',
    'action'
  ])

  const stillHasName = togglePlayerColumn(withKuId, 'playerName', false)
  assert.ok(stillHasName.includes('playerName'))
  assert.ok(stillHasName.includes('action'))

  const withoutRoom = togglePlayerColumn(withKuId, 'roomAndWorld')
  assert.equal(withoutRoom.includes('roomAndWorld'), false)
})

test('player column preferences persist and recover gracefully from corrupt storage', () => {
  const storage = createMemoryStorage()
  assert.deepEqual(readVisiblePlayerColumns(storage), DEFAULT_VISIBLE_PLAYER_COLUMNS)

  storage.setItem(PLAYER_LIST_COLUMNS_STORAGE_KEY, '{broken json')
  assert.deepEqual(readVisiblePlayerColumns(storage), DEFAULT_VISIBLE_PLAYER_COLUMNS)

  const saved = saveVisiblePlayerColumns(['roomAndWorld', 'steamId', 'status'], storage)
  assert.deepEqual(saved, ['roomAndWorld', 'playerName', 'status', 'steamId', 'action'])
  assert.deepEqual(readVisiblePlayerColumns(storage), saved)
})

test('PlayerList simplifies header actions, enables column picker, and replaces NativeSelect with UiSelect across C3 views', async () => {
  const [playerList, pagination, activityDialog, layout] = await Promise.all([
    source('src/views/players/PlayerList.vue'),
    source('src/components/Pagination.vue'),
    source('src/components/players/PlayerActivityDialog.vue'),
    source('src/layouts/MainLayoutV2.vue')
  ])

  assert.doesNotMatch(playerList, /NativeSelect/)
  assert.doesNotMatch(pagination, /NativeSelect/)
  assert.doesNotMatch(activityDialog, /NativeSelect/)

  const headerSection = playerList.slice(
    playerList.indexOf('<div class="action-buttons">'),
    playerList.indexOf('</div>\n    </div>')
  )
  assert.equal((headerSection.match(/<UiButton\b/g) || []).length, 4)
  assert.match(headerSection, /<DropdownMenu>[\s\S]*showPlayerRefreshSettings[\s\S]*showUpdateDialog[\s\S]*showSessionSelect[\s\S]*showScheduleDialog/)

  assert.match(playerList, /players\.actions\.columnSettings/)
  assert.match(playerList, /isColumnVisible\('roomAndWorld'\)/)
  assert.match(playerList, /isColumnVisible\('kuId'\)/)
  assert.match(playerList, /isColumnVisible\('steamId'\)/)
  assert.match(playerList, /isColumnVisible\('network'\)/)
  assert.match(playerList, /isColumnVisible\('firstSeen'\)/)
  assert.match(playerList, /isColumnVisible\('lastSeen'\)/)

  assert.match(layout, /main id="main-content-v2" class="mx-auto w-full max-w-\[1440px\]/)
  assert.doesNotMatch(layout, /route\.path !== '\/players\/list'/)
})
