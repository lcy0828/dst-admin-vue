import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { parse } from '@babel/parser'
import { parse as parseSFC } from '@vue/compiler-sfc'
import { computed, reactive, ref } from 'vue'
import { workshopMessages } from '../src/i18n/workshopMessages.js'
import { isModItemQuery, resolveModSearchSort } from '../src/lib/modSearchDefaults.mjs'
import { createModFailure, formatModFailure, modMessages } from '../src/i18n/modMessages.js'

const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
async function networkForm() {
  const source = await readFile(new URL('../src/components/settings/WorkshopNetworkPanel.vue', import.meta.url), 'utf8')
  const script = parseSFC(source).descriptor.scriptSetup.content
  const body = parse(script, { sourceType: 'module' }).program.body.filter(node => node.type !== 'ImportDeclaration').map(node => script.slice(node.start, node.end)).join('\n')
  const scope = { computed, reactive, ref, watch() {}, onMounted() {}, onBeforeUnmount() {}, useI18n: () => ({ t: key => key }) }
  return new Function(...Object.keys(scope), `${body}\nreturn { accept, input, form, proxyEdited, clearKey }`)(...Object.values(scope))
}

test('a readable proxy endpoint is preserved without overwriting stored credentials on unrelated saves', async () => {
  const vm = await networkForm()
  vm.accept({ revision: 'r1', fields: [
    { id: 'mod.proxyMode', value: 'custom', editable: true },
    { id: 'mod.proxyURL', value: '', displayValue: 'http://proxy.example:7890', sensitive: true, configured: true, editable: true },
    { id: 'mod.steamAPIKey', value: '', sensitive: true, configured: true, editable: true },
  ] })
  assert.equal(vm.form['mod.proxyURL'], 'http://proxy.example:7890')
  vm.form['mod.steamAPIBase'] = 'https://api.example.com'
  assert.equal(Object.hasOwn(vm.input().values, 'mod.proxyURL'), false)
  vm.clearKey.value = true
  assert.deepEqual(vm.input().clearSecrets, ['mod.steamAPIKey'])
  assert.equal(Object.hasOwn(vm.input().values, 'mod.proxyURL'), false)

  vm.form['mod.proxyURL'] = 'http://new-proxy.example:1080'
  vm.proxyEdited.value = true // Input emits update:modelValue only for an edit.
  assert.equal(vm.input().values['mod.proxyURL'], 'http://new-proxy.example:1080')
  vm.accept({ revision: 'r2', fields: [{ id: 'mod.proxyURL', value: '', displayValue: 'http://new-proxy.example:1080', sensitive: true, configured: true }] })
  assert.equal(Object.hasOwn(vm.input().values, 'mod.proxyURL'), false)
})

test('a legacy settings response cannot silently clear a configured proxy', async () => {
  const vm = await networkForm()
  vm.accept({ revision: 'old', fields: [{ id: 'mod.proxyURL', value: '', sensitive: true, configured: true }] })
  assert.equal(Object.hasOwn(vm.input().values, 'mod.proxyURL'), false)
})

async function searchInstance(search) {
  const source = await readFile(new URL('../src/views/mods/ModSearch.vue', import.meta.url), 'utf8')
  const script = parseSFC(source).descriptor.script.content
  const declaration = parse(script, { sourceType: 'module' }).program.body.find(node => node.type === 'ExportDefaultDeclaration').declaration
  const properties = declaration.properties.filter(node => node.key.name !== 'components').map(node => script.slice(node.start, node.end))
  const scope = { isModItemQuery, resolveModSearchSort, modThumbnailUrl() {}, modApi: { searchMods: search }, workshopV2API: { enrich: async () => ({ items: {} }) }, createModFailure: (_, error) => ({ ...error, message: error.message, retryAfterSeconds: error.details?.retryAfterSeconds }), formatModFailure: (_, error) => error?.message || '' }
  const options = new Function(...Object.keys(scope), `return ({${properties.join(',')}})`)(...Object.values(scope))
  const vm = { ...options.data(), $t: key => key }
  for (const [name, fn] of Object.entries(options.methods)) vm[name] = fn.bind(vm)
  for (const [name, getter] of Object.entries(options.computed)) Object.defineProperty(vm, name, { get: getter.bind(vm) })
  return vm
}

