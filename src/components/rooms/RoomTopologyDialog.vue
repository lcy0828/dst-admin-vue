<template>
  <Dialog v-model:open="open">
    <DialogTrigger as-child>
      <UiButton type="button" size="sm" variant="ghost">
        <Waypoints data-icon="inline-start" />
        {{ t('roomTopology.trigger') }}
      </UiButton>
    </DialogTrigger>

    <DialogScrollContent class="topology-dialog max-w-5xl gap-0 p-0" @open-auto-focus="focusHeading">
      <DialogHeader class="topology-header">
        <div class="topology-heading">
          <DialogTitle ref="titleRef" tabindex="-1" class="outline-none">{{ t('roomTopology.title') }}</DialogTitle>
          <DialogDescription>{{ t('roomTopology.description') }}</DialogDescription>
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
          <div class="topology-room-heading">
            <div class="topology-room-title">
              <Waypoints aria-hidden="true" />
              <strong>{{ t('roomTopology.lanes.room', { room: view.roomName || view.roomId || '--' }) }}</strong>
            </div>
            <div class="topology-room-meta">
              <Badge variant="outline" class="h-auto whitespace-normal">{{ t(`roomTopology.modes.${view.mode}`) }}</Badge>
              <Badge variant="outline">{{ t('roomTopology.summary', { worlds: view.worldCount }) }}</Badge>
            </div>
          </div>

          <div class="topology-flow" :class="{ 'is-single-world': !view.secondaries.length }">
            <div class="topology-entry-lane">
              <Card size="sm" class="topology-entry" :class="{ 'is-warning': !view.playerEntry.ready }">
                <CardHeader>
                  <CardTitle class="flex items-center gap-2"><UsersRound class="size-4 shrink-0" aria-hidden="true" />{{ t('roomTopology.nodes.players') }}</CardTitle>
                  <CardDescription>{{ t('roomTopology.nodes.playersDescription') }}</CardDescription>
                </CardHeader>
                <CardContent class="flex flex-col gap-3 group-data-[size=sm]/card:pt-0">
                  <code class="topology-entry-endpoint">{{ view.playerEntry.endpoint || t('roomTopology.entrySources.missing') }}</code>
                  <div class="flex flex-wrap items-center gap-1.5">
                    <Badge v-if="view.playerEntry.endpoint" variant="secondary">UDP</Badge>
                    <Badge :variant="entryVariant" class="h-auto whitespace-normal">{{ t(`roomTopology.entrySources.${entrySource}`) }}</Badge>
                  </div>
                </CardContent>
              </Card>
              <div class="topology-entry-edge" :class="{ 'is-missing': !view.playerEntry.ready || !view.master }" aria-hidden="true"><ArrowRight /></div>
            </div>

            <div class="topology-shards">
              <RoomTopologyWorldNode v-if="view.master" class="topology-master" :node="view.master" :master="true" />
              <div v-else class="topology-missing-master">
                <CircleAlert aria-hidden="true" />
                <span>{{ t('roomTopology.issues.masterMissing') }}</span>
              </div>

              <div v-if="view.secondaries.length" class="topology-branches" :class="{ 'has-multiple': view.secondaries.length > 1 }">
                <article v-for="node in view.secondaries" :key="node.id" class="topology-branch">
                  <div class="topology-shard-edge" :class="{ 'is-missing': node.route.state === 'missing' || !view.master }" aria-hidden="true"><ArrowLeft /></div>
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
import { ArrowLeft, ArrowRight, CircleAlert, RefreshCw, TriangleAlert, UsersRound, Waypoints } from '@lucide/vue'
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

.topology-summary,
.topology-room-heading,
.topology-room-title,
.topology-room-meta,
.topology-timestamps {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
}

.topology-summary {
  justify-content: flex-end;
  flex-wrap: wrap;
}

.topology-content {
  gap: 16px;
  padding: 16px 20px;
  overflow-wrap: anywhere;
}

.topology-map {
  min-width: 0;
}

