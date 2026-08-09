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

export default {
  name: 'App',
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
