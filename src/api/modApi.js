import { modPublicationsV2API, modsV2API, modUpdatesV2API, roomsV2API, topologyV2API } from './v2'
import { waitForV2Job } from './v2ConfigurationAdapters'
import { adapterError } from './adapterProtocol.mjs'
import { resolveModPublicationJob } from './modPublicationJob.mjs'
import { mergeRoomModCatalog } from '../lib/roomModCatalog.mjs'
import { compareWorldRoles } from '../lib/worldRuntimeStatus.mjs'
import { preferredRoomId } from '../lib/pageScope.mjs'

const MOD_JOB_TIMEOUT = 15 * 60 * 1000
const IN_PLACE_PUBLICATION_RETRY_STATES = new Set([
  'previewed',
  'preparing',
  'prepared',
  'publishing',
  'committed',
  'completing',
  'recovery_required'
])

function matchResource(item, value) {
  return item.id === value || item.name === value || item.directoryName === value
}

function requireValue(value, code, context = {}) {
  if (!value) throw adapterError(code, { context })
  return value
}

function mapSearchMod(mod) {
  const rating = Number(mod.ratingCount) > 0 || Number(mod.score) > 0 ? Number(mod.score) : null
  const subscriptions = Number(mod.subscriptions) || 0
  return {
    id: mod.id,
    name: mod.name || '',
    auth: mod.author || '',
    author: mod.author || '',
    metadataWarning: mod.metadataWarning || '',
    img: mod.previewUrl || '',
    image: mod.previewUrl || '',
    sub: String(subscriptions),
    subscriptions,
    time: mod.updatedAt || '',
    updatedAt: mod.updatedAt || '',
    createdAt: mod.createdAt || '',
    version: mod.version || '',
    describe: mod.description || '',
    description: mod.description || '',
    rating,
    ratingCount: Number(mod.ratingCount) || 0,
    favorites: Number(mod.favorites) || 0,
    views: Number(mod.views) || 0,
    fileSize: Number(mod.fileSize) || 0,
    tags: mod.tags || [],
    downloaded: Boolean(mod.downloaded),
    configured: Boolean(mod.configured),
    installed: Boolean(mod.installed),
    loaded: Boolean(mod.loaded),
    dependencies: mod.dependencies || [],
    workshopUrl: `https://steamcommunity.com/sharedfiles/filedetails/?id=${mod.id}`,
    changelogUrl: `https://steamcommunity.com/sharedfiles/filedetails/changelog/${mod.id}`
  }
}

