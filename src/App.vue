<template>
  <div class="app-root">
    <router-view/>
    <FeedbackHost />
    <Toaster position="top-right" rich-colors close-button />
  </div>
</template>

<script>
import FeedbackHost from '@/components/FeedbackHost.vue'
import { Toaster } from '@/components/ui/sonner'
import { provideAIAssistant } from '@/composables/useAIAssistant'

export default {
  name: 'App',
  setup() { provideAIAssistant() },
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