.topology-room-heading {
  justify-content: space-between;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.topology-room-title strong {
  font-size: 13px;
  font-weight: 500;
  overflow-wrap: anywhere;
}

.topology-room-title > svg {
  width: 16px;
  height: 16px;
  flex: 0 0 auto;
  color: var(--muted-foreground);
}

.topology-room-meta {
  flex-wrap: wrap;
}

.topology-flow {
  --edge-width: 36px;
  display: grid;
  grid-template-columns: minmax(0, 0.8fr) minmax(0, 2fr);
  align-items: center;
  min-width: 0;
}

.topology-entry-lane,
.topology-shards,
.topology-branch {
  display: grid;
  min-width: 0;
  align-items: center;
}

.topology-entry-lane {
  grid-template-columns: minmax(0, 1fr) var(--edge-width);
}

.topology-entry {
  min-width: 0;
}

.topology-entry.is-warning {
  border-color: color-mix(in srgb, var(--warning) 55%, var(--border));
}

.topology-entry-endpoint {
  font-family: var(--font-mono);
  font-size: 13px;
  line-height: 20px;
  overflow-wrap: anywhere;
}

.topology-entry-edge,
.topology-shard-edge {
  position: relative;
  display: grid;
  min-width: 0;
  place-items: center;
  color: var(--muted-foreground);
}

.topology-entry-edge > svg,
.topology-shard-edge > svg {
  position: relative;
  width: 20px;
  height: 20px;
  stroke-width: 1.5;
  background: var(--popover);
}

.topology-entry-edge::before,
.topology-shard-edge::before {
  position: absolute;
  inset-inline: 0;
  top: 50%;
  border-top: 1px solid currentColor;
  opacity: 0.5;
  content: '';
}

.is-missing::before {
  border-top-style: dashed;
}

.is-missing {
  color: var(--destructive);
}

.is-missing > svg {
  stroke-dasharray: 3 3;
}

.topology-shards {
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
}

.is-single-world {
  max-width: 660px;
  margin-inline: auto;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
}

.is-single-world .topology-shards {
  grid-template-columns: minmax(0, 1fr);
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
  grid-auto-rows: 1fr;
}

.topology-branch {
  position: relative;
  grid-template-columns: var(--edge-width) minmax(0, 1fr);
  padding-block: 6px;
}

.topology-secondary {
  height: 100%;
}

/* Each arm meets one shared trunk: additional worlds never link to one another. */
.has-multiple .topology-branch::before {
  position: absolute;
  left: calc(var(--edge-width) / 2);
  inset-block: 0;
  border-left: 1px solid var(--border);
  content: '';
}

.has-multiple .topology-branch:first-child::before {
  top: 50%;
}

.has-multiple .topology-branch:last-child::before {
  bottom: 50%;
}

.has-multiple .topology-shard-edge > svg {
  width: 18px;
  justify-self: end;
}

.has-multiple .topology-shard-edge::before {
  left: 50%;
}

.has-multiple {
  position: relative;
}

.has-multiple::before {
  position: absolute;
  top: 50%;
  left: 0;
  width: calc(var(--edge-width) / 2);
  border-top: 1px solid var(--border);
  content: '';
}

.topology-timestamps {
  justify-content: flex-end;
  flex-wrap: wrap;
  column-gap: 16px;
  color: var(--muted-foreground);
  font-size: 11px;
  line-height: 16px;
}

@media (max-width: 899px) {
  .topology-flow,
  .topology-shards,
  .topology-entry-lane {
    grid-template-columns: minmax(0, 1fr);
  }

  .topology-flow {
    max-width: 560px;
    margin-inline: auto;
  }

  .topology-entry-edge {
    height: 32px;
  }

  .topology-entry-edge > svg {
    transform: rotate(90deg);
  }

  .topology-entry-edge::before {
    inset-block: 0;
    inset-inline: auto;
    left: 50%;
    border-top: 0;
    border-left: 1px solid currentColor;
  }

  .topology-entry-edge.is-missing::before {
    border-left-style: dashed;
  }

  .topology-branches {
    margin-left: 16px;
    padding-top: 12px;
    grid-auto-rows: auto;
    gap: 12px;
  }

  .topology-branch {
    padding-block: 0;
  }

  .topology-branch::before,
  .has-multiple .topology-branch::before,
  .has-multiple .topology-branch:first-child::before {
    position: absolute;
    display: block;
    left: 0;
    top: -12px;
    bottom: 0;
    border-left: 1px solid var(--border);
    content: '';
  }

  .topology-branch:last-child::before,
  .has-multiple .topology-branch:last-child::before {
    bottom: calc(100% - 34px);
  }

  .has-multiple::before {
    display: none;
  }

  .has-multiple .topology-shard-edge::before {
    left: 0;
  }

  .has-multiple .topology-shard-edge > svg {
    width: 20px;
    justify-self: center;
  }

  .topology-shard-edge {
    align-self: start;
    margin-top: 24px;
  }

  .topology-timestamps {
    justify-content: flex-start;
  }
}

@media (max-width: 479px) {
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

  .topology-flow {
    --edge-width: 20px;
  }
}
</style>
