import assert from 'node:assert/strict'
import test from 'node:test'

import { navigationForFeatures } from '../src/v2/navigation.js'

function navigationItems(features) {
  return navigationForFeatures(features).flatMap(section => section.items)
}

test('all deployment profiles expose centralized node management', () => {
  for (const features of [{ agentControl: false }, { agentControl: true }, {}]) {
    assert.equal(navigationItems(features).some(item => item.labelKey === 'navigation.agents'), true)
  }
})

test('room navigation only exposes room-level destinations', () => {
  const rooms = navigationForFeatures({})[0].items.find(item => item.to === '/rooms/list')

  assert.deepEqual(
    [rooms.to, ...(rooms.children || []).map(item => item.to)].filter(Boolean),
    ['/rooms/list']
  )
})

test('common navigation keeps advanced destinations discoverable without duplicating paths', () => {
 const sections = navigationForFeatures({})
 const paths = sections.flatMap(section => section.items.flatMap(item => item.children || [item])).map(item => item.to)
 assert.equal(new Set(paths).size, paths.length)
 for (const path of ['/rooms/topology', '/rooms/diagnostics', '/worlds/list', '/players/bans', '/servers/tools', '/logs/service', '/cron/tasks']) assert.ok(paths.includes(path))
 assert.equal(sections[0].items.length, 6)
})
