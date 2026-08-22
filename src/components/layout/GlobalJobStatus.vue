<script setup>
import { computed } from 'vue'
import { CircleAlert, ListTodo, TriangleAlert, X } from '@lucide/vue'
import { useI18n } from 'vue-i18n'
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import { globalJobKindLabel } from '@/i18n/globalJobMessages.js'

const { t } = useI18n()
const {
  activeJobs,
  activeCount,
  clearFailures,
  connected,
  dismissFailure,
  failureCount,
  loadError,
  recentFailures,
  visible
} = useGlobalJobStatus()

const displayedActiveJobs = computed(() => activeJobs.value.slice(0, 5))
const displayedFailures = computed(() => recentFailures.value.slice(0, 3))
const hiddenActiveCount = computed(() => Math.max(0, activeCount.value - displayedActiveJobs.value.length))

const triggerLabel = computed(() => {
  if (loadError.value && !activeCount.value && !failureCount.value) return t('globalJobs.trigger.unavailable')
  if (activeCount.value && failureCount.value) {
    return t('globalJobs.trigger.summary', { active: activeCount.value, failed: failureCount.value })
  }
  return failureCount.value
    ? t('globalJobs.trigger.failed', { count: failureCount.value })
    : t('globalJobs.trigger.active', { count: activeCount.value })
})

function taskName(job) {
  return globalJobKindLabel(job.kind, t)
}

function taskTargets(job) {
  const names = [...new Set((job.targets || []).map(target => target.name).filter(Boolean))]
  return names.length ? t('globalJobs.targets', { value: names.slice(0, 3).join(' · ') }) : ''
}

function failureMessage(job) {
  return job.targets?.find(target => target.status === 'failed')?.error?.message
    || job.error?.message
    || t('globalJobs.unknownFailure')
}
</script>

<template>
  <Popover v-if="visible">
    <Tooltip>
      <TooltipTrigger as-child>
        <span class="inline-flex">
          <PopoverTrigger as-child>
            <Button variant="ghost" size="sm" :aria-label="triggerLabel">
              <TriangleAlert v-if="failureCount" class="text-destructive" />
              <CircleAlert v-else-if="loadError" class="text-destructive" />
              <ListTodo v-else />
              <span class="hidden xl:inline">{{ triggerLabel }}</span>
              <Badge v-if="activeCount" variant="secondary">{{ activeCount }}</Badge>
              <Badge v-if="failureCount" variant="destructive">{{ failureCount }}</Badge>
            </Button>
          </PopoverTrigger>
        </span>
      </TooltipTrigger>
      <TooltipContent>{{ triggerLabel }}</TooltipContent>
    </Tooltip>

    <PopoverContent align="end" :side-offset="8" class="w-[min(28rem,calc(100vw-2rem))] gap-3 p-3">
      <PopoverHeader>
        <PopoverTitle>{{ t('globalJobs.title') }}</PopoverTitle>
        <PopoverDescription>
          {{ connected ? t('globalJobs.descriptionLive') : t('globalJobs.descriptionConnecting') }}
        </PopoverDescription>
      </PopoverHeader>

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
              <div class="flex items-center gap-2">
                <Progress :model-value="job.progress || 0" />
                <span class="text-muted-foreground w-9 shrink-0 text-right text-xs tabular-nums">
                  {{ t('globalJobs.progress', { value: job.progress || 0 }) }}
                </span>
              </div>
            </div>
          </template>
        </div>
        <p v-if="hiddenActiveCount" class="text-muted-foreground text-xs">
          {{ t('globalJobs.remaining', { count: hiddenActiveCount }) }}
        </p>
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
    </PopoverContent>
  </Popover>
</template>
