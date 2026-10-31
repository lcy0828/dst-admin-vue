<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ChevronDown, CircleAlert, PackageCheck, RefreshCw, ShieldCheck } from '@lucide/vue'
import { useGameUpdate } from '@/composables/useGameUpdate'
import { gameReleaseBlockerKey } from '@/lib/gameRelease.mjs'
import { formatSystemDateTime } from '@/lib/dateTime.mjs'
import { gameUpdateDialogState } from '@/lib/gameUpdateDialogState.mjs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import ModPreflightReports from './ModPreflightReports.vue'

const { t } = useI18n()
const router = useRouter()
const update = useGameUpdate()
const state = update.state
const technicalOpen = ref(false)
const plan = computed(() => state.plan)
const dialogState = computed(() => gameUpdateDialogState({ ...state, active: update.active.value }))
const installations = computed(() => plan.value?.installations || [])
const shards = computed(() => installations.value.flatMap(item => item.shards || []))
const running = computed(() => shards.value.filter(item => item.wasRunning).length)
const canSubmit = computed(() => plan.value?.ready && plan.value?.updateRequired && plan.value?.planHash &&
  !state.preparing && !state.submitting && !state.uncertain && !state.diagnosticsLoading && !update.active.value)
const targetName = item => item.targetId === 'local' ? t('gameReleases.values.local') : item.targetName || installations.value.find(target => target.targetId === item.targetId)?.targetName || t('gameReleases.values.unknownTarget')
const rooms = computed(() => {
  const groups = new Map()
  for (const shard of shards.value) {
    const room = groups.get(shard.roomId) || { id: shard.roomId, name: shard.roomName || shard.roomDirectory || t('gameReleases.values.unknownRoom'), worlds: [] }
    room.worlds.push(shard)
    groups.set(shard.roomId, room)
  }
  return [...groups.values()]
})
function viewProgress() {
  const jobId = update.active.value?.currentJobId || update.active.value?.sourceJobId || update.active.value?.id
  update.close()
  router.push({ path: '/servers/releases', query: jobId ? { maintenanceJob: jobId } : {} })
}
function blockerLabel(blocker) {
  const label = t(`gameReleases.blockers.${gameReleaseBlockerKey(blocker.code)}`)
  const installation = installations.value.find(item => item.targetId === blocker.targetId && (!blocker.installationId || item.installationId === blocker.installationId))
  return [installation ? targetName(installation) : '', label].filter(Boolean).join(' · ')
}
</script>

