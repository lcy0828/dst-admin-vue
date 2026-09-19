<template>
  <Dialog v-model:open="open">
    <DialogTrigger as-child>
      <UiButton type="button" size="sm" variant="ghost">
        <Waypoints data-icon="inline-start" />
        {{ t('roomTopology.trigger') }}
      </UiButton>
    </DialogTrigger>

    <DialogScrollContent class="topology-dialog max-w-3xl gap-0 p-0" @open-auto-focus="focusHeading">
      <DialogHeader class="topology-header">
        <div class="topology-heading">
          <DialogTitle ref="titleRef" tabindex="-1" class="outline-none">{{ t('roomTopology.title') }}</DialogTitle>
          <DialogDescription class="topology-context">
            <span>{{ view.roomName || view.roomId || '--' }}</span>
            <span aria-hidden="true">·</span>
            <span>{{ t(`roomTopology.modes.${view.mode}`) }}</span>
            <span aria-hidden="true">·</span>
            <span>{{ t('roomTopology.summary', { worlds: view.worldCount }) }}</span>
          </DialogDescription>
        </div>
        <div class="topology-summary" role="status" aria-live="polite">
          <Badge :variant="refreshing ? 'outline' : healthVariant">{{ refreshing ? t('roomTopology.refreshing') : t(`roomTopology.health.${displayStatus}`) }}</Badge>
          <Tooltip>
            <TooltipTrigger as-child>
              <UiButton
                type="button"
                size="icon-sm"
                variant="outline"
                :disabled="refreshing"
                :aria-label="t(refreshing ? 'roomTopology.refreshing' : 'roomTopology.refresh')"
                @click="emit('refresh')"
              >
                <Spinner v-if="refreshing" />
                <RefreshCw v-else />
              </UiButton>
            </TooltipTrigger>
            <TooltipContent>{{ t(refreshing ? 'roomTopology.refreshing' : 'roomTopology.refresh') }}</TooltipContent>
          </Tooltip>
        </div>
      </DialogHeader>

      <div v-if="refreshing && !topology" class="flex items-center gap-2 p-6" role="status">
        <Spinner />
        {{ t('roomTopology.refreshing') }}
      </div>
      <div v-else class="topology-content">
        <Alert v-if="errorMessage" variant="destructive">
          <CircleAlert />
          <AlertTitle>{{ t('roomTopology.health.unavailable') }}</AlertTitle>
          <AlertDescription>{{ t('roomTopology.feedback.refreshFailed', { error: errorMessage }) }}</AlertDescription>
        </Alert>

        <section class="topology-map" :aria-label="t('roomTopology.lanes.complete')">
          <p class="sr-only">{{ t('roomTopology.description') }}</p>
          <div class="topology-flow" :class="{ 'is-single-world': !view.secondaries.length }">
            <Card size="sm" class="topology-entry" :class="{ 'is-warning': !view.playerEntry.ready }">
              <CardHeader class="group-data-[size=sm]/card:p-0">
                <CardTitle class="flex items-center gap-2"><UsersRound class="size-4 shrink-0" aria-hidden="true" />{{ t('roomTopology.nodes.players') }}</CardTitle>
                <CardDescription class="sr-only">{{ t('roomTopology.nodes.playersDescription') }}</CardDescription>
              </CardHeader>
              <CardContent class="topology-entry-content group-data-[size=sm]/card:p-0">
                <code class="topology-entry-endpoint">{{ view.playerEntry.endpoint || t('roomTopology.entrySources.missing') }}</code>
                <div class="topology-entry-meta">
                  <Badge v-if="view.playerEntry.endpoint" variant="secondary">UDP</Badge>
                  <Badge :variant="entryVariant" class="h-auto whitespace-normal">{{ t(`roomTopology.entrySources.${entrySource}`) }}</Badge>
                </div>
              </CardContent>
            </Card>

            <div class="topology-entry-edge" :class="{ 'is-missing': !view.playerEntry.ready || !view.master }" aria-hidden="true"><ArrowDown /></div>

            <div class="topology-shards" :class="{ 'has-multiple': view.secondaries.length > 1 }">
              <RoomTopologyWorldNode v-if="view.master" class="topology-master" :node="view.master" :master="true" />
              <div v-else class="topology-missing-master">
                <CircleAlert aria-hidden="true" />
                <span>{{ t('roomTopology.issues.masterMissing') }}</span>
              </div>

              <div v-if="view.secondaries.length" class="topology-branches">
                <article v-for="node in view.secondaries" :key="node.id" class="topology-branch">
                  <span class="topology-shard-edge" :class="{ 'is-missing': node.route.state === 'missing' || !view.master }" aria-hidden="true" />
                  <RoomTopologyWorldNode class="topology-secondary" :node="node" />
                </article>
              </div>
            </div>
          </div>
        </section>

        <Alert
          v-if="view.connectionIssues.length"
          :variant="view.status === 'error' ? 'destructive' : 'default'"
        >
          <CircleAlert />
          <AlertTitle>{{ t('roomTopology.issues.title', { count: view.connectionIssues.length }) }}</AlertTitle>
          <AlertDescription class="topology-issue-list">
            <span v-for="topologyIssue in view.connectionIssues" :key="issueKey(topologyIssue)">
              {{ issueMessage(topologyIssue) }}
            </span>
          </AlertDescription>
        </Alert>

        <Alert v-if="view.configurationNotices.length">
          <CircleAlert />
          <AlertTitle>{{ t('roomTopology.issues.noticeTitle', { count: view.configurationNotices.length }) }}</AlertTitle>
          <AlertDescription class="topology-issue-list">
            <span v-for="configurationNotice in view.configurationNotices" :key="issueKey(configurationNotice)">
              {{ issueMessage(configurationNotice) }}
            </span>
          </AlertDescription>
        </Alert>

        <Alert v-if="view.runtimeRisks.length">
          <TriangleAlert />
          <AlertTitle>{{ t('roomTopology.issues.riskTitle', { count: view.runtimeRisks.length }) }}</AlertTitle>
          <AlertDescription class="topology-issue-list">
            <span v-for="runtimeRisk in view.runtimeRisks" :key="issueKey(runtimeRisk)">
              {{ issueMessage(runtimeRisk) }}
            </span>
          </AlertDescription>
        </Alert>

        <div class="topology-timestamps">
          <span>{{ view.observedAt ? t('roomTopology.observedAt', { time: formatTimestamp(view.observedAt) }) : t('roomTopology.noObservedAt') }}</span>
          <span v-if="view.updatedAt">{{ t('roomTopology.configuredAt', { time: formatTimestamp(view.updatedAt) }) }}</span>
        </div>
      </div>
    </DialogScrollContent>
  </Dialog>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { ArrowDown, CircleAlert, RefreshCw, TriangleAlert, UsersRound, Waypoints } from '@lucide/vue'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button as UiButton } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogDescription, DialogHeader, DialogScrollContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Spinner } from '@/components/ui/spinner'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { formatSystemDateTime } from '@/lib/dateTime.mjs'
