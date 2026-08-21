<template>
  <section ref="root" class="world-log-container">
    <div class="log-toolbar">
      <FieldGroup class="log-controls">
        <Field>
          <FieldLabel for="world-log-room">{{ $t('servers.liveLogs.fields.room') }}</FieldLabel>
          <UiSelect
            v-model="selectedRoomId"
            @update:model-value="handleRoomChange"
          >
            <SelectTrigger id="world-log-room"><SelectValue :placeholder="$t('servers.liveLogs.fields.selectRoom')" /></SelectTrigger>
            <SelectContent><SelectGroup>
              <SelectItem v-for="room in archives" :key="room.id" :value="room.id">{{ room.name }}</SelectItem>
            </SelectGroup></SelectContent>
          </UiSelect>
        </Field>

        <Field>
          <FieldLabel for="world-log-world">{{ $t('servers.liveLogs.fields.world') }}</FieldLabel>
          <UiSelect
            v-model="selectedWorldId"
            :disabled="!selectedRoomId || currentRoomWorlds.length === 0"
            @update:model-value="handleWorldChange"
          >
            <SelectTrigger id="world-log-world"><SelectValue :placeholder="$t('servers.liveLogs.fields.selectWorld')" /></SelectTrigger>
            <SelectContent><SelectGroup>
              <SelectItem v-for="world in currentRoomWorlds" :key="world.id" :value="world.id">
                {{ world.name }} ({{ formatWorldType(world.type || world.role) }})
              </SelectItem>
            </SelectGroup></SelectContent>
          </UiSelect>
        </Field>

        <Field>
          <FieldLabel for="world-log-time-mode">{{ $t('servers.liveLogs.fields.timeDisplay') }}</FieldLabel>
          <UiSelect
            v-model="timeDisplayMode"
            @update:model-value="handleTimeDisplayModeChange"
          >
            <SelectTrigger id="world-log-time-mode">
              <SelectValue :placeholder="$t('servers.liveLogs.fields.timeDisplayPlaceholder')" />
            </SelectTrigger>
            <SelectContent><SelectGroup>
              <SelectItem value="wallclock">{{ $t('servers.liveLogs.fields.timeModes.wallclock') }}</SelectItem>
              <SelectItem value="runtime">{{ $t('servers.liveLogs.fields.timeModes.runtime') }}</SelectItem>
            </SelectGroup></SelectContent>
          </UiSelect>
        </Field>

        <Field orientation="horizontal" class="toggle-field">
          <FieldContent>
            <FieldLabel for="world-log-follow">{{ $t('servers.liveLogs.fields.follow') }}</FieldLabel>
          </FieldContent>
          <UiSwitch
            id="world-log-follow"
            v-model="followLog"
            @update:model-value="handleFollowChange"
          />
        </Field>

        <Field orientation="horizontal" class="toggle-field">
          <FieldContent>
            <FieldLabel for="world-log-scroll">{{ $t('servers.liveLogs.fields.autoScroll') }}</FieldLabel>
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
          {{ $t('common.actions.refresh') }}
        </UiButton>
      </div>
    </div>

    <Alert v-if="loadError" variant="destructive">
      <TriangleAlertIcon />
      <AlertTitle>{{ $t('servers.liveLogs.terminal.loadFailed') }}</AlertTitle>
      <AlertDescription>{{ loadError }}</AlertDescription>
      <AlertAction><UiButton size="sm" variant="outline" :disabled="loading" @click="retryLoad">{{ $t('common.actions.retry') }}</UiButton></AlertAction>
    </Alert>

    <div class="log-content">
      <div ref="terminal" class="terminal-container" role="log" :aria-label="title || $t('servers.liveLogs.terminal.defaultTitle')"></div>
    </div>
  </section>
</template>

