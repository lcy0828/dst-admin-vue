import { configurationV2API, jobsV2API, roomsV2API } from './v2'
import { adapterError, adapterSuccess } from './adapterProtocol.mjs'
import { jobFailure } from './jobFeedback.mjs'

export { jobFailure } from './jobFeedback.mjs'

const success = (data, msg = 'operation_succeeded') => adapterSuccess(data, msg)
const TERMINAL_JOB_STATES = new Set(['succeeded', 'failed', 'canceled'])

function delay(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds))
}

export async function waitForV2Job(job, timeout = 60000, onUpdate) {
  if (!job?.id) throw adapterError('JOB_ID_MISSING')
  const deadline = Date.now() + timeout
  let current = job
  if (typeof onUpdate === 'function') onUpdate(current)
  while (!TERMINAL_JOB_STATES.has(current.status)) {
    if (Date.now() >= deadline) throw adapterError('JOB_TIMEOUT', { context: { jobId: job.id } })
    await delay(300)
    current = await jobsV2API.get(job.id)
    if (typeof onUpdate === 'function') onUpdate(current)
  }
  if (current.status !== 'succeeded') {
    const code = current.status === 'canceled' ? 'JOB_CANCELED' : 'JOB_FAILED'
    const failure = jobFailure(current)
    throw adapterError(code, {
      detail: failure.message,
      context: { jobId: current.id, targetErrorCode: failure.code }
    })
  }
  return current
}

export async function resolveV2Room(value) {
  const response = await roomsV2API.list()
  const room = (response.items || []).find(item =>
    item.id === value || item.name === value || item.directoryName === value
  )
  if (!room) throw adapterError('ROOM_NOT_FOUND', { context: { reference: value || '' } })
  return room
}

export async function resolveV2World(room, value) {
  const response = await roomsV2API.worlds(room.id)
  const world = (response.items || []).find(item =>
    item.id === value || item.name === value || item.directoryName === value
  )
  if (!world) throw adapterError('WORLD_NOT_FOUND', { context: { reference: value || '' } })
  return world
}

function booleanValue(value, fallback = false) {
  if (typeof value === 'boolean') return value
  if (value === 'true' || value === 'yes' || value === '1') return true
  if (value === 'false' || value === 'no' || value === '0') return false
  return fallback
}