function mapInstalledMod(mod, replica = null, replicaError = null, profile = null, profileError = null) {
  const rating = Number(mod.ratingCount) > 0 || Number(mod.score) > 0 ? Number(mod.score) : null
  const subscriptions = Number(mod.subscriptions) || 0
  return {
    id: mod.id,
    modid: mod.id,
    name: mod.name || `Workshop ${mod.id}`,
    author: mod.author || '',
    description: mod.description || '',
    image: mod.previewUrl || '',
    version: mod.runtimeVersion || mod.version || '',
    currentVersion: mod.runtimeVersion || '',
    latestVersion: mod.latestVersion || mod.version || '',
    runtimeVersionStatus: mod.runtimeVersionStatus || '',
    runtimeCurrentTargets: Number(mod.runtimeCurrentTargets) || 0,
    runtimeOutdatedTargets: Number(mod.runtimeOutdatedTargets) || 0,
    runtimeUnknownVersionTargets: Number(mod.runtimeUnknownVersionTargets) || 0,
    runtimeVersions: Array.isArray(mod.runtimeVersions) ? mod.runtimeVersions : [],
    update_time: mod.updatedAt || '',
    updatedAt: mod.updatedAt || '',
    createdAt: mod.createdAt || '',
    subscribers: String(subscriptions),
    subscriptions,
    rating,
    ratingCount: Number(mod.ratingCount) || 0,
    favorites: Number(mod.favorites) || 0,
    views: Number(mod.views) || 0,
    fileSize: Number(mod.fileSize) || 0,
    tags: mod.tags || [],
    downloaded: Boolean(mod.downloaded),
    configured: Boolean(mod.configured),
    installed: Boolean(mod.installed),
    loaded: Boolean(mod.loaded),
    runtimeObserved: Boolean(mod.runtimeObserved),
    runtimeFileStatus: mod.runtimeFileStatus || '',
    runtimeReadyTargets: Number(mod.runtimeReadyTargets) || 0,
    runtimePendingTargets: Number(mod.runtimePendingTargets) || 0,
    runtimeUnavailableTargets: Number(mod.runtimeUnavailableTargets) || 0,
    runtimeTotalTargets: Number(mod.runtimeTotalTargets) || 0,
    enabled: Boolean(mod.enabled),
    updateAvailable: Number(mod.runtimeOutdatedTargets) > 0 || mod.health === 'update_available',
    health: mod.health,
    healthMessage: mod.healthMessage || '',
    repairAction: mod.repairAction || '',
    configuredWorlds: mod.configuredWorlds || [],
    enabledWorlds: mod.enabledWorlds || [],
    installedWorlds: mod.installedWorlds || [],
    loadedWorlds: mod.loadedWorlds || [],
    worldRevisions: profile?.worldRevisions || {},
    parser: mod.parser || '',
    fallbackUsed: Boolean(mod.fallbackUsed),
    fallbackReason: mod.fallbackReason || '',
    warnings: mod.warnings || [],
    time: mod.localUpdatedAt || '',
    installedAt: mod.localUpdatedAt || '',
    localUpdatedAt: mod.localUpdatedAt || '',
    path: '',
    size: Number(mod.fileSize) || 0,
    workshopUrl: `https://steamcommunity.com/sharedfiles/filedetails/?id=${mod.id}`,
    changelogUrl: `https://steamcommunity.com/sharedfiles/filedetails/changelog/${mod.id}`,
    runtimeReplica: replica,
    runtimeReplicaAvailable: replicaError === null,
    runtimeReplicaError: replicaError?.message || '',
    roomProfile: profile,
    roomProfileAvailable: profileError === null,
    roomProfileError: profileError?.message || ''
  }
}

function legacyConfigurationField(field) {
  return {
    name: field.key,
    label: field.label,
    hover: field.description || '',
    default: field.defaultValue,
    type: field.type,
    options: (field.options || []).map(option => ({
      data: option.value,
      description: option.label,
      hover: option.hint || ''
    }))
  }
}

async function getContext({ roomId = '', worldId = '', preferRememberedRoom = false } = {}) {
  const response = await roomsV2API.controlPlaneList()
  const rooms = response.items || []
  if (rooms.length === 0) throw adapterError('MOD_ROOM_REQUIRED')

  let room = null
  if (!roomId && preferRememberedRoom) roomId = preferredRoomId(rooms)
  if (roomId) {
    room = rooms.find(item => matchResource(item, roomId))
    if (!room) throw adapterError('ROOM_NOT_MANAGED', { context: { reference: roomId } })
  } else if (rooms.length === 1) {
    room = rooms[0]
  }

  let worlds = []
  let world = null
  if (room) {
    worlds = await getRoomWorlds(room.id)
    if (worldId) {
      world = worlds.find(item => matchResource(item, worldId))
      if (!world) {
        throw adapterError('WORLD_NOT_FOUND', {
          context: { room: room.name, reference: worldId }
        })
      }
    } else if (worlds.length === 1) {
      world = worlds[0]
    }
  }
  return { rooms, room, worlds, world }
}

async function getServerList({ roomId, factsOnly = false } = {}) {
  requireValue(roomId, 'ROOM_REQUIRED')
  const response = await modsV2API.list(roomId, factsOnly ? { view: 'facts' } : {})
  const profileResult = response.profile
    ? { value: response.profile, error: null }
    : await modsV2API.profile(roomId)
      .then(value => ({ value, error: null }))
      .catch(error => ({ value: null, error }))
  const profiles = new Map((profileResult.value?.items || []).map(item => [String(item.modId), item]))
  const profileContext = profileResult.value || {}
  const worldRevisions = Object.fromEntries((profileContext.worlds || []).map(world => [world.worldId, world.revision]))
  return (response.items || []).map(mod => ({
    ...mapInstalledMod(
      mod,
      null,
      null,
      profiles.has(String(mod.id)) ? {
        ...profiles.get(String(mod.id)),
        profileRevision: profileContext.revision || '',
        defaultWorldId: profileContext.defaultWorldId || '',
        worldRevisions
      } : null,
      profileResult.error
    ),
    runtimeReplicaAvailable: false
  }))
}

