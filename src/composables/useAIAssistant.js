import { inject, onBeforeUnmount, provide, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { aiV2API, authAPI, roomsV2API } from '@/api/v2'
import { createAISession } from '@/lib/aiSession.mjs'
import { createAIHistoryStorage } from '@/lib/aiHistoryStorage.mjs'
import { readWorkspaceSelection } from '@/lib/workspacePreferences.mjs'
import { managementScopeTargetId } from '@/lib/managementScope.mjs'
import { pageHasMachineScope } from '@/lib/pageScope.mjs'

const key = Symbol('ai-assistant')

export function provideAIAssistant() {
  const { t, locale } = useI18n()
  const route = useRoute()
  const history = createAIHistoryStorage({ getUser: async () => (await authAPI.session()).user,
    storage: { getItem: key => localStorage.getItem(key), setItem: (key, value) => localStorage.setItem(key, value) } })
  const session = createAISession({ api: aiV2API, roomsAPI: roomsV2API, t, locale: () => locale.value, history })
  provide(key, session)
  let persistTimer
  const flush = () => { clearTimeout(persistTimer); session.persist() }
  watch(() => [session.draft.value, session.selectedRoom.value, session.busy.value,
    session.messages.value.length, session.messages.value.at(-1)?.content, session.messages.value.at(-1)?.calls?.length], () => {
    clearTimeout(persistTimer); persistTimer = setTimeout(session.persist, 300)
  })
  window.addEventListener('pagehide', flush)
  window.addEventListener('beforeunload', flush)
  watch(() => route.path, path => {
    if (['/login', '/setup'].includes(path)) session.reset()
  })
  onBeforeUnmount(() => { clearTimeout(persistTimer); window.removeEventListener('pagehide', flush); window.removeEventListener('beforeunload', flush); session.reset() })
  return session
}

export function useAIAssistant() {
  const session = inject(key)
  if (!session) throw new Error('AI assistant provider is missing')
  return session
}

export function aiPageRoom(route) {
  if (typeof route.query.roomId === 'string') return route.query.roomId
  if (route.path === '/rooms/settings' && typeof route.query.id === 'string') return route.query.id
  return pageHasMachineScope(route) ? readWorkspaceSelection(managementScopeTargetId()).roomId : ''
}
