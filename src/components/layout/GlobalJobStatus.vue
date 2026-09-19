<script setup>
import { computed, watch } from 'vue'
import { CircleAlert, ListTodo, TriangleAlert, X } from '@lucide/vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Empty, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger
} from '@/components/ui/popover'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useGlobalJobStatus } from '@/composables/useGlobalJobStatus'
import { isTaskProgressJob } from '@/lib/taskProgress.mjs'
import { globalJobKindLabel } from '@/i18n/globalJobMessages.js'
import {
  formatJobBytes,
  formatJobRate,
  globalJobFailure,
  globalJobFailureToastId,
  globalJobTransfer,
  globalJobWarning,
  globalJobWarningToastId
} from '@/lib/globalJobs.mjs'

const { t } = useI18n()
const {
  activeJobs,
  recentProgressJobs,
  roomLabels,
  focusedJobId,
  showJobProgress,
  taskListOpen: popoverOpen,
  activeCount,
  clearFailures,
  clearWarnings,
  connected,
  dismissFailure,
  dismissWarning,
  failureCount,
  loadError,
  recentFailures,
  recentWarnings,
  visible,
  warningCount
} = useGlobalJobStatus()

const displayedActiveJobs = computed(() => activeJobs.value.slice(0, 5))
const displayedFailures = computed(() => recentFailures.value.slice(0, 3))
const displayedWarnings = computed(() => recentWarnings.value.slice(0, 3))
const hiddenActiveCount = computed(() => Math.max(0, activeCount.value - displayedActiveJobs.value.length))
const latestFailure = computed(() => recentFailures.value[0] || null)
const latestWarning = computed(() => recentWarnings.value[0] || null)
const completedProgressJobs = computed(() => recentProgressJobs.value.filter(job => job.status !== 'failed').slice(0, 3))
const notifiedFailureIds = new Set()
const notifiedWarningIds = new Set()

const triggerLabel = computed(() => {
  if (!visible.value) return t('globalJobs.title')
  if (loadError.value && !activeCount.value && !failureCount.value && !warningCount.value) return t('globalJobs.trigger.unavailable')
  if (activeCount.value && failureCount.value) {
    return t('globalJobs.trigger.summary', { active: activeCount.value, failed: failureCount.value })
  }
  if (latestFailure.value) {
    return t('globalJobs.trigger.latestFailure', { task: taskName(latestFailure.value) })
  }
  if (activeCount.value && warningCount.value) {
    return t('globalJobs.trigger.summaryWarning', { active: activeCount.value, warnings: warningCount.value })
  }
  if (latestWarning.value) {
    return t('globalJobs.trigger.latestWarning', { task: taskName(latestWarning.value) })
  }
  return activeCount.value ? t('globalJobs.trigger.active', { count: activeCount.value }) : t('globalJobs.trigger.completed')
})

function openProgress(job) {
  popoverOpen.value = false
  showJobProgress(job.id)
}

const triggerDescription = computed(() => latestFailure.value
  ? `${triggerLabel.value}：${failureMessage(latestFailure.value)}`
  : latestWarning.value
    ? `${triggerLabel.value}：${warningMessage(latestWarning.value)}`
    : triggerLabel.value)

function taskName(job) {
  return globalJobKindLabel(job.kind, t)
}

function taskTargets(job) {
  const names = [...new Set((job.targets || []).map(target => target.name).filter(Boolean))]
  return names.length ? t('globalJobs.targets', { value: names.slice(0, 3).join(' · ') }) : ''
}

function failureMessage(job) {
  return globalJobFailure(job).message || t('globalJobs.unknownFailure')
}

function warningMessage(job) {
  return globalJobWarning(job).message || t('globalJobs.unknownWarning')
}

function taskTransfer(job) {
  const transfer = globalJobTransfer(job)
  if (!transfer) return ''
  const details = []
  const rate = formatJobRate(transfer.bytesPerSecond)
  if (rate) details.push(rate)
  const current = formatJobBytes(transfer.currentBytes)
  const total = formatJobBytes(transfer.totalBytes)
  if (current && total) details.push(t('globalJobs.transfer.progress', { current, total }))
  else if (total) details.push(t('globalJobs.transfer.total', { total }))
  else if (current) details.push(t('globalJobs.transfer.downloaded', { current }))
  return details.join(' · ')
}