async function getRoomModCatalog({ roomId, worlds } = {}) {
  const resolvedRoomId = requireValue(roomId, 'ROOM_REQUIRED')
  const [configured, observations] = await Promise.all([
    getServerList({ roomId: resolvedRoomId, factsOnly: true }),
    Promise.resolve(worlds || getRoomWorlds(resolvedRoomId)).then(readRoomModInventories)
  ])
  return mergeRoomModCatalog(configured, observations)
}

async function readRoomModInventories(worlds) {
  const endpoints = []
  const seen = new Set()
  for (const world of worlds) {
    const targetId = String(world.appliedTargetId || world.placement?.appliedTargetId || '').trim()
    const installationId = String(
      world.appliedInstallationId
      || world.placement?.appliedInstallationId
      || (targetId === 'local' ? 'default' : '')
    ).trim()
    if (!targetId || !installationId) continue
    const key = JSON.stringify([targetId, installationId])
    if (seen.has(key)) continue
    seen.add(key)
    endpoints.push({ targetId, installationId, name: world.appliedTargetName || targetId })
  }
  return Promise.all(endpoints.map(async endpoint => {
    try {
      return { ...endpoint, inventory: await getRuntimeModInventory(endpoint.targetId, endpoint.installationId, { view: 'facts' }), error: null }
    } catch (error) {
      return { ...endpoint, inventory: null, error }
    }
  }))
}

async function getRoomModReplicas(roomId) {
  return modPublicationsV2API.replicas(requireValue(roomId, 'ROOM_REQUIRED'))
}

// Service overview only needs current room facts. Publication history and the
// configuration inheritance model belong to the advanced Mod management view.
async function getRoomModFacts({ roomId } = {}) {
  requireValue(roomId, 'ROOM_REQUIRED')
  const response = await modsV2API.list(roomId, { view: 'facts' })
  return (response.items || []).map(mod => mapInstalledMod(mod))
}

async function getModMetadata(items = []) {
  const ids = [...new Set(items.map(item => String(item.modid || item.id || '')).filter(Boolean))]
  const metadata = {}
  const warnings = []
  for (let start = 0; start < ids.length; start += 100) {
    try {
      const result = await modsV2API.metadata(ids.slice(start, start + 100))
      Object.assign(metadata, result.items || {})
      if (result.warning) warnings.push(result.warning)
    } catch (error) {
      warnings.push(error?.message || String(error))
    }
  }
  const incompleteModIds = ids.filter(id => !metadata[id]?.name?.trim() || !metadata[id]?.author?.trim())
  return { metadata, incompleteModIds, warning: [...new Set(warnings)].join('; ') }
}

async function getRoomModProfile(roomId) {
  return modsV2API.profile(requireValue(roomId, 'ROOM_REQUIRED'))
}

async function getModUpdateOverview(roomId) {
  return modUpdatesV2API.overview(requireValue(roomId, 'ROOM_REQUIRED'))
}

async function saveModUpdatePolicy(roomId, input) {
  return modUpdatesV2API.updatePolicy(requireValue(roomId, 'ROOM_REQUIRED'), input)
}

async function checkModUpdatesNow(roomId) {
  return modUpdatesV2API.check(requireValue(roomId, 'ROOM_REQUIRED'))
}

async function applyModUpdatesWhenEmpty(roomId) {
  return modUpdatesV2API.applyWhenEmpty(requireValue(roomId, 'ROOM_REQUIRED'))
}

async function applyModUpdatesNow(roomId) {
  return modUpdatesV2API.applyNow(requireValue(roomId, 'ROOM_REQUIRED'))
}

async function getRooms() {
  const response = await roomsV2API.controlPlaneList()
  return response.items || []
}