import { buildRoomTopologyView } from '@/lib/roomTopologyPresentation.mjs'
import RoomTopologyWorldNode from './RoomTopologyWorldNode.vue'

const props = defineProps({
  room: { type: Object, default: () => ({}) },
  topology: { type: Object, default: null },
  infrastructure: { type: Object, default: null },
  connection: { type: Object, default: () => ({}) },
  worldPorts: { type: Array, default: () => [] },
  refreshing: { type: Boolean, default: false },
  errorMessage: { type: String, default: '' }
})

const emit = defineEmits(['refresh'])
const { t, locale } = useI18n()
const open = ref(false)
const titleRef = ref(null)

const view = computed(() => buildRoomTopologyView({
  room: props.room,
  topology: props.topology,
  infrastructure: props.infrastructure,
  connection: props.connection,
  worldPorts: props.worldPorts
}))
const displayStatus = computed(() => props.errorMessage && view.value.status === 'healthy' ? 'warning' : view.value.status)
const healthVariant = computed(() => ({
  healthy: 'success',
  warning: 'warning',
  error: 'destructive',
  unavailable: 'outline'
})[displayStatus.value] || 'outline')
const entrySource = computed(() => {
  const source = view.value.playerEntry.source
  return ['configured', 'detected', 'lan', 'draft', 'panel', 'local', 'missing'].includes(source) ? source : 'configured'
})
const entryVariant = computed(() => view.value.playerEntry.ready ? 'outline' : 'warning')

watch(open, value => {
  if (value) emit('refresh')
})

function focusHeading(event) {
  event.preventDefault()
  titleRef.value?.$el?.focus({ preventScroll: true })
}

function issueMessage(value) {
  return value.messageKey ? t(value.messageKey, value.parameters || {}) : (value.message || value.code)
}

function issueKey(value) {
  return `${value.code || 'issue'}:${value.worldId || ''}:${value.targetId || ''}:${value.message || value.messageKey || ''}`
}

function formatTimestamp(value) {
  return formatSystemDateTime(value, { locale: locale.value })
}
</script>

<style scoped>
.topology-dialog {
  min-width: 0;
}

.topology-header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: start;
  gap: 16px;
  padding: 20px 52px 16px 20px;
  border-bottom: 1px solid var(--border);
  text-align: left;
}

.topology-heading,
.topology-content,
.topology-issue-list {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 6px;
}

