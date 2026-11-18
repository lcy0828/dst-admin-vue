import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { parse } from '@vue/compiler-sfc'

import { workbenchMessages } from '../src/i18n/workbenchMessages.js'

const SRC_ROOT = new URL('../src/', import.meta.url).pathname

function walkVueFiles(dir) {
  const results = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...walkVueFiles(fullPath))
    } else if (entry.name.endsWith('.vue')) {
      results.push(fullPath)
    }
  }
  return results
}

function collectLeafPaths(value, prefix = '') {
  if (typeof value === 'string') {
    return [[prefix, value]]
  }
  if (!value || typeof value !== 'object') return []
  return Object.entries(value)
    .sort(([a], [b]) => a.localeCompare(b))
    .flatMap(([key, child]) => collectLeafPaths(child, prefix ? `${prefix}.${key}` : key))
}

test('no native <details> or <summary> disclosure elements remain in src Vue templates', () => {
  const offenders = []
  for (const file of walkVueFiles(SRC_ROOT)) {
    const source = readFileSync(file, 'utf8')
    const { descriptor } = parse(source)
    const template = descriptor.template?.content || ''
    if (/<(?:details|summary)\b/i.test(template)) {
      offenders.push(path.relative(SRC_ROOT, file))
    }
  }
  assert.deepEqual(offenders, [])
})

test('updated workbench templates contain no hard-coded CJK copy and workbenchMessages remain symmetric', () => {
  const checked = [
    'components/game-tools/WorkbenchCommands.vue',
    'components/game-tools/CommandRunResult.vue',
    'components/game-tools/ResourceEntityPicker.vue'
  ]
  for (const rel of checked) {
    const source = readFileSync(path.join(SRC_ROOT, rel), 'utf8')
    const { descriptor } = parse(source)
    const template = (descriptor.template?.content || '').replace(/<!--[\s\S]*?-->/g, '')
    assert.doesNotMatch(template, /[\u3400-\u9fff]/, rel)
  }

  const zhEntries = collectLeafPaths(workbenchMessages['zh-CN'])
  const enEntries = collectLeafPaths(workbenchMessages['en-US'])
  assert.deepEqual(
    zhEntries.map(([key]) => key),
    enEntries.map(([key]) => key)
  )
  for (const [key, value] of enEntries) {
    assert.doesNotMatch(value, /[\u3400-\u9fff]/, `en-US.${key}`)
  }
})