<script>
import { RefreshCwIcon, TriangleAlertIcon } from '@lucide/vue'
import { markRaw } from 'vue'
import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import 'xterm/css/xterm.css'
import { roomApi } from '@/api/index'
import { worldLogsV2API } from '@/api/v2'
import { formatSystemDateTime } from '@/lib/dateTime.mjs'
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button as UiButton } from '@/components/ui/button'
import { Field, FieldContent, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Select as UiSelect, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { Switch as UiSwitch } from '@/components/ui/switch'
import { RUNTIME_TARGET_CHANGED_EVENT } from '@/utils/runtimeTarget'

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
      default: ''
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
      timeDisplayMode: 'wallclock',
      logStartedAt: null,
      rawLogLines: [],
      logSnapshot: null,
      eventSource: null,
      manuallyClosedEventSource: false,
      streamState: 'idle',
      loadError: '',
      resizeObserver: null,
      archiveRequestSequence: 0,
      logRequestSequence: 0,
      retryTimer: null,
      retryAttempt: 0,
      destroyed: false
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
      const known = ['idle', 'connecting', 'reconnecting', 'connected', 'paused', 'error']
      return this.$t(`servers.liveLogs.terminal.states.${known.includes(this.streamState) ? this.streamState : 'unknown'}`)
    },
    streamStateVariant() {
      if (this.streamState === 'connected') return 'default'
      if (this.streamState === 'error') return 'destructive'
      if (this.streamState === 'connecting' || this.streamState === 'reconnecting') return 'outline'
      return 'secondary'
    }
  },
  async mounted() {
    this.destroyed = false
    this.initTerminal()
    window.addEventListener('resize', this.onResize)
    window.addEventListener(RUNTIME_TARGET_CHANGED_EVENT, this.handleRuntimeTargetChange)
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(this.onResize)
      this.resizeObserver.observe(this.$refs.root)
    }
    await this.loadArchives()
  },
  beforeUnmount() {
    this.destroyed = true
    window.removeEventListener('resize', this.onResize)
    window.removeEventListener(RUNTIME_TARGET_CHANGED_EVENT, this.handleRuntimeTargetChange)
    this.resizeObserver?.disconnect()
    this.clearLogRetry(true)
    this.closeEventSource()
    this.terminal?.dispose()
  },
  methods: {
    initTerminal() {
      this.terminal = markRaw(new Terminal({
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
      }))
      this.fitAddon = markRaw(new FitAddon())
      this.terminal.loadAddon(this.fitAddon)
      this.terminal.open(this.$refs.terminal)
      this.$nextTick(() => this.fitAddon.fit())
      this.writeSystemLine(this.$t('servers.liveLogs.terminal.selectTarget'))
    },
    async loadArchives() {
      const requestSequence = ++this.archiveRequestSequence
      this.loading = true
      this.loadError = ''
      try {
        const response = await roomApi.getRoomList()
        if (requestSequence !== this.archiveRequestSequence) return
        this.archives = Array.isArray(response)
          ? response
          : (Array.isArray(response?.data) ? response.data : [])
        this.resolveInitialSelection()
        if (this.selectedRoomId && this.selectedWorldId) await this.loadLog()
      } catch (error) {
        if (requestSequence !== this.archiveRequestSequence) return
        this.archives = []
        this.streamState = 'error'
        this.loadError = error.message || this.$t('servers.liveLogs.terminal.archiveLoadFailed')
        this.writeErrorLine(this.loadError)
      } finally {
        if (requestSequence === this.archiveRequestSequence) this.loading = false
      }
    },
    handleRuntimeTargetChange() {
      this.clearLogRetry(true)
      this.closeEventSource()
      this.logRequestSequence += 1
      this.selectedRoomId = ''
      this.selectedWorldId = ''
      this.archives = []
      this.terminal?.clear()
      this.loadArchives()
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
      this.clearLogRetry(true)
      this.closeEventSource()
      this.resetLogMetadata()
      const worlds = this.currentRoomWorlds
      this.selectedWorldId = (worlds.find(world => world.status === 'running') || worlds[0])?.id || ''
      if (this.selectedWorldId) this.loadLog()
      else {
        this.streamState = 'idle'
        this.terminal.clear()
        this.writeSystemLine(this.$t('servers.liveLogs.terminal.noWorlds'))
      }
    },
    handleWorldChange() {
      this.clearLogRetry(true)
      this.loadLog()
    },
    handleTimeDisplayModeChange() {
      if (this.logSnapshot || this.rawLogLines.length > 0) this.redrawTerminal()
    },
    formatWorldType(type) {
      if (type === 'forest' || type === 'master') return this.$t('servers.list.worldTypes.forest')
      if (type === 'cave' || type === 'caves') return this.$t('servers.list.worldTypes.cave')
      return type || this.$t('servers.list.worldTypes.custom')
    },
    async refreshLog() {
      if (!this.selectedRoomId || !this.selectedWorldId) return
      await this.loadLog()
    },
    async loadLog() {
      if (!this.selectedRoomId || !this.selectedWorldId || !this.terminal) return

      const requestSequence = ++this.logRequestSequence
      this.clearLogRetry(false)
      this.loading = true
      this.loadError = ''
      this.closeEventSource()
      this.resetLogMetadata()
      this.terminal.clear()
      this.terminal.writeln(`\x1B[1;33m${this.currentRoom?.name || '-'} / ${this.currentWorld?.name || '-'}\x1B[0m`)

      try {
        const snapshot = await worldLogsV2API.snapshot(this.selectedRoomId, this.selectedWorldId, { limit: 300 })
        if (requestSequence !== this.logRequestSequence) return
        this.renderSnapshot(snapshot)
        this.retryAttempt = 0
        if (this.followLog) this.connectEventSource()
        else this.streamState = 'paused'
      } catch (error) {
        if (requestSequence !== this.logRequestSequence) return
        this.streamState = 'error'
        this.loadError = error.message || this.$t('servers.liveLogs.terminal.loadFailed')
        this.writeErrorLine(this.loadError)
        this.scheduleLogRetry(requestSequence)
      } finally {
        if (requestSequence === this.logRequestSequence) this.loading = false
      }
    },
    connectEventSource() {
      this.manuallyClosedEventSource = false
      this.streamState = 'connecting'
      const source = new EventSource(worldLogsV2API.eventURL(this.selectedRoomId, this.selectedWorldId, 300))
      this.eventSource = source

      source.addEventListener('connected', event => {
        if (this.eventSource !== source) return
        const payload = this.parseEvent(event)
        this.clearLogRetry(true)
        this.streamState = 'connected'
        this.loadError = ''
        if (payload?.snapshot) this.renderSnapshot(payload.snapshot)
      })
      source.addEventListener('line', event => {
        if (this.eventSource !== source) return
        const payload = this.parseEvent(event)
        if (payload?.line?.text !== undefined) this.writeLogLine(payload.line.text)
      })
      source.addEventListener('reset', event => {
        if (this.eventSource !== source) return
        const payload = this.parseEvent(event)
        this.resetLogMetadata()
        if (payload?.snapshot) {
          this.logStartedAt = this.normalizeStartedAt(payload.snapshot.startedAt)
          this.logSnapshot = {
            fileName: payload.snapshot.fileName || 'server_log.txt',
            truncated: false
          }
        }
        this.terminal.clear()
        this.terminal.writeln(`\x1B[1;33m${this.currentRoom?.name || '-'} / ${this.currentWorld?.name || '-'}\x1B[0m`)
        this.writeSystemLine(this.$t('servers.liveLogs.terminal.rotated', {
          file: payload?.snapshot?.fileName || 'server_log.txt'
        }))
        if (payload?.snapshot?.lines) {
          payload.snapshot.lines.forEach(line => this.writeLogLine(typeof line === 'string' ? line : line?.text))
        }
      })
      source.addEventListener('heartbeat', () => {
        if (this.eventSource === source && this.streamState !== 'connected') this.streamState = 'connected'
      })
      source.onerror = event => {
        if (this.manuallyClosedEventSource || this.eventSource !== source) return
        const payload = this.parseEvent(event)
        if (payload?.message) {
          this.streamState = 'error'
          this.loadError = payload.message
          this.writeErrorLine(this.loadError)
          this.closeEventSource()
          this.scheduleLogRetry(this.logRequestSequence)
          return
        }
        if (this.streamState !== 'reconnecting') this.writeSystemLine(this.$t('servers.liveLogs.terminal.reconnecting'))
        this.streamState = 'reconnecting'
        this.loadError = ''
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
      this.logStartedAt = this.normalizeStartedAt(snapshot.startedAt)
      this.logSnapshot = {
        fileName: snapshot.fileName || 'server_log.txt',
        truncated: Boolean(snapshot.truncated)
      }
      this.rawLogLines = (snapshot.lines || [])
        .map(line => typeof line === 'string' ? line : line?.text)
        .filter(line => line !== undefined && line !== null)
        .map(line => String(line))
        .slice(-5000)
      this.redrawTerminal()
    },
    writeLogLine(line) {
      const value = String(line ?? '')
      this.rawLogLines.push(value)
      if (this.rawLogLines.length > 5000) this.rawLogLines.splice(0, this.rawLogLines.length - 5000)
      this.terminal.writeln(this.formatLogLine(value))
      if (this.autoScroll) this.terminal.scrollToBottom()
    },
    resetLogMetadata() {
      this.logStartedAt = null
      this.rawLogLines = []
      this.logSnapshot = null
    },
    normalizeStartedAt(value) {
      if (!value) return null
      const parsed = new Date(value)
      return Number.isNaN(parsed.getTime()) ? null : parsed
    },
    formatLogLine(line) {
      const value = String(line ?? '')
      if (this.timeDisplayMode !== 'wallclock' || !this.logStartedAt) return value

      const match = value.match(/^(\[)(\d{2,}):(\d{2}):(\d{2})(\])/)
      if (!match) return value
      const hours = Number(match[2])
      const minutes = Number(match[3])
      const seconds = Number(match[4])
      if (minutes > 59 || seconds > 59) return value

      const elapsed = ((hours * 60 + minutes) * 60) + seconds
      const timestamp = new Date(this.logStartedAt.getTime() + elapsed * 1000)
      const formatted = formatSystemDateTime(timestamp, {
        locale: 'sv-SE',
        fallback: '',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
      })
      if (!formatted) return value
      return `${match[1]}${formatted}${match[5]}${value.slice(match[0].length)}`
    },
    redrawTerminal() {
      if (!this.terminal) return
      this.terminal.clear()
      this.terminal.writeln(`\x1B[1;33m${this.currentRoom?.name || '-'} / ${this.currentWorld?.name || '-'}\x1B[0m`)
      if (!this.logSnapshot) {
        if (this.loading) this.writeSystemLine(this.$t('servers.liveLogs.terminal.loading'))
        else this.writeSystemLine(this.$t('servers.liveLogs.terminal.selectTarget'))
        return
      }
      this.terminal.writeln(`\x1B[90m${this.$t('servers.liveLogs.terminal.snapshot', {
        file: this.logSnapshot.fileName,
        count: this.rawLogLines.length
      })}\x1B[0m`)
      this.rawLogLines.forEach(line => this.terminal.writeln(this.formatLogLine(line)))
      if (this.autoScroll) this.terminal.scrollToBottom()
    },
    writeSystemLine(message) {
      this.terminal?.writeln(`\x1B[36m${this.$t('servers.liveLogs.terminal.systemPrefix')}\x1B[0m ${message}`)
    },
    writeErrorLine(message) {
      this.terminal?.writeln(`\x1B[31m${this.$t('servers.liveLogs.terminal.errorPrefix')}\x1B[0m ${message}`)
    },
    retryLoad() {
      this.clearLogRetry(true)
      if (this.archives.length > 0 && this.selectedWorldId) return this.refreshLog()
      return this.loadArchives()
    },
    handleFollowChange(enabled) {
      if (enabled) {
        if (this.selectedWorldId) this.connectEventSource()
      } else {
        this.clearLogRetry(true)
        this.closeEventSource()
        this.streamState = 'paused'
      }
    },
    scheduleLogRetry(requestSequence) {
      if (this.destroyed || !this.followLog || !this.selectedRoomId || !this.selectedWorldId) return
      this.clearLogRetry(false)
      const delay = Math.min(30_000, 3_000 * (2 ** Math.min(this.retryAttempt, 3)))
      this.retryAttempt += 1
      this.retryTimer = window.setTimeout(() => {
        this.retryTimer = null
        if (this.destroyed || requestSequence !== this.logRequestSequence) return
        this.loadLog()
      }, delay)
    },
    clearLogRetry(resetAttempts = false) {
      if (this.retryTimer) window.clearTimeout(this.retryTimer)
      this.retryTimer = null
      if (resetAttempts) this.retryAttempt = 0
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
    '$i18n.locale'() {
      if (!this.terminal) return
      if (this.selectedRoomId && this.selectedWorldId) this.loadLog()
      else {
        this.terminal.clear()
        this.writeSystemLine(this.$t('servers.liveLogs.terminal.selectTarget'))
      }
    },
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
  position: relative;
  z-index: 0;
  display: flex;
  height: 100%;
  min-width: 0;
  min-height: 0;
  flex-direction: column;
  gap: 12px;
  overflow: hidden;
  isolation: isolate;
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
  grid-template-columns: repeat(3, minmax(150px, 1fr)) repeat(2, minmax(108px, auto));
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
  padding: 0;
}

.log-content {
  position: relative;
  z-index: 0;
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

@media (max-width: 860px) {
  .log-toolbar {
    align-items: flex-start;
    flex-direction: column;
  }

  .log-actions {
    width: 100%;
    justify-content: flex-end;
  }
}

@media (max-width: 600px) {
  .log-controls {
    width: 100%;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .log-actions {
    justify-content: space-between;
  }
}
</style>
