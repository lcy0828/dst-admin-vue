<template>
  <Dialog v-model:open="open">
    <DialogTrigger as-child>
      <UiButton type="button" size="sm" variant="ghost">
        <Waypoints data-icon="inline-start" />
        {{ t('roomTopology.trigger') }}
      </UiButton>
    </DialogTrigger>

    <DialogScrollContent class="topology-dialog max-w-4xl gap-0 p-0">
      <DialogHeader class="topology-header">
        <div class="topology-heading">
          <DialogTitle>{{ t('roomTopology.title') }}</DialogTitle>
          <DialogDescription>{{ t('roomTopology.description') }}</DialogDescription>
        </div>
        <div class="topology-summary" role="status" aria-live="polite">
          <Badge v-if="!refreshing && view.runtimeRisks.length" variant="warning">
            {{ t('roomTopology.issues.riskTitle', { count: view.runtimeRisks.length }) }}
          </Badge>
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
          <div class="topology-entry-grid">
            <article class="topology-node topology-entry" :class="{ 'is-warning': !view.playerEntry.ready }">
              <span class="topology-node-icon"><UsersRound /></span>
              <div class="topology-node-copy">
                <div class="topology-node-heading">
                  <div class="topology-world-title">
                    <strong>{{ t('roomTopology.nodes.players') }}</strong>
                    <span>{{ t('roomTopology.nodes.playersDescription') }}</span>
                  </div>
                  <Badge :variant="entryVariant">{{ t(`roomTopology.entrySources.${entrySource}`) }}</Badge>
                </div>
                <div class="topology-entry-endpoint">
                  <Cable />
                  <code>{{ view.playerEntry.endpoint || t('roomTopology.routes.unavailable') }}</code>
                </div>
              </div>
            </article>
          </div>

          <div class="topology-access-grid" aria-hidden="true">
            <div class="topology-access-edge">
              <span class="topology-access-line" />
              <span class="topology-access-label">
                <Badge variant="outline">{{ t('roomTopology.fields.protocol') }}</Badge>
                <ArrowDown />
              </span>
            </div>
          </div>

          <div class="topology-room">
            <div class="topology-room-heading">
              <div class="topology-room-title">
                <Waypoints />
                <strong>{{ t('roomTopology.lanes.room', { room: view.roomName || view.roomId || '--' }) }}</strong>
              </div>
              <div class="topology-room-meta">
                <Badge variant="outline">{{ t(`roomTopology.modes.${view.mode}`) }}</Badge>
                <Badge variant="outline">{{ t('roomTopology.summary', { worlds: view.worldCount }) }}</Badge>
              </div>
            </div>

            <div v-if="view.master" class="topology-shards">
              <article class="topology-node topology-master" :class="nodeToneClass(view.master)">
                <span class="topology-node-icon"><Server /></span>
                <div class="topology-node-copy">
                  <div class="topology-node-heading">
                    <div class="topology-world-title">
                      <strong>{{ view.master.name }}</strong>
                      <span>{{ t('roomTopology.nodes.master') }}</span>
                    </div>
                    <Badge :variant="runtimeVariant(view.master.runtimeState)">
                      {{ runtimeLabel(view.master.runtimeState) }}
                    </Badge>
                  </div>
                  <RoomTopologyNodeFacts :node="view.master" :master="true" />
                </div>
              </article>

              <div
                v-if="view.secondaries.length"
                class="topology-branches"
                :style="{ '--branch-count': Math.max(view.secondaries.length, 1) }"
              >
                <article v-for="node in view.secondaries" :key="node.id" class="topology-branch">
                  <div class="topology-route" :class="{ 'is-missing': node.route.state === 'missing' }">
                    <span class="topology-route-line" aria-hidden="true" />
                    <div class="topology-route-label">
                      <div class="topology-route-title">
                        <ArrowLeft />
                        <Badge :variant="node.route.state === 'missing' ? 'destructive' : 'outline'">
                          {{ routeModeLabel(node.route.mode) }}
                        </Badge>
                        <span>{{ t('roomTopology.routes.toMaster') }}</span>
                      </div>
                      <Tooltip>
                        <TooltipTrigger as-child>
                          <code tabindex="0">{{ routeDestination(node.route) }}</code>
                        </TooltipTrigger>
                        <TooltipContent>{{ routeDestination(node.route) }}</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>

                  <div class="topology-node topology-secondary" :class="nodeToneClass(node)">
                    <span class="topology-node-icon"><Boxes /></span>
                    <div class="topology-node-copy">
                      <div class="topology-node-heading">
                        <div class="topology-world-title">
                          <strong>{{ node.name }}</strong>
                          <span>{{ t('roomTopology.nodes.secondary') }}</span>
                        </div>
                        <Badge :variant="runtimeVariant(node.runtimeState)">
                          {{ runtimeLabel(node.runtimeState) }}
                        </Badge>
                      </div>
                      <RoomTopologyNodeFacts :node="node" />
                    </div>
                  </div>
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
import { ArrowDown, ArrowLeft, Boxes, Cable, CircleAlert, RefreshCw, Server, TriangleAlert, UsersRound, Waypoints } from '@lucide/vue'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button as UiButton } from '@/components/ui/button'
import { Dialog, DialogDescription, DialogHeader, DialogScrollContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Spinner } from '@/components/ui/spinner'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { formatSystemDateTime } from '@/lib/dateTime.mjs'
import { buildRoomTopologyView } from '@/lib/roomTopologyPresentation.mjs'
import RoomTopologyNodeFacts from './RoomTopologyNodeFacts.vue'

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

