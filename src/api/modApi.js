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
  return {
    id: mod.id,
    name: mod.name || '',
    auth: mod.author || '',
    img: mod.previewUrl || '',
    sub: String(mod.subscriptions ?? ''),
    time: mod.updatedAt || '',
    updatedAt: mod.updatedAt || '',
    version: '',
    describe: mod.description || '',
    rating: Number.isFinite(mod.score) ? mod.score : null,
    tags: mod.tags || [],
    dependencies: mod.dependencies || []
  }
}

function mapInstalledMod(mod) {
  return {
    id: mod.id,
    modid: mod.id,
    name: mod.name || '',
    author: mod.author || '',
    description: mod.description || '',
    image: mod.previewUrl || '',
    version: '',
    update_time: mod.updatedAt || '',
    updatedAt: mod.updatedAt || '',
    subscribers: String(mod.subscriptions ?? ''),
    rating: Number.isFinite(mod.score) ? mod.score : null,
    tags: mod.tags || [],
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
    size: ''
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

async function searchMods({ keyword, page = 1, pageSize = 20 }) {
  const response = await modsV2API.search(requireValue(keyword?.trim(), 'MOD_KEYWORD_REQUIRED'), page, pageSize)
  return {
    ...response,
    items: (response.items || []).map(mapSearchMod)
  }
}

async function downloadMod(input) {
  const roomId = requireValue(input.roomId, 'ROOM_REQUIRED')
  const modId = requireValue(input.modid || input.id, 'MOD_ID_REQUIRED')
  const worldIds = input.worldIds || []
  const job = input.installed
    ? await modsV2API.update(roomId, modId)
    : await modsV2API.install(roomId, {
      modId,
      worldIds,
      enabled: input.enabled !== false,
      includeDependencies: input.includeDependencies !== false
    })
  return waitForV2Job(job, MOD_JOB_TIMEOUT)
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
  const job = await modsV2API.update(
    requireValue(input.roomId, 'ROOM_REQUIRED'),
    requireValue(input.modid, 'MOD_ID_REQUIRED')
  )
  return waitForV2Job(job, MOD_JOB_TIMEOUT)
}

async function deleteMod(input) {
  const job = await modsV2API.uninstall(
    requireValue(input.roomId, 'ROOM_REQUIRED'),
    requireValue(input.modid, 'MOD_ID_REQUIRED'),
    {
      worldIds: input.worldIds || [],
      confirmation: requireValue(input.confirmation, 'MOD_UNINSTALL_CONFIRMATION_REQUIRED'),
      removeFiles: input.removeFiles !== false
    }
  )
  return waitForV2Job(job, MOD_JOB_TIMEOUT)
}

async function getAllModConfigFile({ roomId, worldId }) {
  const file = await modsV2API.configurationFile(
    requireValue(roomId, 'ROOM_REQUIRED'),
    requireValue(worldId, 'WORLD_REQUIRED')
  )
  return { status: 200, modinfo: file.content, file }
}

export const realModApi = {
  getContext,
  getServerList,
  searchMods,
  downloadMod,
  getModConfig,
  getModCustomConfig,
  saveModCustomConfig,
  toggleMod,
  updateMod,
  deleteMod,
  getAllModConfigFile
}

export default realModApi
