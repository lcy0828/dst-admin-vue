<script setup>
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Download, RefreshCw, CircleAlert } from '@lucide/vue'
import { agentsV2API, jobsV2API } from '@/api/v2'
import { createAgentSoftwareController } from '@/lib/agentSoftwareUpdate.mjs'
import { formatSoftwareBytes, softwareUpdateActive, softwareUpdateAction } from '@/lib/softwareUpdate.mjs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import SoftwareUpdateSettings from '@/components/settings/SoftwareUpdateSettings.vue'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'

const props = defineProps({ agentId: { type: String, required: true }, online: Boolean })
const emit = defineEmits(['changed'])
const { t } = useI18n()
const ui = reactive({ confirmation: '', version: '', operationId: '' })
let storage
try { storage = window.sessionStorage } catch { /* Storage is optional. */ }
const controller = createAgentSoftwareController({ id: props.agentId, api: agentsV2API, jobs: jobsV2API, storage, onChange: value => Object.assign(state, value), changed: () => emit('changed') })
const state = reactive({ ...controller.state })
const snapshot = computed(() => state.snapshot)
const latest = computed(() => snapshot.value?.check?.latest)
const legacySource = ref('auto')
const source = computed(() => snapshot.value?.settings?.controllerRelay ? 'controller' : snapshot.value?.settings?.source || legacySource.value)
const operation = computed(() => snapshot.value?.operation)
const nextAction = computed(() => softwareUpdateAction(snapshot.value))
const busy = computed(() => state.acting || softwareUpdateActive(operation.value) || snapshot.value?.supported && snapshot.value?.ready === false)
const phase = computed(() => state.acting ? state.job?.progressDetail?.stage || operation.value?.phase : operation.value?.phase)
const transfer = computed(() => state.job?.transfer || { currentBytes: operation.value?.downloadedBytes, totalBytes: operation.value?.totalBytes, bytesPerSecond: operation.value?.bytesPerSecond })
const errorMessage = computed(() => {
  const key = { SOFTWARE_CONNECTION_TIMEOUT: 'softwareUpdate.connectionTimeout', SOFTWARE_OBSERVATION_TIMEOUT: 'softwareUpdate.observationTimeout' }[state.error]
  return key ? t(key) : state.error
})
function confirm(action, version, operationId = '') { ui.confirmation = action; ui.version = version; ui.operationId = operationId }
function execute() { ui.confirmation = ''; void controller.start({ version: ui.version, source: source.value, operationId: ui.operationId }) }
watch(() => props.online, value => { if (value && !state.acting) void controller.initialize() }, { immediate: true })
onBeforeUnmount(() => controller.dispose())
</script>

