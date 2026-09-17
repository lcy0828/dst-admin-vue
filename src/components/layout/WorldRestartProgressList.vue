<script setup>
import { useI18n } from 'vue-i18n'
import { Check, CircleAlert, CircleHelp, Globe2, WifiOff } from '@lucide/vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Spinner } from '@/components/ui/spinner'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { taskProgressMessages } from '@/i18n/taskProgressMessages'
import { readableTaskText } from '@/lib/taskProgress.mjs'

defineProps({ progress: { type: Object, required: true }, connected: { type: Boolean, default: true }, targetLabels: { type: Object, default: () => ({}) } })
const { t } = useI18n({ useScope: 'local', messages: taskProgressMessages })
const state = (world, connected) => world.active && !connected ? 'disconnected' : world.stage
const issue = world => ['failed', 'unconfirmed', 'canceled'].includes(world.stage)
</script>

<template>
  <div class="world-restart-progress">
    <div v-if="progress.ready < progress.total" class="flex items-center justify-between gap-2" role="status">
      <strong class="text-sm font-semibold tabular-nums">{{ t('taskProgress.worlds.readyCount', { ready: progress.ready, total: progress.total }) }}</strong>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger as-child><Button variant="ghost" size="icon-sm" :aria-label="t('taskProgress.worlds.estimateLabel')"><CircleHelp /></Button></TooltipTrigger>
          <TooltipContent class="max-w-64">{{ t('taskProgress.worlds.estimateHint') }}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
    <ol class="world-restart-list" :aria-label="t('taskProgress.worlds.title')">
      <li v-for="world in progress.worlds" :key="world.worldId" class="world-restart-item" :data-world="world.worldId" :data-stage="state(world, connected)">
        <div class="flex min-w-0 items-center gap-2">
          <Globe2 class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <strong class="min-w-0 flex-1 truncate text-sm" :title="world.name">{{ world.name }}</strong>
          <Badge v-if="world.isMaster" variant="outline">{{ t('taskProgress.worlds.master') }}</Badge>
        </div>
        <div class="flex items-center justify-between gap-3 text-xs">
          <span class="flex min-w-0 items-center gap-1.5" :class="world.stage === 'failed' ? 'text-destructive' : world.stage === 'ready' ? 'text-success-foreground' : 'text-muted-foreground'" role="status">
            <Check v-if="world.stage === 'ready'" class="size-3.5 shrink-0" aria-hidden="true" />
            <WifiOff v-else-if="world.active && !connected" class="size-3.5 shrink-0" aria-hidden="true" />
            <CircleAlert v-else-if="issue(world)" class="size-3.5 shrink-0" aria-hidden="true" />
            <Spinner v-else-if="world.active && !['queued', 'stopped'].includes(world.stage)" class="size-3.5 shrink-0" />
            {{ t(`taskProgress.worlds.stages.${state(world, connected)}`) }}
          </span>
          <strong v-if="world.active" class="shrink-0 tabular-nums">{{ t('taskProgress.worlds.estimate', { value: world.percent }) }}</strong>
        </div>
        <Progress v-if="world.active" :model-value="world.percent" :aria-label="t('taskProgress.worlds.progress', { name: world.name })" :aria-valuetext="`${t(`taskProgress.worlds.stages.${state(world, connected)}`)} · ${world.percent}%`" class="h-1.5" />
        <p v-if="issue(world) && world.message" class="text-xs leading-relaxed break-words" :class="world.stage === 'failed' ? 'text-destructive' : 'text-muted-foreground'">{{ readableTaskText(world.message, targetLabels) }}</p>
      </li>
    </ol>
  </div>
</template>

<style scoped>
.world-restart-progress { display: flex; flex-direction: column; gap: 10px; }
.world-restart-list { display: flex; flex-direction: column; gap: 14px; max-height: min(36svh, 320px); overflow-y: auto; overscroll-behavior: contain; padding: 1px; }
.world-restart-item { display: flex; min-width: 0; flex-direction: column; gap: 8px; }
.world-restart-item + .world-restart-item { padding-top: 14px; border-top: 1px solid var(--border); }
</style>
