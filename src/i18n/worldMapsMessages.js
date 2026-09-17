import { mapJobFailure, mapStatusMeta } from '../lib/worldMaps.mjs'
import { formatSystemDateTime } from '../lib/dateTime.mjs'

const LAYER_KEYS = Object.freeze({
  terrain: 'terrain',
  features: 'features',
  worldState: 'worldState'
})

const FEATURE_CATEGORY_KEYS = Object.freeze({
  spawnPoint: 'spawnPoint',
  player: 'player',
  walrusCamp: 'walrusCamp',
  landmark: 'landmark',
  resource: 'resource',
  other: 'other'
})

const STATUS_KEYS = Object.freeze({
  running: 'running',
  succeeded: 'succeeded',
  failed: 'failed',
  canceled: 'canceled'
})

const STAGE_KEYS = Object.freeze({
  snapshot: 'snapshot',
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

export function worldMapFeatureCategoryLabel(category, translate) {
  return translatedValue(category, FEATURE_CATEGORY_KEYS, 'worldMaps.categories', translate)
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
  return formatSystemDateTime(value, {
    locale: locale === 'en-US' ? 'en-US' : 'zh-CN',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
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
      title: '世界地图',
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
        downloadSession: '下载存档文件',
        downloadSessionAria: '下载存档文件 {file}',
        viewMap: '查看地图',
        viewDiagnostic: '查看诊断',
        viewDiagnosticAria: '查看地图失败诊断',
        clearSearch: '清除搜索',
        zoomIn: '放大',
        zoomOut: '缩小',
        rotateMap: '顺时针旋转 45°',
        resetOrientation: '恢复游戏默认朝向',
        fitMap: '适应地图',
        fullscreen: '全屏',
        exitFullscreen: '退出全屏'
      },
      source: {
        title: '选择世界',
        description: '列出 Agent 已发现房间的真实世界和 Session 文件。',
        archive: '存档',
        selectArchive: '选择存档',
        world: '世界',
        loadingWorlds: '正在加载世界',
        selectWorld: '选择世界'
      },
      renderer: {
        protocol: 'Renderer v{version}',
        unavailableBadge: '地图生成不可用',
        unavailableTitle: '地图渲染器未就绪',
        unavailableDescription: '请在运行机器上安装地图生成工具 dst-map-renderer。已有地图和存档文件仍可查看或下载。',
        readyTitle: '地图渲染器已就绪',
        readyDescription: '当前节点已完成地图渲染器配置。'
      },
      generation: {
        runningTitle: '地图生成任务正在执行',
        completedTitle: '地图生成完成',
        canceledTitle: '地图生成已取消',
        failedTitle: '地图生成失败',
        runningDescription: '正在从存档生成地图。',
        publishedDescription: '新地图版本已经发布。',
        title: '生成地图',
        description: '根据选定的存档生成地图，不修改存档。',
        sessionSnapshot: '存档记录',
        readingSessions: '正在读取存档记录',
        selectSession: '选择存档记录',
        snapshotMetadata: '{size} · {count} 位玩家数据 · {time}',
        layers: '地图图层',
        layersDescription: '地形层始终生成，可叠加位置和世界状态图层。',
        output: '生成内容',
        outputDescription: '包含地形、物品与生物位置、世界状态。',
        diagnosticSnapshots: '{count} 个可诊断快照'
      },
      sessions: {
        title: '存档文件',
        countDescription: '当前世界共 {count} 条存档记录',
        unavailableDescription: '当前世界没有可用存档',
        loadFailedTitle: '存档文件读取失败',
        columns: {
          snapshot: '存档记录',
          size: '大小',
          actions: '操作'
        },
        latest: '最新',
        emptyTitle: '没有存档记录',
        emptyDescription: '世界首次保存后，存档文件会出现在这里。'
      },
      viewer: {
        title: '地图查看器',
        worldTitle: '{world}地图',
        description: '选择或生成一个可用地图版本。',
        layerAlt: '{world} {layer}图层',
        partialLayersFailed: '部分地图图层加载失败',
        searchPlaceholder: '搜索 prefab 或实体 ID',
        searchResults: '{count} 个匹配实体',
        noSearchResults: '没有匹配的实体',
        categoryFilters: '实体图层',
        artifactLoadFailedTitle: '地图产物加载失败',
        terrainLoadFailedTitle: '地形图加载失败',
        terrainLoadFailedDescription: '地形图片无法解码或已不可用，请查看其他地图版本。',
        statistics: {
          tiles: '地形块',
          features: '实体',
          unknownTiles: '扩展 Tile',
          warnings: '警告'
        },
        emptyTitle: '还没有可用地图',
        emptyRendererReady: '选择存档记录，生成第一张地图。',
        emptyRendererUnavailable: '配置地图生成工具后，即可从存档生成地图。'
      },
      history: {
        title: '地图版本',
        description: '成功版本、运行任务和失败诊断均保留在同一历史中。',
        loading: '正在读取地图版本',
        loadFailedTitle: '地图历史读取失败',
        columns: {
          time: '时间',
          session: '存档记录',
          status: '状态',
          stage: '阶段',
          layers: '图层',
          features: '实体',
          warnings: '警告',
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
      worldState: {
        title: '存档中的世界状态',
        description: '选定存档保存时的世界状态。',
        emptyTitle: '没有世界状态',
        emptyDescription: '当前存档未包含可读取的世界状态。',
        warningsTitle: '{count} 条渲染警告'
      },
      feature: {
        title: '实体详情',
        worldCoordinates: '世界坐标 X / Z',
        pixelCoordinates: '图片坐标 X / Y',
        properties: '存档属性',
        noProperties: '该实体没有可展示的附加属性。'
      },
      layers: {
        terrain: '地形',
        features: '实体',
        worldState: '世界状态'
      },
      categories: {
        spawnPoint: '出生点',
        player: '玩家',
        walrusCamp: '海象营地',
        landmark: '地标',
        resource: '资源',
        other: '其他 / MOD'
      },
      statuses: {
        running: '生成中',
        succeeded: '可用',
        failed: '失败',
        canceled: '已取消'
      },
      stages: {
        snapshot: '复制快照',
        renderer: '渲染',
        staging: '准备目录',
        validate: '校验产物',
        publish: '发布',
        interrupted: '服务中断',
        complete: '完成'
      },
      errors: {
        sourceLoadFailedTitle: '地图数据加载失败',
        roomsLoadFailed: '无法读取房间：{error}',
        worldsLoadFailed: '无法读取世界列表：{error}',
        mapsLoadFailed: '无法读取地图版本：{error}',
        sessionsLoadFailed: '无法读取存档记录：{error}',
        artifactsLoadFailed: '无法读取地图产物：{error}',
        withRequestId: '{message}（请求 ID：{requestId}）',
        codes: {
          invalidJson: '地图生成配置无效',
          jobCreateFailed: '无法创建地图生成任务',
          resourceNotFound: '地图或存档文件不存在',
          roomNotManaged: '房间所在 Agent 可用后才能使用地图功能',
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
        sessionDownloadStarted: '存档文件下载已开始',
        sessionDownloadFailed: '存档文件下载失败：{error}',
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
      title: 'World maps',
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
        downloadSession: 'Download save file',
        downloadSessionAria: 'Download save file {file}',
        viewMap: 'View map',
        viewDiagnostic: 'View diagnostics',
        viewDiagnosticAria: 'View map generation failure diagnostics',
        clearSearch: 'Clear search',
        zoomIn: 'Zoom in',
        zoomOut: 'Zoom out',
        rotateMap: 'Rotate 45° clockwise',
        resetOrientation: 'Reset to the game default orientation',
        fitMap: 'Fit map',
        fullscreen: 'Fullscreen',
        exitFullscreen: 'Exit fullscreen'
      },
      source: {
        title: 'Select world',
        description: 'Lists real worlds and Session files reported by Agents.',
        archive: 'Archive',
        selectArchive: 'Select an archive',
        world: 'World',
        loadingWorlds: 'Loading worlds',
        selectWorld: 'Select a world'
      },
      renderer: {
        protocol: 'Renderer v{version}',
        unavailableBadge: 'Map generation unavailable',
        unavailableTitle: 'Map renderer not ready',
        unavailableDescription: 'Install dst-map-renderer on the machine running this world. Existing maps and save files remain available to view or download.',
        readyTitle: 'Map renderer ready',
        readyDescription: 'The map renderer is configured on this node.'
      },
      generation: {
        runningTitle: 'Map generation is running',
        completedTitle: 'Map generation complete',
        canceledTitle: 'Map generation canceled',
        failedTitle: 'Map generation failed',
        runningDescription: 'Generating a map from the save.',
        publishedDescription: 'The new map version has been published.',
        title: 'Generate map',
        description: 'Generate a map from the selected save without changing it.',
        sessionSnapshot: 'Save record',
        readingSessions: 'Reading save records',
        selectSession: 'Select a save record',
        snapshotMetadata: '{size} · {count} player records · {time}',
        layers: 'Map layers',
        layersDescription: 'Terrain is always generated. Location and world-state overlays are optional.',
        output: 'Map contents',
        outputDescription: 'Includes terrain, item and creature locations, and world state.',
        diagnosticSnapshots: '{count} diagnostic snapshots'
      },
      sessions: {
        title: 'Save files',
        countDescription: '{count} save records in this world',
        unavailableDescription: 'No saves are available for this world',
        loadFailedTitle: 'Could not read save files',
        columns: {
          snapshot: 'Save record',
          size: 'Size',
          actions: 'Actions'
        },
        latest: 'Latest',
        emptyTitle: 'No save records',
        emptyDescription: 'Save files will appear here after the world is saved for the first time.'
      },
      viewer: {
        title: 'Map viewer',
        worldTitle: '{world} map',
        description: 'Select or generate an available map version.',
        layerAlt: '{world} {layer} layer',
        partialLayersFailed: 'Some map layers could not be loaded',
        searchPlaceholder: 'Search prefab or entity ID',
        searchResults: '{count} matching entities',
        noSearchResults: 'No matching entities',
        categoryFilters: 'Entity layers',
        artifactLoadFailedTitle: 'Could not load map artifacts',
        terrainLoadFailedTitle: 'Could not load terrain',
        terrainLoadFailedDescription: 'The terrain image could not be decoded or is no longer available. Select another map version.',
        statistics: {
          tiles: 'Tiles',
          features: 'Entities',
          unknownTiles: 'Extended tiles',
          warnings: 'Warnings'
        },
        emptyTitle: 'No maps available',
        emptyRendererReady: 'Select a save record to generate the first map.',
        emptyRendererUnavailable: 'Configure the map tool to generate maps from saves.'
      },
      history: {
        title: 'Map versions',
        description: 'Successful versions, running jobs, and failure diagnostics share one history.',
        loading: 'Reading map versions',
        loadFailedTitle: 'Could not read map history',
        columns: {
          time: 'Time',
          session: 'Save record',
          status: 'Status',
          stage: 'Stage',
          layers: 'Layers',
          features: 'Entities',
          warnings: 'Warnings',
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
      worldState: {
        title: 'World snapshot',
        description: 'World state at the time of the selected save.',
        emptyTitle: 'No world state',
        emptyDescription: 'The selected save has no readable world state.',
        warningsTitle: '{count} renderer warnings'
      },
      feature: {
        title: 'Entity details',
        worldCoordinates: 'World coordinates X / Z',
        pixelCoordinates: 'Image coordinates X / Y',
        properties: 'Save properties',
        noProperties: 'This entity has no additional properties to display.'
      },
      layers: {
        terrain: 'Terrain',
        features: 'Entities',
        worldState: 'World state'
      },
      categories: {
        spawnPoint: 'Spawn points',
        player: 'Players',
        walrusCamp: 'Walrus camps',
        landmark: 'Landmarks',
        resource: 'Resources',
        other: 'Other / MOD'
      },
      statuses: {
        running: 'Generating',
        succeeded: 'Available',
        failed: 'Failed',
        canceled: 'Canceled'
      },
      stages: {
        snapshot: 'Copying snapshot',
        renderer: 'Rendering',
        staging: 'Preparing directory',
        validate: 'Validating artifacts',
        publish: 'Publishing',
        interrupted: 'Service interrupted',
        complete: 'Complete'
      },
      errors: {
        sourceLoadFailedTitle: 'Could not load map data',
        roomsLoadFailed: 'Could not read rooms: {error}',
        worldsLoadFailed: 'Could not read worlds: {error}',
        mapsLoadFailed: 'Could not read map versions: {error}',
        sessionsLoadFailed: 'Could not read save records: {error}',
        artifactsLoadFailed: 'Could not read map artifacts: {error}',
        withRequestId: '{message} (request ID: {requestId})',
        codes: {
          invalidJson: 'The map generation configuration is invalid',
          jobCreateFailed: 'Could not create the map generation job',
          resourceNotFound: 'The map or save file does not exist',
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
        sessionDownloadStarted: 'Save file download started',
        sessionDownloadFailed: 'Save file download failed: {error}',
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
