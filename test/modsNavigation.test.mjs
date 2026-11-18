import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveModsActiveTab } from '../src/lib/modsNavigation.mjs'

test('defaults to room tab when rooms exist and no tab query is specified', () => {
  assert.equal(resolveModsActiveTab({}, { hasRooms: true }), 'room')
})

test('falls back to workshop tab when no rooms exist and no tab query is specified', () => {
  assert.equal(resolveModsActiveTab({}, { hasRooms: false }), 'workshop')
})

test('respects explicit tab query', () => {
  assert.equal(resolveModsActiveTab({ tab: 'workshop' }, { hasRooms: true }), 'workshop')
  assert.equal(resolveModsActiveTab({ tab: 'room' }, { hasRooms: false }), 'room')
  assert.equal(resolveModsActiveTab({ tab: 'catalog' }, { hasRooms: true }), 'catalog')
})

test('maps runtime catalog query parameters to catalog tab', () => {
  assert.equal(resolveModsActiveTab({ source: 'runtime' }, { hasRooms: true }), 'catalog')
  assert.equal(resolveModsActiveTab({ scope: 'downloaded' }, { hasRooms: true }), 'catalog')
  assert.equal(resolveModsActiveTab({ scope: 'updates' }, { hasRooms: true }), 'catalog')
})

test('selects room tab when roomId is present', () => {
  assert.equal(resolveModsActiveTab({ roomId: 'room-1' }, { hasRooms: false }), 'room')
})