function safeRuntimeState(state) {
  return ['running', 'stopped', 'starting', 'failed'].includes(state) ? state : 'unknown'
}

function runtimeLabel(state) {
  return t(`roomTopology.runtime.${safeRuntimeState(state)}`)
}

function runtimeVariant(state) {
  if (state === 'running') return 'success'
  if (state === 'failed') return 'destructive'
  if (state === 'starting') return 'warning'
  return 'outline'
}

function nodeToneClass(node) {
  return {
    'is-error': node.placementTone === 'error' || !node.targetOnline,
    'is-warning': node.placementTone === 'warning' || node.installationStale || !node.installationAvailable
  }
}

function routeModeLabel(mode) {
  const value = ['local', 'lan', 'overlay', 'tunnel', 'public', 'configured', 'manual', 'missing'].includes(mode) ? mode : 'manual'
  return t(`roomTopology.routes.${value}`)
}

function routeDestination(route) {
  if (route.mode === 'local') return route.endpoint
    ? `${t('roomTopology.routes.localDestination')} · ${route.endpoint}`
    : t('roomTopology.routes.localDestination')
  if (!route.endpoint) return t('roomTopology.routes.unavailable')
  return route.endpoint
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
  overflow-x: hidden;
}

.topology-header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: start;
  gap: 16px;
  padding: 16px 52px 13px 18px;
  border-bottom: 1px solid var(--border);
}

.topology-heading,
.topology-content,
.topology-map,
.topology-node-copy,
.topology-world-title,
.topology-branches,
.topology-issue-list {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.topology-heading {
  gap: 3px;
}

.topology-summary,
.topology-room-heading,
.topology-room-title,
.topology-room-meta,
.topology-node-heading,
.topology-entry-endpoint,
.topology-access-label,
.topology-route-title,
.topology-timestamps {
  display: flex;
  min-width: 0;
  align-items: center;
}

.topology-summary {
  justify-content: flex-end;
  gap: 6px;
  flex-wrap: wrap;
}

.topology-content {
  gap: 12px;
  padding: 14px 18px 13px;
}

.topology-map {
  gap: 0;
}

.topology-entry-grid,
.topology-access-grid,
.topology-shards {
  display: grid;
  min-width: 0;
  grid-template-columns: minmax(250px, 0.9fr) minmax(0, 1.35fr);
}

.topology-entry-grid,
.topology-access-grid {
  padding-inline: 12px;
}

.topology-node {
  position: relative;
  display: grid;
  min-width: 0;
  grid-template-columns: 34px minmax(0, 1fr);
  gap: 10px;
  padding: 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--background);
}

.topology-node.is-warning {
  border-color: color-mix(in srgb, var(--warning) 45%, var(--border));
}

.topology-node.is-error {
  border-color: color-mix(in srgb, var(--destructive) 45%, var(--border));
}

.topology-node-icon {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  color: var(--muted-foreground);
  border-radius: var(--radius-sm);
  background: var(--muted);
}

.topology-node-icon :deep(svg) {
  width: 17px;
  height: 17px;
}

.topology-node-copy,
.topology-world-title {
  gap: 2px;
}

