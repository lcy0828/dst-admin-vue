import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { jobsV2API } from '@/api/v2'
import { mergeActiveJobs, reduceGlobalJobEvent } from '@/lib/globalJobs.mjs'

const JOB_EVENTS = Object.freeze([
  'job.created',
  'job.running',
  'job.target.completed',
  'job.completed',
  'job.cancel.requested',
  'job.interrupted'
])

export function useGlobalJobStatus() {
  const activeJobs = ref([])
  const recentFailures = ref([])
  const connected = ref(false)
  const loadError = ref('')
  let eventSource = null
  let refreshSequence = 0

  const activeCount = computed(() => activeJobs.value.length)
  const failureCount = computed(() => recentFailures.value.length)
  const visible = computed(() => activeCount.value > 0 || failureCount.value > 0 || Boolean(loadError.value))

  async function refreshActiveJobs() {
    const sequence = ++refreshSequence
    try {
      const [queued, running] = await Promise.all([
        jobsV2API.controlPlaneList({ status: 'queued', limit: 100 }),
        jobsV2API.controlPlaneList({ status: 'running', limit: 100 })
      ])
      if (sequence !== refreshSequence) return
      activeJobs.value = mergeActiveJobs(queued?.items, running?.items)
      loadError.value = ''
    } catch (error) {
      if (sequence !== refreshSequence) return
      loadError.value = error?.message || String(error)
    }
  }

  function applyJobEvent(eventType, event) {
    const next = reduceGlobalJobEvent({
      activeJobs: activeJobs.value,
      recentFailures: recentFailures.value
    }, eventType, event.data)
    activeJobs.value = next.activeJobs
    recentFailures.value = next.recentFailures
    loadError.value = ''
  }

  function connect() {
    if (typeof EventSource !== 'function') return
    eventSource = new EventSource(jobsV2API.eventsURL(), { withCredentials: true })
    eventSource.onopen = () => {
      connected.value = true
    }
    eventSource.addEventListener('job.cursor', refreshActiveJobs)
    for (const eventType of JOB_EVENTS) {
      eventSource.addEventListener(eventType, event => applyJobEvent(eventType, event))
    }
    eventSource.onerror = () => {
      connected.value = false
    }
  }

  function dismissFailure(jobId) {
    recentFailures.value = recentFailures.value.filter(job => job.id !== jobId)
  }

  function clearFailures() {
    recentFailures.value = []
  }

  onMounted(() => {
    refreshActiveJobs()
    connect()
  })
  onBeforeUnmount(() => {
    refreshSequence += 1
    eventSource?.close()
    eventSource = null
  })

  return {
    activeJobs,
    activeCount,
    clearFailures,
    connected,
    dismissFailure,
    failureCount,
    loadError,
    recentFailures,
    refreshActiveJobs,
    visible
  }
}
