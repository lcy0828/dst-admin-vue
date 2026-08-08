<template>
  <div class="world-log-container">
    <div class="log-header">
      <div class="log-title">
        <component :is="'el-icon-document'" class="legacy-icon" />
        <span>{{ title || '世界日志' }}</span>
        <span class="stream-state" :class="`is-${streamState}`">
          <span class="state-dot"></span>
          {{ streamStateLabel }}
        </span>
      </div>

      <div class="log-actions">
        <el-select
          v-model="selectedRoomId"
          aria-label="选择房间"
          placeholder="选择房间"
          size="small"
          @change="handleRoomChange"
        >
          <el-option
            v-for="room in archives"
            :key="room.id"
            :label="room.name"
            :value="room.id"
          />
        </el-select>

        <el-select
          v-model="selectedWorldId"
          aria-label="选择世界"
          placeholder="选择世界"
          size="small"
          :disabled="!selectedRoomId || currentRoomWorlds.length === 0"
          @change="handleWorldChange"
        >
          <el-option
            v-for="world in currentRoomWorlds"
            :key="world.id"
            :label="`${world.name} (${formatWorldType(world.type || world.role)})`"
            :value="world.id"
          />
        </el-select>

        <el-tooltip content="实时跟随日志" placement="top">
          <el-switch
            v-model="followLog"
            aria-label="实时跟随日志"
            @change="handleFollowChange"
          />
        </el-tooltip>

        <el-tooltip content="自动滚动到最新日志" placement="top">
          <el-switch
            v-model="autoScroll"
            aria-label="自动滚动到最新日志"
          />
        </el-tooltip>

        <el-button
          size="small"
          icon="el-icon-refresh"
          aria-label="刷新日志"
          :loading="loading"
          :disabled="!selectedWorldId"
          @click="refreshLog"
        >
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
import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import 'xterm/css/xterm.css'
import { roomApi } from '@/api/index'
import { worldLogsV2API } from '@/api/v2'

