<template>
  <div class="log-viewer-container">
    <div class="log-header">
      <div class="log-title">
        <h3>{{ title }}</h3>
        <span class="log-subtitle">{{ subtitle }}</span>
      </div>
      <div class="log-actions">
        <UiButton size="sm" @click="refreshLogs">
          <RefreshCw data-icon="inline-start" />
          刷新
        </UiButton>
        <UiButton size="sm" variant="outline" @click="downloadLogs">
          <Download data-icon="inline-start" />
          下载日志
        </UiButton>
        <UiButton size="sm" variant="ghost" @click="$emit('close')">
          <X data-icon="inline-start" />
          关闭
        </UiButton>
      </div>
    </div>
    
    <div class="log-content-wrapper">
      <div class="log-filter">
        <UiSelect v-model="selectedWorld" @update:model-value="refreshLogs">
          <SelectTrigger class="world-select"><SelectValue placeholder="选择世界" /></SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem v-for="world in worlds" :key="world.name" :value="world.name">
                {{ world.name + (world.type ? ' (' + formatWorldType(world.type) + ')' : '') }}
              </SelectItem>
            </SelectGroup>
          </SelectContent>
        </UiSelect>
        <div class="search-wrapper">
          <Search />
          <UiInput v-model="searchQuery" placeholder="搜索日志" aria-label="搜索日志" />
        </div>
      </div>
      
      <div class="log-content" ref="logContent">
        <div v-if="loading" class="log-loading">
          <Spinner />
          <span>正在连接日志流...</span>
        </div>
        <div v-if="logs.length === 0 && !loading" class="no-logs-message">
          <Info />
          <span>暂无日志记录</span>
        </div>
        <div v-else-if="logs.length > 0">
          <div class="log-info-row">已加载 {{ logs.length }} 行日志</div>
          <pre><code v-for="(line, index) in filteredLogs" :key="index" 
            :class="{ 'log-info': line.includes('[INFO]') || line.includes('event:log'), 
                      'log-warning': line.includes('[WARNING]'), 
                      'log-error': line.includes('[ERROR]') || line.includes('[FATAL]'),
                      'log-debug': line.includes('[DEBUG]') }">{{ line }}</code></pre>
        </div>
      </div>
      
      <div class="log-actions-bottom">
        <Field orientation="horizontal" class="auto-scroll-control">
          <UiCheckbox id="log-auto-scroll" v-model="autoScroll" />
          <FieldLabel for="log-auto-scroll">自动滚动到最新日志</FieldLabel>
        </Field>
        <UiButton size="sm" variant="ghost" @click="clearLogs">清空日志</UiButton>
      </div>
    </div>
  </div>
</template>

