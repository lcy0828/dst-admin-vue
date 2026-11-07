// Separate Vite development entry; it never connects to a Runtime or submits jobs.
import { createApp } from 'vue'
import { createI18n } from 'vue-i18n'
import '../assets/css/main.css'
import TaskProgressPreview from './TaskProgressPreview.vue'
import { globalJobMessages } from '../i18n/globalJobMessages'

createApp(TaskProgressPreview)
  .use(createI18n({ legacy: false, locale: 'zh-CN', fallbackLocale: 'en-US', messages: globalJobMessages }))
  .mount('#app')
