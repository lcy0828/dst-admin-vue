<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Check, ChevronDown, CircleAlert } from '@lucide/vue'
import { gameReleaseProgress, gameReleaseStageVariant } from '@/lib/gameRelease.mjs'
import { formatSystemDateTime } from '@/lib/dateTime.mjs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Progress } from '@/components/ui/progress'
import { Spinner } from '@/components/ui/spinner'

const props = defineProps({ release: { type: Object, required: true } })
const { t } = useI18n()
const progress = computed(() => gameReleaseProgress(props.release))
const failed = computed(() => ['failed', 'recovery_required'].includes(progress.value.stage))
const updatedAt = computed(() => props.release.finishedAt || props.release.updatedAt)
function targetName(item) {
  return item.targetId === 'local' ? t('gameReleases.values.local') : item.targetName || t('gameReleases.values.unknownTarget')
}
</script>

<template>
  <section class="flex min-w-0 flex-col gap-3 rounded-lg border p-4" :aria-label="t('gameReleases.progress.title')">
    <div class="flex flex-wrap items-center justify-between gap-2" role="status" aria-live="polite">
      <div class="flex flex-wrap items-center gap-2">
        <Spinner v-if="!progress.terminal" />
        <h3 class="text-sm font-semibold">{{ t('gameReleases.progress.title') }}</h3>
        <Badge :variant="progress.stage === 'succeeded' ? 'success' : gameReleaseStageVariant(progress.stage)">{{ t(`gameReleases.stages.${progress.stage}`) }}</Badge>
      </div>
      <span v-if="updatedAt" class="text-xs text-muted-foreground">{{ t('gameReleases.progress.updatedAt', { time: formatSystemDateTime(updatedAt) }) }}</span>
    </div>

    <ol class="grid gap-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5" :aria-label="t('gameReleases.progress.steps')">
      <li v-for="(step, index) in progress.steps" :key="step.key" class="flex min-w-0 flex-col gap-2 rounded-md border p-3" :aria-current="step.state === 'active' ? 'step' : undefined">
        <div class="flex items-center justify-between gap-2">
          <span class="text-sm font-medium">{{ index + 1 }}. {{ t(`gameReleases.progress.stepsLabels.${step.key}`) }}</span>
          <Spinner v-if="step.state === 'active'" />
          <Check v-else-if="step.state === 'done'" class="size-4 text-success-foreground" />
          <CircleAlert v-else-if="step.state === 'interrupted'" class="size-4 text-destructive" />
        </div>
        <Badge :variant="step.state === 'done' ? 'success' : step.state === 'active' ? 'info' : step.state === 'interrupted' ? 'destructive' : 'outline'">{{ t(`gameReleases.progress.states.${step.state}`) }}<template v-if="step.total"> · {{ step.done }}/{{ step.total }}</template></Badge>
      </li>
    </ol>

    <div v-if="!progress.terminal" class="flex flex-col gap-2">
      <Progress :model-value="null" :aria-label="t(`gameReleases.stages.${progress.stage}`)" />
      <p class="text-sm text-muted-foreground">{{ t(`gameReleases.progress.hints.${progress.stage}`) }}</p>
    </div>
    <Alert v-else-if="progress.stage === 'succeeded'">
      <Check />
      <AlertTitle>{{ t(progress.noUpdate ? 'gameReleases.progress.noUpdate' : 'gameReleases.progress.success') }}</AlertTitle>
      <AlertDescription v-if="!progress.noUpdate">{{ t('gameReleases.progress.restored', { count: progress.restored, total: progress.restoreTotal, stopped: progress.keptStopped }) }}</AlertDescription>
    </Alert>
    <Alert v-else-if="progress.stage === 'abandoned'">
      <CircleAlert /><AlertTitle>{{ t('gameReleases.stages.abandoned') }}</AlertTitle>
      <AlertDescription>{{ t('gameReleases.recovery.finished') }}</AlertDescription>
    </Alert>
    <Alert v-else-if="failed" variant="destructive">
      <CircleAlert />
      <AlertTitle>{{ t(`gameReleases.stages.${progress.stage}`) }}</AlertTitle>
      <AlertDescription>{{ release.errorMessage || t('gameReleases.progress.incomplete') }}</AlertDescription>
    </Alert>

    <Alert v-if="release.shards?.some(shard => shard.warningCode === 'RUNTIME_FALLBACK_GAME') || release.installations?.some(item => item.warningMessage)">
      <CircleAlert /><AlertTitle>{{ t('gameReleases.recovery.acceleratorWarning') }}</AlertTitle>
      <AlertDescription>{{ t(release.shards?.some(shard => shard.warningCode === 'RUNTIME_FALLBACK_GAME') ? 'gameReleases.recovery.runtimeFallback' : 'gameReleases.recovery.acceleratorRepair') }}</AlertDescription>
    </Alert>
    <div v-if="progress.terminal && progress.rows.installations.length" class="flex flex-col gap-1 text-sm">
      <p v-for="item in progress.rows.installations" :key="`${item.targetId}:${item.installationId}`" class="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span>{{ targetName(item) }}</span>
        <span class="text-muted-foreground">{{ t('gameReleases.progress.actualBuild') }}</span>
        <span class="font-medium tabular-nums">{{ item.beforeVersion || '—' }} → {{ item.afterVersion || t('gameReleases.values.unknown') }}</span>
      </p>
    </div>

    <Collapsible v-if="progress.rows.backups.length">
      <CollapsibleTrigger as-child><Button size="sm" variant="ghost" class="group"><span>{{ t('gameReleases.progress.backups', { count: progress.rows.backups.filter(item => item.id).length, total: progress.rows.backups.length }) }}</span><ChevronDown data-icon="inline-end" class="transition-transform group-data-[state=open]:rotate-180" /></Button></CollapsibleTrigger>
      <CollapsibleContent class="pt-2">
        <ul class="flex flex-col gap-2 text-sm"><li v-for="backup in progress.rows.backups" :key="backup.roomId" class="flex flex-wrap items-center gap-2"><span>{{ backup.roomName || t('gameReleases.values.unknownRoom') }}</span><Badge :variant="backup.id ? 'success' : 'outline'">{{ t(backup.id ? 'gameReleases.progress.backupReady' : 'gameReleases.progress.backupPending') }}</Badge><span v-if="backup.id" class="break-all font-mono text-xs text-muted-foreground">{{ backup.id }}</span></li></ul>
      </CollapsibleContent>
    </Collapsible>
  </section>
</template>