async function getRoomWorlds(roomId) {
  const resolvedRoomId = requireValue(roomId, 'ROOM_REQUIRED')
  const [response, topology] = await Promise.all([
    topologyV2API.worlds(resolvedRoomId),
    topologyV2API.get(resolvedRoomId).catch(() => null)
  ])
  const worlds = [...(response.items || [])].sort(compareWorldRoles)
  if (topology) {
    const placements = new Map((topology.placements || []).map(item => [item.worldId, item]))
    const targets = new Map((topology.targets || []).map(item => [item.id, item]))
    return worlds.map(world => {
      const placement = placements.get(world.id)
      const targetId = placement?.appliedTargetId || ''
      return {
        ...world,
        appliedTargetId: targetId,
        appliedInstallationId: placement?.appliedInstallationId || '',
        appliedTargetName: targets.get(targetId)?.name || targetId,
        topologyRevision: topology.revision || topology.topologyRevision || '',
        placement: placement || null
      }
    })
  }
  return worlds
}

async function getRoomTopology(roomId) {
  return topologyV2API.get(requireValue(roomId, 'ROOM_REQUIRED'))
}

function publicationRequest(input = {}) {
  const { roomId, onProgress, ...request } = input
  return {
    roomId: requireValue(roomId, 'ROOM_REQUIRED'),
    onProgress,
    request
  }
}

function finishModPublication(roomId, job, onProgress, existingPublicationId = '') {
  return resolveModPublicationJob({
    roomId,
    job,
    timeout: MOD_JOB_TIMEOUT,
    onProgress,
    waitForJob: waitForV2Job,
    listPublications: params => modPublicationsV2API.list(roomId, params),
    existingPublicationId,
    getPublication: id => modPublicationsV2API.get(id)
  })
}

async function previewModPublication(input) {
  const { roomId, request } = publicationRequest(input)
  return modPublicationsV2API.preview(roomId, request)
}

async function createModPublication(input) {
  const { roomId, onProgress, request } = publicationRequest(input)
  const job = await modPublicationsV2API.create(roomId, request)
  return finishModPublication(roomId, job, onProgress)
}

async function publishPreparedModMutation(input) {
  const plan = await previewModPublication(input)
  const resolvedPlan = plan?.plan || plan
  if (!resolvedPlan?.ready || !resolvedPlan?.planHash) {
    throw adapterError('MOD_PUBLICATION_PREVIEW_BLOCKED', {
      context: { blockers: resolvedPlan?.blockers || [] }
    })
  }
  return createModPublication({
    ...input,
    planHash: resolvedPlan.planHash,
    expectedTopologyRevision: resolvedPlan.topologyRevision || input.expectedTopologyRevision,
    confirmation: resolvedPlan.planHash
  })
}

async function listModPublications({ roomId, ...params } = {}) {
  return modPublicationsV2API.list(requireValue(roomId, 'ROOM_REQUIRED'), params)
}

async function getModPublication(publicationId) {
  return modPublicationsV2API.get(requireValue(publicationId, 'MOD_PUBLICATION_ID_REQUIRED'))
}

async function retryModPublication(publicationId, options = {}) {
  const resolvedPublicationId = requireValue(publicationId, 'MOD_PUBLICATION_ID_REQUIRED')
  const current = await modPublicationsV2API.get(resolvedPublicationId)
  const roomId = requireValue(current?.roomId, 'ROOM_REQUIRED', { publicationId: resolvedPublicationId })
  const job = await modPublicationsV2API.retry(resolvedPublicationId)
  const inPlace = IN_PLACE_PUBLICATION_RETRY_STATES.has(String(current?.status || '').toLowerCase())
  return finishModPublication(roomId, job, options.onProgress, inPlace ? resolvedPublicationId : '')
}

async function activateModPublication(publicationId, options = {}) {
  const resolvedPublicationId = requireValue(publicationId, 'MOD_PUBLICATION_ID_REQUIRED')
  const current = await modPublicationsV2API.get(resolvedPublicationId)
  const roomId = requireValue(current?.roomId, 'ROOM_REQUIRED', { publicationId: resolvedPublicationId })
  const job = await modPublicationsV2API.activate(resolvedPublicationId, {
    mode: 'restart',
    loadConfirmation: 'logs',
    timeoutSeconds: options.timeoutSeconds || 300
  })
  return finishModPublication(roomId, job, options.onProgress, resolvedPublicationId)
}

