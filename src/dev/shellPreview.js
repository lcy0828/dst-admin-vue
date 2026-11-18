// Separate Vite development entry; it never connects to a Runtime or performs live polling.
import { createApp } from 'vue'
import { createI18n } from 'vue-i18n'
import '../assets/css/main.css'
import ShellPreview from './ShellPreview.vue'
import { messages } from '../i18n/messages.js'
import { shellPreviewMessages } from './shellPreviewMessages.js'

const mergedMessages = {
  'zh-CN': {
    ...messages['zh-CN'],
    ...shellPreviewMessages['zh-CN']
  },
  'en-US': {
    ...messages['en-US'],
    ...shellPreviewMessages['en-US']
  }
}

createApp(ShellPreview)
  .use(createI18n({
    legacy: false,
    globalInjection: true,
    locale: 'zh-CN',
    fallbackLocale: 'en-US',
    messages: mergedMessages,
    missingWarn: false,
    fallbackWarn: false
  }))
  .mount('#app')