<template>
  <Card>
    <CardHeader><CardTitle>{{ t('softwareUpdate.agentTitle') }}</CardTitle><CardDescription>{{ t('softwareUpdate.agentDescription') }}</CardDescription></CardHeader>
    <CardContent class="flex min-w-0 flex-col gap-4">
      <Alert v-if="state.error" variant="destructive"><CircleAlert /><AlertTitle>{{ t('softwareUpdate.actionFailed') }}</AlertTitle><AlertDescription>{{ errorMessage }}</AlertDescription><Button variant="outline" size="sm" :disabled="state.acting || state.loading" @click="controller.reconnect()">{{ t('softwareUpdate.retry') }}</Button></Alert>
      <Alert v-if="state.reconnecting"><Spinner /><AlertDescription>{{ t('softwareUpdate.trackingReconnect') }}</AlertDescription></Alert>
      <Alert v-if="!online"><CircleAlert /><AlertDescription>{{ t('softwareUpdate.agentOffline') }}</AlertDescription></Alert>
      <Skeleton v-if="state.loading && !snapshot" class="h-16 w-full" />
      <template v-if="snapshot">
        <dl class="grid grid-cols-2 gap-4 text-sm"><div><dt class="text-muted-foreground">{{ t('softwareUpdate.current') }}</dt><dd class="mt-1 font-medium">{{ snapshot.current.version }}</dd></div><div><dt class="text-muted-foreground">{{ t('softwareUpdate.latest') }}</dt><dd class="mt-1 flex flex-wrap items-center gap-2"><span>{{ latest?.version || '—' }}</span><Badge v-if="latest" :variant="snapshot.check.hasUpdate ? 'warning' : 'secondary'">{{ t(snapshot.check.hasUpdate ? 'softwareUpdate.available' : 'softwareUpdate.upToDate') }}</Badge></dd></div></dl>
        <Alert v-if="!snapshot.supported"><CircleAlert /><AlertDescription>{{ t(`softwareUpdate.reasons.${snapshot.unsupportedReason}`) }}</AlertDescription></Alert>
        <Alert v-if="snapshot.check.warning"><CircleAlert /><AlertTitle>{{ t('softwareUpdate.checkFailed') }}</AlertTitle><AlertDescription>{{ snapshot.check.warning }}</AlertDescription></Alert>
        <Alert v-if="latest && !latest.onlineUpdate"><CircleAlert /><AlertDescription>{{ t('softwareUpdate.packageMissing') }}</AlertDescription></Alert>
        <SoftwareUpdateSettings v-if="snapshot.settings?.source" :agent-id="agentId" :settings="snapshot.settings" :disabled="!online || busy || state.checking" @saved="controller.refresh()" />
        <ToggleGroup v-else v-model="legacySource" type="single" variant="outline" :aria-label="t('softwareUpdate.source')" :disabled="busy"><ToggleGroupItem v-for="value in ['auto', 'direct', 'proxy', 'controller']" :key="value" :value="value">{{ t(`softwareUpdate.${value === 'controller' ? 'controllerTransfer' : value}`) }}</ToggleGroupItem></ToggleGroup>
        <div v-if="phase" class="flex flex-col gap-2" aria-live="polite"><p class="text-sm">{{ t(phase === 'restarting' ? 'softwareUpdate.agentReconnecting' : `softwareUpdate.phases.${phase}`) }}</p><Progress v-if="busy" :model-value="state.job?.progress ?? operation?.progress ?? 0" :aria-label="t('softwareUpdate.progress')" /><p v-if="transfer.totalBytes > 0" class="text-xs text-muted-foreground tabular-nums">{{ t('softwareUpdate.downloaded', { downloaded: formatSoftwareBytes(transfer.currentBytes), total: formatSoftwareBytes(transfer.totalBytes) }) }}<span v-if="transfer.bytesPerSecond > 0"> · {{ formatSoftwareBytes(transfer.bytesPerSecond) }}/s</span></p></div>
        <details v-if="latest?.notes"><summary class="cursor-pointer text-sm">{{ t('softwareUpdate.notes') }}</summary><p class="mt-2 whitespace-pre-wrap break-words text-sm text-muted-foreground">{{ latest.notes }}</p></details>
      </template>
    </CardContent>
    <CardFooter class="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" :disabled="!online || busy || state.loading || state.checking" @click="controller.check(source)"><Spinner v-if="state.checking" data-icon="inline-start" /><RefreshCw v-else data-icon="inline-start" />{{ t(state.checking ? 'softwareUpdate.checking' : 'softwareUpdate.check') }}</Button>
      <Button v-if="nextAction" size="sm" :disabled="!online || busy || state.checking" @click="confirm(nextAction.kind, nextAction.version, nextAction.operationId)"><Download data-icon="inline-start" />{{ t(`softwareUpdate.${nextAction.kind === 'apply' ? 'apply' : nextAction.kind === 'resume' ? 'resume' : 'update'}`, { version: nextAction.version }) }}</Button>
    </CardFooter>
  </Card>
  <AlertDialog :open="Boolean(ui.confirmation)" @update:open="value => { if (!value) ui.confirmation = '' }"><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{{ t('softwareUpdate.confirmAgentUpdate', { version: ui.version }) }}</AlertDialogTitle><AlertDialogDescription>{{ t('softwareUpdate.agentConfirmation') }}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>{{ t('softwareUpdate.cancel') }}</AlertDialogCancel><AlertDialogAction @click="execute">{{ t('softwareUpdate.confirm') }}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
</template>
