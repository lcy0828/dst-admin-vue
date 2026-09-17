<template>
  <section class="room-chat-panel" :aria-busy="loading">
    <div class="chat-toolbar">
      <FieldGroup class="chat-filters">
        <Field>
          <FieldLabel class="sr-only" for="room-chat-search">{{ $t('servers.workspace.chat.search') }}</FieldLabel>
          <InputGroup>
            <InputGroupAddon><Search /></InputGroupAddon>
            <InputGroupInput
              id="room-chat-search"
              v-model="draftQuery"
              :placeholder="$t('servers.workspace.chat.searchPlaceholder')"
              @keyup.enter="applySearch"
            />
          </InputGroup>
        </Field>

        <Field>
          <FieldLabel class="sr-only" for="room-chat-kind">{{ $t('servers.workspace.chat.kindFilter') }}</FieldLabel>
          <UiSelect v-model="kind" @update:model-value="applySelectFilter">
            <SelectTrigger id="room-chat-kind"><SelectValue :placeholder="$t('servers.workspace.chat.kindFilter')" /></SelectTrigger>
            <SelectContent><SelectGroup>
              <SelectItem value="all">{{ $t('servers.workspace.chat.allKinds') }}</SelectItem>
              <SelectItem value="say">{{ $t('servers.workspace.chat.kinds.say') }}</SelectItem>
              <SelectItem value="whisper">{{ $t('servers.workspace.chat.kinds.whisper') }}</SelectItem>
              <SelectItem value="announcement">{{ $t('servers.workspace.chat.kinds.announcement') }}</SelectItem>
            </SelectGroup></SelectContent>
          </UiSelect>
        </Field>

        <Field>
          <FieldLabel class="sr-only" for="room-chat-world">{{ $t('servers.workspace.chat.worldFilter') }}</FieldLabel>
          <UiSelect v-model="worldId" @update:model-value="applySelectFilter">
            <SelectTrigger id="room-chat-world"><SelectValue :placeholder="$t('servers.workspace.chat.worldFilter')" /></SelectTrigger>
            <SelectContent><SelectGroup>
              <SelectItem value="all">{{ $t('servers.workspace.chat.allWorlds') }}</SelectItem>
              <SelectItem v-for="world in worlds" :key="world.id" :value="world.id">{{ world.name }}</SelectItem>
            </SelectGroup></SelectContent>
          </UiSelect>
        </Field>
      </FieldGroup>

      <div class="chat-actions">
        <UiButton v-if="historyAvailable" size="sm" variant="outline" :disabled="repairSubmitting || Boolean(activeRepair)" @click="repairHistory">
          <Spinner v-if="repairSubmitting || activeRepair" data-icon="inline-start" />
          {{ $t(activeRepair ? 'servers.workspace.chat.historyCatchingUp' : 'servers.workspace.chat.repairAction') }}
        </UiButton>
        <UiButton size="sm" :disabled="loading" @click="applySearch">
          <Search data-icon="inline-start" />
          {{ $t('servers.workspace.chat.searchAction') }}
        </UiButton>
        <Tooltip>
          <TooltipTrigger as-child>
            <UiButton
              size="icon-sm"
              variant="outline"
              :aria-label="$t('servers.workspace.chat.refresh')"
              :disabled="loading"
              @click="loadChatLogs"
            >
              <Spinner v-if="loading" data-icon="inline-start" />
              <RefreshCw v-else data-icon="inline-start" />
            </UiButton>
          </TooltipTrigger>
          <TooltipContent>{{ $t('servers.workspace.chat.refresh') }}</TooltipContent>
        </Tooltip>
      </div>
    </div>

    <div class="chat-summary" role="status">
      <Badge variant="secondary">{{ $t('servers.workspace.chat.total', { count: total }) }}</Badge>
      <Badge variant="outline">{{ $t('servers.workspace.chat.kindCount', { kind: $t('servers.workspace.chat.kinds.say'), count: counts.say }) }}</Badge>
      <Badge variant="outline">{{ $t('servers.workspace.chat.kindCount', { kind: $t('servers.workspace.chat.kinds.whisper'), count: counts.whisper }) }}</Badge>
      <Badge variant="outline">{{ $t('servers.workspace.chat.kindCount', { kind: $t('servers.workspace.chat.kinds.announcement'), count: counts.announcement }) }}</Badge>
      <Badge v-if="historyAvailable" :variant="syncState === 'ready' ? 'outline' : 'secondary'">
        {{ syncStateLabel }}
      </Badge>
      <div v-if="historyAvailable && lastSyncedAt" class="chat-summary-times">
        <span>{{ $t('servers.workspace.chat.lastSyncedAt', { time: formatDateTime(lastSyncedAt) }) }}</span>
      </div>
      <div v-else-if="startedAt || updatedAt" class="chat-summary-times">
        <span v-if="startedAt">{{ $t('servers.workspace.chat.startedAt', { time: formatDateTime(startedAt) }) }}</span>
        <span v-if="updatedAt">{{ $t('servers.workspace.chat.updatedAt', { time: formatDateTime(updatedAt) }) }}</span>
      </div>
    </div>

    <Alert v-if="loadError" variant="destructive">
      <CircleAlert />
      <AlertTitle>{{ $t('servers.workspace.chat.loadFailed') }}</AlertTitle>
      <AlertDescription>{{ loadError }}</AlertDescription>
      <AlertAction><UiButton size="sm" variant="outline" :disabled="loading" @click="loadChatLogs">{{ $t('servers.workspace.chat.retry') }}</UiButton></AlertAction>
    </Alert>

    <Alert v-else-if="historyAvailable && syncState === 'partial'">
      <TriangleAlert />
      <AlertTitle>{{ $t('servers.workspace.chat.historyPartialTitle') }}</AlertTitle>
      <AlertDescription>{{ syncMessage || $t('servers.workspace.chat.historyPartialDescription') }}</AlertDescription>
    </Alert>

    <Alert v-else-if="partial">
      <TriangleAlert />
      <AlertTitle>{{ $t('servers.workspace.chat.partialTitle') }}</AlertTitle>
      <AlertDescription>{{ $t('servers.workspace.chat.partialDescription', { count: unavailableWorlds }) }}</AlertDescription>
    </Alert>

    <Alert v-if="historyAvailable && (parseErrors || uncertainTimes || unavailableGenerations)">
      <Info />
      <AlertTitle>{{ $t('servers.workspace.chat.historyReview') }}</AlertTitle>
      <AlertDescription>
        {{ $t('servers.workspace.chat.reviewDescription', { errors: parseErrors, times: uncertainTimes, missing: unavailableGenerations }) }}
        <span v-for="problem in parseProblems" :key="problem">{{ problem }}</span>
      </AlertDescription>
    </Alert>

    <Alert v-if="truncated">
      <Info />
      <AlertTitle>{{ $t('servers.workspace.chat.truncatedTitle') }}</AlertTitle>
      <AlertDescription>{{ $t('servers.workspace.chat.truncatedDescription') }}</AlertDescription>
    </Alert>

    <div v-if="loading && items.length === 0" class="chat-table-shell" role="status" :aria-label="$t('servers.workspace.chat.loading')">
      <UiTable class="chat-table">
        <TableHeader><TableRow>
          <TableHead v-for="column in 6" :key="column"><Skeleton class="h-4 w-20" /></TableHead>
        </TableRow></TableHeader>
        <TableBody>
          <TableRow v-for="row in 6" :key="row">
            <TableCell v-for="column in 6" :key="column"><Skeleton class="h-4 w-full" /></TableCell>
          </TableRow>
        </TableBody>
      </UiTable>
    </div>

    <Empty v-else-if="!loadError && items.length === 0" class="chat-empty">
      <EmptyHeader>
        <EmptyMedia variant="icon"><MessagesSquare /></EmptyMedia>
        <EmptyTitle>{{ $t('servers.workspace.chat.empty') }}</EmptyTitle>
        <EmptyDescription>{{ $t('servers.workspace.chat.emptyDescription') }}</EmptyDescription>
      </EmptyHeader>
    </Empty>

    <div v-else-if="items.length" class="chat-table-shell">
      <UiTable class="chat-table">
        <TableHeader><TableRow>
          <TableHead>{{ $t('servers.workspace.chat.columns.realTime') }}</TableHead>
          <TableHead>{{ $t('servers.workspace.chat.columns.runtime') }}</TableHead>
          <TableHead>{{ $t('servers.workspace.chat.columns.kind') }}</TableHead>
          <TableHead>{{ $t('servers.workspace.chat.columns.player') }}</TableHead>
          <TableHead>{{ $t('servers.workspace.chat.columns.content') }}</TableHead>
          <TableHead>{{ $t('servers.workspace.chat.columns.source') }}</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          <TableRow v-for="entry in items" :key="entry.id">
            <TableCell>
              <span
                class="chat-time"
                :title="!entry.occurredAt ? $t('servers.workspace.chat.realTimeUnavailable') : entry.timeEstimated ? $t('servers.workspace.chat.estimatedTime') : (formatDateTime(entry.occurredAt) || $t('servers.workspace.chat.realTimeUnavailable'))"
              >{{ entry.occurredAt && entry.timeEstimated ? '~ ' : '' }}{{ formatDateTime(entry.occurredAt) || $t('servers.workspace.chat.realTimeUnavailable') }}</span>
            </TableCell>
            <TableCell><span class="chat-time">{{ entry.sourceTimestamp }}</span></TableCell>
            <TableCell><Badge :variant="kindVariant(entry.kind)">{{ kindLabel(entry) }}</Badge></TableCell>
            <TableCell><span class="chat-player" :title="entry.playerId || ''">{{ entry.playerName || $t('servers.workspace.chat.system') }}</span></TableCell>
            <TableCell class="chat-content"><span :title="entry.content">{{ entry.content }}</span></TableCell>
            <TableCell>
              <span class="chat-source" :title="sourceTitle(entry.sources)">
                {{ sourceLabel(entry.sources) }}
                <Badge v-if="entry.sources?.length > 1" variant="outline">+{{ entry.sources.length - 1 }}</Badge>
              </span>
            </TableCell>
          </TableRow>
        </TableBody>
      </UiTable>
    </div>

    <footer v-if="!loadError && total > 0" class="chat-pagination">
      <span>{{ $t('servers.workspace.chat.range', { start: rangeStart, end: rangeEnd, total }) }}</span>
      <div class="chat-page-actions">
        <UiButton size="sm" variant="outline" :disabled="loading || page <= 1" @click="previousPage">
          <ArrowLeft data-icon="inline-start" />{{ $t('servers.workspace.chat.previous') }}
        </UiButton>
        <UiButton size="sm" variant="outline" :disabled="loading || page >= pageCount" @click="nextPage">
          {{ $t('servers.workspace.chat.next') }}<ArrowRight data-icon="inline-end" />
        </UiButton>
      </div>
    </footer>
  </section>