<template>
  <Dialog :open="state.open" @update:open="value => { if (!value) update.close() }">
    <DialogContent class="max-h-[85dvh] overflow-y-auto sm:max-w-xl" @escape-key-down="event => { if (state.submitting) event.preventDefault() }" @interact-outside="event => { if (state.submitting) event.preventDefault() }">
      <DialogHeader>
        <DialogTitle>{{ t('gameReleases.workflow.title') }}</DialogTitle>
        <DialogDescription>{{ t('gameReleases.workflow.description') }}</DialogDescription>
      </DialogHeader>
      <template v-if="dialogState === 'checking'">
        <p class="flex items-center gap-2 text-sm" role="status"><Spinner />{{ t('gameReleases.workflow.preparing') }}</p>
        <Skeleton class="h-20 w-full" />
      </template>
      <Alert v-if="update.active.value">
        <AlertTitle>{{ t(update.active.value.stage === 'recovery_required' ? 'gameReleases.workflow.recovery' : 'gameReleases.workflow.existing') }}</AlertTitle>
        <AlertDescription>{{ t('gameReleases.workflow.existingHint') }}</AlertDescription>
      </Alert>
      <Alert v-if="state.uncertain" variant="destructive">
        <CircleAlert /><AlertTitle>{{ t('gameReleases.workflow.uncertain') }}</AlertTitle>
        <AlertDescription>{{ t('gameReleases.workflow.uncertainHint') }}<details v-if="state.requestId" class="break-all"><summary class="cursor-pointer">{{ t('novice.record') }}</summary>{{ t('serviceLogs.requestId') }}: {{ state.requestId }}</details></AlertDescription>
      </Alert>
      <Alert v-if="state.error || state.pendingError" variant="destructive">
        <CircleAlert /><AlertTitle>{{ t('gameReleases.feedback.operationFailedTitle') }}</AlertTitle><AlertDescription>{{ state.error || state.pendingError }}</AlertDescription>
      </Alert>
      <Alert v-if="state.planChanged && dialogState === 'available'">
        <CircleAlert /><AlertTitle>{{ t('gameReleases.workflow.changed') }}</AlertTitle><AlertDescription>{{ t('gameReleases.workflow.changedHint') }}</AlertDescription>
      </Alert>
      <Alert v-if="dialogState === 'current'">
        <PackageCheck /><AlertTitle>{{ t('gameReleases.plan.upToDate') }}</AlertTitle>
        <AlertDescription class="flex flex-col gap-1"><span>{{ t('gameReleases.plan.noUpdateDescription') }}</span><span v-for="item in installations" :key="`${item.targetId}:${item.installationId}`">{{ targetName(item) }}<template v-if="item.gameVersion"> · {{ t('gameReleases.simple.currentGameVersion') }} {{ item.gameVersion }}</template></span><span v-if="plan.createdAt">{{ t('gameReleases.workflow.checkedAt', { time: formatSystemDateTime(plan.createdAt) }) }}</span></AlertDescription>
      </Alert>
      <template v-if="plan && ['available', 'blocked'].includes(dialogState)">
        <div class="flex flex-col gap-2">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <span class="font-medium">{{ t('gameReleases.simple.scopeSummary', { rooms: rooms.length, worlds: shards.length }) }}</span>
            <Badge :variant="!plan.ready ? 'destructive' : plan.updateRequired ? 'default' : 'secondary'">{{ t(`gameReleases.plan.${!plan.ready ? 'blocked' : plan.updateRequired ? 'updateRequired' : 'upToDate'}`) }}</Badge>
          </div>
          <p v-for="item in installations" :key="`version:${item.targetId}:${item.installationId}`" class="text-sm tabular-nums">{{ targetName(item) }} · {{ t('gameReleases.simple.currentGameVersion') }} {{ item.gameVersion || t('gameReleases.values.unknown') }}</p>
          <p v-if="plan.updateRequired" class="text-sm text-muted-foreground">{{ t('gameReleases.workflow.restoreSummary', { running, stopped: shards.length - running }) }}</p>
          <div v-for="room in plan.updateRequired ? rooms : []" :key="room.id" class="flex min-w-0 flex-col gap-1 rounded-md border p-3">
            <span class="break-words font-medium">{{ room.name }}</span>
            <span v-for="world in room.worlds" :key="world.worldId" class="text-sm text-muted-foreground">{{ world.worldName || world.worldDirectory || t('gameReleases.values.unknownWorld') }} · {{ targetName(world) }} · {{ t(world.wasRunning ? plan.policy?.restartRunning === false ? 'gameReleases.workflow.willStop' : 'gameReleases.workflow.willRestore' : 'gameReleases.workflow.keepStopped') }}</span>
          </div>
        </div>
        <Alert v-if="plan.blockers?.length" variant="destructive">
          <CircleAlert /><AlertTitle>{{ t('gameReleases.plan.blockerTitle') }}</AlertTitle>
          <AlertDescription class="flex flex-col gap-1"><span v-for="(blocker, index) in plan.blockers" :key="index">{{ blockerLabel(blocker) }}</span></AlertDescription>
        </Alert>
        <Alert v-else-if="plan.updateRequired">
          <ShieldCheck /><AlertTitle>{{ t('gameReleases.workflow.protection') }}</AlertTitle><AlertDescription>{{ t(plan.policy?.restartRunning === false ? 'gameReleases.workflow.protectionNoRestoreHint' : 'gameReleases.workflow.protectionHint') }}</AlertDescription>
        </Alert>
        <Collapsible v-model:open="technicalOpen">
          <CollapsibleTrigger as-child><Button variant="ghost" size="sm" class="group">{{ t('gameReleases.technical.title') }}<ChevronDown data-icon="inline-end" class="transition-transform group-data-[state=open]:rotate-180" /></Button></CollapsibleTrigger>
          <CollapsibleContent class="flex min-w-0 flex-col gap-2 pt-2 text-xs text-muted-foreground">
            <div v-for="item in installations" :key="`${item.targetId}:${item.installationId}`" class="flex flex-col gap-1">
              <span>{{ targetName(item) }} · {{ item.installationId }} · {{ item.os }} · App {{ item.appId }}</span>
              <span>{{ t('gameReleases.columns.steamVersions') }}: {{ item.currentVersion || item.steamBuild || '--' }} → {{ item.desiredVersion || '--' }} · {{ item.branch }}</span>
              <span>{{ t('gameReleases.columns.disk') }}: {{ (Number(item.availableBytes) / 1073741824).toFixed(1) }} / {{ (Number(item.requiredBytes) / 1073741824).toFixed(1) }} GiB</span>
            </div>
            <span class="break-all">{{ t('gameReleases.plan.planHash') }}: {{ plan.planHash }}</span>
            <span v-for="(blocker, index) in plan.blockers || []" :key="`blocker:${index}`" class="break-words">{{ blocker.code }}: {{ blocker.message }}</span>
          </CollapsibleContent>
        </Collapsible>
        <Button v-if="!state.diagnostics.length" variant="ghost" size="sm" class="justify-start" :disabled="state.diagnosticsLoading || state.submitting" @click="update.loadDiagnostics">
          <Spinner v-if="state.diagnosticsLoading" data-icon="inline-start" />{{ t('gameReleases.workflow.diagnostics') }}
        </Button>
        <p v-if="state.diagnosticsError" class="text-sm text-muted-foreground">{{ state.diagnosticsError }}</p>
        <ModPreflightReports :reports="state.diagnostics" />
      </template>
      <DialogFooter class="flex-wrap">
        <Button variant="outline" :disabled="state.submitting" @click="update.close">{{ t(dialogState === 'current' ? 'common.actions.close' : 'common.actions.cancel') }}</Button>
        <Button v-if="update.active.value" @click="viewProgress">{{ t('gameReleases.workflow.progress') }}</Button>
        <Button v-else-if="state.uncertain" variant="outline" :disabled="state.pendingLoading" @click="update.refreshPending"><RefreshCw data-icon="inline-start" />{{ t('gameReleases.workflow.reconcile') }}</Button>
        <Button v-else-if="['error', 'blocked', 'idle'].includes(dialogState)" :disabled="state.preparing || state.submitting" @click="update.prepare()"><RefreshCw data-icon="inline-start" />{{ t('gameReleases.actions.check') }}</Button>
        <Button v-else-if="dialogState === 'available'" :disabled="!canSubmit" @click="update.submit"><Spinner v-if="state.submitting" data-icon="inline-start" /><PackageCheck v-else data-icon="inline-start" />{{ t(state.planChanged ? 'gameReleases.workflow.reconfirm' : 'gameReleases.confirm.submit') }}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
