<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Check, ChevronDown, ChevronUp, CircleAlert, Download, Minus, RotateCw, WifiOff, X } from '@lucide/vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Progress } from '@/components/ui/progress'
import { Spinner } from '@/components/ui/spinner'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { globalJobKindLabel } from '@/i18n/globalJobMessages'
import { taskProgressMessages } from '@/i18n/taskProgressMessages'
import { formatJobBytes, formatJobRate, globalJobFailure, globalJobWarning } from '@/lib/globalJobs.mjs'
import { jobElapsedSeconds, modDownloadGroups, modDownloadSummary, taskProgress, readableTaskText, worldRestartProgress } from '@/lib/taskProgress.mjs'
import ModDownloadProgressList from './ModDownloadProgressList.vue'
import WorldRestartProgressList from './WorldRestartProgressList.vue'

const props = defineProps({
  job: { type: Object, required: true },
  roomName: { type: String, default: '' },
  targetNames: { type: Array, default: () => [] },
  connected: { type: Boolean, default: true },
  otherCount: { type: Number, default: 0 },
  displayName: { type: String, default: '' },
  taskOptions: { type: Array, default: () => [] },
  modMetadata: { type: Object, default: () => ({}) },
  targetLabels: { type: Object, default: () => ({}) }
})
defineEmits(['tasks', 'select', 'close'])
const { t: globalT } = useI18n({ useScope: 'global' })
const { t } = useI18n({ useScope: 'local', messages: taskProgressMessages })
const expanded = defineModel('expanded', { type: Boolean, default: false })
const minimized = defineModel('minimized', { type: Boolean, default: false })
const bubbleButton = ref(null)
const panel = ref(null)
const now = ref(Date.now())
const showDownloads = ref(false)
const model = computed(() => taskProgress(props.job))
const worlds = computed(() => worldRestartProgress(props.job))
const worldPhase = computed(() => model.value.lifecycle || model.value.restart && model.value.phase === 'restarting')
const warning = computed(() => globalJobWarning(props.job).message)
const failure = computed(() => globalJobFailure(props.job).message)
const succeeded = computed(() => model.value.status === 'succeeded' && !warning.value)
const tone = computed(() => model.value.status === 'failed' ? 'destructive'
  : warning.value || ['waiting', 'unconfirmed'].includes(model.value.status) ? 'warning'
    : model.value.status === 'succeeded' ? 'success'
      : model.value.status === 'canceled' ? 'outline' : 'info')
