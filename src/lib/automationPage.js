import { defineAsyncComponent, defineComponent, h } from 'vue'
import AutomationWorkspace from '@/components/AutomationWorkspace.vue'

export function automationPage(loader) {
  const page = defineAsyncComponent(loader)
  return defineComponent({
    name: 'AutomationPage',
    setup: () => () => h(AutomationWorkspace, { page })
  })
}
