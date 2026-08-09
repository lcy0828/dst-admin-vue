import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './assets/css/main.css'
import api from './api'
import { authAPI, systemV2API } from './api/v2'
import { applySystemPreferences, getSystemPreferences } from './utils/systemPreferences'
import './utils/themeManager'
import 'xterm/css/xterm.css'

function loginRedirect(value, fallback = '/dashboard') {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//')
    ? value
    : fallback
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
    const systemName = getSystemPreferences().systemName
    document.title = to.meta.title ? `${to.meta.title} - ${systemName}` : systemName
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
app.use(router)
app.mount('#app')
