<template>
  <div class="app-root">
    <router-view/>
  </div>
</template>

<script>
export default {
  name: 'App'
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

.el-dialog {
  display: flex;
  flex-direction: column;
  margin-top: 5vh !important;
  max-height: 90vh !important;
}

/* 提高对话框层级，禁用背景遮罩层 */
.el-dialog__wrapper {
  background-color: transparent !important;
  position: fixed !important;
  top: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  left: 0 !important;
  overflow: auto !important;
  z-index: 2001 !important;
  pointer-events: auto !important;
}


.el-dialog__body {
  flex: 0 1 auto;
  min-height: 0;
  overflow-y: auto !important;
  padding: 15px 20px !important;
  height: auto !important;
  max-height: calc(90vh - 124px) !important;
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

/* 修改Element UI样式 */
.el-table th {
  background-color: var(--surface-muted) !important;
}

.el-card__header {
  font-size: 16px;
  font-weight: bold;
}

.xterm-viewport {
  overflow-y: auto !important;
}

.xterm-screen {
  width: 100% !important;
}
</style>