const elapsed = computed(() => {
  const seconds = jobElapsedSeconds(props.job, now.value)
  const minutes = Math.floor(seconds / 60)
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`
})
const detail = computed(() => model.value.status === 'failed' ? failure.value : warning.value || props.job.message)
const groups = computed(() => modDownloadGroups(props.job, props.modMetadata))
const downloads = computed(() => modDownloadSummary(props.job, groups.value))
const completedLabel = computed(() => t('taskProgress.completedCount', { completed: downloads.value.counts.succeeded, total: downloads.value.total }))
const failedCount = computed(() => downloads.value.counts.failed)
const downloadStates = computed(() => ['downloading', 'queued', 'notStarted', 'unconfirmed'].filter(status => downloads.value.counts[status]))
const summary = computed(() => {
  if (model.value.status === 'failed') return t(failedCount.value ? 'taskProgress.downloadFailure' : 'taskProgress.failureSummary')
  if (warning.value) return t('taskProgress.failureSummary')
  return t(`taskProgress.${model.value.status}`)
})
const transfer = computed(() => {
  const value = model.value.transfer
  if (!value) return ''
  const bytes = value.totalBytes ? `${formatJobBytes(value.currentBytes) || '0 B'} / ${formatJobBytes(value.totalBytes)}`
    : t('taskProgress.downloadBytes', { value: formatJobBytes(value.currentBytes) || '0 B' })
  return [formatJobRate(value.bytesPerSecond), bytes].filter(Boolean).join(' · ')
})
const title = computed(() => model.value.lifecycle && props.job.worldId ? t(model.value.restart ? 'taskProgress.restarting' : 'taskProgress.starting') : globalJobKindLabel(props.job.kind, globalT))
const resultTitle = computed(() => worlds.value.total
  ? t(model.value.restart ? 'taskProgress.worlds.restarted' : 'taskProgress.worlds.started', { count: worlds.value.ready })
  : downloads.value.recorded ? t('taskProgress.modsCompleted', { count: downloads.value.counts.succeeded }) : t('taskProgress.succeeded'))
const scope = computed(() => readableTaskText(props.displayName, props.targetLabels) || [props.job.roomId && props.roomName ? t('taskProgress.room', { name: props.roomName }) : '', ...props.targetNames].filter(Boolean).join(' · ') || title.value)
const batchRing = computed(() => downloads.value.recorded && downloads.value.total > 1 && model.value.active && model.value.phase === 'downloading')
const hasOtherFailures = computed(() => props.taskOptions.some(task => task.id !== props.job.id && task.status === 'failed'))
const reconnecting = computed(() => !props.connected && model.value.active)
const bubbleStatus = computed(() => reconnecting.value ? 'reconnecting' : warning.value ? 'warning' : model.value.status)
const bubbleLabel = computed(() => [
  scope.value,
  worldPhase.value && worlds.value.total ? t('taskProgress.worlds.readyCount', { ready: worlds.value.ready, total: worlds.value.total }) : groups.value.length ? completedLabel.value : '',
  props.taskOptions.length > 1 ? t('taskProgress.taskCount', { count: props.taskOptions.length }) : '',
  t(`taskProgress.bubble.${bubbleStatus.value}`),
  !batchRing.value && model.value.active && model.value.percent !== null ? t(worldPhase.value ? 'taskProgress.worlds.overall' : 'taskProgress.downloadPercent', { value: model.value.percent }) : '',
  t('taskProgress.restore')
].filter(Boolean).join(' · '))
const ringIndeterminate = computed(() => model.value.active && !batchRing.value && model.value.percent === null)
const ringPercent = computed(() => batchRing.value ? downloads.value.percent : model.value.percent ?? (model.value.active ? 0 : 100))

async function minimizeProgress() {
  minimized.value = true
  await nextTick()
  bubbleButton.value?.$el?.focus({ preventScroll: true })
}

async function restoreProgress() {
  // Reopening a result is an explicit request to read it; keep it open.
  expanded.value = true
  minimized.value = false
  await nextTick()
  panel.value?.focus({ preventScroll: true })
}

watch(() => [props.job.id, model.value.active], (_, __, onCleanup) => {
  now.value = Date.now()
  if (!model.value.active) return
  const timer = setInterval(() => { now.value = Date.now() }, 1000)
  onCleanup(() => clearInterval(timer))
}, { immediate: true })
watch(() => props.job.id, () => { showDownloads.value = false })
</script>

<template>
  <div v-if="minimized" class="task-progress-bubble" :data-status="bubbleStatus">
    <Button
      ref="bubbleButton"
      type="button"
      variant="outline"
      size="icon-lg"
      class="relative size-16 rounded-full shadow-lg"
      :aria-label="bubbleLabel"
      :title="bubbleLabel"
      :aria-expanded="false"
      @click="restoreProgress"
    >
      <svg class="task-progress-ring size-full" viewBox="0 0 64 64" aria-hidden="true">
        <circle class="task-progress-ring-track" cx="32" cy="32" r="27" fill="none" stroke-width="3" />
        <circle
          class="task-progress-ring-value"
          :class="{ 'task-progress-ring-indeterminate': ringIndeterminate }"
          :data-paused="reconnecting || undefined"
          cx="32" cy="32" r="27" fill="none" stroke-width="3" stroke-linecap="round" pathLength="100"
          :stroke-dasharray="ringIndeterminate ? '24 76' : '100'"
          :stroke-dashoffset="ringIndeterminate ? 0 : 100 - ringPercent"
        />
      </svg>
      <span class="task-progress-bubble-content" aria-hidden="true">
        <WifiOff v-if="reconnecting" />
        <CircleAlert v-else-if="['failed', 'unconfirmed'].includes(model.status) || warning" />
        <Check v-else-if="model.status === 'succeeded'" />
        <Minus v-else-if="model.status === 'canceled'" />
        <span v-else-if="batchRing" class="task-progress-bubble-count">{{ downloads.counts.succeeded }}<small>/{{ downloads.total }}</small></span>
        <span v-else-if="model.percent !== null" class="task-progress-bubble-percent">{{ model.percent }}<small>%</small></span>
        <RotateCw v-else />
        <span class="task-progress-bubble-caption">{{ t(batchRing && !reconnecting && !warning ? 'taskProgress.downloaded' : `taskProgress.bubble.${bubbleStatus}`) }}</span>
      </span>
      <Badge v-if="taskOptions.length > 1" :variant="hasOtherFailures ? 'destructive' : 'secondary'" class="absolute -right-1 -top-1" :aria-label="t('taskProgress.taskCount', { count: taskOptions.length })">{{ taskOptions.length }}</Badge>
    </Button>
  </div>
  <section v-else ref="panel" class="task-progress-dock" tabindex="-1" :aria-label="t('taskProgress.progressLabel')" :data-status="model.status">
    <Card size="sm" class="shadow-lg">
    <Collapsible v-model:open="expanded" class="task-progress-inner">
      <div v-if="taskOptions.length > 1" class="flex min-w-0 items-center gap-3 px-4 pt-3">
        <span class="shrink-0 text-xs text-muted-foreground">{{ t('taskProgress.taskCount', { count: taskOptions.length }) }}</span>
        <Select :model-value="job.id" @update:model-value="$emit('select', $event)">
          <SelectTrigger class="min-w-0 flex-1 sm:max-w-xl" :aria-label="t('taskProgress.switchTask')"><SelectValue>{{ taskOptions.find(task => task.id === job.id)?.label }}</SelectValue></SelectTrigger>
          <SelectContent><SelectGroup>
            <SelectItem v-for="task in taskOptions" :key="task.id" :value="task.id">{{ task.label }} · {{ t(`taskProgress.${task.status}`) }}</SelectItem>
          </SelectGroup></SelectContent>
        </Select>
      </div>
      <CardHeader class="shrink-0">
        <CardTitle class="flex min-w-0 flex-wrap items-center gap-2">
          <span class="task-progress-icon" aria-hidden="true">
            <Check v-if="succeeded" class="size-4" />
            <CircleAlert v-else-if="['failed', 'unconfirmed'].includes(model.status) || warning" class="size-4" />
            <Download v-else-if="model.phase === 'downloading'" class="size-4" />
            <RotateCw v-else class="size-4" />
          </span>
          <span>{{ succeeded ? resultTitle : title }}</span>
          <Badge v-if="!succeeded" :variant="tone">{{ t(`taskProgress.${model.status}`) }}</Badge>
        </CardTitle>
        <CardDescription class="min-w-0 truncate" :title="scope">{{ scope }}</CardDescription>
        <CardAction class="flex items-center gap-1">
          <Button variant="ghost" size="icon-sm" :aria-label="t('taskProgress.minimize')" :title="t('taskProgress.minimize')" @click="minimizeProgress">
            <Minus />
          </Button>
          <Button v-if="!model.active" variant="ghost" size="icon-sm" :aria-label="t('taskProgress.close')" :title="t('taskProgress.close')" @click="$emit('close')"><X /></Button>
        </CardAction>
      </CardHeader>

      <CardContent v-if="!succeeded || expanded" class="task-progress-content group-data-[size=sm]/card:pt-0">
      <div class="task-progress-body">
        <template v-if="worldPhase">
          <WorldRestartProgressList v-if="worlds.total" :progress="worlds" :connected="connected" :target-labels="targetLabels" />
          <template v-else>
            <p class="task-progress-message" role="status">{{ readableTaskText(detail, targetLabels) || t('taskProgress.restartHint') }}</p>
            <Progress v-if="model.active" :model-value="connected ? null : 0" :aria-label="t('taskProgress.worlds.title')" class="h-2" />
            <p v-if="!model.active" class="task-progress-caption">{{ t('taskProgress.worlds.legacyHint') }}</p>
          </template>
          <Collapsible v-if="groups.length" v-model:open="showDownloads" class="task-progress-download-records">
            <CollapsibleTrigger as-child>
              <Button variant="ghost" size="sm" class="w-full justify-between">
                <span class="flex items-center gap-2"><Check class="size-3.5 text-success-foreground" />{{ completedLabel }} · {{ t('taskProgress.worlds.downloadRecords') }}</span>
                <ChevronUp v-if="showDownloads" /><ChevronDown v-else />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent><ModDownloadProgressList :key="job.id" :groups="groups" :target-labels="targetLabels" :connected="connected" /></CollapsibleContent>
          </Collapsible>
        </template>
        <template v-else-if="groups.length">
          <div class="task-progress-description">
            <div class="task-progress-counts" role="status">
              <p class="task-progress-completed">{{ completedLabel }}</p>
              <p v-if="downloadStates.length" class="task-progress-caption">{{ downloadStates.map(status => t(`taskProgress.counts.${!connected && status === 'downloading' ? 'disconnected' : status}`, { count: downloads.counts[status] })).join(' · ') }}</p>
            </div>
            <Badge v-if="failedCount" variant="destructive">{{ t('taskProgress.failedCount', { count: failedCount }) }}</Badge>
          </div>
          <ModDownloadProgressList :key="job.id" :groups="groups" :target-labels="targetLabels" :connected="connected" />
          <p v-if="model.status === 'failed' || warning" class="task-progress-caption" role="status">{{ summary }}</p>
        </template>
        <div v-else class="task-progress-description">
          <p class="task-progress-message" role="status" :title="summary">
            <Spinner v-if="model.active" class="size-3.5 shrink-0" />
            <span class="truncate">{{ summary }}</span>
          </p>
          <span v-if="model.percent !== null && model.active" class="task-progress-percent">{{ t('taskProgress.downloadPercent', { value: model.percent }) }}</span>
        </div>
        <Progress
          v-if="!worldPhase && !groups.length && model.active"
          :model-value="!connected && model.active ? (model.percent ?? 0) : model.percent"
          :aria-label="t('taskProgress.progressLabel')"
          class="h-1.5"
        />
        <div class="task-progress-caption">
          <span v-if="!connected && model.active" role="status">{{ t('taskProgress.reconnecting') }}</span>
          <span v-else-if="transfer && !groups.length" class="tabular-nums">{{ transfer }}</span>
          <span v-else-if="model.active && !worldPhase">{{ t(!model.restart ? 'taskProgress.applyHint' : 'taskProgress.downloadDone') }}</span>
        </div>
      </div>

      <CollapsibleContent>
        <div class="task-progress-details">
          <ol v-if="model.active && model.stages.length > 1" class="task-progress-stages" :aria-label="t('taskProgress.stagesLabel')">
            <li v-for="(stage, index) in model.stages" :key="stage" :data-current="index === model.step || undefined" :aria-current="index === model.step ? 'step' : undefined">
              <Check v-if="index < model.step" class="size-3.5" aria-hidden="true" />
              <span v-else class="task-progress-step-number">{{ index + 1 }}</span>
              {{ t(`taskProgress.${stage}`) }}
            </li>
          </ol>
          <p v-if="detail" class="task-progress-detail-text">{{ detail }}</p>
          <p v-if="!model.lifecycle && !downloads.recorded && !model.active" class="task-progress-task-id">{{ t('taskProgress.oldTask') }}</p>
          <p v-for="group in groups" :key="group.id" class="task-progress-task-id">{{ group.name }} · Workshop {{ group.id }}<template v-for="item in group.downloads" :key="item.key"><br />{{ item.targetId }}/{{ item.installationId }}<template v-if="item.message"> · {{ item.message }}</template></template></p>
          <p class="task-progress-task-id">{{ t('taskProgress.taskId') }} · {{ job.id }}</p>
        </div>
      </CollapsibleContent>
      </CardContent>
      <CardFooter class="shrink-0 justify-between gap-2">
        <span class="task-progress-elapsed">{{ t(model.active ? 'taskProgress.elapsed' : 'taskProgress.duration', { time: elapsed }) }}</span>
        <div class="flex items-center gap-1">
          <Button v-if="otherCount" variant="ghost" size="sm" @click="$emit('tasks')">{{ t('taskProgress.more', { count: otherCount }) }}</Button>
          <CollapsibleTrigger as-child>
            <Button variant="ghost" size="sm">
              {{ t(expanded ? 'taskProgress.collapse' : 'taskProgress.details') }}
              <ChevronDown v-if="expanded" data-icon="inline-end" /><ChevronUp v-else data-icon="inline-end" />
            </Button>
          </CollapsibleTrigger>
        </div>
      </CardFooter>
    </Collapsible>
    </Card>
  </section>
</template>

<style scoped>
.task-progress-bubble {
  --task-ring-color: var(--primary);
  position: fixed;
  right: max(24px, env(safe-area-inset-right));
  bottom: max(24px, env(safe-area-inset-bottom));
  z-index: 20;
}
.task-progress-bubble[data-status='succeeded'] { --task-ring-color: var(--success-foreground); }
.task-progress-bubble[data-status='failed'] { --task-ring-color: var(--destructive); }
.task-progress-bubble[data-status='warning'],
.task-progress-bubble[data-status='unconfirmed'],
.task-progress-bubble[data-status='reconnecting'] { --task-ring-color: var(--warning-foreground); }
.task-progress-bubble[data-status='canceled'] { --task-ring-color: var(--muted-foreground); }
.task-progress-ring { position: absolute; inset: 0; pointer-events: none; }
.task-progress-ring-track { stroke: var(--muted); }
.task-progress-ring-value { stroke: var(--task-ring-color); transform: rotate(-90deg); transform-origin: center; transition: stroke-dashoffset 180ms ease; }
.task-progress-ring-indeterminate { animation: task-ring-spin 1.6s linear infinite; }
.task-progress-ring-indeterminate[data-paused] { animation-play-state: paused; }
.task-progress-bubble-content { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; color: var(--task-ring-color); }
.task-progress-bubble-percent { font-size: 15px; line-height: 18px; font-weight: 650; font-variant-numeric: tabular-nums; }
.task-progress-bubble-percent small { font-size: 10px; margin-left: 1px; }
.task-progress-bubble-count { font-size: 20px; line-height: 22px; font-weight: 650; font-variant-numeric: tabular-nums; }
.task-progress-bubble-count small { font-size: 13px; margin-left: 2px; font-weight: 500; }
.task-progress-bubble-caption { font-size: 10px; line-height: 12px; }
@keyframes task-ring-spin { from { transform: rotate(-90deg); } to { transform: rotate(270deg); } }
@media (prefers-reduced-motion: reduce) { .task-progress-ring-indeterminate { animation: none; } }
.task-progress-dock { position: fixed; right: max(24px, env(safe-area-inset-right)); bottom: max(24px, env(safe-area-inset-bottom)); width: 420px; max-width: calc(100vw - 48px); z-index: 20; }
.task-progress-dock:focus-visible { outline: 2px solid var(--ring); outline-offset: 3px; border-radius: var(--radius); }
.task-progress-inner { display: flex; flex-direction: column; max-height: min(76svh, 720px); }
.task-progress-content { min-height: 0; overflow-y: auto; overscroll-behavior: contain; }
.task-progress-description, .task-progress-message { display: flex; align-items: center; min-width: 0; }
.task-progress-description { justify-content: space-between; gap: 12px; }
.task-progress-icon { display: grid; place-items: center; flex-shrink: 0; color: var(--primary); }
.task-progress-elapsed { font-size: 12px; font-variant-numeric: tabular-nums; color: var(--muted-foreground); white-space: nowrap; }
.task-progress-body { display: flex; flex-direction: column; gap: 10px; }
.task-progress-download-records { border-top: 1px solid var(--border); padding-top: 6px; }
.task-progress-completed { font-size: 16px; line-height: 1.5; font-weight: 600; font-variant-numeric: tabular-nums; }
.task-progress-counts { display: flex; flex-wrap: wrap; align-items: baseline; gap: 2px 12px; }
.task-progress-message { gap: 7px; font-size: 12px; }
.task-progress-percent { font-size: 12px; font-variant-numeric: tabular-nums; flex-shrink: 0; }
.task-progress-caption { font-size: 11px; line-height: 16px; color: var(--muted-foreground); }
.task-progress-details { display: flex; flex-direction: column; gap: 12px; padding-top: 16px; margin-top: 12px; border-top: 1px solid var(--border); }
.task-progress-stages { display: flex; flex-wrap: wrap; gap: 12px 24px; font-size: 12px; color: var(--muted-foreground); }
.task-progress-stages li { display: flex; align-items: center; gap: 7px; }
.task-progress-stages li[data-current] { color: var(--foreground); font-weight: 600; }
.task-progress-step-number { display: grid; place-items: center; width: 19px; height: 19px; border: 1px solid var(--border); border-radius: 50%; font-size: 10px; }
.task-progress-detail-text { font-size: 12px; line-height: 1.7; white-space: pre-wrap; overflow-wrap: anywhere; }
.task-progress-task-id { font-size: 11px; color: var(--muted-foreground); overflow-wrap: anywhere; }
[data-status='failed'] .task-progress-icon { color: var(--destructive); }
[data-status='succeeded'] .task-progress-icon { color: var(--success-foreground); }
@media (max-width: 767px) {
  .task-progress-bubble { right: max(16px, env(safe-area-inset-right)); bottom: max(16px, env(safe-area-inset-bottom)); }
  .task-progress-dock { right: max(16px, env(safe-area-inset-right)); bottom: max(16px, env(safe-area-inset-bottom)); max-width: calc(100vw - 32px); }
}
</style>