<script>
import { Download, Info, RefreshCw, Search, X } from '@lucide/vue';
import { toast } from 'vue-sonner';
import { serverApi } from '@/api/index';
import { Button as UiButton } from '@/components/ui/button';
import { Checkbox as UiCheckbox } from '@/components/ui/checkbox';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input as UiInput } from '@/components/ui/input';
import { Select as UiSelect, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';

export default {
  name: 'LogViewer',
  components: {
    UiButton, UiCheckbox, Download, Field, FieldLabel, Info, UiInput, RefreshCw, Search, UiSelect, SelectContent,
    SelectGroup, SelectItem, SelectTrigger, SelectValue, Spinner, X
  },
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
      refreshInterval: null,
      eventSource: null
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
        toast.warning('未指定存档或世界');
        return;
      }
      
      this.loading = true;
      console.log('正在获取日志...', this.archiveName, this.selectedWorld);
      
      // 清空现有日志
      this.logs = [];
      
      // 关闭已存在的EventSource连接
      this.closeEventSource();
      
      // 创建新的EventSource连接
      const url = serverApi.getServerLogStreamUrl(this.archiveName, this.selectedWorld);
      console.log('EventSource URL:', url);
      
      try {
        const eventSource = new EventSource(url);
        this.eventSource = eventSource;
        
        // 连接建立事件
        eventSource.addEventListener('open', () => {
          console.log('SSE连接已建立');
          this.loading = false;
          this.logs.push('[系统] 已连接到日志流');
        });
        
        // 日志事件
        eventSource.addEventListener('log', (event) => {
          if (event.data) {
            console.log('收到日志事件:', event.data);
            this.logs.push(event.data);
            
            // 如果启用了自动滚动，滚动到底部
            if (this.autoScroll) {
              this.$nextTick(() => {
                this.scrollToBottom();
              });
            }
          }
        });
        
        // 消息事件 (默认事件)
        eventSource.addEventListener('message', (event) => {
          if (event.data) {
            console.log('收到消息事件:', event.data);
            this.logs.push(event.data);
            
            // 如果启用了自动滚动，滚动到底部
            if (this.autoScroll) {
              this.$nextTick(() => {
                this.scrollToBottom();
              });
            }
          }
        });
        
        // 心跳事件
        eventSource.addEventListener('heartbeat', (event) => {
          console.log('收到心跳:', event.data);
        });
        
        // 错误事件
        eventSource.addEventListener('error', (event) => {
          console.error('SSE连接错误:', event);
          
          if (this.eventSource) {
            this.logs.push('[错误] 日志流连接断开');
            this.loading = false;
            this.closeEventSource();
          }
        });
      } catch (error) {
        console.error('创建EventSource失败:', error);
        toast.error('连接日志流失败: ' + error.message);
        this.loading = false;
      }
    },
    closeEventSource() {
      if (this.eventSource) {
        console.log('关闭SSE连接');
        this.eventSource.close();
        this.eventSource = null;
      }
    },
    scrollToBottom() {
      const logContent = this.$refs.logContent;
      if (logContent) {
        logContent.scrollTop = logContent.scrollHeight;
      }
    },
    downloadLogs() {
      if (this.logs.length === 0) {
        toast.warning('没有日志可下载');
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
      
      toast.success('日志下载已开始');
    },
    clearLogs() {
      this.logs = [];
    },
    startAutoRefresh() {
      // SSE连接会自动刷新，不需要额外的刷新逻辑
    },
    stopAutoRefresh() {
      // 关闭EventSource连接
      this.closeEventSource();
    }
  },
  mounted() {
    this.refreshLogs();
  },
  beforeUnmount() {
    this.closeEventSource();
  },
  watch: {
    archiveName() {
      this.closeEventSource();
      this.refreshLogs();
    },
    defaultWorld(newVal) {
      if (newVal && !this.selectedWorld) {
        this.selectedWorld = newVal;
        this.closeEventSource();
        this.refreshLogs();
      }
    },
    worlds: {
      handler(newWorlds) {
        if (newWorlds.length > 0 && !this.selectedWorld) {
          this.selectedWorld = newWorlds[0].name;
          this.closeEventSource();
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
  min-width: 0;
  background-color: var(--surface-color);
  border: 1px solid var(--border-color);
  border-radius: 4px;
}

.log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background-color: var(--surface-muted);
  border-bottom: 1px solid var(--border-color);
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
  color: var(--text-secondary);
}

.log-content-wrapper {
  display: flex;
  flex-direction: column;
  flex: 1;
  padding: 12px 14px 14px;
  overflow: hidden;
}

.log-filter {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
}

.world-select {
  width: 180px;
}

.search-wrapper {
  position: relative;
  width: 220px;
}

.search-wrapper > svg {
  position: absolute;
  top: 50%;
  left: 10px;
  width: 16px;
  height: 16px;
  color: var(--muted-foreground);
  transform: translateY(-50%);
  pointer-events: none;
}

.search-wrapper input {
  padding-left: 34px;
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
  min-height: 200px;
  max-height: calc(100vh - 200px);
  white-space: pre-wrap;
  word-wrap: break-word;
}

.log-content > div {
  height: 100%;
}

.log-content pre {
  margin: 0;
  overflow-y: auto;
  height: calc(100% - 30px);
}

.log-content code {
  display: block;
  width: 100%;
  padding: 2px 5px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  white-space: pre-wrap;
  word-break: break-all;
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
  color: var(--text-secondary);
}

.no-logs-message svg {
  width: 30px;
  height: 30px;
  margin-bottom: 10px;
}

.log-loading {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  color: #d4d4d4;
}

.auto-scroll-control {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--foreground);
  font-size: 13px;
  cursor: pointer;
}

.log-info-row {
  padding: 5px;
  background-color: #2b2b2b;
  color: #ffffff;
  font-size: 12px;
  border-radius: 3px 3px 0 0;
  text-align: center;
}

@media (max-width: 640px) {
  .log-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .log-actions,
  .log-filter {
    width: 100%;
    flex-wrap: wrap;
  }

  .world-select,
  .search-wrapper {
    width: 100%;
  }

  .log-content {
    max-height: 60vh;
  }
}
</style>
