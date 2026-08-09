import assert from 'node:assert/strict'
import test from 'node:test'
import {
  translateWorldStateValue,
  worldStateMessages
} from '../src/i18n/worldStateMessages.js'
import { messages } from '../src/i18n/messages.js'

function leafPaths(value, prefix = '') {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [prefix]
  return Object.entries(value).flatMap(([key, child]) => (
    leafPaths(child, prefix ? `${prefix}.${key}` : key)
  ))
}

function readPath(value, path) {
  return path.split('.').reduce((current, key) => current?.[key], value)
}

test('world state locales expose identical message keys', () => {
  assert.deepEqual(
    leafPaths(worldStateMessages['en-US']).sort(),
    leafPaths(worldStateMessages['zh-CN']).sort()
  )
  assert.equal(Object.keys(worldStateMessages['zh-CN'].worldState.details.fields).length, 54)
})

test('world state value translation preserves unknown protocol values', () => {
  const messages = worldStateMessages['en-US']
  const translate = key => readPath(messages, key)
  const hasTranslation = key => readPath(messages, key) !== undefined

  assert.equal(translateWorldStateValue(translate, hasTranslation, 'seasons', 'autumn'), 'Autumn')
  assert.equal(translateWorldStateValue(translate, hasTranslation, 'seasons', 'mod_season'), 'mod_season')
  assert.equal(translateWorldStateValue(translate, hasTranslation, 'nightmare', 'mod_phase'), 'mod_phase')
  assert.equal(translateWorldStateValue(translate, hasTranslation, 'seasons', ''), 'Unknown')
})

test('world state messages are registered in the global locale catalogs', () => {
  assert.equal(messages['zh-CN'].worldState.title, '世界状态')
  assert.equal(messages['en-US'].worldState.title, 'World State')
})
