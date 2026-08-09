import { mapJobFailure, mapStatusMeta } from '../lib/worldMaps.mjs'

const LAYER_KEYS = Object.freeze({
  terrain: 'terrain',
  walrusCamps: 'walrusCamps',
  spawnPoints: 'spawnPoints',
  players: 'players',
  worldState: 'worldState'
})

const STATUS_KEYS = Object.freeze({
  running: 'running',
  succeeded: 'succeeded',
  failed: 'failed',
  canceled: 'canceled'
})

const STAGE_KEYS = Object.freeze({
  renderer: 'renderer',
  staging: 'staging',
  validate: 'validate',
  publish: 'publish',
  interrupted: 'interrupted',
  complete: 'complete'
})

const API_ERROR_KEYS = Object.freeze({
  INVALID_JSON: 'invalidJson',
  JOB_CREATE_FAILED: 'jobCreateFailed',
  MAP_RESOURCE_NOT_FOUND: 'resourceNotFound',
  ROOM_NOT_MANAGED: 'roomNotManaged',
  MAP_RENDERER_UNAVAILABLE: 'rendererUnavailable',
  MAP_GENERATION_IN_PROGRESS: 'generationInProgress',
  INVALID_MAP_LAYERS: 'invalidLayers',
  INVALID_MAP_RESOURCE: 'invalidResource',
  RESOURCE_NOT_FOUND: 'roomOrWorldNotFound',
  MAP_OPERATION_FAILED: 'operationFailed',
  BACKEND_UNAVAILABLE: 'backendUnavailable',
  INVALID_RESPONSE: 'invalidResponse',
  BINARY_REQUEST_FAILED: 'binaryRequestFailed'
})

const DIAGNOSTIC_ERROR_KEYS = Object.freeze({
  '服务重启导致地图生成中断，可重新生成': 'jobInterrupted'
})

function translatedValue(value, keys, namespace, translate, emptyKey = 'worldMaps.values.unknown') {
  const key = keys[value]
  if (key) return translate(`${namespace}.${key}`)
  return value || translate(emptyKey)
}

export function worldMapLayerLabel(layer, translate) {
  return translatedValue(layer, LAYER_KEYS, 'worldMaps.layers', translate)
}

export function worldMapStatusMeta(status, translate) {
  return {
    ...mapStatusMeta(status),
    label: translatedValue(status, STATUS_KEYS, 'worldMaps.statuses', translate)
  }
}

export function worldMapStageLabel(stage, translate) {
  if (!stage) return '--'
  return translatedValue(stage, STAGE_KEYS, 'worldMaps.stages', translate)
}

export function formatWorldMapTime(value, locale = 'zh-CN') {
  if (!value) return '--'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '--'
  return date.toLocaleString(locale === 'en-US' ? 'en-US' : 'zh-CN', { hour12: false })
}

export function worldMapErrorDetail(error, translate) {
  const knownKey = API_ERROR_KEYS[error?.code]
  const message = knownKey
    ? translate(`worldMaps.errors.codes.${knownKey}`)
    : error?.message || translate('worldMaps.values.unknownError')

  if (!error?.requestId || String(message).includes(error.requestId)) return message
  return translate('worldMaps.errors.withRequestId', { message, requestId: error.requestId })
}

export function worldMapJobFailure(job, translate) {
  const failed = (job?.targets || []).find(target => target.status === 'failed')
  const error = failed?.error || job?.error
  if (error?.code === 'JOB_CANCELED') return translate('worldMaps.feedback.jobCanceled')
  if (error?.code === 'SERVER_RESTARTED') return translate('worldMaps.feedback.jobInterrupted')
  if (error?.message) return mapJobFailure(job)
  return translate('worldMaps.feedback.jobFailureDefault')
}

export function worldMapDiagnosticError(message, translate) {
  const key = DIAGNOSTIC_ERROR_KEYS[message]
  return key ? translate(`worldMaps.feedback.${key}`) : message
}