test('Workshop messages have matching Chinese and English keys', () => {
  const paths = (object, prefix = '') => Object.entries(object).flatMap(([key, value]) => typeof value === 'object' ? paths(value, `${prefix}${key}.`) : [`${prefix}${key}`])
  assert.deepEqual(paths(workshopMessages['zh-CN']).sort(), paths(workshopMessages['en-US']).sort())
})

test('Workshop failures use the selected language instead of the backend generic message', () => {
  for (const locale of ['zh-CN', 'en-US']) {
    const catalog = { ...modMessages[locale], ...workshopMessages[locale] }
    const translate = (key, parameters = {}) => Object.entries(parameters).reduce((message, [name, value]) => message.replaceAll(`{${name}}`, value), key.split('.').reduce((value, part) => value?.[part], catalog))
    const failure = createModFailure('mods.errors.search', { code: 'WORKSHOP_TIMEOUT', message: '创意工坊资料暂不可用', requestId: 'fixture-request' })
    const message = formatModFailure(translate, failure)
    assert.ok(message.includes(workshopMessages[locale].workshop.codes.WORKSHOP_TIMEOUT))
    assert.ok(message.includes('fixture-request'))
    assert.ok(!message.includes('创意工坊资料暂不可用'))
  }
})

test('search keeps previous results when a network request fails', async () => {
  let fail = false
  const vm = await searchInstance(async () => { if (fail) throw new Error('offline'); return { items: [{ id: '100', name: 'Known' }], total: 1, source: 'api', configVersion: 'v1' } })
  await vm.searchMods()
  fail = true
  const oldResults = vm.searchResults
  const pending = vm.searchMods()
  assert.equal(vm.searchResults, oldResults)
  await pending
  assert.equal(vm.searchResults[0].name, 'Known')
  assert.equal(vm.loadFailure.message, 'offline')
  assert.equal(vm.searching, false)
})

test('a late response cannot overwrite a newer search and the old request is canceled', async () => {
  const first = deferred(), second = deferred(), calls = []
  const vm = await searchInstance(input => { calls.push(input); return calls.length === 1 ? first.promise : second.promise })
  vm.searchForm.keyword = 'first'
  const a = vm.searchMods()
  vm.searchForm.keyword = 'second'
  const b = vm.searchMods()
  assert.equal(calls[0].signal.aborted, true)
  second.resolve({ items: [{ id: '200', name: 'New' }], source: 'community', configVersion: 'v1' })
  await b
  first.resolve({ items: [{ id: '100', name: 'Old' }], source: 'api', configVersion: 'v0' })
  await a
  assert.equal(vm.searchResults[0].name, 'New')
  assert.equal(vm.searchSource, 'community')
})

test('pagination retains its source and changing filters starts a new search', async () => {
  const calls = []
  const vm = await searchInstance(async input => { calls.push(input); return { items: [], source: 'api', configVersion: 'v1', totalKind: 'lower_bound', hasMore: true } })
  await vm.searchMods()
  vm.currentPage = 2
  await vm.searchMods()
  assert.equal(calls[1].source, 'api')
  assert.equal(calls[1].configVersion, 'v1')
  assert.equal(calls[1].page, 2)
  vm.searchForm.category = 'utility'
  await vm.searchMods()
  assert.equal(calls[2].page, 1)
  assert.equal(calls[2].source, '')
  assert.equal(vm.totalKind, 'lower_bound')
})

test('Chinese IME confirmation does not submit an incomplete search', async () => {
  let calls = 0
  const vm = await searchInstance(async () => { calls++; return { items: [] } })
  vm.searchComposing = true
  vm.startSearch({ isComposing: true })
  assert.equal(calls, 0)
  vm.searchComposing = false
  vm.startSearch({ isComposing: false })
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(calls, 1)
})

