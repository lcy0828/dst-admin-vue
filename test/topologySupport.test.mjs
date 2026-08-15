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
  assert.match(router, /path:\s*'topology'/)
  assert.match(navigation, /to:\s*'\/rooms\/topology'/)
  assert.match(messages, /topologyMessages\['zh-CN'\]/)
  assert.match(messages, /topologyMessages\['en-US'\]/)
  assert.match(topologyMessages, /一颗物理核心最多运行一层世界/)
  assert.match(topologyMessages, /one Shard per physical core/)
})

test('topology page uses shadcn-vue controls and separates planning from confirmed migration', async () => {
  const page = await source('src/views/rooms/RoomTopology.vue')

  assert.match(page, /<SelectGroup>/)
  assert.match(page, /<AlertDialogTitle>/)
  assert.match(page, /<UiTable/)
  assert.match(page, /requiresOvercommitConfirmation/)
  assert.match(page, /target\.configured/)
  assert.match(page, /topology\.planning\.description/)
  assert.match(page, /topologyV2API\.applyPlacement/)
  assert.match(page, /migrationConfirmation/)
  assert.doesNotMatch(page, /bg-(blue|purple|orange|slate)-/)
})
