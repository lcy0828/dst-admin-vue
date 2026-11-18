import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { runInNewContext } from 'node:vm'
import { ref, computed } from 'vue'
import { babelParse, parse } from '@vue/compiler-sfc'

const flush = async () => {
  for (let index = 0; index < 12; index += 1) await Promise.resolve()
}

function readSource(relativePath) {
  return readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8')
}

function stripImports(source) {
  return babelParse(source, { sourceType: 'module' })
    .program.body
    .filter(node => node.type !== 'ImportDeclaration')
    .map(node => {
      const decl = node.type === 'ExportNamedDeclaration' ? node.declaration : node
      return decl ? source.slice(decl.start, decl.end) : ''
    })
    .join('\n')
}

function createEnvironment() {
  const listeners = new Map()
  const intervals = new Map()
  const storage = new Map()
  let nextTimerId = 0

  const document = {
    visibilityState: 'visible',
    addEventListener(name, handler) {
      if (!listeners.has(name)) listeners.set(name, new Set())
      listeners.get(name).add(handler)
    },
    removeEventListener(name, handler) {
      listeners.get(name)?.delete(handler)
    }
  }

  const window = {
    addEventListener(name, handler) {
      document.addEventListener(`window:${name}`, handler)
    },
    removeEventListener(name, handler) {
      document.removeEventListener(`window:${name}`, handler)
    },
    setInterval(fn, ms) {
      const id = ++nextTimerId
      intervals.set(id, { fn, ms })
      return id
    },
    clearInterval(id) {
      intervals.delete(id)
    }
  }

  const sessionStorage = {
    getItem: key => (storage.has(key) ? storage.get(key) : null),
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: key => storage.delete(key)
  }

  async function emitVisibility(state) {
    document.visibilityState = state
    for (const handler of [...(listeners.get('visibilitychange') || [])]) {
      await handler()
    }
  }

  return {
    document,
    window,
    sessionStorage,
    listeners,
    intervals,
    emitVisibility,
    setInterval: window.setInterval,
    clearInterval: window.clearInterval
  }
}

test('useDashboardV2 pauses update polling while document is hidden and resumes on return', async () => {
  const env = createEnvironment()
  const mounts = []
  const unmounts = []
  const updateCalls = []
  let pollResponse = { status: 200, data: { is_running: true, is_completed: false } }

  env.sessionStorage.setItem('dstUpdateSessionName', 'update-job-1')

  const context = {
    ref,
    computed,
    onMounted: fn => mounts.push(fn),
    onBeforeUnmount: fn => unmounts.push(fn),
    document: env.document,
    window: env.window,
    sessionStorage: env.sessionStorage,
    setInterval: env.setInterval,
    clearInterval: env.clearInterval,
    roomApi: { getScopedRuntimeOverview: async () => ({ status: 200, data: {} }) },
    systemApi: {
      getDstUpdateStatus: async jobId => {
        updateCalls.push(jobId)
        return pollResponse
      },
      getGameVersion: async () => ({ status: 200, data: {} })
    },
    authAPI: { session: async () => ({}) },
    AUTH_ONBOARDING_UPDATED_EVENT: 'auth:onboarding-updated',
    systemV2API: { capabilities: async () => ({}), setupChecks: async () => ({ ready: true, checks: [] }) },
    confirmAction: async () => ({}),
    confirmRoomMaintenance: async () => ({}),
    formatResourceDateTime: value => String(value || ''),
    isCapacityRiskCanceled: () => false,
    startRoomWithCapacityRisk: async () => ({}),
    canCleanFailedWorld: () => false,
    canStartWorld: () => false,
    worldPrimaryAction: () => ({ disabled: true }),
    worldStatusMessage: () => '',
    i18n: { global: { locale: 'en-US' } },
    translate: key => key,
    useSystemResourceStatus: () => ({
      status: ref({}),
      loading: ref(false),
      error: ref(''),
      refreshSystemResourceStatus: async () => true
    }),
    toast: { success() {}, warning() {}, error() {} },
    getManagementScope: () => ({ kind: 'all' }),
    MANAGEMENT_SCOPE_CHANGED_EVENT: 'management-scope:changed',
    managementScopeTargetId: () => '',
    RUNTIME_OBSERVATION_UPDATED_EVENT: 'runtime:updated'
  }

  const dashboard = runInNewContext(
    `${stripImports(readSource('src/composables/useDashboardV2.js'))}\nuseDashboardV2({ observeRuntime: false })`,
    context
  )

  mounts.forEach(fn => fn())
  await dashboard.resumeUpdatePolling()
  assert.equal(updateCalls.length, 1)
  assert.equal(env.intervals.size, 1)

  await env.emitVisibility('hidden')
  assert.equal(env.intervals.size, 0)

  await env.emitVisibility('visible')
  assert.equal(updateCalls.length, 2)
  assert.equal(env.intervals.size, 1)

  pollResponse = { status: 200, data: { is_running: false, is_completed: true } }
  const activeTimer = [...env.intervals.values()][0]
  await activeTimer.fn()
  await flush()
  assert.equal(updateCalls.length, 3)
  assert.equal(env.intervals.size, 0)

  unmounts.forEach(fn => fn())
  assert.equal(env.listeners.get('visibilitychange')?.size || 0, 0)
})

