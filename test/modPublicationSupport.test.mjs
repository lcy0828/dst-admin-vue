import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import {
  isModPublicationUnavailable,
  publicationBlockerKey,
  publicationIsTerminal,
  publicationOutcomeKey,
  publicationPhaseKey,
  publicationProgress,
  publicationStatusKey,
  publicationStatusVariant,
  publicationTargetPhase,
  publicationTargetWorlds
} from '../src/lib/modPublication.mjs'

const source = path => readFile(new URL(path, import.meta.url), 'utf8')

test('mod publication control-plane API never inherits the manual runtime target', async () => {
  const api = await source('../src/api/v2.js')
  const start = api.indexOf('export const modPublicationsV2API')
  const end = api.indexOf('export const automationV2API', start)
  const publicationAPI = api.slice(start, end)

  assert.match(publicationAPI, /mod-publications\/preview/)
  assert.match(publicationAPI, /\/mod-publications\/\$\{encode\(publicationId\)\}/)
  assert.match(publicationAPI, /retry-failed/)
  assert.equal(publicationAPI.match(/runtimeTarget:\s*false/g)?.length, 5)
})

test('installed mod mapping does not invent per-mod publication state', async () => {
  const adapter = await source('../src/api/modApi.js')
  const start = adapter.indexOf('function mapInstalledMod')
  const end = adapter.indexOf('\n}', start) + 2
  const mapping = adapter.slice(start, end)
  assert.doesNotMatch(mapping, /publication(Status|Outcome|Targets|Id)?:/)
  assert.doesNotMatch(mapping, /target(Statuses|Status|Name|Id):/)
})

test('publication creation and retry resolve their completed jobs to final publications', async () => {
  const adapter = await source('../src/api/modApi.js')
  const createStart = adapter.indexOf('async function createModPublication')
  const listStart = adapter.indexOf('async function listModPublications', createStart)
  const retryStart = adapter.indexOf('async function retryModPublication')
  const libraryStart = adapter.indexOf('async function getLibrary', retryStart)
  const createBlock = adapter.slice(createStart, listStart)
  const retryBlock = adapter.slice(retryStart, libraryStart)

  assert.match(createBlock, /modPublicationsV2API\.create/)
  assert.match(createBlock, /finishModPublication\(roomId, job, onProgress\)/)
  assert.match(retryBlock, /modPublicationsV2API\.get\(resolvedPublicationId\)/)
  assert.match(retryBlock, /current\?\.roomId/)
  assert.match(retryBlock, /modPublicationsV2API\.retry/)
  assert.match(retryBlock, /IN_PLACE_PUBLICATION_RETRY_STATES/)
  assert.match(retryBlock, /finishModPublication\(roomId, job, options\.onProgress, inPlace \? resolvedPublicationId : ''\)/)
})

test('publication presentation helpers normalize backend states without inventing progress', () => {
  assert.equal(publicationStatusKey('rolled_back'), 'rolledBack')
  assert.equal(publicationStatusKey('custom-state'), 'unknown')
  assert.equal(publicationStatusVariant('recovery_required'), 'destructive')
  assert.equal(publicationPhaseKey('verifying'), 'verify')
  assert.equal(publicationOutcomeKey('partial'), 'partial')
  assert.equal(publicationBlockerKey('INSUFFICIENT_DISK_SPACE'), 'insufficientDisk')
  assert.equal(publicationBlockerKey('DISK_INSUFFICIENT'), 'insufficientDisk')
  assert.equal(publicationBlockerKey('RUNTIME_VERSION_BLOCKED'), 'capabilityMissing')
  assert.equal(publicationBlockerKey('TARGET_OBSERVE_FAILED'), 'nodeOffline')
  assert.equal(publicationProgress({ status: 'prepared' }), 40)
  assert.equal(publicationProgress({ progress: 147 }), 100)
  assert.equal(publicationProgress({ status: 'custom-state' }), 0)
  assert.equal(publicationIsTerminal({ status: 'committed' }), false)
  assert.equal(publicationIsTerminal({ status: 'succeeded' }), true)
  assert.equal(publicationTargetPhase({ cacheEnsured: true, status: 'preparing' }), 'download')
  assert.equal(publicationTargetPhase({ prepared: true, cacheEnsured: true }), 'stage')
  assert.equal(publicationTargetPhase({ rolledBack: true, completed: true }), 'rollback')
  assert.deepEqual(publicationTargetWorlds({ worlds: [{ worldName: 'Surface' }, { worldId: 'caves' }] }), ['Surface', 'caves'])
  assert.equal(isModPublicationUnavailable({ status: 404, code: 'MOD_TARGET_NOT_FOUND' }), false)
  assert.equal(isModPublicationUnavailable({ status: 404, code: 'ENDPOINT_NOT_FOUND' }), true)
  assert.equal(isModPublicationUnavailable({ code: 'REMOTE_RUNTIME_MUTATION_UNAVAILABLE' }), false)
})

test('room publication panel uses accessible shadcn status composition', async () => {
  const panel = await source('../src/components/mods/RoomModPublicationPanel.vue')

  assert.match(panel, /<DialogTitle>/)
  assert.match(panel, /<DialogDescription>/)
  assert.match(panel, /<Table>/)
  assert.match(panel, /<Progress/)
  assert.match(panel, /<Badge/)
  assert.match(panel, /modApi\.previewModPublication/)
  assert.match(panel, /modApi\.createModPublication/)
  assert.doesNotMatch(panel, /bg-(blue|purple|orange|slate)-/)
})