test('rate-limit failures preserve a bounded retry time from the server', () => {
  for (const [input, expected] of [[12.1, 13], [9999999, 86400], [0, undefined], [-1, undefined], ['bad', undefined], [Infinity, undefined]]) {
    const failure = createModFailure('mods.errors.search', { code: 'WORKSHOP_RATE_LIMITED', details: { retryAfterSeconds: input } })
    assert.equal(failure.retryAfterSeconds, expected)
  }
})

test('an ID or item link does not get mistaken for unavailable name search', () => {
  for (const input of ['100', ' https://steamcommunity.com/sharedfiles/filedetails/?id=100&l=schinese ']) assert.equal(isModItemQuery(input), true)
  for (const input of ['example', '', 'https://example.com/sharedfiles/filedetails/?id=100', 'https://steamcommunity.com/sharedfiles/filedetails/?id=bad', '100'.repeat(10)]) assert.equal(isModItemQuery(input), false)
})

test('rate cooldown blocks repeated clicks and filter changes without automatically retrying', async t => {
  let calls = 0
  const vm = await searchInstance(async () => {
    calls++
    throw Object.assign(new Error('rate limited'), { code: 'WORKSHOP_RATE_LIMITED', details: { retryAfterSeconds: 10 } })
  })
  t.after(() => clearInterval(vm.searchCooldownTimer))
  vm.searchForm.keyword = 'example'
  await vm.searchMods()
  assert.equal(vm.searchRetrySeconds, 10)
  assert.equal(vm.searchRetryBlocked, true)
  await vm.retryLoad()
  vm.searchForm.category = 'utility'
  await vm.searchMods()
  assert.equal(calls, 1)
  assert.equal(vm.searchFailureKeyword, 'example')
  assert.equal(vm.loadFailure.code, 'WORKSHOP_RATE_LIMITED')
  // Expiry enables an explicit retry, and does not itself send a request.
  vm.searchCooldownUntil = Date.now() - 1
  vm.searchClock = Date.now()
  assert.equal(vm.searchRetryBlocked, false)
  assert.equal(calls, 1)
  await vm.retryLoad()
  assert.equal(calls, 2)
})

test('a community cooldown still allows an independent ID lookup and preserves earlier results', async t => {
  const calls = []
  const vm = await searchInstance(async input => {
    calls.push(input.keyword)
    if (input.keyword === 'example') throw Object.assign(new Error('rate limited'), { code: 'WORKSHOP_RATE_LIMITED', details: { retryAfterSeconds: 20 } })
    return { items: [{ id: '100', name: 'API result' }], source: 'api' }
  })
  t.after(() => clearInterval(vm.searchCooldownTimer))
  vm.searchResults = [{ id: '200', name: 'Earlier result' }]
  vm.searchForm.keyword = 'example'
  await vm.searchMods()
  assert.equal(vm.searchResults[0].name, 'Earlier result')
  vm.searchForm.keyword = '100'
  assert.equal(vm.searchRetryBlocked, false)
  await vm.searchMods()
  assert.deepEqual(calls, ['example', '100'])
  assert.equal(vm.loadFailure, null)
  assert.equal(vm.searchResults[0].name, 'API result')
  assert.equal(vm.searchRetrySeconds, 0)
})

test('a late rate-limit error cannot block a newer successful search', async t => {
  const first = deferred()
  const vm = await searchInstance(input => input.keyword === 'old' ? first.promise : Promise.resolve({ items: [{ id: '100' }] }))
  t.after(() => clearInterval(vm.searchCooldownTimer))
  vm.searchForm.keyword = 'old'
  const pending = vm.searchMods()
  vm.searchForm.keyword = '100'
  await vm.searchMods()
  first.reject(Object.assign(new Error('rate limited'), { code: 'WORKSHOP_RATE_LIMITED', details: { retryAfterSeconds: 60 } }))
  await pending
  assert.equal(vm.loadFailure, null)
  assert.equal(vm.searchRetryBlocked, false)
})
