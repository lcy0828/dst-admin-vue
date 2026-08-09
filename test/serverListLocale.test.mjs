import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import { serverMessages } from '../src/i18n/serverMessages.js'

function messageKeys(value, prefix = '') {
  return Object.entries(value).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key
    return child && typeof child === 'object' && !Array.isArray(child)
      ? messageKeys(child, path)
      : [path]
  }).sort()
}

test('server locale catalogs expose matching keys', () => {
  assert.deepEqual(
    messageKeys(serverMessages['en-US']),
    messageKeys(serverMessages['zh-CN'])
  )
})

test('server list localizes runtime presentation without changing protocol values', async () => {
  const source = await readFile(new URL('../src/views/servers/ServerList.vue', import.meta.url), 'utf8')

  assert.match(source, /worldStatusLabel\(status, key => this\.\$t\(key\)\)/)
  assert.match(source, /worldPrimaryAction\(server, key => this\.\$t\(key\)\)/)
  assert.match(source, /\['autumn', 'winter', 'spring', 'summer'\]\.includes\(normalized\)/)
  assert.doesNotMatch(source, /response\?\.msg \|\|/)
})
