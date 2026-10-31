import { currentSharedUiLocale } from '../i18n/sharedUiMessages.js'

const groups = {
  connection: ['BACKEND_UNAVAILABLE', 'NETWORK_ERROR'],
  timeout: ['REQUEST_TIMEOUT', 'WORLD_STATE_PROBE_TIMEOUT'],
  credentials: ['CLUSTER_TOKEN_INVALID', 'CLUSTER_TOKEN_MISSING', 'ROOM_TOKEN_REQUIRED', 'TOKEN_REQUIRED'],
  installation: ['GAME_NOT_INSTALLED', 'GAME_INSTALLATION_MISSING', 'INSTALLATION_MISSING'],
  collection: ['RUNTIME_NOT_INSTALLED', 'WORLD_STATE_RUNTIME_UNAVAILABLE', 'RUNTIME_OBSERVATION_FAILED', 'PLAYER_TARGET_UNAVAILABLE'],
  unavailable: ['ROOM_UNAVAILABLE', 'TARGET_UNAVAILABLE', 'TARGET_OFFLINE', 'AGENT_OFFLINE'],
  topology: ['TOPOLOGY_CHANGED', 'ROOM_TOPOLOGY_CHANGED'],
  conflict: ['REVISION_CONFLICT', 'CONFIGURATION_CONFLICT', 'SETTINGS_REVISION_CONFLICT', 'PLAN_CHANGED'],
  inventory: ['SAVE_INVALID', 'PLAYER_INVENTORY_UNAVAILABLE'],
  maintenance: ['INSTALLATION_MAINTENANCE', 'GAME_RELEASE_IN_PROGRESS', 'MAINTENANCE_IN_PROGRESS']
}
const messages = {
  'zh-CN': {
    connection: '暂时无法连接面板服务，请检查连接后刷新。',
    timeout: '等待响应超时，暂时无法确认操作结果。请先查看原任务或刷新状态。',
    credentials: '开服凭证缺失或无效，请检查房间的开服凭证。',
    installation: '这台机器还没有可用的游戏服务端，请先安装或接入已有游戏。',
    collection: '暂时无法读取游戏数据，请稍后刷新；持续失败时可在房间中检查数据采集。',
    unavailable: '暂时无法管理这个房间，请检查运行机器是否在线。',
    topology: '房间的运行位置已变化，请刷新房间并查看原任务。',
    conflict: '设置已被其他操作修改，请重新读取后再保存。',
    inventory: '暂时无法读取这个背包，请查看玩家所在世界和可用的存档来源。',
    maintenance: '游戏正在更新或维护，请先查看原任务的进度。',
    forbidden: '当前账户没有这项操作的权限。', session: '登录已过期，请重新登录。',
    limited: '当前请求较多，请稍后再试。', invalid: '填写的内容未通过检查，请核对设置。',
    missing: '没有找到这项记录，可能已被删除或不在当前访问范围内。',
    failed: '未能完成这项操作，请查看报错记录了解原因。'
  },
  'en-US': {
    connection: 'Unable to reach the panel. Check the connection and refresh.',
    timeout: 'The response timed out. Check the original task or refresh its status before trying again.',
    credentials: 'The Klei server token is missing or invalid. Check the room credentials.',
    installation: 'No usable game installation is available on this machine. Install or connect an existing game.',
    collection: 'Game data is temporarily unavailable. Refresh later, or check data collection in the room.',
    unavailable: 'This room is temporarily unavailable. Check whether its machine is online.',
    topology: 'Room placement changed. Refresh the room and check the original task.',
    conflict: 'These settings changed elsewhere. Reload them before saving.',
    inventory: 'Unable to read this inventory. Check the player’s world and available save sources.',
    maintenance: 'The game is being updated or maintained. Check the original task.',
    forbidden: 'Your account does not have permission for this operation.', session: 'Your session expired. Please sign in again.',
    limited: 'Too many requests. Please try again later.', invalid: 'Some values were rejected. Check your settings.',
    missing: 'The record was not found. It may have been removed or be outside your access.',
    failed: 'Unable to complete this operation. Check the error record for the cause.'
  }
}