.topology-node-heading {
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.topology-node-heading strong {
  min-width: 0;
  overflow: hidden;
  font-size: 13px;
  line-height: 18px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.topology-world-title > span {
  color: var(--muted-foreground);
  font-size: 10px;
  line-height: 14px;
}

.topology-entry-endpoint {
  gap: 5px;
  margin-top: 5px;
  color: var(--muted-foreground);
}

.topology-entry-endpoint svg {
  width: 14px;
  height: 14px;
  flex: 0 0 auto;
}

.topology-entry-endpoint code,
.topology-route code {
  min-width: 0;
  overflow: hidden;
  font-family: var(--font-mono);
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.topology-access-edge {
  position: relative;
  display: grid;
  min-height: 42px;
  place-items: center;
}

.topology-access-line {
  position: absolute;
  inset-block: 0;
  left: 50%;
  border-left: 1px solid var(--border);
}

.topology-access-label {
  position: relative;
  gap: 3px;
  padding: 2px;
  background: var(--popover);
}

.topology-access-label > svg {
  width: 14px;
  height: 14px;
  color: var(--muted-foreground);
}

.topology-room {
  min-width: 0;
  padding: 10px 12px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: color-mix(in srgb, var(--muted) 32%, var(--background));
}

.topology-room-heading {
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
}

.topology-room-title,
.topology-room-meta {
  gap: 6px;
}

.topology-room-title > svg {
  width: 15px;
  height: 15px;
  color: var(--muted-foreground);
}

.topology-room-title strong {
  min-width: 0;
  overflow: hidden;
  font-size: 11px;
  line-height: 16px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.topology-master {
  align-self: center;
}

.topology-branches {
  --branch-count: 1;
  position: relative;
  display: grid;
  grid-template-rows: repeat(var(--branch-count), minmax(0, 1fr));
  gap: 10px;
}

.topology-branches::before {
  position: absolute;
  top: calc(50% / var(--branch-count));
  bottom: calc(50% / var(--branch-count));
  left: 0;
  border-left: 1px solid var(--border);
  content: '';
}

.topology-branch {
  display: grid;
  min-width: 0;
  grid-template-columns: minmax(130px, 0.58fr) minmax(230px, 1fr);
}

.topology-route {
  position: relative;
  display: grid;
  min-width: 0;
  min-height: 100%;
  place-items: center;
}

.topology-route-line {
  position: absolute;
  inset-inline: 0;
  top: 50%;
  border-top: 1px solid var(--border);
}

.topology-route-label {
  position: relative;
  display: flex;
  max-width: calc(100% - 12px);
  min-width: 0;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 5px 7px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--popover);
}

.topology-route.is-missing .topology-route-label {
  border-color: color-mix(in srgb, var(--destructive) 45%, var(--border));
}

.topology-route-title {
  justify-content: center;
  gap: 4px;
}

.topology-route-title > svg {
  width: 14px;
  height: 14px;
  flex: 0 0 auto;
  color: var(--muted-foreground);
}

.topology-route-title > span {
  min-width: 0;
  overflow: hidden;
  color: var(--muted-foreground);
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.topology-issue-list {
  gap: 2px;
}

.topology-timestamps {
  justify-content: flex-end;
  gap: 12px;
  flex-wrap: wrap;
  color: var(--muted-foreground);
  font-size: 10px;
  line-height: 14px;
}

@media (max-width: 767px) {
  .topology-header {
    grid-template-columns: minmax(0, 1fr);
    padding-right: 48px;
  }

  .topology-summary {
    justify-content: flex-start;
  }

  .topology-content {
    padding-inline: 12px;
  }

  .topology-entry-grid,
  .topology-access-grid,
  .topology-shards,
  .topology-branch {
    grid-template-columns: minmax(0, 1fr);
  }

  .topology-branches {
    display: flex;
  }

  .topology-branches::before {
    display: none;
  }

  .topology-room-heading {
    align-items: flex-start;
    flex-direction: column;
  }

  .topology-route {
    min-height: 58px;
  }

  .topology-route-line {
    inset-block: 0;
    inset-inline: auto;
    left: 50%;
    border-top: 0;
    border-left: 1px solid var(--border);
  }

  .topology-route-title > svg {
    transform: rotate(90deg);
  }

  .topology-timestamps {
    justify-content: flex-start;
  }
}
</style>