.topology-context,
.topology-summary,
.topology-entry-content,
.topology-entry-meta,
.topology-timestamps {
  display: flex;
  min-width: 0;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.topology-context {
  overflow-wrap: anywhere;
}

.topology-summary {
  justify-content: flex-end;
}

.topology-content {
  gap: 16px;
  padding: 20px;
  overflow-wrap: anywhere;
}

.topology-map,
.topology-flow {
  min-width: 0;
}

.topology-flow {
  --edge-width: 32px;
  --arm-y: 36px;
}

.topology-entry {
  display: grid;
  grid-template-columns: 112px minmax(0, 1fr);
  align-items: center;
  gap: 8px 16px;
  padding: 12px 14px;
}

.topology-entry.is-warning {
  border-color: color-mix(in srgb, var(--warning) 55%, var(--border));
}

.topology-entry-content {
  justify-content: space-between;
  gap: 8px 12px;
}

.topology-entry-endpoint {
  min-width: 0;
  font-family: var(--font-mono);
  font-size: 13px;
  line-height: 20px;
  overflow-wrap: anywhere;
}

.topology-entry-edge {
  position: relative;
  height: 28px;
  margin-left: calc((100% - var(--edge-width)) / 4);
  color: var(--muted-foreground);
}

.topology-entry-edge::before {
  position: absolute;
  inset-block: 0;
  left: 0;
  border-left: 1px solid currentColor;
  opacity: 0.5;
  content: '';
}

.topology-entry-edge > svg {
  position: absolute;
  left: -8px;
  bottom: 0;
  width: 16px;
  height: 16px;
  stroke-width: 1.5;
  background: var(--popover);
}

.topology-entry-edge.is-missing {
  color: var(--destructive);
}

.topology-entry-edge.is-missing::before {
  border-left-style: dashed;
}

.topology-shards {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: var(--edge-width);
  min-width: 0;
  align-items: stretch;
}

.topology-master,
.topology-secondary {
  height: 100%;
}

.topology-shards.has-multiple {
  align-items: start;
}

.topology-shards.has-multiple > .topology-master {
  height: auto;
}

.is-single-world .topology-entry-edge {
  margin-left: 50%;
}

.is-single-world .topology-shards {
  grid-template-columns: minmax(0, 1fr);
  max-width: 400px;
  margin-inline: auto;
}

.topology-missing-master {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 24px 16px;
  border: 1px dashed var(--destructive);
  border-radius: var(--radius);
  color: var(--destructive);
  font-size: 13px;
}

.topology-missing-master > svg {
  width: 18px;
  height: 18px;
  flex: 0 0 auto;
}

.topology-branches {
  display: grid;
  min-width: 0;
  gap: 12px;
}

.topology-branch {
  position: relative;
  min-width: 0;
}

/* Every secondary joins the same trunk beside Master, never another secondary. */
.topology-shard-edge {
  position: absolute;
  left: calc(-1 * var(--edge-width));
  top: var(--arm-y);
  width: var(--edge-width);
  border-top: 1px solid var(--muted-foreground);
  opacity: 0.55;
}

.topology-shard-edge.is-missing {
  border-top-style: dashed;
  border-color: var(--destructive);
  opacity: 1;
}

.has-multiple .topology-branch::before {
  position: absolute;
  left: calc(-1 * var(--edge-width) / 2);
  top: -12px;
  bottom: 0;
  border-left: 1px solid var(--border);
  content: '';
}

.has-multiple .topology-branch:first-child::before {
  top: var(--arm-y);
}

.has-multiple .topology-branch:last-child::before {
  bottom: calc(100% - var(--arm-y));
}

.has-multiple .topology-branch:not(:first-child) .topology-shard-edge {
  left: calc(-1 * var(--edge-width) / 2);
  width: calc(var(--edge-width) / 2);
}

.topology-timestamps {
  justify-content: flex-end;
  column-gap: 16px;
  color: var(--muted-foreground);
  font-size: 11px;
  line-height: 16px;
}

@media (max-width: 639px) {
  .topology-header {
    grid-template-columns: minmax(0, 1fr);
    gap: 12px;
    padding: 16px 48px 16px 16px;
  }

  .topology-summary {
    justify-content: flex-start;
  }

  .topology-content {
    padding: 16px;
  }

  .topology-entry {
    grid-template-columns: minmax(0, 1fr);
    gap: 8px;
  }

  .topology-entry-edge {
    margin-left: 50%;
  }

  .topology-shards {
    grid-template-columns: minmax(0, 1fr);
  }

  .topology-flow {
    --edge-width: 20px;
  }

  .topology-branches {
    margin-left: 36px;
    padding-top: 12px;
  }

  .topology-branch::before,
  .has-multiple .topology-branch::before,
  .has-multiple .topology-branch:first-child::before {
    position: absolute;
    left: calc(-1 * var(--edge-width));
    top: -12px;
    bottom: 0;
    border-left: 1px solid var(--border);
    content: '';
  }

  .topology-branch:last-child::before,
  .has-multiple .topology-branch:last-child::before {
    bottom: calc(100% - var(--arm-y));
  }

  .has-multiple .topology-branch:not(:first-child) .topology-shard-edge {
    left: calc(-1 * var(--edge-width));
    width: var(--edge-width);
  }

  .topology-timestamps {
    justify-content: flex-start;
  }
}
</style>