async function getLibrary() {
  const response = await modsV2API.library()
  return {
    ...response,
    items: (response.items || []).map(mapInstalledMod)
  }
}

async function getRuntimeModInventory(targetId, installationId, params = {}) {
  return modsV2API.runtimeInventory(
    requireValue(targetId, 'RUNTIME_TARGET_REQUIRED'),
    requireValue(installationId, 'RUNTIME_INSTALLATION_REQUIRED'),
    params
  )
}

async function updateRuntimeMod(targetId, installationId, modId) {
  return modsV2API.updateRuntimeMod(
    requireValue(targetId, 'RUNTIME_TARGET_REQUIRED'),
    requireValue(installationId, 'RUNTIME_INSTALLATION_REQUIRED'),
    requireValue(modId, 'MOD_ID_REQUIRED')
  )
}

async function updateOutdatedRuntimeMods(targetId, installationId) {
  return modsV2API.updateOutdatedRuntimeMods(
    requireValue(targetId, 'RUNTIME_TARGET_REQUIRED'),
    requireValue(installationId, 'RUNTIME_INSTALLATION_REQUIRED')
  )
}

async function searchMods({ keyword = '', sort = 'trend', days = 7, tags = [], page = 1, pageSize = 20 }) {
  const response = await modsV2API.search({
    query: keyword.trim(),
    sort,
    days,
    tags: Array.isArray(tags) ? tags.join(',') : tags,
    page,
    pageSize
  })
  return {
    ...response,
    items: (response.items || []).map(mapSearchMod)
  }
}

async function getModDetails(mod) {
  const modId = requireValue(mod?.id || mod?.modid, 'MOD_ID_REQUIRED')
  const details = mapSearchMod(await modsV2API.details(modId))
  return {
    ...mod,
    ...details,
    modid: mod.modid || details.id,
    downloaded: Boolean(mod.downloaded || mod.isDownloaded),
    isDownloaded: Boolean(mod.isDownloaded || mod.downloaded),
    configured: Boolean(mod.configured),
    installed: Boolean(mod.installed),
    loaded: Boolean(mod.loaded),
    runtimeObserved: Boolean(mod.runtimeObserved),
    runtimeFileStatus: mod.runtimeFileStatus || '',
    currentVersion: mod.runtimeVersion || mod.currentVersion || '',
    latestVersion: mod.latestVersion || mod.version || '',
    runtimeVersionStatus: mod.runtimeVersionStatus || '',
    runtimeCurrentTargets: Number(mod.runtimeCurrentTargets) || 0,
    runtimeOutdatedTargets: Number(mod.runtimeOutdatedTargets) || 0,
    runtimeUnknownVersionTargets: Number(mod.runtimeUnknownVersionTargets) || 0,
    runtimeVersions: Array.isArray(mod.runtimeVersions) ? mod.runtimeVersions : [],
    runtimeReadyTargets: Number(mod.runtimeReadyTargets) || 0,
    runtimePendingTargets: Number(mod.runtimePendingTargets) || 0,
    runtimeUnavailableTargets: Number(mod.runtimeUnavailableTargets) || 0,
    runtimeTotalTargets: Number(mod.runtimeTotalTargets) || 0,
    enabled: Boolean(mod.enabled),
    configuredWorlds: mod.configuredWorlds || [],
    enabledWorlds: mod.enabledWorlds || [],
    installedWorlds: mod.installedWorlds || [],
    loadedWorlds: mod.loadedWorlds || []
  }
}

async function downloadMod(input) {
  const modId = requireValue(input.modid || input.id, 'MOD_ID_REQUIRED')
  const targetId = requireValue(input.targetId, 'RUNTIME_TARGET_REQUIRED')
  const installationId = requireValue(input.installationId, 'RUNTIME_INSTALLATION_REQUIRED')
  const job = await modsV2API.downloadRuntimeMod(targetId, installationId, modId)
  return (input.waitForJob || waitForV2Job)(job, MOD_JOB_TIMEOUT, input.onProgress)
}