const accountMessages = {
  INVALID_CREDENTIALS: ['用户名或密码不正确，请重新填写。', 'The username or password is incorrect.'],
  CURRENT_PASSWORD_INVALID: ['当前密码不正确，请重新填写。', 'The current password is incorrect.'],
  WEAK_PASSWORD: ['密码太短，请按页面要求设置。', 'The password is too short. Follow the requirements shown on the page.'],
  PASSWORD_COMPLEXITY_REQUIRED: ['密码需包含大小写字母、数字和特殊字符。', 'Use uppercase and lowercase letters, numbers and a special character.'],
  PASSWORD_TOO_LONG: ['密码不能超过 72 字节。', 'The password must not exceed 72 bytes.'],
  PASSWORD_UNCHANGED: ['请使用与当前密码不同的新密码。', 'Choose a new password different from the current one.'],
  SETUP_REQUIRED: ['请先完成管理员账户设置。', 'Complete administrator account setup first.'],
  SETUP_COMPLETE: ['管理员账户已创建，请登录后继续。', 'The administrator account already exists. Sign in to continue.']
}

export function requestErrorMessage(error, locale = currentSharedUiLocale()) {
  const catalog = messages[locale] || messages['zh-CN']
  const code = String(error?.code || '').toUpperCase()
  if (accountMessages[code]) return accountMessages[code][locale === 'en-US' ? 1 : 0]
  const group = Object.keys(groups).find(key => groups[key].includes(code))
  if (group) return catalog[group]
  const status = Number(error?.status)
  return catalog[({ 400: 'invalid', 401: 'session', 403: 'forbidden', 404: 'missing', 409: 'failed', 422: 'invalid', 429: 'limited' })[status] || 'failed']
}

function safeReportValue(value, depth = 0, budget = { chars: 12000, nodes: 256, seen: new WeakSet() }) {
  if (depth > 5 || --budget.nodes < 0 || budget.chars <= 0) return '[…]'
  if (typeof value === 'string') {
    const text = value.slice(0, Math.min(4000, budget.chars))
      .replace(/(https?:\/\/)[^\s/@]+:[^\s/@]+@/gi, '$1[hidden]@')
      .replace(/Bearer\s+[\w.-]+/gi, 'Bearer [hidden]')
    budget.chars -= text.length
    return text
  }
  if (value && typeof value === 'object') {
    if (budget.seen.has(value)) return '[…]'
    budget.seen.add(value)
    if (Array.isArray(value)) return value.slice(0, 30).map(item => safeReportValue(item, depth + 1, budget))
    const entries = []
    for (const [key, item] of Object.entries(value).slice(0, 40)) {
      if (budget.nodes <= 0 || budget.chars <= 0) { entries.push(['…', '[…]']); break }
      const safeKey = key.slice(0, Math.min(100, budget.chars))
      budget.chars -= safeKey.length
      entries.push([safeKey, /password|secret|token|authorization|cookie|api.?key/i.test(key) ? '[hidden]' : safeReportValue(item, depth + 1, budget)])
    }
    return Object.fromEntries(entries)
  }
  return value
}

export function errorReport(error) {
  return JSON.stringify(safeReportValue({
    code: error?.code || '', status: error?.status,
    message: error?.rawMessage || error?.message || '',
    requestId: error?.requestId || '', details: error?.details
  }), null, 2)
}

// Memory only: retain enough information for a user to copy a failed request,
// without persisting responses or starting another background request.
const recent = []
export const REQUEST_ERROR_EVENT = 'dst-admin:request-error'
export function rememberRequestError(error) {
  recent.unshift({ message: error.message, report: errorReport(error), at: Date.now() })
  recent.splice(5)
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(REQUEST_ERROR_EVENT))
}
export const recentRequestErrors = () => recent.map(item => ({ ...item }))
