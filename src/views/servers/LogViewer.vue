<template>
  <div class="log-viewer-container">
    <div class="log-header">
      <div class="log-title">
        <h3>{{ title }}</h3>
        <span class="log-subtitle">{{ subtitle }}</span>
      </div>
      <div class="log-actions">
        <el-button size="small" type="primary" icon="el-icon-refresh" @click="refreshLogs">刷新</el-button>
        <el-button size="small" icon="el-icon-download" @click="downloadLogs">下载日志</el-button>
        <el-button size="small" icon="el-icon-close" @click="$emit('close')">关闭</el-button>
      </div>
    </div>
    
    <div class="log-content-wrapper">
      <div class="log-filter">
        <el-select v-model="selectedWorld" placeholder="选择世界" size="small" style="width: 180px" @change="refreshLogs">
          <el-option
            v-for="world in worlds"
            :key="world.name"
            :label="world.name + (world.type ? ' (' + formatWorldType(world.type) + ')' : '')"
            :value="world.name">
          </el-option>
        </el-select>
        
        <el-input
          placeholder="搜索日志"
          v-model="searchQuery"
          size="small"
          prefix-icon="el-icon-search"
          clearable
          style="width: 200px; margin-left: 10px;">
        </el-input>
      </div>
      
      <div class="log-content" ref="logContent" v-loading="loading">
        <div v-if="logs.length === 0 && !loading" class="no-logs-message">
          <i class="el-icon-info"></i>
          <span>暂无日志记录</span>
        </div>
        <pre v-else><code v-for="(line, index) in filteredLogs" :key="index" 
          :class="{ 'log-info': line.includes('[INFO]'), 
                    'log-warning': line.includes('[WARNING]'), 
                    'log-error': line.includes('[ERROR]') || line.includes('[FATAL]'),
                    'log-debug': line.includes('[DEBUG]') }">{{ line }}</code></pre>
      </div>
      
      <div class="log-actions-bottom">
        <el-checkbox v-model="autoScroll">自动滚动到最新日志</el-checkbox>
        <el-button size="small" type="text" @click="clearLogs">清空日志</el-button>
      </div>
    </div>
  </div>
</template>

<script>
import { serverApi } from '@/api/index';

export default {
  name: 'LogViewer',
  props: {
    archiveName: {
      type: String,
      required: true
    },
    title: {
      type: String,
      default: '服务器日志'
    },
    subtitle: {
      type: String,
      default: ''
    },
    worlds: {
      type: Array,
      default: () => []
    },
    defaultWorld: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      logs: [],
      loading: false,
      selectedWorld: this.defaultWorld || (this.worlds.length > 0 ? this.worlds[0].name : ''),
      searchQuery: '',
      autoScroll: true,
      refreshInterval: null
    };
  },
  computed: {
    filteredLogs() {
      if (!this.searchQuery) {
        return this.logs;
      }
      
      const query = this.searchQuery.toLowerCase();
      return this.logs.filter(line => line.toLowerCase().includes(query));
    }
  },
  methods: {
    formatWorldType(type) {
      const typeMap = {
        'forest': '主世界',
        'cave': '洞穴',
        'unknown': '未知'
      };
      return typeMap[type] || type;
    },
    refreshLogs() {
      if (!this.archiveName || !this.selectedWorld) {
        this.$message.warning('未指定存档或世界');
        return;
      }
      
      this.loading = true;
      serverApi.getServerLogStream(this.archiveName, this.selectedWorld)
        .then(response => {
          if (response.data && typeof response.data === 'string') {
            this.logs = response.data.split('\n');
          } else if (Array.isArray(response.data)) {
            this.logs = response.data;
          } else {
            this.logs = ['无法解析日志数据'];
          }
          
          // 如果启用了自动滚动，滚动到底部
          this.$nextTick(() => {
            if (this.autoScroll) {
              this.scrollToBottom();
            }
          });
        })
        .catch(error => {
          this.$message.error('获取日志失败: ' + (error.message || '未知错误'));
          console.error('获取日志失败:', error);
        })
        .finally(() => {
          this.loading = false;
        });
    },
    scrollToBottom() {
      const logContent = this.$refs.logContent;
      if (logContent) {
        logContent.scrollTop = logContent.scrollHeight;
      }
    },
    downloadLogs() {
      if (this.logs.length === 0) {
        this.$message.warning('没有日志可下载');
        return;
      }
      
      const logText = this.logs.join('\n');
      const blob = new Blob([logText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `${this.archiveName}_${this.selectedWorld}_${new Date().toISOString().split('T')[0]}.log`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      this.$message.success('日志下载已开始');
    },
    clearLogs() {
      this.logs = [];
    },
    startAutoRefresh() {
      // 每30秒自动刷新一次日志
      this.refreshInterval = setInterval(() => {
        this.refreshLogs();
      }, 30000);
    },
    stopAutoRefresh() {
      if (this.refreshInterval) {
        clearInterval(this.refreshInterval);
        this.refreshInterval = null;
      }
    }
  },
  mounted() {
    this.refreshLogs();
    this.startAutoRefresh();
  },
  beforeDestroy() {
    this.stopAutoRefresh();
  },
  watch: {
    archiveName() {
      this.refreshLogs();
    },
    defaultWorld(newVal) {
      if (newVal && !this.selectedWorld) {
        this.selectedWorld = newVal;
        this.refreshLogs();
      }
    },
    worlds: {
      handler(newWorlds) {
        if (newWorlds.length > 0 && !this.selectedWorld) {
          this.selectedWorld = newWorlds[0].name;
          this.refreshLogs();
        }
      },
      immediate: true
    }
  }
};
</script>

<style scoped>
.log-viewer-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: #f9f9f9;
  border-radius: 4px;
}

.log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 15px;
  background-color: #eef1f6;
  border-bottom: 1px solid #e6ebf5;
}

.log-title {
  display: flex;
  flex-direction: column;
}

.log-title h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.log-subtitle {
  font-size: 12px;
  color: #909399;
}

.log-content-wrapper {
  display: flex;
  flex-direction: column;
  flex: 1;
  padding: 10px 15px 15px;
  overflow: hidden;
}

.log-filter {
  display: flex;
  margin-bottom: 10px;
}

.log-content {
  flex: 1;
  padding: 10px;
  background-color: #1e1e1e;
  color: #d4d4d4;
  border-radius: 4px;
  font-family: Consolas, Monaco, 'Andale Mono', monospace;
  font-size: 13px;
  line-height: 1.5;
  overflow-y: auto;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.log-content pre {
  margin: 0;
}

.log-content code {
  display: block;
  width: 100%;
}

.log-info {
  color: #9cdcfe;
}

.log-warning {
  color: #f9d649;
}

.log-error {
  color: #f14c4c;
  font-weight: bold;
}

.log-debug {
  color: #6a9955;
}

.log-actions-bottom {
  display: flex;
  justify-content: space-between;
  margin-top: 10px;
}

.no-logs-message {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
  color: #909399;
}

.no-logs-message i {
  font-size: 48px;
  margin-bottom: 10px;
}
</style> 