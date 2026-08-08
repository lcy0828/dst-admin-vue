<template>
  <div class="world-log-container">
    <div class="log-header">
      <div class="log-title">
        <component is="el-icon-document" class="legacy-icon" />
        <span>{{ title || '世界日志' }}</span>
      </div>
      <div class="log-actions">
        <el-select 
          v-model="selectedArchive" 
          placeholder="选择存档" 
          size="small"
          @change="handleArchiveChange">
          <el-option
            v-for="archive in archives"
            :key="archive.name"
            :label="archive.name"
            :value="archive.name">
          </el-option>
        </el-select>
        
        <el-select 
          v-model="selectedWorld" 
          placeholder="选择世界" 
          size="small"
          @change="handleWorldChange"
          :disabled="!selectedArchive || !currentArchiveWorlds.length">
          <el-option
            v-for="world in currentArchiveWorlds"
            :key="world.name"
            :label="world.name + ' (' + formatWorldType(world.type) + ')'"
            :value="world.name">
          </el-option>
        </el-select>
        
        <el-tooltip content="自动刷新日志" placement="top">
          <el-switch
            v-model="autoRefresh"
            active-color="#13ce66"
            inactive-color="#ff4949"
            @change="handleAutoRefreshChange">
          </el-switch>
        </el-tooltip>
        
        <el-tooltip content="自动滚动到最新日志" placement="top">
          <el-switch
            v-model="autoScroll"
            active-color="#d97932"
            inactive-color="#758078">
          </el-switch>
        </el-tooltip>
        
        <el-button 
          size="small" 
          type="primary" 
          icon="el-icon-refresh" 
          @click="refreshLog"
          :loading="loading">
          刷新
        </el-button>
      </div>
    </div>
    <div class="log-content">
      <div ref="terminal" class="terminal-container"></div>
    </div>
  </div>
</template>

<script>
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import { serverApi, roomApi } from '@/api/index';