function integerValue(value, fallback = 0) {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

export function legacyRoomSections(values) {
  return {
    GAMEPLAY: {
      game_mode: values.gameMode,
      max_players: String(values.maxPlayers),
      pvp: String(values.pvp),
      pause_when_empty: String(values.pauseWhenEmpty),
      vote_enabled: String(values.voteEnabled),
      vote_kick_enabled: String(values.voteKickEnabled)
    },
    NETWORK: {
      lan_only_cluster: String(values.lanOnly),
      cluster_intention: values.clusterIntention,
      cluster_password: values.clusterPassword,
      cluster_description: values.clusterDescription,
      cluster_name: values.clusterName,
      offline_cluster: String(values.offline),
      cluster_language: values.clusterLanguage,
      whitelist_slots: String(values.whitelistSlots),
      tick_rate: String(values.tickRate),
      autosaver_enabled: String(values.autosaverEnabled),
      idle_timeout: String(values.idleTimeout)
    },
    MISC: {
      console_enabled: String(values.consoleEnabled),
      max_snapshots: String(values.maxSnapshots)
    },
    SHARD: {
      shard_enabled: String(values.shardEnabled),
      bind_ip: values.bindIp,
      master_ip: values.masterIp,
      master_port: String(values.masterPort),
      cluster_key: values.clusterKey
    },
    STEAM: {
      steam_group_only: String(values.steamGroupOnly),
      steam_group_id: String(values.steamGroupId),
      steam_group_admins: String(values.steamGroupAdmins)
    }
  }
}

export function roomValuesFromLegacy(config, current) {
  const gameplay = config.GAMEPLAY || {}
  const network = config.NETWORK || {}
  const misc = config.MISC || {}
  const shard = config.SHARD || {}
  const steam = config.STEAM || {}
  return {
    ...current,
    clusterName: network.cluster_name ?? current.clusterName,
    clusterDescription: network.cluster_description ?? current.clusterDescription,
    clusterPassword: network.cluster_password ?? current.clusterPassword,
    clusterIntention: network.cluster_intention ?? current.clusterIntention,
    clusterLanguage: network.cluster_language ?? current.clusterLanguage,
    gameMode: gameplay.game_mode ?? current.gameMode,
    maxPlayers: integerValue(gameplay.max_players, current.maxPlayers),
    pvp: booleanValue(gameplay.pvp, current.pvp),
    pauseWhenEmpty: booleanValue(gameplay.pause_when_empty, current.pauseWhenEmpty),
    voteEnabled: booleanValue(gameplay.vote_enabled, current.voteEnabled),
    voteKickEnabled: booleanValue(gameplay.vote_kick_enabled, current.voteKickEnabled),
    consoleEnabled: booleanValue(misc.console_enabled, current.consoleEnabled),
    lanOnly: booleanValue(network.lan_only_cluster, current.lanOnly),
    offline: booleanValue(network.offline_cluster, current.offline),
    whitelistSlots: integerValue(network.whitelist_slots, current.whitelistSlots),
    tickRate: integerValue(network.tick_rate, current.tickRate),
    autosaverEnabled: booleanValue(network.autosaver_enabled, current.autosaverEnabled),
    idleTimeout: integerValue(network.idle_timeout, current.idleTimeout),
    maxSnapshots: integerValue(misc.max_snapshots, current.maxSnapshots),
    shardEnabled: booleanValue(shard.shard_enabled, current.shardEnabled),
    bindIp: shard.bind_ip ?? current.bindIp,
    masterIp: shard.master_ip ?? current.masterIp,
    masterPort: integerValue(shard.master_port, current.masterPort),
    clusterKey: shard.cluster_key ?? current.clusterKey,
    steamGroupOnly: booleanValue(steam.steam_group_only, current.steamGroupOnly),
    steamGroupId: integerValue(steam.steam_group_id, current.steamGroupId),
    steamGroupAdmins: booleanValue(steam.steam_group_admins, current.steamGroupAdmins)
  }
}

async function applyRoomConfiguration(room, config) {
  const current = await configurationV2API.room(room.id)
  const request = {
    expectedRevision: current.revision,
    values: roomValuesFromLegacy(config, current.values)
  }
  try {
    await configurationV2API.previewRoom(room.id, request)
  } catch (error) {
    if (error.code === 'NO_CONFIGURATION_CHANGES') return null
    throw error
  }
  return waitForV2Job(await configurationV2API.applyRoom(room.id, request))
}

async function accessUpdate(roomValue, change, confirmed = false) {
  const room = await resolveV2Room(roomValue)
  const current = await configurationV2API.access(room.id)
  const request = {
    expectedRevision: current.revision,
    admins: current.admins || [],
    blocked: current.blocked || [],
    whitelist: current.whitelist || [],
    confirmation: confirmed ? room.name : '',
    ...change
  }
  await configurationV2API.previewAccess(room.id, request)
  return waitForV2Job(await configurationV2API.applyAccess(room.id, request))
}

export const legacyRoomConfigApi = {
  async getRoomConfig(roomValue) {
    const room = await resolveV2Room(roomValue)
    const configuration = await configurationV2API.room(room.id)
    return success(legacyRoomSections(configuration.values), 'room_configuration_loaded')
  },
  async saveRoomConfig(roomValue, config) {
    const room = await resolveV2Room(roomValue)
    const job = await applyRoomConfiguration(room, config)
    return success(job, job ? 'room_configuration_applied' : 'no_configuration_changes')
  },
  async createRoom(directoryName, config, token = '') {
    const values = roomValuesFromLegacy(config, {
      clusterName: directoryName,
      clusterDescription: '',
      clusterPassword: '',
      clusterIntention: 'cooperative',
      clusterLanguage: 'zh',
      gameMode: 'survival',
      maxPlayers: 6,
      pvp: false,
      pauseWhenEmpty: true,
      voteEnabled: true,
      voteKickEnabled: false,
      consoleEnabled: true,
      lanOnly: false,
      offline: false,
      whitelistSlots: 0,
      tickRate: 15,
      autosaverEnabled: true,
      idleTimeout: 0,
      maxSnapshots: 10,
      shardEnabled: true,
      bindIp: '127.0.0.1',
      masterIp: '127.0.0.1',
      masterPort: 10889,
      clusterKey: '',
      steamGroupOnly: false,
      steamGroupId: 0,
      steamGroupAdmins: false
    })
    const room = await roomsV2API.create({
      directoryName,
      name: values.clusterName,
      description: values.clusterDescription,
      gameMode: values.gameMode,
      maxPlayers: values.maxPlayers,
      pvp: values.pvp,
      password: values.clusterPassword,
      clusterToken: token,
      includeCaves: values.shardEnabled
    })
    try {
      await applyRoomConfiguration(room, config)
    } catch (error) {
      try {
        await roomsV2API.deleteRoom(room.id, room.name)
      } catch (rollbackError) {
        throw adapterError('ROOM_CREATE_ROLLBACK_FAILED', {
          detail: [error.detail || error.message, rollbackError.detail || rollbackError.message]
            .filter(Boolean)
            .join('; rollback failed: '),
          context: { roomId: room.id }
        })
      }
      throw error
    }
    return success(room, 'room_created_and_configured')
  },
  async importRoomConfig() {
    throw adapterError('ROOM_CONFIGURATION_IMPORT_UNAVAILABLE')
  },
  async exportRoomConfig() {
    throw adapterError('ROOM_CONFIGURATION_EXPORT_UNAVAILABLE')
  }
}

export const legacyAccessApi = {
  async getAdminList(roomValue) {
    const room = await resolveV2Room(roomValue)
    const access = await configurationV2API.access(room.id)
    return success(access.admins || [])
  },
  async getBlockList(roomValue) {
    const room = await resolveV2Room(roomValue)
    const access = await configurationV2API.access(room.id)
    return success(access.blocked || [])
  },
  async getWhiteList(roomValue) {
    const room = await resolveV2Room(roomValue)
    const access = await configurationV2API.access(room.id)
    return success(access.whitelist || [])
  },
  async updateAdminList(roomValue, list, confirmed = false) {
    return success(await accessUpdate(roomValue, { admins: list }, confirmed), 'admin_list_applied')
  },
  async updateBlockList(roomValue, list, confirmed = false) {
    return success(await accessUpdate(roomValue, { blocked: list }, confirmed), 'block_list_applied')
  },
  async updateWhiteList(roomValue, list, confirmed = false) {
    return success(await accessUpdate(roomValue, { whitelist: list }, confirmed), 'whitelist_applied')
  },
  async getServerToken(roomValue) {
    const room = await resolveV2Room(roomValue)
    const status = await configurationV2API.tokenStatus(room.id)
    return success(status.maskedValue || '', status.configured ? 'server_token_status_loaded' : 'server_token_not_configured')
  },
  async getServerTokenStatus(roomValue) {
    const room = await resolveV2Room(roomValue)
    const status = await configurationV2API.tokenStatus(room.id)
    return success({ ...status, roomName: room.name }, status.configured ? 'server_token_status_loaded' : 'server_token_not_configured')
  },
  async revealServerToken(roomValue, confirmation) {
    const room = await resolveV2Room(roomValue)
    const revealed = await configurationV2API.revealToken(room.id, confirmation)
    return success(revealed.token, 'server_token_revealed')
  },
  async updateServerToken(roomValue, token, confirmation) {
    const room = await resolveV2Room(roomValue)
    const status = await configurationV2API.tokenStatus(room.id)
    const request = {
      expectedRevision: status.revision,
      token,
      confirmation
    }
    await configurationV2API.previewToken(room.id, request)
    const job = await waitForV2Job(await configurationV2API.applyToken(room.id, request))
    return success(job, 'server_token_applied')
  }
}

export const legacyWorldConfigurationApi = {
  async get(roomValue, worldValue) {
    const room = await resolveV2Room(roomValue)
    const world = await resolveV2World(room, worldValue)
    return { room, world, configuration: await configurationV2API.world(room.id, world.id) }
  },
  async apply(roomValue, worldValue, server, overridePatch) {
    const { room, world, configuration } = await this.get(roomValue, worldValue)
    const request = {
      expectedRevision: configuration.revision,
      server: { ...configuration.server, ...server },
      overridePatch
    }
    try {
      await configurationV2API.previewWorld(room.id, world.id, request)
    } catch (error) {
      if (error.code === 'NO_CONFIGURATION_CHANGES') return success(null, 'no_configuration_changes')
      throw error
    }
    const job = await waitForV2Job(await configurationV2API.applyWorld(room.id, world.id, request))
    return success(job, 'world_configuration_applied')
  },
  async getWorldOverrides(roomValue, worldValue) {
    const { configuration } = await this.get(roomValue, worldValue)
    return success(configuration.overrides || {}, 'world_configuration_loaded')
  },
  async getServerIni(roomValue, worldValue) {
    const { configuration } = await this.get(roomValue, worldValue)
    const server = configuration.server
    return success({
      network: { server_port: server.serverPort },
      shard: {
        is_master: server.isMaster,
        name: server.shardName,
        id: server.shardId
      },
      account: { encode_user_path: server.encodeUserPath },
      steam: {
        master_server_port: server.masterServerPort,
        authentication_port: server.authenticationPort
      }
    }, 'server_ini_loaded')
  },
  async saveServerIni(input) {
    const config = input.config || {}
    const server = {
      serverPort: integerValue(config.network?.server_port),
      isMaster: booleanValue(config.shard?.is_master),
      shardName: config.shard?.name ?? '',
      shardId: integerValue(config.shard?.id),
      encodeUserPath: booleanValue(config.account?.encode_user_path),
      masterServerPort: integerValue(config.steam?.master_server_port),
      authenticationPort: integerValue(config.steam?.authentication_port)
    }
    return this.apply(input.savename, input.worldname, server, {})
  },
  async createOrApplyWorld(input, type) {
    const room = await resolveV2Room(input.savename)
    const worlds = await roomsV2API.worlds(room.id)
    let world = (worlds.items || []).find(item =>
      item.id === input.worldname || item.name === input.worldname || item.directoryName === input.worldname
    )
    let created = false
    if (!world) {
      world = await roomsV2API.createWorld(room.id, {
        directoryName: input.worldname,
        type
      })
      created = true
    }
    const overrides = input.overrides || {}
    if (Object.keys(overrides).length > 0) {
      try {
        await this.apply(room.id, world.id, {}, overrides)
      } catch (error) {
        if (created) {
          try {
            await roomsV2API.deleteWorld(room.id, world.id, room.name)
          } catch (rollbackError) {
            throw adapterError('WORLD_CREATE_ROLLBACK_FAILED', {
              detail: [error.detail || error.message, rollbackError.detail || rollbackError.message]
                .filter(Boolean)
                .join('; rollback failed: '),
              context: { roomId: room.id, worldId: world.id }
            })
          }
        }
        throw error
      }
    }
    return success(world, created ? 'world_created_and_configured' : 'world_configuration_applied')
  },
  forestWorld(input) {
    return this.createOrApplyWorld(input, 'forest')
  },
  caveWorld(input) {
    return this.createOrApplyWorld(input, 'cave')
  },
  async deleteWorld(input) {
    const room = await resolveV2Room(input.savename)
    const world = await resolveV2World(room, input.worldname)
    const result = await roomsV2API.deleteWorld(room.id, world.id, input.confirmation)
    return success(result, 'world_moved_to_recovery')
  }
}