</template>

<script>
import {
  ArrowLeft, ArrowRight, CircleAlert, Info, MessagesSquare, RefreshCw, Search, TriangleAlert
} from '@lucide/vue'
import { computed } from 'vue'
import { toast } from 'vue-sonner'
import { useSharedJobStatus } from '@/composables/useGlobalJobStatus'
import { emitGlobalJobSubmitted } from '@/lib/globalJobs.mjs'
import { chatLogsV2API } from '@/api/v2'
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button as UiButton } from '@/components/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Select as UiSelect, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Table as UiTable, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { buildChatLogFilter, normalizeChatLogList } from '@/lib/chatLogSupport.mjs'
import { formatSystemDateTime } from '@/lib/dateTime.mjs'

const PAGE_SIZE = 100

export default {
  name: 'RoomChatPanel',
  components: {
    Alert, AlertAction, AlertDescription, AlertTitle, ArrowLeft, ArrowRight, Badge, CircleAlert,
    Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle, Field, FieldGroup, FieldLabel,
    Info, InputGroup, InputGroupAddon, InputGroupInput, MessagesSquare, RefreshCw, Search,
    SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue, Skeleton, Spinner,
    TableBody, TableCell, TableHead, TableHeader, TableRow, Tooltip, TooltipContent, TooltipTrigger,
    TriangleAlert, UiButton, UiSelect, UiTable
  },
  props: {
    roomId: { type: String, required: true },
    worlds: { type: Array, default: () => [] }
  },
  setup(props) {
    const status = useSharedJobStatus()
    const activeRepair = computed(() => status?.activeJobs.value.find(job => job.kind === 'log.chat.repair' && job.roomId === props.roomId))
    return { activeRepair }
  },
  data() {
    return {
      items: [],
      total: 0,
      counts: { say: 0, whisper: 0, announcement: 0 },
      draftQuery: '',
      query: '',
      kind: 'all',
      worldId: 'all',
      page: 1,
      loading: false,
      loadError: '',
      partial: false,
      truncated: false,
      availableWorlds: 0,
      unavailableWorlds: 0,
      startedAt: '',
      updatedAt: '',
      problems: [],
      historyAvailable: false,
      syncState: '',
      syncMessage: '',
      lastSyncedAt: '',
      pendingGenerations: 0,
      unavailableGenerations: 0,
      parseErrors: 0,
      uncertainTimes: 0,
      parseProblems: [],
      repairSubmitting: false,
      refreshTimer: null,
      panelActive: true,
      requestSequence: 0
    }
  },
  computed: {
    pageCount() {
      return Math.max(1, Math.ceil(this.total / PAGE_SIZE))
    },
    rangeStart() {
      return this.total === 0 ? 0 : ((this.page - 1) * PAGE_SIZE) + 1
    },
    rangeEnd() {
      return Math.min(this.total, this.page * PAGE_SIZE)
    },
    syncStateLabel() {
      if (this.syncState === 'ready') return this.$t('servers.workspace.chat.historyReady')
      if (this.syncState === 'catching_up') return this.$t('servers.workspace.chat.historyCatchingUp')
      if (this.syncState === 'review') return this.$t('servers.workspace.chat.historyReview')
      if (this.syncState === 'partial') return this.$t('servers.workspace.chat.historyPartial')
      return this.$t('servers.workspace.chat.historyPending')
    }
  },
  mounted() {
    document.addEventListener('visibilitychange', this.handleVisibility)
    this.loadChatLogs()
  },
  beforeUnmount() {
    this.panelActive = false
    this.requestSequence += 1
    clearTimeout(this.refreshTimer)
    document.removeEventListener('visibilitychange', this.handleVisibility)
  },
  methods: {
    async repairHistory() {
      const roomId = this.roomId
      this.repairSubmitting = true
      try {
        const job = await chatLogsV2API.repair(roomId)
        emitGlobalJobSubmitted(job)
        if (this.panelActive && this.roomId === roomId) {
          this.syncState = 'catching_up'
          this.scheduleRefresh()
        }
      } catch (error) {
        toast.error(error?.message || this.$t('servers.workspace.chat.repairFailed'))
      } finally {
        this.repairSubmitting = false
      }
    },
    handleVisibility() {
      clearTimeout(this.refreshTimer)
      if (document.visibilityState !== 'hidden' && (this.activeRepair || this.syncState === 'catching_up')) this.loadChatLogs()
    },
    scheduleRefresh() {
      clearTimeout(this.refreshTimer)
      if (!this.panelActive || document.visibilityState === 'hidden' || this.loadError) return
      if (this.activeRepair || this.syncState === 'catching_up') this.refreshTimer = setTimeout(() => this.loadChatLogs(), 5000)
    },
    async loadChatLogs() {
      if (!this.roomId || !this.panelActive) return
      clearTimeout(this.refreshTimer)
      const requestSequence = ++this.requestSequence
      this.loading = true
      this.loadError = ''
      try {
        const value = await chatLogsV2API.list(this.roomId, buildChatLogFilter({
          query: this.query,
          worldId: this.worldId === 'all' ? '' : this.worldId,
          kind: this.kind === 'all' ? '' : this.kind,
          page: this.page,
          pageSize: PAGE_SIZE
        }))
        if (requestSequence !== this.requestSequence) return
        Object.assign(this, normalizeChatLogList(value))
      } catch (error) {
        if (requestSequence !== this.requestSequence) return
        Object.assign(this, normalizeChatLogList())
        this.loadError = error?.message || this.$t('servers.workspace.chat.loadFailed')
      } finally {
        if (requestSequence === this.requestSequence) {
          this.loading = false
          this.scheduleRefresh()
        }
      }
    },
    applySearch() {
      this.query = this.draftQuery.trim()
      this.page = 1
      this.loadChatLogs()
    },
    applySelectFilter() {
      this.page = 1
      this.loadChatLogs()
    },
    previousPage() {
      if (this.page <= 1) return
      this.page -= 1
      this.loadChatLogs()
    },
    nextPage() {
      if (this.page >= this.pageCount) return
      this.page += 1
      this.loadChatLogs()
    },
    kindVariant(kind) {
      if (kind === 'say') return 'default'
      if (kind === 'whisper') return 'secondary'
      return 'outline'
    },
    kindLabel(entry) {
      if (entry.kind === 'announcement' && entry.announcementType) {
        const known = ['join', 'leave', 'death', 'resurrect', 'vote', 'skin']
        if (known.includes(entry.announcementType)) {
          return this.$t(`servers.workspace.chat.announcements.${entry.announcementType}`)
        }
      }
      const kind = ['say', 'whisper', 'announcement'].includes(entry.kind) ? entry.kind : 'announcement'
      return this.$t(`servers.workspace.chat.kinds.${kind}`)
    },
    sourceLabel(sources) {
      return sources?.[0]?.worldName || this.$t('servers.workspace.chat.unknownSource')
    },
    sourceTitle(sources) {
      return (sources || []).map(source => source.worldName).filter(Boolean).join(', ')
    },
    formatDateTime(value) {
      const localeState = this.$i18n?.locale
      const locale = typeof localeState === 'string' ? localeState : (localeState?.value || 'zh-CN')
      return formatSystemDateTime(value, {
        locale,
        fallback: '',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
      })
    }
  },
  watch: {
    activeRepair(value, previous) {
      if ((value || previous) && this.panelActive && document.visibilityState !== 'hidden') this.loadChatLogs()
    },
    roomId(value, previous) {
      if (!value || value === previous) return
      this.requestSequence += 1
      this.items = []
      this.draftQuery = ''
      this.query = ''
      this.kind = 'all'
      this.worldId = 'all'
      this.page = 1
      this.loadChatLogs()
    },
    worlds() {
      if (this.worldId !== 'all' && !this.worlds.some(world => world.id === this.worldId)) {
        this.worldId = 'all'
        this.page = 1
        this.loadChatLogs()
      }
    }
  }
}
</script>

