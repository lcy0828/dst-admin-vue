import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './assets/css/main.css'
import api from './api'
import { authAPI, systemV2API } from './api/v2'
import { i18n } from './i18n'
import { applySystemPreferences, getSystemPreferences } from './utils/systemPreferences'
import './utils/themeManager'
import 'xterm/css/xterm.css'

function loginRedirect(value, fallback = '/dashboard') {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//')
    ? value
    : fallback
}

function updateDocumentTitle(route = router.currentRoute.value) {
  const systemName = getSystemPreferences().systemName
  const routeTitle = route.meta?.titleKey ? i18n.global.t(route.meta.titleKey) : route.meta?.title
  document.title = routeTitle ? `${routeTitle} - ${systemName}` : systemName
}

// 路由守卫
router.beforeEach(async to => {
  try {
    const session = await authAPI.session()
    if (session.authenticated) {
      try {
        applySystemPreferences(await systemV2API.settings())
      } catch (error) {
        console.error('读取系统偏好失败，继续使用当前主题', error)
      }
    }
    updateDocumentTitle(to)
    if (to.path === '/login') {
      return session.authenticated ? loginRedirect(to.query.redirect) : true
    }
    return session.authenticated ? true : { path: '/login', query: { redirect: to.fullPath } }
  } catch {
    return to.path === '/login'
      ? true
      : { path: '/login', query: { reason: 'backend-unavailable', redirect: to.fullPath } }
  }
})

const app = createApp(App)

app.config.globalProperties.$api = api
app.use(i18n)
app.use(router)
app.mount('#app')
window.addEventListener('system-preferences-updated', () => updateDocumentTitle())
