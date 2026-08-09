<template>
  <section ref="root" class="world-log-container">
    <div class="log-toolbar">
      <FieldGroup class="log-controls">
        <Field>
          <FieldLabel for="world-log-room">房间</FieldLabel>
          <UiSelect
            v-model="selectedRoomId"
            @update:model-value="handleRoomChange"
          >
            <SelectTrigger id="world-log-room"><SelectValue placeholder="选择房间" /></SelectTrigger>
            <SelectContent><SelectGroup>
              <SelectItem v-for="room in archives" :key="room.id" :value="room.id">{{ room.name }}</SelectItem>
            </SelectGroup></SelectContent>
          </UiSelect>
        </Field>

        <Field>
          <FieldLabel for="world-log-world">世界</FieldLabel>
          <UiSelect
            v-model="selectedWorldId"
            :disabled="!selectedRoomId || currentRoomWorlds.length === 0"
            @update:model-value="handleWorldChange"
          >
            <SelectTrigger id="world-log-world"><SelectValue placeholder="选择世界" /></SelectTrigger>
            <SelectContent><SelectGroup>
              <SelectItem v-for="world in currentRoomWorlds" :key="world.id" :value="world.id">
                {{ world.name }} ({{ formatWorldType(world.type || world.role) }})
              </SelectItem>
            </SelectGroup></SelectContent>
          </UiSelect>
        </Field>

        <Field orientation="horizontal" class="toggle-field">
          <FieldContent>
            <FieldLabel for="world-log-follow">实时跟随</FieldLabel>
          </FieldContent>
          <UiSwitch
            id="world-log-follow"
            v-model="followLog"
            @update:model-value="handleFollowChange"
          />
        </Field>

        <Field orientation="horizontal" class="toggle-field">
          <FieldContent>
            <FieldLabel for="world-log-scroll">自动滚动</FieldLabel>
          </FieldContent>
          <UiSwitch
            id="world-log-scroll"
            v-model="autoScroll"
          />
        </Field>
      </FieldGroup>

      <div class="log-actions">
        <Badge :variant="streamStateVariant">{{ streamStateLabel }}</Badge>
        <UiButton
          size="sm"
          :disabled="loading || !selectedWorldId"
          @click="refreshLog"
        >
          <Spinner v-if="loading" data-icon="inline-start" />
          <RefreshCwIcon v-else data-icon="inline-start" />
          刷新
        </UiButton>
      </div>
    </div>

    <Alert v-if="loadError" variant="destructive">
      <TriangleAlertIcon />
      <AlertTitle>日志读取失败</AlertTitle>
      <AlertDescription>{{ loadError }}</AlertDescription>
      <AlertAction><UiButton size="sm" variant="outline" :disabled="loading" @click="retryLoad">重试</UiButton></AlertAction>
    </Alert>

    <div class="log-content">
      <div ref="terminal" class="terminal-container" role="log" :aria-label="title || '世界日志'"></div>
    </div>
  </section>
</template>

<script>
import { RefreshCwIcon, TriangleAlertIcon } from '@lucide/vue'
import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import 'xterm/css/xterm.css'
import { roomApi } from '@/api/index'
import { worldLogsV2API } from '@/api/v2'
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button as UiButton } from '@/components/ui/button'
import { Field, FieldContent, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Select as UiSelect, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { Switch as UiSwitch } from '@/components/ui/switch'

export default {
  name: 'WorldLog',
  components: {
    Alert,
    AlertAction,
    AlertDescription,
    AlertTitle,
    Badge,
    Field,
    FieldContent,
    FieldGroup,
    FieldLabel,
    RefreshCwIcon,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
    Spinner,
    TriangleAlertIcon,
    UiSwitch,
    UiButton,
    UiSelect
  },
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
      streamState: 'idle',
      loadError: '',
      resizeObserver: null
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
    },
    streamStateVariant() {
      if (this.streamState === 'connected') return 'default'
      if (this.streamState === 'error') return 'destructive'
      if (this.streamState === 'connecting') return 'outline'
      return 'secondary'
    }
  },
  async mounted() {
    this.initTerminal()
    window.addEventListener('resize', this.onResize)
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(this.onResize)
      this.resizeObserver.observe(this.$refs.root)
    }
    await this.loadArchives()
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.onResize)
    this.resizeObserver?.disconnect()
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
      this.loadError = ''
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
        this.loadError = error.message || '获取房间列表失败'
        this.writeErrorLine(this.loadError)
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
      this.loadError = ''
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
        this.loadError = error.message || '日志读取失败'
        this.writeErrorLine(this.loadError)
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
    retryLoad() {
      if (this.archives.length > 0 && this.selectedWorldId) return this.refreshLog()
      return this.loadArchives()
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
      window.requestAnimationFrame(() => {
        try {
          this.fitAddon?.fit()
        } catch {
          // The terminal may be temporarily hidden while dashboard panels switch.
        }
      })
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
  height: 100%;
  min-width: 0;
  min-height: 0;
  flex-direction: column;
  gap: 12px;
  overflow: hidden;
}

.log-toolbar {
  display: flex;
  min-width: 0;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
}

.log-controls {
  display: grid;
  flex: 1;
  min-width: 0;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 132px), 1fr));
  align-items: end;
  gap: 10px;
}

.log-actions {
  display: flex;
  flex: none;
  min-width: 0;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 8px;
}

.toggle-field {
  min-height: 36px;
  padding: 0 2px;
}

.log-content {
  flex: 1;
  min-height: 0;
  padding: 10px;
  overflow: hidden;
  border-radius: var(--radius);
  background: #181a19;
}

.terminal-container {
  width: 100%;
  height: 100%;
  min-height: 180px;
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

@media (max-width: 640px) {
  .log-toolbar {
    align-items: flex-start;
    flex-direction: column;
  }

  .log-actions {
    width: 100%;
    justify-content: space-between;
  }
}
</style>