test('TaskExecutionResult pauses polling while hidden and stops permanently once end_time arrives', async () => {
  const env = createEnvironment()
  const raw = parse(readSource('src/views/cron/TaskExecutionResult.vue')).descriptor.script.content
  const ast = babelParse(raw, { sourceType: 'module' })
  const exportDecl = ast.program.body.find(node => node.type === 'ExportDefaultDeclaration').declaration
  const methodsProp = exportDecl.properties.find(node => node.key.name === 'methods')
  const keptMethods = methodsProp.value.properties
    .filter(node => ['stopRefreshTimer', 'startRefreshTimer', 'handleVisibilityChange', 'fetchLogDetail'].includes(node.key.name))
    .map(node => raw.slice(node.start, node.end))
  const hooks = exportDecl.properties
    .filter(node => ['created', 'mounted', 'beforeUnmount'].includes(node.key.name))
    .map(node => raw.slice(node.start, node.end))

  const fetchCalls = []
  let nextLog = { id: 'log-1', status: 'running' }
  const context = {
    document: env.document,
    setInterval: env.setInterval,
    clearInterval: env.clearInterval,
    toast: { error() {} },
    console
  }
  const instance = runInNewContext(`({ ${[...hooks, ...keptMethods].join(',\n')} })`, context)
  for (const key of ['stopRefreshTimer', 'startRefreshTimer', 'handleVisibilityChange', 'fetchLogDetail']) {
    instance[key] = instance[key].bind(instance)
  }
  Object.assign(instance, {
    loading: false,
    logId: 'log-1',
    logData: null,
    refreshInterval: null,
    $route: { params: { id: 'log-1' } },
    automationApi: {
      getLogDetail: async id => {
        fetchCalls.push(id)
        return { code: 200, data: nextLog }
      }
    },
    text: key => key,
    failureText: key => key,
    goBack() {}
  })

  instance.created()
  instance.mounted()
  await flush()
  assert.equal(fetchCalls.length, 1)
  assert.equal(env.intervals.size, 1)

  await env.emitVisibility('hidden')
  assert.equal(env.intervals.size, 0)

  await env.emitVisibility('visible')
  await flush()
  assert.equal(fetchCalls.length, 2)
  assert.equal(env.intervals.size, 1)

  nextLog = { id: 'log-1', status: 'success', end_time: '2026-11-13T10:00:00Z' }
  const activeTimer = [...env.intervals.values()][0]
  activeTimer.fn()
  await flush()
  assert.equal(fetchCalls.length, 3)
  assert.equal(env.intervals.size, 0)

  await env.emitVisibility('visible')
  await flush()
  assert.equal(fetchCalls.length, 3)

  instance.beforeUnmount()
  assert.equal(env.listeners.get('visibilitychange')?.size || 0, 0)
})

test('SaveImportsPanel pauses background polling while hidden and catches up on return when active imports exist', async () => {
  const env = createEnvironment()
  const raw = parse(readSource('src/views/backups/SaveImportsPanel.vue')).descriptor.scriptSetup.content
  const ast = babelParse(raw, { sourceType: 'module' })
  const want = new Set(['hasPendingImports', 'stopRefreshTimer', 'startRefreshTimer', 'handleVisibilityChange'])
  const fns = ast.program.body
    .filter(node => node.type === 'FunctionDeclaration' && want.has(node.id.name))
    .map(node => raw.slice(node.start, node.end))
  const lifecycleCalls = ast.program.body
    .filter(node => node.type === 'ExpressionStatement' && node.expression.type === 'CallExpression' && ['onMounted', 'onBeforeUnmount'].includes(node.expression.callee?.name))
    .map(node => raw.slice(node.start, node.end))

  const mounts = []
  const unmounts = []
  const loadCalls = []
  const imports = ref([{ id: 'imp-1', status: 'analyzing' }])

  const context = {
    document: env.document,
    window: env.window,
    onMounted: fn => mounts.push(fn),
    onBeforeUnmount: fn => unmounts.push(fn),
    imports,
    disposed: false,
    refreshTimer: null,
    lifecycleGeneration: 0,
    importRequestSequence: 0,
    roomRequestSequence: 0,
    detailRequestSequence: 0,
    loadImports: opts => {
      loadCalls.push({ ...opts })
      return Promise.resolve()
    },
    loadRooms: () => Promise.resolve()
  }

  runInNewContext(`${fns.join('\n')}\n${lifecycleCalls.join('\n')}`, context)

  mounts.forEach(fn => fn())
  assert.equal(loadCalls.length, 1)
  assert.equal(env.intervals.size, 1)

  await env.emitVisibility('hidden')
  assert.equal(env.intervals.size, 0)

  await env.emitVisibility('visible')
  assert.equal(loadCalls.length, 2)
  assert.deepEqual(loadCalls[1], { quiet: true })
  assert.equal(env.intervals.size, 1)

  unmounts.forEach(fn => fn())
  assert.equal(env.intervals.size, 0)
  assert.equal(env.listeners.get('visibilitychange')?.size || 0, 0)
})