watch(recentFailures, failures => {
  let hasNewFailure = false
  for (const job of [...failures].reverse()) {
    const toastId = globalJobFailureToastId(job)
    if (!toastId || notifiedFailureIds.has(toastId)) continue
    notifiedFailureIds.add(toastId)
    if (isTaskProgressJob(job)) {
      if (!focusedJobId.value) focusedJobId.value = job.id
      continue
    }
    hasNewFailure = true
    toast.error(t('globalJobs.failureToastTitle', { task: taskName(job) }), {
      id: toastId,
      description: t('globalJobs.failureToastDescription', {
        detail: failureMessage(job),
        id: job.id
      }),
      duration: 15_000,
      action: {
        label: t('globalJobs.failureToastAction'),
        onClick: () => { popoverOpen.value = true }
      }
    })
  }
  if (hasNewFailure) popoverOpen.value = true
}, { flush: 'sync' })

watch(recentWarnings, warnings => {
  let hasNewWarning = false
  for (const job of [...warnings].reverse()) {
    const toastId = globalJobWarningToastId(job)
    if (!toastId || notifiedWarningIds.has(toastId)) continue
    notifiedWarningIds.add(toastId)
    hasNewWarning = true
    toast.warning(t('globalJobs.warningToastTitle', { task: taskName(job) }), {
      id: toastId,
      description: t('globalJobs.warningToastDescription', {
        detail: warningMessage(job),
        id: job.id
      }),
      duration: 15_000,
      action: {
        label: t('globalJobs.warningToastAction'),
        onClick: () => { popoverOpen.value = true }
      }
    })
  }
  if (hasNewWarning) popoverOpen.value = true
}, { flush: 'sync' })
</script>

