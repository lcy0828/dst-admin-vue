import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import ElementPlus, { ElSubMenu } from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import 'element-plus/dist/index.css'
import './assets/css/main.css'
import api from './api'
import { authAPI } from './api/v2'
import { installLegacyIcons } from './compat/legacyIcons'
import 'xterm/css/xterm.css'

// 路由守卫
router.beforeEach(async to => {
  document.title = to.meta.title ? `${to.meta.title} - 饥荒管理系统` : '饥荒管理系统'

  try {
    const session = await authAPI.session()
    if (to.path === '/login') return session.authenticated ? '/dashboard' : true
    return session.authenticated ? true : '/login'
  } catch {
    return to.path === '/login' ? true : { path: '/login', query: { reason: 'backend-unavailable' } }
  }
})

const app = createApp(App)

app.config.globalProperties.$api = api
app.use(router)
app.use(ElementPlus, {
  size: 'default',
  locale: zhCn
})

// Element UI used <el-submenu>; keep the old tag while Element Plus uses ElSubMenu.
app.component('ElSubmenu', ElSubMenu)
installLegacyIcons(app)
app.mount('#app')
