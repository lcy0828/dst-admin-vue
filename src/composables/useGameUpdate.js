import { computed, inject, onBeforeUnmount, onMounted, provide, reactive, watch } from 'vue'
import { gameReleasesV2API, gameV2API } from '@/api/v2'
import { createGameUpdateController, gameUpdateAvailability } from '@/lib/gameUpdateController.mjs'
import { getManagementScope, MANAGEMENT_SCOPE_CHANGED_EVENT, managementScopeTargetId } from '@/lib/managementScope.mjs'
import { GLOBAL_JOB_SUBMITTED_EVENT } from '@/lib/globalJobs.mjs'
import { useSharedJobStatus } from './useGlobalJobStatus'

const key = Symbol.for('dst-admin:game-update')

export function provideGameUpdate() {
  const state = reactive({})
  const controller = createGameUpdateController({
    api: gameReleasesV2API, versionAPI: gameV2API,
    changed: next => Object.assign(state, next),
    submitted: job => window.dispatchEvent(new CustomEvent(GLOBAL_JOB_SUBMITTED_EVENT, { detail: job }))
  })
  Object.assign(state, controller.state)
  controller.setScope(getManagementScope())
  const pending = computed(() => state.pending.find(item => !managementScopeTargetId(state.scope) ||
    item.plan?.installations?.some(installation => installation.targetId === managementScopeTargetId(state.scope))) || null)
  const active = computed(() => pending.value || state.accepted || state.activeJobs[0] || null)
  const availability = computed(() => gameUpdateAvailability(state.installations, state.report?.officialRelease))
  const sharedJobs = useSharedJobStatus()
  if (sharedJobs) {
    watch(() => sharedJobs.activeJobs.value, value => controller.setActiveJobs(value), { immediate: true })
    watch(() => [...sharedJobs.activeJobs.value, ...sharedJobs.recentProgressJobs.value, ...sharedJobs.recentFailures.value]
      .filter(job => ['game.release', 'game.release.retry'].includes(job.kind)).map(job => `${job.id}:${job.status}:${job.progress || 0}`).sort().join(','), () => {
      void controller.refreshPending()
      if (!sharedJobs.activeJobs.value.some(job => ['game.release', 'game.release.retry'].includes(job.kind))) void controller.ensureOverview({ fresh: true })
    })
  }
  // Follow only active updates while this layout is mounted. No idle timer,
  // no additional Steam checks, and concurrent page reads share each request.
  let progressTimer
  const stopProgress = watch(() => Boolean(state.accepted || state.activeJobs.length ||
    state.pending.some(item => !['recovery_required', 'succeeded', 'failed', 'abandoned'].includes(item.stage))), (active, _, onCleanup) => {
    let live = true
    async function tick() {
      await controller.refreshProgress()
      if (live) progressTimer = setTimeout(tick, 5_000)
    }
    if (active) progressTimer = setTimeout(tick, 5_000)
    onCleanup(() => { live = false; clearTimeout(progressTimer) })
  }, { immediate: true })
  function changeScope(event) {
    controller.setScope(event?.detail || getManagementScope())
    void controller.ensureOverview()
  }
  onMounted(() => window.addEventListener(MANAGEMENT_SCOPE_CHANGED_EVENT, changeScope))
  onBeforeUnmount(() => {
    window.removeEventListener(MANAGEMENT_SCOPE_CHANGED_EVENT, changeScope)
    stopProgress()
    clearTimeout(progressTimer)
    controller.dispose()
  })
  const value = { ...controller, state, pending, active, availability }
  provide(key, value)
  return value
}

export function useGameUpdate() {
  return inject(key, null) || provideGameUpdate()
}
