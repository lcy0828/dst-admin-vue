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

/* 公共样式 */
.text-center {
  text-align: center;
}

.text-right {
  text-align: right;
}

.mb-20 {
  margin-bottom: 20px;
}

.mt-20 {
  margin-top: 20px;
}

.tag-success {
  color: #4f8a5b;
  background-color: #F0F9EB;
  border: 1px solid #E1F3D8;
  padding: 2px 6px;
  border-radius: 2px;
}

.tag-warning {
  color: #d99b32;
  background-color: #FDF6EC;
  border: 1px solid #FAECD8;
  padding: 2px 6px;
  border-radius: 2px;
}

.tag-error {
  color: #c94f4f;
  background-color: #FEF0F0;
  border: 1px solid #FDE2E2;
  padding: 2px 6px;
  border-radius: 2px;
}

.xterm-viewport {
  overflow-y: auto !important;
}

.xterm-screen {
  width: 100% !important;
}
</style>