export default {
  name: 'WorldLog',
  props: {
    title: {
      type: String,
      default: '世界日志'
    },
    roomId: {
      type: String,
      default: ''
    },
    worldId: {
      type: String,
      default: ''
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
      selectedRoomId: this.roomId || '',
      selectedWorldId: this.worldId || '',
      archives: [],
      loading: false,
      followLog: true,
      autoScroll: true,
      eventSource: null,
      manuallyClosedEventSource: false,
      streamState: 'idle'
    }
  },
  computed: {
    currentRoom() {
      return this.archives.find(room => room.id === this.selectedRoomId) || null
    },
    currentRoomWorlds() {
      return this.currentRoom?.worlds || []
    },
    currentWorld() {
      return this.currentRoomWorlds.find(world => world.id === this.selectedWorldId) || null
    },
    streamStateLabel() {
      return {
        idle: '待选择',
        connecting: '连接中',
        connected: '实时',
        paused: '已暂停',
        error: '已断开'
      }[this.streamState] || '未知'
    }
  },
  async mounted() {
    this.initTerminal()
    window.addEventListener('resize', this.onResize)
    await this.loadArchives()
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.onResize)
    this.closeEventSource()
    this.terminal?.dispose()
  },
  methods: {
    initTerminal() {
      this.terminal = new Terminal({
        cursorBlink: false,
        disableStdin: true,
        fontSize: 13,
        lineHeight: 1.35,
        fontFamily: 'Menlo, Monaco, "Courier New", monospace',
        theme: {
          background: '#181a19',
          foreground: '#e6e9e6',
          cursor: 'transparent',
          selectionBackground: '#5c4736'
        },
        scrollback: 5000
      })
      this.fitAddon = new FitAddon()
      this.terminal.loadAddon(this.fitAddon)
      this.terminal.open(this.$refs.terminal)
      this.$nextTick(() => this.fitAddon.fit())
      this.writeSystemLine('请选择房间和世界以查看日志')
    },
    async loadArchives() {
      this.loading = true
      try {
        const response = await roomApi.getRoomList()
        this.archives = Array.isArray(response)
          ? response
          : (Array.isArray(response?.data) ? response.data : [])
        this.resolveInitialSelection()
        if (this.selectedRoomId && this.selectedWorldId) await this.loadLog()
      } catch (error) {
        this.archives = []
        this.streamState = 'error'
        this.writeErrorLine(error.message || '获取房间列表失败')
      } finally {
        this.loading = false
      }
    },
    resolveInitialSelection() {
      const preferredRoom = this.archives.find(room =>
        room.id === this.roomId || room.name === this.archiveName
      )
      const selectedRoom = preferredRoom || this.currentRoom || this.archives[0]
      this.selectedRoomId = selectedRoom?.id || ''

      const worlds = selectedRoom?.worlds || []
      const preferredWorld = worlds.find(world =>
        world.id === this.worldId || world.name === this.worldName
      )
      const selectedWorld = preferredWorld || worlds.find(world => world.status === 'running') || worlds[0]
      this.selectedWorldId = selectedWorld?.id || ''
    },
    handleRoomChange() {
      this.closeEventSource()
      const worlds = this.currentRoomWorlds
      this.selectedWorldId = (worlds.find(world => world.status === 'running') || worlds[0])?.id || ''
      if (this.selectedWorldId) this.loadLog()
      else {
        this.streamState = 'idle'
        this.terminal.clear()
        this.writeSystemLine('当前房间没有可用世界')
      }
    },
    handleWorldChange() {
      this.loadLog()
    },
    formatWorldType(type) {
      return {
        forest: '森林',
        master: '森林',
        cave: '洞穴',
        caves: '洞穴',
        unknown: '自定义'
      }[type] || '自定义'
    },
    async refreshLog() {
      if (!this.selectedRoomId || !this.selectedWorldId) return
      await this.loadLog()
    },
    async loadLog() {
      if (!this.selectedRoomId || !this.selectedWorldId || !this.terminal) return

      this.loading = true
      this.closeEventSource()
      this.terminal.clear()
      this.terminal.writeln(`\x1B[1;33m${this.currentRoom?.name || '-'} / ${this.currentWorld?.name || '-'}\x1B[0m`)

      try {
        const snapshot = await worldLogsV2API.snapshot(this.selectedRoomId, this.selectedWorldId, { limit: 300 })
        this.renderSnapshot(snapshot)
        if (this.followLog) this.connectEventSource()
        else this.streamState = 'paused'
      } catch (error) {
        this.streamState = 'error'
        this.writeErrorLine(error.message || '日志读取失败')
      } finally {
        this.loading = false
      }
    },
    connectEventSource() {
      this.manuallyClosedEventSource = false
      this.streamState = 'connecting'
      const source = new EventSource(worldLogsV2API.eventURL(this.selectedRoomId, this.selectedWorldId, 300))
      this.eventSource = source

      source.addEventListener('connected', event => {
        const payload = this.parseEvent(event)
        this.streamState = 'connected'
        if (payload?.snapshot) this.renderSnapshot(payload.snapshot)
      })
      source.addEventListener('line', event => {
        const payload = this.parseEvent(event)
        if (payload?.line?.text !== undefined) this.writeLogLine(payload.line.text)
      })
      source.addEventListener('reset', event => {
        const payload = this.parseEvent(event)
        this.terminal.clear()
        this.writeSystemLine(`日志文件已轮转：${payload?.snapshot?.fileName || 'server_log.txt'}`)
      })
      source.addEventListener('heartbeat', () => {
        if (this.streamState !== 'connected') this.streamState = 'connected'
      })
      source.onerror = event => {
        if (this.manuallyClosedEventSource) return
        const payload = this.parseEvent(event)
        this.streamState = 'error'
        if (payload?.message) this.writeErrorLine(payload.message)
      }
    },
    parseEvent(event) {
      if (!event?.data) return null
      try {
        return JSON.parse(event.data)
      } catch {
        return { message: event.data }
      }
    },
    renderSnapshot(snapshot) {
      if (!snapshot) return
      this.terminal.clear()
      this.terminal.writeln(`\x1B[90m${snapshot.fileName || 'server_log.txt'} · ${snapshot.lines?.length || 0} 行\x1B[0m`)
      ;(snapshot.lines || []).forEach(line => this.writeLogLine(line.text))
      if (this.autoScroll) this.terminal.scrollToBottom()
    },
    writeLogLine(line) {
      this.terminal.writeln(String(line ?? ''))
      if (this.autoScroll) this.terminal.scrollToBottom()
    },
    writeSystemLine(message) {
      this.terminal?.writeln(`\x1B[36m[系统]\x1B[0m ${message}`)
    },
    writeErrorLine(message) {
      this.terminal?.writeln(`\x1B[31m[错误]\x1B[0m ${message}`)
    },
    handleFollowChange(enabled) {
      if (enabled) {
        if (this.selectedWorldId) this.connectEventSource()
      } else {
        this.closeEventSource()
        this.streamState = 'paused'
      }
    },
    closeEventSource() {
      if (!this.eventSource) return
      this.manuallyClosedEventSource = true
      this.eventSource.close()
      this.eventSource = null
    },
    onResize() {
      this.fitAddon?.fit()
    }
  },
  watch: {
    roomId(value) {
      if (!value || value === this.selectedRoomId) return
      this.selectedRoomId = value
      this.handleRoomChange()
    },
    worldId(value) {
      if (!value || value === this.selectedWorldId) return
      this.selectedWorldId = value
      this.handleWorldChange()
    },
    archiveName(value) {
      if (!value) return
      const room = this.archives.find(item => item.name === value)
      if (room && room.id !== this.selectedRoomId) {
        this.selectedRoomId = room.id
        this.handleRoomChange()
      }
    },
    worldName(value) {
      if (!value) return
      const world = this.currentRoomWorlds.find(item => item.name === value)
      if (world && world.id !== this.selectedWorldId) {
        this.selectedWorldId = world.id
        this.handleWorldChange()
      }
    }
  }
}
</script>