export const worldMapsMessages = {
  'zh-CN': {
    worldMaps: {
      title: '地图与 Session',
      subtitle: '查看世界地图版本、生成任务和原始 Session 快照。',
      values: {
        unknown: '未知',
        unknownError: '未知错误',
        defaultWorld: '世界',
        listSeparator: '、'
      },
      actions: {
        refresh: '刷新',
        retry: '重试',
        cancelJob: '取消任务',
        generate: '生成地图',
        generating: '正在生成',
        downloadSession: '下载 Session',
        downloadSessionAria: '下载 Session {file}',
        viewMap: '查看地图',
        viewDiagnostic: '查看诊断',
        viewDiagnosticAria: '查看地图失败诊断'
      },
      source: {
        title: '世界来源',
        description: '只列出已接管房间的真实世界和 Session 文件。',
        archive: '存档',
        selectArchive: '选择存档',
        world: '世界',
        loadingWorlds: '正在加载世界',
        selectWorld: '选择世界'
      },
      renderer: {
        unavailableTitle: '地图渲染器未就绪',
        unavailableDescription: '当前节点未找到可执行的 dst-map-renderer。已有地图查看和 Session 下载不受影响，新地图生成暂不可用。',
        readyTitle: '地图渲染器已就绪',
        readyDescription: '当前节点已完成地图渲染器配置。'
      },
      generation: {
        runningTitle: '地图生成任务正在执行',
        completedTitle: '地图生成完成',
        canceledTitle: '地图生成已取消',
        failedTitle: '地图生成失败',
        runningDescription: '正在运行外部渲染器并校验输出图层。',
        publishedDescription: '新地图版本已经发布。',
        title: '生成地图',
        description: '从选定 Session 生成经过校验的不可变地图版本。',
        sessionSnapshot: 'Session 快照',
        readingSessions: '正在读取 Session',
        selectSession: '选择 Session',
        snapshotMetadata: '{size} · {count} 位玩家数据 · {time}',
        layers: '地图图层',
        layersDescription: '地形层始终生成，可叠加位置和世界状态图层。',
        diagnosticSnapshots: '{count} 个可诊断快照'
      },
      sessions: {
        title: 'Session 诊断',
        countDescription: '当前世界共 {count} 个快照',
        unavailableDescription: '当前世界没有可用 Session',
        loadFailedTitle: 'Session 读取失败',
        columns: {
          snapshot: '快照',
          size: '大小',
          actions: '操作'
        },
        latest: '最新',
        emptyTitle: '没有 Session 快照',
        emptyDescription: '世界首次保存后，Session 文件会在这里出现。'
      },
      viewer: {
        title: '地图查看器',
        worldTitle: '{world}地图',
        description: '选择或生成一个可用地图版本。',
        layerAlt: '{world} {layer}图层',
        partialLayersFailed: '部分地图图层加载失败',
        emptyTitle: '还没有可用地图',
        emptyRendererReady: '选择 Session 后生成第一个地图版本。',
        emptyRendererUnavailable: '配置地图渲染器后即可从 Session 生成地图。'
      },
      history: {
        title: '地图版本',
        description: '成功版本、运行任务和失败诊断均保留在同一历史中。',
        loading: '正在读取地图版本',
        loadFailedTitle: '地图历史读取失败',
        columns: {
          time: '时间',
          session: 'Session',
          status: '状态',
          stage: '阶段',
          layers: '图层',
          actions: '操作'
        },
        emptyTitle: '没有地图版本',
        emptyDescription: '生成任务提交后，状态会显示在这里。'
      },
      diagnostic: {
        title: '地图生成诊断',
        failedStage: '失败阶段：{stage}',
        failedStageWithError: '失败阶段：{stage}。{error}',
        rendererOutput: '渲染器输出',
        noLogs: '渲染器没有返回日志。'
      },
      layers: {
        terrain: '地形',
        walrusCamps: '海象营地',
        spawnPoints: '出生点',
        players: '玩家',
        worldState: '世界状态'
      },
      statuses: {
        running: '生成中',
        succeeded: '可用',
        failed: '失败',
        canceled: '已取消'
      },
      stages: {
        renderer: '渲染',
        staging: '准备目录',
        validate: '校验图片',
        publish: '发布',
        interrupted: '服务中断',
        complete: '完成'
      },
      errors: {
        sourceLoadFailedTitle: '地图数据加载失败',
        roomsLoadFailed: '无法读取已接管房间：{error}',
        worldsLoadFailed: '无法读取世界列表：{error}',
        mapsLoadFailed: '无法读取地图版本：{error}',
        sessionsLoadFailed: '无法读取 Session 快照：{error}',
        withRequestId: '{message}（请求 ID：{requestId}）',
        codes: {
          invalidJson: '地图生成配置无效',
          jobCreateFailed: '无法创建地图生成任务',
          resourceNotFound: '地图或 Session 资源不存在',
          roomNotManaged: '接管房间后才能使用地图功能',
          rendererUnavailable: '地图渲染器不可用，请先完成节点配置',
          generationInProgress: '该世界已有地图生成任务',
          invalidLayers: '地图图层配置无效',
          invalidResource: '地图资源或路径无效',
          roomOrWorldNotFound: '房间或世界不存在',
          operationFailed: '地图操作失败',
          backendUnavailable: '无法连接真实后端，请检查服务是否已启动',
          invalidResponse: '服务器返回了无效响应',
          binaryRequestFailed: '资源读取失败'
        }
      },
      feedback: {
        generationSubmitted: '地图生成任务已提交',
        generationFailed: '地图生成失败：{error}',
        sessionDownloadStarted: 'Session 下载已开始',
        sessionDownloadFailed: 'Session 下载失败：{error}',
        generationIncomplete: '地图生成未完成：{error}',
        jobStillRunning: '地图任务仍在执行，请稍后刷新状态',
        jobStatusFailed: '地图任务状态读取失败：{error}',
        cancelRequested: '已提交地图任务取消请求',
        cancelFailed: '取消地图任务失败：{error}',
        jobCanceled: '地图任务已取消',
        jobInterrupted: '服务重启中断了地图生成任务',
        jobFailureDefault: '地图生成任务未成功完成'
      }
    }
  },
  'en-US': {
    worldMaps: {
      title: 'Maps & Sessions',
      subtitle: 'Inspect map versions, generation jobs, and raw Session snapshots for each world.',
      values: {
        unknown: 'Unknown',
        unknownError: 'Unknown error',
        defaultWorld: 'World',
        listSeparator: ', '
      },
      actions: {
        refresh: 'Refresh',
        retry: 'Retry',
        cancelJob: 'Cancel job',
        generate: 'Generate map',
        generating: 'Generating',
        downloadSession: 'Download Session',
        downloadSessionAria: 'Download Session {file}',
        viewMap: 'View map',
        viewDiagnostic: 'View diagnostics',
        viewDiagnosticAria: 'View map generation failure diagnostics'
      },
      source: {
        title: 'World source',
        description: 'Only real worlds and Session files from managed rooms are listed.',
        archive: 'Archive',
        selectArchive: 'Select an archive',
        world: 'World',
        loadingWorlds: 'Loading worlds',
        selectWorld: 'Select a world'
      },
      renderer: {
        unavailableTitle: 'Map renderer not ready',
        unavailableDescription: 'No executable dst-map-renderer was found on this node. Existing maps and Session downloads remain available, but new maps cannot be generated yet.',
        readyTitle: 'Map renderer ready',
        readyDescription: 'The map renderer is configured on this node.'
      },
      generation: {
        runningTitle: 'Map generation is running',
        completedTitle: 'Map generation complete',
        canceledTitle: 'Map generation canceled',
        failedTitle: 'Map generation failed',
        runningDescription: 'Running the external renderer and validating its output layers.',
        publishedDescription: 'The new map version has been published.',
        title: 'Generate map',
        description: 'Generate a validated, immutable map version from the selected Session.',
        sessionSnapshot: 'Session snapshot',
        readingSessions: 'Reading Sessions',
        selectSession: 'Select a Session',
        snapshotMetadata: '{size} · {count} player records · {time}',
        layers: 'Map layers',
        layersDescription: 'Terrain is always generated. Location and world-state overlays are optional.',
        diagnosticSnapshots: '{count} diagnostic snapshots'
      },
      sessions: {
        title: 'Session diagnostics',
        countDescription: '{count} snapshots in this world',
        unavailableDescription: 'No Sessions are available for this world',
        loadFailedTitle: 'Could not read Sessions',
        columns: {
          snapshot: 'Snapshot',
          size: 'Size',
          actions: 'Actions'
        },
        latest: 'Latest',
        emptyTitle: 'No Session snapshots',
        emptyDescription: 'Session files will appear here after the world is saved for the first time.'
      },
      viewer: {
        title: 'Map viewer',
        worldTitle: '{world} map',
        description: 'Select or generate an available map version.',
        layerAlt: '{world} {layer} layer',
        partialLayersFailed: 'Some map layers could not be loaded',
        emptyTitle: 'No maps available',
        emptyRendererReady: 'Select a Session to generate the first map version.',
        emptyRendererUnavailable: 'Configure the map renderer to generate maps from Sessions.'
      },
      history: {
        title: 'Map versions',
        description: 'Successful versions, running jobs, and failure diagnostics share one history.',
        loading: 'Reading map versions',
        loadFailedTitle: 'Could not read map history',
        columns: {
          time: 'Time',
          session: 'Session',
          status: 'Status',
          stage: 'Stage',
          layers: 'Layers',
          actions: 'Actions'
        },
        emptyTitle: 'No map versions',
        emptyDescription: 'Submitted generation jobs will appear here with their current status.'
      },
      diagnostic: {
        title: 'Map generation diagnostics',
        failedStage: 'Failed during: {stage}',
        failedStageWithError: 'Failed during: {stage}. {error}',
        rendererOutput: 'Renderer output',
        noLogs: 'The renderer did not return any logs.'
      },
      layers: {
        terrain: 'Terrain',
        walrusCamps: 'Walrus camps',
        spawnPoints: 'Spawn points',
        players: 'Players',
        worldState: 'World state'
      },
      statuses: {
        running: 'Generating',
        succeeded: 'Available',
        failed: 'Failed',
        canceled: 'Canceled'
      },
      stages: {
        renderer: 'Rendering',
        staging: 'Preparing directory',
        validate: 'Validating images',
        publish: 'Publishing',
        interrupted: 'Service interrupted',
        complete: 'Complete'
      },
      errors: {
        sourceLoadFailedTitle: 'Could not load map data',
        roomsLoadFailed: 'Could not read managed rooms: {error}',
        worldsLoadFailed: 'Could not read worlds: {error}',
        mapsLoadFailed: 'Could not read map versions: {error}',
        sessionsLoadFailed: 'Could not read Session snapshots: {error}',
        withRequestId: '{message} (request ID: {requestId})',
        codes: {
          invalidJson: 'The map generation configuration is invalid',
          jobCreateFailed: 'Could not create the map generation job',
          resourceNotFound: 'The map or Session resource does not exist',
          roomNotManaged: 'Manage the room before using map features',
          rendererUnavailable: 'The map renderer is unavailable; configure it on this node first',
          generationInProgress: 'A map generation job is already running for this world',
          invalidLayers: 'The map layer configuration is invalid',
          invalidResource: 'The map resource or path is invalid',
          roomOrWorldNotFound: 'The room or world does not exist',
          operationFailed: 'The map operation failed',
          backendUnavailable: 'Could not reach the backend; check that the service is running',
          invalidResponse: 'The server returned an invalid response',
          binaryRequestFailed: 'Could not read the resource'
        }
      },
      feedback: {
        generationSubmitted: 'Map generation job submitted',
        generationFailed: 'Map generation failed: {error}',
        sessionDownloadStarted: 'Session download started',
        sessionDownloadFailed: 'Session download failed: {error}',
        generationIncomplete: 'Map generation did not complete: {error}',
        jobStillRunning: 'The map job is still running. Refresh its status later.',
        jobStatusFailed: 'Could not read the map job status: {error}',
        cancelRequested: 'Map job cancellation requested',
        cancelFailed: 'Could not cancel the map job: {error}',
        jobCanceled: 'The map job was canceled',
        jobInterrupted: 'A service restart interrupted the map generation job',
        jobFailureDefault: 'The map generation job did not complete successfully'
      }
    }
  }
}
