<template>
  <div id="app">
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
  font-family: 'Helvetica Neue', Helvetica, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  height: 100%;
  font-size: 14px;
  color: #333;
}

#app {
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
  color: #67C23A;
  background-color: #F0F9EB;
  border: 1px solid #E1F3D8;
  padding: 2px 6px;
  border-radius: 2px;
}

.tag-warning {
  color: #E6A23C;
  background-color: #FDF6EC;
  border: 1px solid #FAECD8;
  padding: 2px 6px;
  border-radius: 2px;
}

.tag-error {
  color: #F56C6C;
  background-color: #FEF0F0;
  border: 1px solid #FDE2E2;
  padding: 2px 6px;
  border-radius: 2px;
}

/* 修改Element UI样式 */
.el-table th {
  background-color: #F5F7FA !important;
}

.el-card__header {
  font-size: 16px;
  font-weight: bold;
}
</style> 