<style scoped>
.room-chat-panel {
  display: flex;
  min-width: 0;
  min-height: 470px;
  flex-direction: column;
  gap: 10px;
}

.chat-toolbar {
  display: flex;
  min-width: 0;
  align-items: end;
  justify-content: space-between;
  gap: 10px;
}

.chat-filters {
  display: grid;
  min-width: 0;
  flex: 1;
  grid-template-columns: minmax(220px, 1fr) minmax(140px, 180px) minmax(140px, 180px);
  gap: 8px;
}

.chat-actions,
.chat-summary,
.chat-summary-times,
.chat-source,
.chat-pagination,
.chat-page-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.chat-actions,
.chat-page-actions {
  flex: none;
}

.chat-summary {
  min-height: 24px;
  flex-wrap: wrap;
}

.chat-summary-times,
.chat-pagination {
  color: var(--muted-foreground);
  font-size: 12px;
}

.chat-summary-times {
  margin-left: auto;
}

.chat-table-shell {
  min-height: 0;
  max-height: 344px;
  overflow: auto;
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.chat-table {
  min-width: 940px;
  table-layout: fixed;
}

.chat-table :deep(th:nth-child(1)),
.chat-table :deep(td:nth-child(1)) {
  width: 184px;
}

.chat-table :deep(th:nth-child(2)),
.chat-table :deep(td:nth-child(2)) {
  width: 86px;
}

.chat-table :deep(th:nth-child(3)),
.chat-table :deep(td:nth-child(3)) {
  width: 94px;
}

.chat-table :deep(th:nth-child(4)),
.chat-table :deep(td:nth-child(4)) {
  width: 150px;
}

.chat-table :deep(th:nth-child(6)),
.chat-table :deep(td:nth-child(6)) {
  width: 128px;
}

.chat-time {
  color: var(--muted-foreground);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
}

.chat-player,
.chat-content span,
.chat-source {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-player {
  font-weight: 600;
}

.chat-source {
  display: flex;
  min-width: 0;
}

.chat-empty {
  min-height: 310px;
}

.chat-pagination {
  justify-content: space-between;
  margin-top: auto;
}

@media (max-width: 860px) {
  .chat-toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .chat-filters {
    grid-template-columns: minmax(0, 1fr) repeat(2, minmax(130px, 1fr));
  }

  .chat-actions {
    justify-content: flex-end;
  }
}

@media (max-width: 600px) {
  .chat-filters {
    grid-template-columns: minmax(0, 1fr);
  }

  .chat-summary-times {
    width: 100%;
    margin-left: 0;
    align-items: flex-start;
    flex-direction: column;
  }

  .chat-pagination {
    align-items: stretch;
    flex-direction: column;
  }

  .chat-page-actions > :deep([data-slot='button']) {
    flex: 1;
  }
}
</style>
