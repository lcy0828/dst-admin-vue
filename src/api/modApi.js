import { modsV2API, roomsV2API } from './v2'
import { waitForV2Job } from './v2ConfigurationAdapters'
import { adapterError } from './adapterProtocol.mjs'

const MOD_JOB_TIMEOUT = 15 * 60 * 1000

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
  const response = await roomsV2API.list()
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
    const worldResponse = await roomsV2API.worlds(room.id)
    worlds = worldResponse.items || []
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
  const response = await roomsV2API.list()
  return (response.items || []).filter(room => room.managed)
}

async function getRoomWorlds(roomId) {
  const response = await roomsV2API.worlds(requireValue(roomId, 'ROOM_REQUIRED'))
  return response.items || []
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
  const job = await modsV2API.enable(
    requireValue(input.roomId, 'ROOM_REQUIRED'),
    requireValue(input.modid, 'MOD_ID_REQUIRED'),
    { worldIds: input.worldIds || [], enabled: Boolean(input.enabled) }
  )
  return waitForV2Job(job, MOD_JOB_TIMEOUT)
}

async function updateMod(input) {
  const job = await modsV2API.updateLibrary(requireValue(input.modid, 'MOD_ID_REQUIRED'))
  return waitForV2Job(job, MOD_JOB_TIMEOUT)
}

async function deleteMod(input) {
  const job = await modsV2API.uninstall(
    requireValue(input.roomId, 'ROOM_REQUIRED'),
    requireValue(input.modid, 'MOD_ID_REQUIRED'),
    {
      worldIds: input.worldIds || [],
      confirmation: requireValue(input.confirmation, 'MOD_UNINSTALL_CONFIRMATION_REQUIRED'),
      removeFiles: false
    }
  )
  return waitForV2Job(job, MOD_JOB_TIMEOUT)
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
  getLibrary,
  getServerList,
  searchMods,
  getModDetails,
  downloadMod,
  addModToRoom,
  getModConfig,
  getModCustomConfig,
  saveModCustomConfig,
  toggleMod,
  updateMod,
  removeModFromRoom,
  deleteMod,
  getAllModConfigFile
}

export default realModApi
