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
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  font-family: 'Inter Variable', Inter, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  height: 100%;
  font-size: 14px;
  color: var(--text-primary);
}

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