export default {
  name: 'WorldLog',
  props: {
    title: {
      type: String,
      default: '世界日志'
    },
    archiveName: {
      type: String,
      default: ''
    },
    worldName: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      terminal: null,
      fitAddon: null,
      selectedArchive: this.archiveName || '',
      selectedWorld: this.worldName || '',
      loading: false,
      autoRefresh: false,
      refreshInterval: null,
      refreshRate: 30000, // 30秒自动刷新一次
      archives: [],
      logContent: '',
      eventSource: null,
      manuallyClosedEventSource: false,
      autoScroll: true // 默认启用自动滚动
    };
  },
  computed: {
    currentArchiveWorlds() {
      if (!this.selectedArchive) return [];
      
      const archive = this.archives.find(a => a.name === this.selectedArchive);
      return archive && archive.worlds ? archive.worlds : [];
    }
  },
  mounted() {
    this.initTerminal();
    this.loadArchives();
    
    // 如果设置了初始存档和世界，尝试加载日志
    if (this.selectedArchive && this.selectedWorld) {
      this.$nextTick(() => {
        this.loadLog();
      });
    }
    
    // 监听窗口大小变化，调整终端大小
    window.addEventListener('resize', this.onResize);
  },
  beforeDestroy() {
    // 清理事件监听
    window.removeEventListener('resize', this.onResize);
    
    // 清除自动刷新定时器
    this.clearRefreshInterval();
    
    // 关闭EventSource连接
    this.closeEventSource();
    
    // 销毁终端
    if (this.terminal) {
      this.terminal.dispose();
    }
  },
  methods: {
    initTerminal() {
      // 创建终端实例
      this.terminal = new Terminal({
        cursorBlink: false,
        disableStdin: true, // 禁用输入
        fontSize: 14,
        fontFamily: 'Menlo, Monaco, "Courier New", monospace',
        theme: {
          background: '#1e1e1e',
          foreground: '#f0f0f0',
          cursor: 'transparent'
        },
        rendererType: 'canvas',
        scrollback: 5000
      });
      
      // 创建自适应插件
      this.fitAddon = new FitAddon();
      this.terminal.loadAddon(this.fitAddon);
      
      // 挂载终端
      this.terminal.open(this.$refs.terminal);
      
      // 调整大小
      this.$nextTick(() => {
        this.fitAddon.fit();
      });
      
      // 写入欢迎信息
      this.terminal.writeln('\x1B[1;3;36m欢迎使用饥荒联机版服务器日志查看器\x1B[0m');
      this.terminal.writeln('\x1B[90m请选择一个存档和世界以查看其日志记录...\x1B[0m');
      this.terminal.writeln('');
    },
    
    loadArchives() {
      this.loading = true;
      roomApi.getRoomList()
        .then(response => {
          // 检查是否是数组
          if (Array.isArray(response)) {
            this.archives = response;
          }
          // 如果设置了初始存档，但没有世界，尝试从加载的数据中找到对应的世界
          if (this.selectedArchive && !this.selectedWorld) {
            const archive = this.archives.find(a => a.name === this.selectedArchive);
            if (archive && archive.worlds && archive.worlds.length > 0) {
              this.selectedWorld = archive.worlds[0].name;
            }
          }
        })
        .catch(error => {
          console.error('获取存档列表失败:', error);
          this.terminal.writeln('\x1B[31m获取存档列表失败，请稍后重试。\x1B[0m');
        })
        .finally(() => {
          this.loading = false;
        });
    },
    
    handleArchiveChange() {
      // 关闭现有的EventSource连接
      this.closeEventSource();
      
      // 当切换存档时，重置所选世界
      this.selectedWorld = '';
      
      // 如果当前存档有世界，自动选择第一个
      if (this.currentArchiveWorlds.length > 0) {
        this.selectedWorld = this.currentArchiveWorlds[0].name;
        this.loadLog();
      }
    },
    
    handleWorldChange() {
      // 关闭现有的EventSource连接
      this.closeEventSource();
      
      this.loadLog();
    },
    
    onResize() {
      if (this.fitAddon) {
        this.fitAddon.fit();
      }
    },
    
    refreshLog() {
      if (this.selectedArchive && this.selectedWorld) {
        // 关闭现有的EventSource连接
        this.closeEventSource();
        
        // 重置手动关闭标志
        this.manuallyClosedEventSource = false;
        
        // 重新加载日志
        this.loadLog();
      } else {
        this.$message.warning('请先选择存档和世界');
      }
    },
    
    formatWorldType(type) {
      const typeMap = {
        'forest': '主世界',
        'cave': '洞穴',
        'unknown': '未知'
      };
      return typeMap[type] || type;
    },
    
    loadLog() {
      if (!this.selectedArchive || !this.selectedWorld) return;
      
      this.loading = true;
      
      // 清空终端内容
      this.terminal.clear();
      
      const archive = this.selectedArchive;
      const world = this.selectedWorld;
      
      // 写入日志标题
      this.terminal.writeln(`\x1B[1;32m=== ${archive}/${world} 日志记录 ===\x1B[0m`);
      this.terminal.writeln('');
      
      // 关闭之前的EventSource连接
      this.closeEventSource();
      
      // 创建新的EventSource连接
      const url = serverApi.getServerLogStreamUrl(archive, world);
      const eventSource = new EventSource(url);
      this.eventSource = eventSource;
      
      // 连接建立事件
      eventSource.addEventListener('connected', (event) => {
        console.log('与服务器的SSE连接已建立:', event.data);
        this.terminal.writeln(`\x1B[36m[系统]\x1B[0m 已连接到日志流`);
      });
      
      // 日志事件
      eventSource.addEventListener('log', (event) => {
        if (event.data) {
          // 根据日志类型添加颜色
          let coloredLog = event.data;
          if (coloredLog.includes('[INFO]')) {
            coloredLog = coloredLog.replace('[INFO]', '\x1B[32m[INFO]\x1B[0m');
          } else if (coloredLog.includes('[WARN]') || coloredLog.includes('[WARNING]')) {
            coloredLog = coloredLog.replace(/\[(WARN|WARNING)\]/, '\x1B[33m[$1]\x1B[0m');
          } else if (coloredLog.includes('[ERROR]') || coloredLog.includes('[FATAL]')) {
            coloredLog = coloredLog.replace(/\[(ERROR|FATAL)\]/, '\x1B[31m[$1]\x1B[0m');
          } else if (coloredLog.includes('[DEBUG]')) {
            coloredLog = coloredLog.replace('[DEBUG]', '\x1B[36m[DEBUG]\x1B[0m');
          } else if (coloredLog.includes('[SYSTEM]')) {
            coloredLog = coloredLog.replace('[SYSTEM]', '\x1B[35m[SYSTEM]\x1B[0m');
          }
          
          this.terminal.writeln(coloredLog);
          
          // 如果启用了自动滚动，滚动到底部
          if (this.autoScroll) {
            this.scrollToBottom();
          }
        }
      });
      
      // 心跳事件
      eventSource.addEventListener('heartbeat', (event) => {
        console.log('收到心跳:', event.data);
      });
      
      // 错误事件
      eventSource.addEventListener('error', (event) => {
        if (event.data) {
          console.error('服务器报告错误:', event.data);
          this.terminal.writeln(`\x1B[31m[错误]\x1B[0m ${event.data}`);
        }
      });
      
      // 连接错误处理
      eventSource.onerror = (error) => {
        console.error('SSE连接错误:', error);
        this.terminal.writeln(`\x1B[31m[错误]\x1B[0m 日志流连接断开，尝试重新连接...`);
        
        // 如果不是手动关闭的连接，则尝试重新连接
        if (this.autoRefresh && !this.manuallyClosedEventSource) {
          setTimeout(() => {
            if (this.autoRefresh) {
              this.loadLog();
            }
          }, 5000); // 5秒后尝试重连
        }
      };
      
      this.loading = false;
    },
    
    // 关闭EventSource连接
    closeEventSource() {
      if (this.eventSource) {
        this.manuallyClosedEventSource = true;
        this.eventSource.close();
        this.eventSource = null;
        console.log('已关闭日志流连接');
      }
    },
    
    // 清除自动刷新定时器
    clearRefreshInterval() {
      if (this.refreshInterval) {
        clearInterval(this.refreshInterval);
        this.refreshInterval = null;
      }
    },
    
    // 仅追加新日志，不清空现有日志 (不再需要，由EventSource自动处理)
    appendNewLogs() {
      // 已由EventSource的log事件处理
      // 仅保留方法用于兼容，实际上不执行任何操作
    },
    
    // 滚动到终端底部
    scrollToBottom() {
      if (this.terminal) {
        this.terminal.scrollToBottom();
      }
    },
    
    // 处理自动刷新开关变化
    handleAutoRefreshChange(value) {
      if (value) {
        this.startAutoRefresh();
      } else {
        this.clearRefreshInterval();
      }
    },
    
    // 启动自动刷新
    startAutoRefresh() {
      // 先清除可能存在的旧定时器
      this.clearRefreshInterval();
      
      // 如果没有选择存档或世界，不启动自动刷新
      if (!this.selectedArchive || !this.selectedWorld) {
        this.$message.warning('请先选择存档和世界');
        this.autoRefresh = false;
        return;
      }
      
      // 创建新的定时器
      this.refreshInterval = setInterval(() => {
        if (!this.loading) {
          this.appendNewLogs();
        }
      }, this.refreshRate);
      
      this.$message.success(`已开启自动刷新，间隔${this.refreshRate / 1000}秒`);
    }
  },
  watch: {
    archiveName(newValue) {
      // 关闭现有的EventSource连接
      this.closeEventSource();
      
      this.selectedArchive = newValue;
      if (newValue && this.archives.length > 0) {
        const archive = this.archives.find(a => a.name === newValue);
        if (archive && archive.worlds && archive.worlds.length > 0 && !this.selectedWorld) {
          this.selectedWorld = archive.worlds[0].name;
        }
        if (this.selectedWorld) {
          this.loadLog();
        }
      }
    },
    worldName(newValue) {
      // 关闭现有的EventSource连接
      this.closeEventSource();
      
      this.selectedWorld = newValue;
      if (this.selectedArchive && newValue) {
        this.loadLog();
      }
    }
  }
};
</script>