async function addModToRoom(input) {
  const roomId = requireValue(input.roomId, 'ROOM_REQUIRED')
  const modId = requireValue(input.modid || input.id, 'MOD_ID_REQUIRED')
  const worldIds = input.worldIds || []
  const job = await modsV2API.install(roomId, {
    modId,
    worldIds,
    enabled: input.enabled !== false,
    includeDependencies: input.includeDependencies !== false
  })
  return (input.waitForJob || waitForV2Job)(job, MOD_JOB_TIMEOUT, input.onProgress)
}

async function getModConfig({ roomId, worldId, modid, mod = {} }) {
  requireValue(roomId, 'ROOM_REQUIRED')
  requireValue(worldId, 'WORLD_REQUIRED')
  const configuration = await modsV2API.configuration(roomId, worldId, requireValue(modid, 'MOD_ID_REQUIRED'))
  return {
    status: 200,
    modinfo: {
      ...mod,
      modid,
      enabled: configuration.enabled,
      configuration_options: (configuration.fields || []).map(legacyConfigurationField),
      configuration
    }
  }
}

async function getModCustomConfig({ roomId, worldId, modid }) {
  const configuration = await modsV2API.configuration(
    requireValue(roomId, 'ROOM_REQUIRED'),
    requireValue(worldId, 'WORLD_REQUIRED'),
    requireValue(modid, 'MOD_ID_REQUIRED')
  )
  return {
    status: 200,
    modinfo: {
      configuration_options: configuration.values || {},
      overridden_configuration_options: configuration.overrides || {},
      unknown_configuration_options: configuration.unknownValues || {},
      enabled: configuration.enabled,
      revision: configuration.revision,
      parser: configuration.parser,
      fallbackUsed: configuration.fallbackUsed,
      fallbackReason: configuration.fallbackReason || '',
      warnings: configuration.warnings || [],
      rawPreserved: configuration.rawPreserved
    }
  }
}

async function saveModCustomConfig(input) {
  const roomId = requireValue(input.roomId, 'ROOM_REQUIRED')
  const worldId = requireValue(input.worldId, 'WORLD_REQUIRED')
  const modId = requireValue(input.modid, 'MOD_ID_REQUIRED')
  const request = {
    expectedRevision: requireValue(input.expectedRevision, 'MOD_CONFIGURATION_REVISION_REQUIRED'),
    enabled: Boolean(input.enabled),
    patch: input.configuration_options || {}
  }
  const result = await modsV2API.applyConfiguration(roomId, worldId, modId, request)
  return { mode: 'direct', result }
}

async function saveModConfigurationForWorld(input) {
  const roomId = requireValue(input.roomId, 'ROOM_REQUIRED')
  const worldId = requireValue(input.worldId, 'WORLD_REQUIRED')
  const modId = requireValue(input.modid, 'MOD_ID_REQUIRED')
  const worldIds = Array.isArray(input.worldIds) && input.worldIds.length > 0 ? input.worldIds : [worldId]
  const expectedRevisions = input.expectedRevisions || {}
  const result = await modsV2API.applyConfiguration(roomId, worldId, modId, {
    ...(input.sourceWorldId ? { sourceWorldId: input.sourceWorldId } : {}),
    expectedRevision: worldIds.length === 1 && Object.keys(expectedRevisions).length === 0
      ? requireValue(input.expectedRevision, 'MOD_CONFIGURATION_REVISION_REQUIRED')
      : input.expectedRevision || '',
    expectedRevisions,
    expectedTopologyRevision: input.expectedTopologyRevision || '',
    worldIds,
    enabled: Boolean(input.enabled),
    preserveEnabled: Boolean(input.preserveEnabled),
    patch: input.configuration_options || {}
  })
  if (typeof input.onProgress === 'function') {
    input.onProgress({ status: 'succeeded', progress: 100, message: 'Mod configuration saved' })
  }
  return { mode: 'direct', result }
}

async function toggleMod(input) {
  const roomId = requireValue(input.roomId, 'ROOM_REQUIRED')
  const modId = requireValue(input.modid, 'MOD_ID_REQUIRED')
  const worldIds = input.worldIds || []
  return modsV2API.enable(roomId, modId, {
    worldIds,
    enabled: Boolean(input.enabled),
    expectedRevision: input.expectedRevision || '',
    expectedRevisions: input.expectedRevisions || {},
    expectedTopologyRevision: input.expectedTopologyRevision || ''
  })
}