<template>
  <Popover v-model:open="popoverOpen">
    <Tooltip>
      <TooltipTrigger as-child>
        <span class="inline-flex">
          <PopoverTrigger as-child>
            <Button variant="ghost" size="icon-sm" class="global-job-trigger relative" :aria-label="triggerDescription">
              <TriangleAlert v-if="failureCount" class="text-destructive" />
              <CircleAlert v-else-if="loadError" class="text-destructive" />
              <CircleAlert v-else-if="warningCount" class="text-warning-foreground" />
              <ListTodo v-else />
              <Badge
                v-if="failureCount || warningCount || activeCount"
                :variant="failureCount ? 'destructive' : warningCount ? 'warning' : 'secondary'"
                class="pointer-events-none absolute -right-1 -top-1 origin-top-right scale-75"
                aria-hidden="true"
              >{{ Math.min(99, failureCount || warningCount || activeCount) }}</Badge>
            </Button>
          </PopoverTrigger>
        </span>
      </TooltipTrigger>
      <TooltipContent>{{ triggerDescription }}</TooltipContent>
    </Tooltip>

    <PopoverContent
      align="end"
      :side-offset="8"
      class="max-h-[min(42rem,calc(100vh-2rem))] w-[min(28rem,calc(100vw-2rem))] gap-3 overflow-y-auto p-3"
    >
      <PopoverHeader>
        <PopoverTitle>{{ t('globalJobs.title') }}</PopoverTitle>
        <PopoverDescription>
          {{ connected ? t('globalJobs.descriptionLive') : t('globalJobs.descriptionConnecting') }}
        </PopoverDescription>
      </PopoverHeader>

      <Empty v-if="!visible">
        <EmptyHeader><EmptyTitle>{{ t('globalJobs.empty') }}</EmptyTitle></EmptyHeader>
      </Empty>

      <Alert v-if="loadError" variant="destructive">
        <CircleAlert />
        <AlertTitle>{{ t('globalJobs.trigger.unavailable') }}</AlertTitle>
        <AlertDescription>{{ t('globalJobs.loadFailed', { detail: loadError }) }}</AlertDescription>
      </Alert>

      <section v-if="activeCount" class="flex flex-col gap-2" :aria-label="t('globalJobs.sections.active')">
        <div class="flex items-center justify-between gap-2">
          <h3 class="text-sm font-medium">{{ t('globalJobs.sections.active') }}</h3>
          <Badge variant="secondary">{{ activeCount }}</Badge>
        </div>
        <div class="flex flex-col">
          <template v-for="(job, index) in displayedActiveJobs" :key="job.id">
            <Separator v-if="index" />
            <div class="flex min-w-0 flex-col gap-1.5 py-2">
              <div class="flex min-w-0 items-center justify-between gap-3">
                <span class="truncate text-sm font-medium" :title="taskName(job)">{{ taskName(job) }}</span>
                <Badge variant="outline">{{ t(`globalJobs.status.${job.status}`) }}</Badge>
              </div>
              <p v-if="taskTargets(job)" class="text-muted-foreground truncate text-xs" :title="taskTargets(job)">
                {{ taskTargets(job) }}
              </p>
              <p v-if="job.message" class="text-muted-foreground truncate text-xs" :title="job.message">
                {{ job.message }}
              </p>
              <Button v-if="isTaskProgressJob(job)" variant="outline" size="sm" class="w-fit" @click="openProgress(job)">{{ t('globalJobs.viewProgress') }}</Button>
              <div v-else class="flex items-center gap-2">
                <Progress :model-value="job.progress || 0" />
                <span class="text-muted-foreground w-9 shrink-0 text-right text-xs tabular-nums">
                  {{ t('globalJobs.progress', { value: job.progress || 0 }) }}
                </span>
              </div>
              <p v-if="taskTransfer(job)" class="text-muted-foreground truncate text-xs tabular-nums" :title="taskTransfer(job)">
                {{ taskTransfer(job) }}
              </p>
            </div>
          </template>
        </div>
        <p v-if="hiddenActiveCount" class="text-muted-foreground text-xs">
          {{ t('globalJobs.remaining', { count: hiddenActiveCount }) }}
        </p>
      </section>

      <section v-if="completedProgressJobs.length" class="flex flex-col gap-2">
        <Separator />
        <h3 class="text-sm font-medium">{{ t('globalJobs.sections.completed') }}</h3>
        <div v-for="job in completedProgressJobs" :key="job.id" class="flex items-center justify-between gap-2">
          <span class="min-w-0 truncate text-sm">{{ roomLabels[job.roomId] || job.roomId }} · {{ taskName(job) }}</span>
          <Button variant="outline" size="sm" @click="openProgress(job)">{{ t('globalJobs.viewResult') }}</Button>
        </div>
      </section>

      <section v-if="failureCount" class="flex flex-col gap-2" :aria-label="t('globalJobs.sections.failed')">
        <Separator v-if="activeCount" />
        <div class="flex items-center justify-between gap-2">
          <h3 class="text-sm font-medium">{{ t('globalJobs.sections.failed') }}</h3>
          <Button variant="ghost" size="xs" @click="clearFailures">{{ t('globalJobs.clearFailures') }}</Button>
        </div>
        <Alert v-for="job in displayedFailures" :key="job.id" variant="destructive">
          <TriangleAlert />
          <AlertTitle>{{ taskName(job) }}</AlertTitle>
          <AlertDescription class="pr-7">{{ failureMessage(job) }}</AlertDescription>
          <Button v-if="isTaskProgressJob(job)" variant="outline" size="sm" class="w-fit" @click="openProgress(job)">{{ t('globalJobs.viewResult') }}</Button>
          <AlertAction>
            <Tooltip>
              <TooltipTrigger as-child>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  :aria-label="t('globalJobs.dismissFailure')"
                  @click="dismissFailure(job.id)"
                >
                  <X />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{{ t('globalJobs.dismissFailure') }}</TooltipContent>
            </Tooltip>
          </AlertAction>
        </Alert>
      </section>

      <section
        v-if="warningCount"
        class="flex flex-col gap-2"
        :aria-label="t('globalJobs.sections.warning')"
        aria-live="polite"
      >
        <Separator v-if="activeCount || failureCount" />
        <div class="flex items-center justify-between gap-2">
          <h3 class="text-sm font-medium">{{ t('globalJobs.sections.warning') }}</h3>
          <Button variant="ghost" size="xs" @click="clearWarnings">{{ t('globalJobs.clearWarnings') }}</Button>
        </div>
        <Alert
          v-for="job in displayedWarnings"
          :key="job.id"
          class="border-warning/25 bg-warning/10 text-warning-foreground"
        >
          <CircleAlert />
          <AlertTitle>{{ taskName(job) }}</AlertTitle>
          <AlertDescription class="pr-7">{{ warningMessage(job) }}</AlertDescription>
          <AlertAction>
            <Tooltip>
              <TooltipTrigger as-child>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  :aria-label="t('globalJobs.dismissWarning')"
                  @click="dismissWarning(job.id)"
                >
                  <X />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{{ t('globalJobs.dismissWarning') }}</TooltipContent>
            </Tooltip>
          </AlertAction>
        </Alert>
      </section>
    </PopoverContent>
  </Popover>
</template>
