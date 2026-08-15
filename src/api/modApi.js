import { modPublicationsV2API, modsV2API, roomsV2API, topologyV2API } from './v2'
import { waitForV2Job } from './v2ConfigurationAdapters'
import { adapterError } from './adapterProtocol.mjs'
import { resolveModPublicationJob } from './modPublicationJob.mjs'

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

function mapInstalledMod(mod) {
  const rating = Number(mod.ratingCount) > 0 || Number(mod.score) > 0 ? Number(mod.score) : null
  const subscriptions = Number(mod.subscriptions) || 0
  return {
    id: mod.id,
    modid: mod.id,
    name: mod.name || '',
    author: mod.author || '',
    description: mod.description || '',
    image: mod.previewUrl || '',
    version: mod.version || '',
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
    enabled: Boolean(mod.enabled),
    updateAvailable: mod.health === 'update_available',
    health: mod.health,
    healthMessage: mod.healthMessage || '',
    repairAction: mod.repairAction || '',
    configuredWorlds: mod.configuredWorlds || [],
    enabledWorlds: mod.enabledWorlds || [],
    installedWorlds: mod.installedWorlds || [],
    loadedWorlds: mod.loadedWorlds || [],
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
    changelogUrl: `https://steamcommunity.com/sharedfiles/filedetails/changelog/${mod.id}`
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

async function getContext({ roomId = '', worldId = '' } = {}) {
  const response = await roomsV2API.controlPlaneList()
  const rooms = (response.items || []).filter(room => room.managed)
  if (rooms.length === 0) throw adapterError('MOD_MANAGED_ROOM_REQUIRED')

  let room = null
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

async function getServerList({ roomId } = {}) {
  requireValue(roomId, 'ROOM_REQUIRED')
  const response = await modsV2API.list(roomId)
  return (response.items || []).map(mapInstalledMod)
}

async function getManagedRooms() {
  const response = await roomsV2API.controlPlaneList()
  return (response.items || []).filter(room => room.managed)
}

async function getRoomWorlds(roomId) {
  const resolvedRoomId = requireValue(roomId, 'ROOM_REQUIRED')
  const response = await topologyV2API.worlds(resolvedRoomId)
  const worlds = response.items || []
  try {
    const topology = await topologyV2API.get(resolvedRoomId)
    const placements = new Map((topology.placements || []).map(item => [item.worldId, item]))
    const targets = new Map((topology.targets || []).map(item => [item.id, item]))
    return worlds.map(world => {
      const placement = placements.get(world.id)
      const targetId = placement?.appliedTargetId || ''
      return {
        ...world,
        appliedTargetId: targetId,
        appliedTargetName: targets.get(targetId)?.name || targetId,
        placement: placement || null
      }
    })
  } catch {
    return worlds
  }
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
    enabled: Boolean(mod.enabled),
    configuredWorlds: mod.configuredWorlds || [],
    enabledWorlds: mod.enabledWorlds || [],
    installedWorlds: mod.installedWorlds || [],
    loadedWorlds: mod.loadedWorlds || []
  }
}

async function downloadMod(input) {
  const modId = requireValue(input.modid || input.id, 'MOD_ID_REQUIRED')
  const alreadyDownloaded = input.downloaded ?? input.installed
  const job = alreadyDownloaded
    ? await modsV2API.updateLibrary(modId)
    : await modsV2API.download({
      modId,
      includeDependencies: input.includeDependencies !== false
    })
  return waitForV2Job(job, MOD_JOB_TIMEOUT, input.onProgress)
}

async function addModToRoom(input) {
  const roomId = requireValue(input.roomId, 'ROOM_REQUIRED')
  const modId = requireValue(input.modid || input.id, 'MOD_ID_REQUIRED')
  const job = await modsV2API.addToRoom(roomId, modId, {
    worldIds: input.worldIds || [],
    enabled: input.enabled !== false,
    includeDependencies: input.includeDependencies !== false
  })
  return waitForV2Job(job, MOD_JOB_TIMEOUT, input.onProgress)
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
  const preview = await modsV2API.previewConfiguration(roomId, worldId, modId, request)
  const job = await modsV2API.applyConfiguration(roomId, worldId, modId, request)
  return { preview, job: await waitForV2Job(job, MOD_JOB_TIMEOUT) }
}

async function toggleMod(input) {
  return publishPreparedModMutation({
    roomId: requireValue(input.roomId, 'ROOM_REQUIRED'),
    action: 'enable',
    modId: requireValue(input.modid, 'MOD_ID_REQUIRED'),
    worldIds: input.worldIds || [],
    enabled: Boolean(input.enabled),
    onProgress: input.onProgress
  })
}

async function updateMod(input) {
  const job = await modsV2API.updateLibrary(requireValue(input.modid, 'MOD_ID_REQUIRED'))
  await waitForV2Job(job, MOD_JOB_TIMEOUT, input.onProgress)
  return publishPreparedModMutation({
    roomId: requireValue(input.roomId, 'ROOM_REQUIRED'),
    action: 'reconcile',
    onProgress: input.onProgress
  })
}

async function deleteMod(input) {
  requireValue(input.confirmation, 'MOD_UNINSTALL_CONFIRMATION_REQUIRED')
  return publishPreparedModMutation({
    roomId: requireValue(input.roomId, 'ROOM_REQUIRED'),
    action: 'remove',
    modId: requireValue(input.modid, 'MOD_ID_REQUIRED'),
    worldIds: input.worldIds || [],
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
  getContext,
  getManagedRooms,
  getRoomWorlds,
  getRoomTopology,
  getLibrary,
  getServerList,
  searchMods,
  getModDetails,
  downloadMod,
  addModToRoom,
  getModConfig,
  getModCustomConfig,
  saveModCustomConfig,
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
