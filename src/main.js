import Vue from 'vue'
import App from './App.vue'
import router from './router'
import ElementUI from 'element-ui'
import 'element-ui/lib/theme-chalk/index.css'
import './assets/css/main.css'
import api from './api'

// 将API挂载到Vue原型上，方便全局调用
Vue.prototype.$api = api

Vue.config.productionTip = false

// 全局过滤器
Vue.filter('formatDate', function(value) {
  if (!value) return ''
  const date = new Date(value)
  return date.toLocaleDateString()
})

// 路由守卫
router.beforeEach((to, from, next) => {
  // 简单的登录验证
  const isLoggedIn = localStorage.getItem('isLoggedIn')
  if (to.path !== '/login' && !isLoggedIn) {
    next('/login')
  } else {
    document.title = to.meta.title ? to.meta.title + ' - 饥荒管理系统' : '饥荒管理系统'
    next()
  }
})

Vue.use(ElementUI, {
  size: 'medium'
})

new Vue({
  router,
  render: h => h(App)
}).$mount('#app') 