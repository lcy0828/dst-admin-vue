import { computed, inject, onBeforeUnmount, onMounted, provide, ref, watch } from 'vue'
import { jobsV2API } from '@/api/v2'
import { waitForV2Job } from '@/api/v2ConfigurationAdapters'
import { isActiveJob, isTaskProgressJob, retainCompletedProgressJob } from '@/lib/taskProgress.mjs'
import {
  GLOBAL_JOB_SUBMITTED_EVENT,
  mergeActiveJobs,
  parseGlobalJobEvent,
  reduceGlobalJobEvent
} from '@/lib/globalJobs.mjs'

const JOB_EVENTS = Object.freeze([
  'job.created',
  'job.running',
  'job.progress',
  'job.target.completed',
  'job.completed',
  'job.cancel.requested',
  'job.interrupted'
])

// Keep the injection key identical when Vite reloads consumers while their
// layout provider is still mounted. The task state remains layout-scoped.
const globalJobStatusKey = Symbol.for('dst-admin:global-job-status')

export function provideGlobalJobStatus() {
  const status = useGlobalJobStatus()
  provide(globalJobStatusKey, status)
  return status
}

export function useSharedJobStatus() {
  return inject(globalJobStatusKey, null)
}

export function useGlobalJobStatus() {
  const shared = useSharedJobStatus()
  if (shared) return shared
  const activeJobs = ref([])
  const recentProgressJobs = ref([])
  const roomLabels = ref({})
  const jobLabels = ref({})
  const closedProgressIds = ref([])
  const focusedJobId = ref('')
  const dockMinimized = ref(false)
  const dockExpanded = ref(false)
  const taskListOpen = ref(false)
  const recentFailures = ref([])
  const recentWarnings = ref([])
  const connected = ref(false)
  const loadError = ref('')
  let eventSource = null
  let refreshPromise = null
  let refreshSequence = 0
  let lifecycleActive = false
  let lastEventId = ''
  let initialReadTimer = null
  let changedJobsDuringRefresh = null

  const activeCount = computed(() => activeJobs.value.length)
  const failureCount = computed(() => recentFailures.value.length)
  const warningCount = computed(() => recentWarnings.value.length)
  const visible = computed(() => activeCount.value > 0 || failureCount.value > 0 || warningCount.value > 0 || recentProgressJobs.value.length > 0 || Boolean(loadError.value))

  async function refreshActiveJobs() {
    if (refreshPromise) return refreshPromise

    const sequence = ++refreshSequence
    const changedJobs = new Set()
    changedJobsDuringRefresh = changedJobs
    const request = (async () => {
      try {
        const [queued, running] = await Promise.all([
          jobsV2API.controlPlaneList({ status: 'queued', limit: 100 }),
          jobsV2API.controlPlaneList({ status: 'running', limit: 100 })
        ])
        if (sequence !== refreshSequence) return
        const previous = activeJobs.value
        activeJobs.value = mergeActiveJobs(
          mergeActiveJobs(queued?.items, running?.items).filter(job => !changedJobs.has(job.id)),
          activeJobs.value.filter(job => changedJobs.has(job.id))
        )
        loadError.value = ''
        // A hidden tab can miss completion events. Reconcile only known
        // tasks that disappeared from the active list when reconnecting.
        await Promise.allSettled(previous.filter(job => isTaskProgressJob(job) && !changedJobs.has(job.id) && !activeJobs.value.some(item => item.id === job.id)).map(async job => {
          const latest = await jobsV2API.controlPlaneGet(job.id)
          if (sequence === refreshSequence && !changedJobs.has(job.id)) applyJobEvent(isActiveJob(latest) ? 'job.progress' : 'job.completed', { data: JSON.stringify({ data: latest }) })
        }))
      } catch (error) {
        if (sequence !== refreshSequence) return
        loadError.value = error?.message || String(error)
      }
    })()
    refreshPromise = request

    try {
      return await request
    } finally {
      if (refreshPromise === request) {
        refreshPromise = null
        changedJobsDuringRefresh = null
      }
    }
  }

  function applyJobEvent(eventType, event) {
    const job = parseGlobalJobEvent(event.data)
    if (job) changedJobsDuringRefresh?.add(job.id)
    if (job && ['job.completed', 'job.interrupted'].includes(eventType)) {
      recentProgressJobs.value = retainCompletedProgressJob(recentProgressJobs.value, job)
    }
    const next = reduceGlobalJobEvent({
      activeJobs: activeJobs.value,
      recentFailures: recentFailures.value,
      recentWarnings: recentWarnings.value
    }, eventType, event.data)
    activeJobs.value = next.activeJobs
    recentFailures.value = next.recentFailures
    recentWarnings.value = next.recentWarnings
    loadError.value = ''
  }

  function disconnect() {
    clearInitialReadTimer()
    refreshSequence += 1
    refreshPromise = null
    changedJobsDuringRefresh = null
    const source = eventSource
    eventSource = null
    connected.value = false
    source?.close()
  }

  function clearInitialReadTimer() {
    if (initialReadTimer !== null) clearTimeout(initialReadTimer)
    initialReadTimer = null
  }

  async function refreshAfterCursor(source) {
    // A fallback read started before the cursor can miss changes in between.
    if (refreshPromise) await refreshPromise
    if (eventSource === source) await refreshActiveJobs()
  }

  function connect() {
    if (!lifecycleActive || eventSource || typeof EventSource !== 'function') return
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return

    let source
    try {
      source = new EventSource(jobsV2API.eventsURL(lastEventId), { withCredentials: true })
    } catch {
      return
    }
    eventSource = source
    initialReadTimer = setTimeout(() => {
      initialReadTimer = null
      if (eventSource === source) void refreshActiveJobs()
    }, 1500)
    source.onopen = () => {
      if (eventSource !== source) return
      connected.value = true
    }
    source.addEventListener('job.cursor', event => {
      if (eventSource !== source) return
      clearInitialReadTimer()
      try {
        const cursor = JSON.parse(event.data || '{}')?.watermark
        if (Number.isInteger(cursor) && cursor >= 0) lastEventId = String(cursor)
      } catch {
        // A malformed cursor only affects replay; live events can still continue.
      }
      void refreshAfterCursor(source)
    })
    for (const eventType of JOB_EVENTS) {
      source.addEventListener(eventType, event => {
        if (eventSource !== source) return
        if (event.lastEventId) lastEventId = event.lastEventId
        applyJobEvent(eventType, event)
      })
    }
    source.onerror = () => {
      if (eventSource !== source) return
      connected.value = false
      clearInitialReadTimer()
      void refreshActiveJobs()
    }
  }

  function resume() {
    if (!lifecycleActive) return
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
    if (eventSource) return
    connect()
    if (!eventSource) void refreshActiveJobs()
  }

  function handleVisibilityChange() {
    if (document.visibilityState === 'hidden') {
      disconnect()
      return
    }
    resume()
  }

  function handlePageHide() {
    disconnect()
  }

  function handlePageShow() {
    resume()
  }

  function handleJobSubmitted(event) {
    const job = event?.detail
    if (!job?.id) return
    if (![...activeJobs.value, ...recentProgressJobs.value, ...recentFailures.value].some(item => item.id === job.id)) {
      applyJobEvent(isActiveJob(job) ? 'job.created' : 'job.completed', { data: JSON.stringify({ data: job }) })
    }
    if (job.displayName) jobLabels.value = Object.fromEntries([...Object.entries(jobLabels.value).filter(([id]) => id !== job.id), [job.id, job.displayName]].slice(-100))
    if (isTaskProgressJob(job)) showJobProgress(job.id, false)
  }

  function showJobProgress(jobId, expanded = true) {
    closedProgressIds.value = closedProgressIds.value.filter(id => id !== jobId)
    focusedJobId.value = jobId
    dockMinimized.value = false
    dockExpanded.value = expanded
  }

  function rememberRoomLabel(roomId, label) {
    if (roomId && label) roomLabels.value = { ...roomLabels.value, [roomId]: label }
  }

  function closeJobProgress(jobId) {
    if (activeJobs.value.some(job => job.id === jobId && isActiveJob(job))) return
    closedProgressIds.value = [...closedProgressIds.value.filter(id => id !== jobId), jobId].slice(-20)
    if (focusedJobId.value === jobId) focusedJobId.value = ''
  }

  function waitForJob(job, timeout = 15 * 60 * 1000, onUpdate) {
    return waitForV2Job(job, timeout, onUpdate, { observe: (initial, deadline, report) => new Promise(resolve => {
      let stop = () => {}
      const timer = setTimeout(() => { stop(); resolve(null) }, Math.max(0, deadline - Date.now()))
      stop = watch(() => [...activeJobs.value, ...recentProgressJobs.value].find(item => item.id === initial.id), value => {
        if (!value) return
        report?.(value)
        if (!isActiveJob(value)) { clearTimeout(timer); stop(); resolve(value) }
      }, { flush: 'sync' })
      const completed = recentProgressJobs.value.find(item => item.id === initial.id)
      if (completed) { clearTimeout(timer); stop(); resolve(completed) }
    }) })
  }

  function dismissFailure(jobId) {
    recentFailures.value = recentFailures.value.filter(job => job.id !== jobId)
    recentProgressJobs.value = recentProgressJobs.value.filter(job => job.id !== jobId)
  }

  function clearFailures() {
    recentFailures.value = []
    recentProgressJobs.value = recentProgressJobs.value.filter(job => job.status !== 'failed')
  }

  function dismissWarning(jobId) {
    recentWarnings.value = recentWarnings.value.filter(job => job.id !== jobId)
  }

  function clearWarnings() {
    recentWarnings.value = []
  }

  onMounted(() => {
    lifecycleActive = true
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('pagehide', handlePageHide)
    window.addEventListener('pageshow', handlePageShow)
    window.addEventListener(GLOBAL_JOB_SUBMITTED_EVENT, handleJobSubmitted)
    resume()
  })
  onBeforeUnmount(() => {
    lifecycleActive = false
    refreshSequence += 1
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    window.removeEventListener('pagehide', handlePageHide)
    window.removeEventListener('pageshow', handlePageShow)
    window.removeEventListener(GLOBAL_JOB_SUBMITTED_EVENT, handleJobSubmitted)
    disconnect()
  })

  return {
    activeJobs,
    recentProgressJobs,
    roomLabels,
    jobLabels,
    closedProgressIds,
    closeJobProgress,
    waitForJob,
    rememberRoomLabel,
    focusedJobId,
    dockMinimized,
    dockExpanded,
    taskListOpen,
    showJobProgress,
    activeCount,
    clearFailures,
    clearWarnings,
    connected,
    dismissFailure,
    dismissWarning,
    failureCount,
    loadError,
    recentFailures,
    recentWarnings,
    refreshActiveJobs,
    visible,
    warningCount
  }
}