async function updateMod(input) {
  requireValue(input.roomId, 'ROOM_REQUIRED')
  const modId = requireValue(input.modid, 'MOD_ID_REQUIRED')
  const seen = new Set()
  const targets = []
  for (const runtime of Array.isArray(input.runtimeVersions) ? input.runtimeVersions : []) {
    const targetId = String(runtime?.targetId || '').trim()
    const installationId = String(runtime?.installationId || '').trim()
    const key = JSON.stringify([targetId, installationId])
    const eligible = input.missingOnly
      ? ['missing', 'invalid', 'not_installed'].includes(runtime?.status)
      : runtime?.status === 'outdated'
    if (!eligible || !targetId || !installationId || seen.has(key)) continue
    seen.add(key)
    targets.push({ targetId, installationId })
  }
  if (!targets.length) throw adapterError('MOD_RUNTIME_TARGET_REQUIRED')

  const onProgress = input.onProgress || input.onDownloadProgress || input.onPublicationProgress
  const progress = targets.map(() => 0)
  const results = targets.map(() => null)
  const failures = []
  let next = 0
  const download = async () => {
    while (next < targets.length) {
      const index = next++
      const target = targets[index]
      const report = current => {
        progress[index] = Math.max(progress[index], Math.min(100, Number(current?.progress) || 0))
        if (typeof onProgress === 'function') onProgress({
          ...current,
          status: 'running',
          message: `${target.targetId}/${target.installationId}: ${current?.message || ''}`,
          progress: Math.min(99, Math.round(progress.reduce((sum, value) => sum + value, 0) / targets.length))
        })
      }
      try {
        const job = await modsV2API.updateRuntimeMod(target.targetId, target.installationId, modId)
        input.onSubmitted?.(job, target)
        results[index] = await (input.waitForJob || waitForV2Job)(job, MOD_JOB_TIMEOUT, report)
        report({ status: 'running', progress: 100 })
      } catch (error) {
        failures.push(`${target.targetId}/${target.installationId}: ${error?.message || String(error)}`)
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(3, targets.length) }, download))
  if (failures.length) throw new Error(failures.join('; '))
  if (typeof onProgress === 'function') onProgress({ status: 'succeeded', progress: 100 })
  return results.at(-1)
}

async function deleteMod(input) {
  const roomId = requireValue(input.roomId, 'ROOM_REQUIRED')
  const modId = requireValue(input.modid, 'MOD_ID_REQUIRED')
  const worldIds = input.worldIds || []
  return publishPreparedModMutation({
    roomId,
    action: 'remove',
    modId,
    worldIds,
    onProgress: input.onProgress
  })
}

const removeModFromRoom = deleteMod

async function getAllModConfigFile({ roomId, worldId }) {
  const file = await modsV2API.configurationFile(
    requireValue(roomId, 'ROOM_REQUIRED'),
    requireValue(worldId, 'WORLD_REQUIRED')
  )
  return { status: 200, modinfo: file.content, file }
}

export const realModApi = {
  setConfigurationMode: (roomId, modId, mode) => modsV2API.setConfigurationMode(
    requireValue(roomId, 'ROOM_REQUIRED'), requireValue(modId, 'MOD_REQUIRED'), mode
  ),
  getContext,
  getRooms,
  getRoomWorlds,
  getRoomTopology,
  getRoomModProfile,
  getRoomModReplicas,
  getModUpdateOverview,
  saveModUpdatePolicy,
  checkModUpdatesNow,
  applyModUpdatesWhenEmpty,
  applyModUpdatesNow,
  getLibrary,
  getRuntimeModInventory,
  updateRuntimeMod,
  updateOutdatedRuntimeMods,
  getRoomModFacts,
  getModMetadata,
  getServerList,
  getRoomModCatalog,
  searchMods,
  getModDetails,
  downloadMod,
  addModToRoom,
  getModConfig,
  getModCustomConfig,
  saveModCustomConfig,
  saveModConfigurationForWorld,
  previewModPublication,
  createModPublication,
  listModPublications,
  getModPublication,
  retryModPublication,
  activateModPublication,
  toggleMod,
  updateMod,
  removeModFromRoom,
  deleteMod,
  getAllModConfigFile
}

export default realModApi
