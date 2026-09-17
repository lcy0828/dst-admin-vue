import assert from 'node:assert/strict'
import test from 'node:test'
import {
  ROOM_ARCHIVE_RULE,
  ROOM_BACKEND_FIELD_KEYS,
  ROOM_FIELD_RULES,
  frontendRoomFieldKey,
  roomFieldRule,
  validateRoomField,
  validateRoomSettings
} from '../src/lib/roomSettingsValidation.mjs'
import { roomsMessages } from '../src/i18n/roomsMessages.js'

function leafPaths(value, prefix = '') {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [prefix]
  return Object.entries(value).flatMap(([key, child]) => leafPaths(child, prefix ? `${prefix}.${key}` : key))
}

const validForm = {
  game_mode: 'endless',
  max_players: 12,
  cluster_name: 'Weekend server',
  cluster_description: 'Cooperative survival',
  cluster_password: '',
  cluster_intention: 'cooperative',
  cluster_language: 'zh',
  whitelist_slots: 2,
  tick_rate: 15,
  idle_timeout: 0,
  max_snapshots: 10,
  bind_ip: '127.0.0.1',
  master_ip: '127.0.0.1',
  master_port: 10889,
  cluster_key: 'shared-secret',
  steam_group_id: 0
}

test('room setting constraints mirror backend numeric and text limits', () => {
  assert.deepEqual(
    Object.fromEntries(['max_players', 'tick_rate', 'master_port'].map(key => [key, {
      min: ROOM_FIELD_RULES[key].min,
      max: ROOM_FIELD_RULES[key].max
    }])),
    {
      max_players: { min: 1, max: 64 },
      tick_rate: { min: 15, max: 60 },
      master_port: { min: 1, max: 65535 }
    }
  )
  assert.equal(ROOM_FIELD_RULES.cluster_name.maxLength, 64)
  assert.equal(ROOM_FIELD_RULES.cluster_description.maxLength, 512)
  assert.equal(ROOM_FIELD_RULES.cluster_key.maxBytes, 256)
  assert.equal(ROOM_ARCHIVE_RULE.pattern.test('room-2026_08'), true)
  assert.equal(ROOM_ARCHIVE_RULE.pattern.test('-room'), false)
})

test('allowlist reserved slots follow the current player limit', () => {
  assert.equal(roomFieldRule('whitelist_slots', validForm).max, 12)
  assert.equal(validateRoomField('whitelist_slots', 12, validForm), null)
  assert.deepEqual(validateRoomField('whitelist_slots', 13, validForm), {
    code: 'range', min: 0, max: 12
  })
})

test('invalid room values are reported without mutating the submitted form', () => {
  const invalid = {
    ...validForm,
    max_players: 65,
    tick_rate: 12,
    cluster_description: 'first line\nsecond line'
  }
  const before = structuredClone(invalid)
  const errors = validateRoomSettings(invalid)

  assert.deepEqual(errors.max_players, { code: 'range', min: 1, max: 64 })
  assert.deepEqual(errors.tick_rate, { code: 'range', min: 15, max: 60 })
  assert.deepEqual(errors.cluster_description, { code: 'singleLine' })
  assert.deepEqual(invalid, before)
})

test('backend room field names map to visible form controls', () => {
  assert.equal(frontendRoomFieldKey('maxPlayers'), 'max_players')
  assert.equal(frontendRoomFieldKey('clusterDescription'), 'cluster_description')
  assert.equal(frontendRoomFieldKey('unknownField'), 'unknownField')
})

test('room setting descriptions and constraints stay aligned across locales', () => {
  assert.deepEqual(
    leafPaths(roomsMessages['zh-CN'].rooms.settings).sort(),
    leafPaths(roomsMessages['en-US'].rooms.settings).sort()
  )
  for (const locale of ['zh-CN', 'en-US']) {
    const fields = roomsMessages[locale].rooms.settings.fields
    for (const key of Object.values(ROOM_BACKEND_FIELD_KEYS)) {
      assert.ok(fields[key]?.description, `${locale}.${key} needs a description`)
      if (ROOM_FIELD_RULES[key]?.constraint) {
        assert.ok(fields[key]?.constraint, `${locale}.${key} needs a visible constraint`)
      }
    }
  }

  assert.match(roomsMessages['zh-CN'].rooms.settings.fields.cluster_language.description, /模组.*重启/)
  assert.match(roomsMessages['en-US'].rooms.settings.fields.cluster_language.description, /mods.*Restart/i)
})
