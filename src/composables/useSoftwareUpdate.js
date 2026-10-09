import { inject, onBeforeUnmount, onMounted, provide, reactive } from 'vue'
import { softwareV2API } from '@/api/v2'
import { createSoftwareUpdateController } from '@/lib/softwareUpdate.mjs'

const contextKey = Symbol('software-update')

export function provideSoftwareUpdate() {
  const state = reactive({ snapshot: null, loading: true, checking: false, acting: false, error: '', reconnecting: false })
  let storage
  try { storage = window.sessionStorage } catch { /* private browsing */ }
  const controller = createSoftwareUpdateController({
    api: softwareV2API, storage,
    changed: next => Object.assign(state, next),
    reload: () => window.location.reload()
  })
  const value = { state, ...controller }
  value.state = state
  provide(contextKey, value)
  onMounted(() => { void controller.initialize() })
  onBeforeUnmount(controller.dispose)
  return value
}

export function useSoftwareUpdate() {
  return inject(contextKey) || provideSoftwareUpdate()
}
