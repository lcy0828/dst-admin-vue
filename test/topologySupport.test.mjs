import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { topologyMessages } from '../src/i18n/topologyMessages.js'

const source = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8')

function leafPaths(value, prefix = '') {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [prefix]
  return Object.entries(value).flatMap(([key, child]) => leafPaths(child, prefix ? `${prefix}.${key}` : key))
}

test('topology locale catalogs expose matching keys', () => {
  assert.deepEqual(
    leafPaths(topologyMessages['en-US']).sort(),
    leafPaths(topologyMessages['zh-CN']).sort()
  )
  assert.doesNotMatch(JSON.stringify(topologyMessages['en-US']), /[\u3400-\u9fff]/)
})

test('distributed topology is wired through API, router, navigation and i18n', async () => {
  const [api, router, navigation, messages, topologyMessages] = await Promise.all([
    source('src/api/v2.js'),
    source('src/router/index.js'),
    source('src/v2/navigation.js'),
    source('src/i18n/messages.js'),
    source('src/i18n/topologyMessages.js')
  ])

  assert.match(api, /export const topologyV2API/)
  assert.match(api, /runtimeTarget:\s*false/)
  assert.match(api, /\/rooms\/\$\{encode\(roomId\)\}\/topology/)
  assert.match(api, /topology\/preview/)
  assert.match(api, /topology\/shard-links\/actions\/discover/)
  assert.match(router, /path:\s*'topology'/)
  assert.match(navigation, /to:\s*'\/rooms\/topology'/)
  assert.match(messages, /topologyMessages\['zh-CN'\]/)
  assert.match(messages, /topologyMessages\['en-US'\]/)
  assert.match(topologyMessages, /2 核及以下不额外预留整核/)
  assert.match(topologyMessages, /up to 2 effective CPUs reserve no whole CPU/)
  assert.doesNotMatch(topologyMessages, /reserve at least one additional core/)
})

test('topology page uses shadcn-vue controls and separates planning from confirmed migration', async () => {
  const [page, editor] = await Promise.all([
    source('src/views/rooms/RoomTopology.vue'),
    source('src/components/rooms/RoomPlacementCard.vue')
  ])

  assert.match(page, /<RoomScopeSelect[^>]*:rooms="rooms"[^>]*@update:model-value="selectRoom"/)
  assert.match(page, /<UiTable/)
  assert.match(page, /<RoomPlacementCard/)
  assert.match(page, /topology\.placements\.simpleDescription/)
  assert.match(page, /<Collapsible/)
  assert.match(page, /resourceConflicts/)
  assert.match(page, /resourceAdvisories/)
  assert.match(page, /resourceAdvisoryPorts/)
  assert.match(page, /topology\.risks\.overlapDescription/)
  assert.doesNotMatch(page, /draftPlacements|topologyV2API\.(preview|update|applyPlacement)/)
  assert.match(editor, /requiresOvercommitConfirmation/)
  assert.match(editor, /target\.configured/)
  assert.match(editor, /topologyV2API\.applyPlacement/)
  assert.match(editor, /confirmation:\s*roomNameForConfirmation\.value/)
  assert.doesNotMatch(`${page}\n${editor}`, /migrationConfirmation|migration-confirmation/)
  assert.doesNotMatch(page, /bg-(blue|purple|orange|slate)-/)
})