<style scoped>
.world-log-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  border-radius: 4px;
  overflow: hidden;
  background: #f1f4ed;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 15px;
  background: #ffffff;
  border-bottom: 1px solid #e8ece5;
}

.log-title {
  display: flex;
  align-items: center;
  font-size: 16px;
  font-weight: bold;
  color: #27352f;
}

.log-title i {
  margin-right: 8px;
  color: #d97932;
}

.log-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.log-content {
  flex: 1;
  overflow: hidden;
  padding: 10px;
  background: #1e1e1e;
}

.terminal-container {
  width: 100%;
  height: 100%;
  background: #1e1e1e;
  border-radius: 4px;
  overflow: hidden;
}

/* 自定义下拉选择器样式 */
:deep(.el-select) {
  width: 150px;
}

/* 自定义按钮样式 */
:deep(.el-button) {
  padding: 8px 15px;
}

/* 显示滚动条的自定义样式 */
:deep(.xterm-viewport::-webkit-scrollbar) {
  width: 6px;
  height: 6px;
}

:deep(.xterm-viewport::-webkit-scrollbar-thumb) {
  background: rgba(144, 147, 153, 0.3);
  border-radius: 3px;
}

:deep(.xterm-viewport::-webkit-scrollbar-track) {
  background: transparent;
}

:deep(.xterm-viewport:hover::-webkit-scrollbar-thumb) {
  background: rgba(144, 147, 153, 0.5);
}
</style> 