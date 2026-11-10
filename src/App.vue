<template>
  <div class="app-root">
    <router-view/>
    <FeedbackHost />
    <Toaster :theme="currentTheme" position="top-right" rich-colors close-button />
  </div>
</template>

<script>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import FeedbackHost from '@/components/FeedbackHost.vue'
import { Toaster } from '@/components/ui/sonner'
import { provideAIAssistant } from '@/composables/useAIAssistant'
import themeManager from '@/utils/themeManager'

export default {
  name: 'App',
  setup() {
    provideAIAssistant()
    const currentTheme = ref(themeManager.getTheme() || 'light')
    const handleThemeChange = (theme) => { currentTheme.value = theme || 'light' }
    onMounted(() => themeManager.addListener(handleThemeChange))
    onBeforeUnmount(() => themeManager.removeListener(handleThemeChange))
    return { currentTheme }
  },
  components: {
    FeedbackHost,
    Toaster
  }
}
</script>

<style>
#app,
.app-root {
  height: 100%;
}

.xterm-viewport {
  overflow-y: auto !important;
}

.xterm-screen {
  width: 100% !important;
}
</style>