<style scoped>
.world-log-container {
  display: flex;
  flex-direction: column;
  min-height: 360px;
  height: 100%;
  overflow: hidden;
  background: #181a19;
  border: 1px solid var(--border-color);
  border-radius: 4px;
}

.log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: var(--surface-color);
  border-bottom: 1px solid var(--border-color);
}

.log-title,
.log-actions,
.stream-state {
  display: flex;
  align-items: center;
}

.log-title {
  flex: 0 0 auto;
  gap: 8px;
  min-width: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.log-title > .legacy-icon {
  color: var(--primary-color);
}

.stream-state {
  gap: 5px;
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 400;
}

.state-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--info-color);
}

.stream-state.is-connected .state-dot {
  background: var(--success-color);
}

.stream-state.is-connecting .state-dot {
  background: var(--warning-color);
}

.stream-state.is-error .state-dot {
  background: var(--danger-color);
}

.log-actions {
  justify-content: flex-end;
  gap: 8px;
  min-width: 0;
  flex-wrap: wrap;
}

.log-actions :deep(.el-select) {
  width: 150px;
}

.log-content {
  flex: 1;
  min-height: 0;
  padding: 10px;
  overflow: hidden;
  background: #181a19;
}

.terminal-container {
  width: 100%;
  height: 100%;
  min-height: 300px;
  overflow: hidden;
}

:deep(.xterm-viewport::-webkit-scrollbar) {
  width: 6px;
  height: 6px;
}

:deep(.xterm-viewport::-webkit-scrollbar-thumb) {
  background: rgba(230, 233, 230, 0.28);
  border-radius: 3px;
}

@media (max-width: 768px) {
  .world-log-container {
    min-height: 440px;
  }

  .log-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .log-actions {
    width: 100%;
    justify-content: flex-start;
  }

  .log-actions :deep(.el-select) {
    flex: 1 1 140px;
    width: auto;
  }
}
</style>
