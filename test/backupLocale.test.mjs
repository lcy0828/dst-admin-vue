import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { backupMessages } from '../src/i18n/backupMessages.js'

function leafPaths(value, prefix = '') {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [prefix]
  return Object.entries(value).flatMap(([key, child]) => (
    leafPaths(child, prefix ? `${prefix}.${key}` : key)
  ))
}

test('backup locale catalogs expose matching keys', () => {
  assert.deepEqual(
    leafPaths(backupMessages['en-US']).sort(),
    leafPaths(backupMessages['zh-CN']).sort()
  )
})

test('backup page localizes presentation without changing backup identifiers', () => {
  const page = fs.readFileSync(new URL('../src/views/Backups.vue', import.meta.url), 'utf8')
  const catalogPanel = fs.readFileSync(new URL('../src/views/backups/DistributedBackupPanel.vue', import.meta.url), 'utf8')
  const importPanel = fs.readFileSync(new URL('../src/views/backups/SaveImportsPanel.vue', import.meta.url), 'utf8')
  const adapters = fs.readFileSync(new URL('../src/api/v2LegacyAdapters.js', import.meta.url), 'utf8')
  const globalMessages = fs.readFileSync(new URL('../src/i18n/messages.js', import.meta.url), 'utf8')
  const template = page.slice(page.indexOf('<template>'), page.indexOf('</template>'))
  const importTemplate = importPanel.slice(importPanel.indexOf('<template>'), importPanel.indexOf('</template>'))

  assert.doesNotMatch(template, /[\u3400-\u9fff]/)
  assert.doesNotMatch(importTemplate, /[\u3400-\u9fff]/)
  assert.match(template, /DistributedBackupPanel v-if="workspace === 'backups'"/)
  assert.match(template, /SaveImportsPanel v-else/)
  assert.doesNotMatch(template, /TabsTrigger/)
  assert.match(catalogPanel, /backupSetsV2API\.list\(roomId\)/)
  assert.match(catalogPanel, /backupsV2API\.list\(roomId\)/)
  assert.match(catalogPanel, /backupSetsV2API\.create/)
  assert.match(catalogPanel, /source: 'legacy'/)
  assert.match(catalogPanel, /Promise\.allSettled/)
  assert.match(catalogPanel, /backupsV2API\.downloadBlob/)
  assert.match(importPanel, /saveImportStatusKey\(item\.status\)/)
  assert.match(importPanel, /saveImportCompatibilityKey\(candidate\.compatibility\)/)
  assert.match(importPanel, /runtimeTarget\.value\?\.kind === 'local'/)
  assert.doesNotMatch(page, /toast\.success\(res\.msg/)
  assert.match(adapters, /create_time: backup\.createdAt \|\| ''/)
  assert.match(globalMessages, /\.\.\.backupMessages\['en-US'\]/)
})

test('save import API exposes the complete local workflow', () => {
  const api = fs.readFileSync(new URL('../src/api/v2.js', import.meta.url), 'utf8')
  const config = fs.readFileSync(new URL('../src/api/config.js', import.meta.url), 'utf8')

  assert.match(api, /export const saveImportsV2API/)
  assert.match(api, /client\.get\('\/save-imports'/)
  assert.match(api, /client\.post\('\/save-imports\/upload'/)
  assert.match(api, /`\/save-imports\/\$\{encode\(importId\)\}\/actions\/analyze`/)
  assert.match(api, /`\/save-imports\/\$\{encode\(importId\)\}\/actions\/apply`/)
  assert.match(api, /client\.delete\(`\/save-imports\/\$\{encode\(importId\)\}`/)
  assert.match(api, /timeout: apiConfig\.UPLOAD_TIMEOUT/)
  assert.match(config, /UPLOAD_TIMEOUT: 7200000/)
})

test('English backup messages contain no Chinese display text', () => {
  for (const path of leafPaths(backupMessages['en-US'])) {
    const value = path.split('.').reduce((current, key) => current?.[key], backupMessages['en-US'])
    assert.doesNotMatch(String(value), /[\u3400-\u9fff]/, path)
  }
})
