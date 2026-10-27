<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { ChevronDown, Download, FolderOpen, RefreshCw, Server, Wrench } from '@lucide/vue'
import { gameInstallationsV2API, gameReleasesV2API, jobsV2API } from '@/api/v2'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Spinner } from '@/components/ui/spinner'
import SteamLoginSettings from '@/components/SteamLoginSettings.vue'
import { getManagementScope, managementScopeTargetId, MANAGEMENT_SCOPE_CHANGED_EVENT } from '@/lib/managementScope.mjs'
import { luaJITJobTerminal, luaJITJobError } from '@/lib/luajitInstaller.mjs'
import { formatJobBytes, formatJobRate } from '@/lib/globalJobs.mjs'
import { gameReleaseBlockerKey } from '@/lib/gameRelease.mjs'
import { installationMaintenanceReady, installationMaintenanceRequest, installationMaintenanceWorlds } from '@/lib/gameInstallation.mjs'

const props = defineProps({
  targetId: { type: String, default: '' },
  maintenanceMenu: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false }
})
const emit = defineEmits(['changed'])
const { t, te } = useI18n()
const router = useRouter()
const jobError = value => luaJITJobError(value, t('gameInstallation.failed'))
const items = ref([]), loading = ref(false), error = ref(''), submitting = ref(false), probing = ref(false)
const selected = ref(null), dialog = ref(''), path = ref(''), candidate = ref(null), dialogError = ref('')
const preview = ref(null), preparing = ref(false), restartRunning = ref(true), release = ref(null)
let preflightSequence = 0
const job = ref(null), scope = ref(getManagementScope())
let generation = 0, timer = 0, alive = true, probeSequence = 0
const running = computed(() => job.value && !luaJITJobTerminal(job.value))
const releaseJob = computed(() => job.value?.kind === 'game.release')
const affectedWorlds = computed(() => installationMaintenanceWorlds(preview.value))
const runningWorlds = computed(() => affectedWorlds.value.filter(world => world.wasRunning))
const canMaintain = computed(() => !preparing.value && installationMaintenanceReady(preview.value, selected.value))
const confirmKey = computed(() => dialog.value === 'adopt' ? 'confirmAdopt' : runningWorlds.value.length ? 'maintenance.confirmStop' : selected.value?.installed ? 'maintenance.confirmValidate' : 'confirmInstall')
const observedNow = ref(Date.now())
const stage = computed(() => job.value?.progressDetail?.stage || 'game.install')
const transfer = computed(() => job.value?.transfer)
const stagePercent = computed(() => {
  if (!running.value) return job.value?.status === 'succeeded' ? 100 : null
  if (releaseJob.value) return null
  return transfer.value?.totalBytes > 0 ? Math.min(100, transfer.value.currentBytes / transfer.value.totalBytes * 100) : null
})
const rate = computed(() => observedNow.value - Date.parse(job.value?.progressDetail?.observedAt || '') < 10000
  ? formatJobRate(transfer.value?.bytesPerSecond) : '')
const busy = computed(() => props.disabled || loading.value || submitting.value || running.value || preparing.value)
const selectedTarget = () => props.targetId || managementScopeTargetId(scope.value)
const key = () => `dstGameInstallationJob:${selectedTarget() || 'all'}`
const identity = item => ({ targetId: item.targetId, installationId: item.installationId })
function blockerLabel(blocker) {
  const key = `gameInstallation.maintenance.blockers.${blocker.code}`
  const sharedKey = gameReleaseBlockerKey(blocker.code)
  const label = te(key) ? t(key) : sharedKey !== 'unknown' ? t(`gameReleases.blockers.${sharedKey}`) : blocker.message
  const target = preview.value?.plan?.installations?.find(item => item.targetId === blocker.targetId && item.installationId === blocker.installationId)
  return target ? `${target.targetName || target.targetId} / ${target.installationId} · ${label}` : label
}
function viewRelease() {
  router.push({ path: '/servers/releases', query: { maintenanceJob: job.value.id }, hash: '#game-release-activity' })
}
const state = item => !item.online ? 'offline' : item.error ? 'unknown' : item.installed ? 'installed' : 'missing'
watch(path, () => { candidate.value = null; dialogError.value = ''; probeSequence += 1; probing.value = false })

async function load(current = generation) {
  loading.value = true; error.value = ''
  try {
    const values = await gameInstallationsV2API.list(selectedTarget())
    if (alive && current === generation) items.value = values || []
  } catch (e) { if (alive && current === generation) error.value = e.message }
  finally { if (alive && current === generation) loading.value = false }
}
function persist(id = '') { try { if (id) sessionStorage.setItem(key(), id); else sessionStorage.removeItem(key()) } catch { /* optional */ } }
async function poll(id, current = generation) {
  clearTimeout(timer)
  try {
    const value = await jobsV2API.controlPlaneGet(id)
    if (!alive || current !== generation) return
    job.value = value
    if (value.kind === 'game.release') {
      try {
        const result = await gameReleasesV2API.get(value.id)
        if (!alive || current !== generation) return
        release.value = result
      } catch { /* A queued job has no release record yet; its durable job remains authoritative. */ }
    }
    observedNow.value = Date.now()
    if (luaJITJobTerminal(value)) { persist(); await load(current); if (alive && current === generation) { error.value = jobError(value) || error.value; if (!jobError(value)) emit('changed') } return }
    timer = window.setTimeout(() => poll(id, current), 2000)
  } catch (e) { if (alive && current === generation) error.value = e.message || t('gameInstallation.trackingFailed') }
}
async function refresh() { await load(); if (running.value) poll(job.value.id) }
function closeDialog() {
  if (submitting.value) return
  dialog.value = ''; probeSequence += 1; preflightSequence += 1; probing.value = false; preparing.value = false; preview.value = null
}
function open(item, kind) {
  if (busy.value) return
  selected.value = item; path.value = ''; candidate.value = null; dialogError.value = ''; preview.value = null; restartRunning.value = true
  dialog.value = kind; probeSequence += 1
  if (kind === 'install') checkMaintenance()
}
async function checkMaintenance() {
  if (!selected.value || dialog.value !== 'install' || submitting.value || props.disabled) return
  const current = generation, sequence = ++preflightSequence
  const input = { ...identity(selected.value), restartRunning: restartRunning.value }
  preparing.value = true; preview.value = null; dialogError.value = ''
  try {
    const result = await gameInstallationsV2API.preview(input)
    if (alive && current === generation && sequence === preflightSequence && dialog.value === 'install') preview.value = result
  } catch (e) {
    if (alive && current === generation && sequence === preflightSequence) dialogError.value = e.message
  } finally {
    if (alive && current === generation && sequence === preflightSequence) preparing.value = false
  }
}
function setRestart(value) { restartRunning.value = value; checkMaintenance() }
async function probe() {
  if (!selected.value || probing.value) return
  const current = generation, sequence = ++probeSequence, currentPath = path.value.trim()
  probing.value = true; dialogError.value = ''
  try {
    const value = await gameInstallationsV2API.probe({ ...identity(selected.value), path: currentPath })
    if (alive && current === generation && sequence === probeSequence && dialog.value === 'adopt') candidate.value = { ...value, path: currentPath }
  } catch (e) { if (alive && current === generation && sequence === probeSequence) dialogError.value = e.message }
  finally { if (alive && current === generation && sequence === probeSequence) probing.value = false }
}
async function submit() {
  if (!selected.value || busy.value || (dialog.value === 'adopt' ? !candidate.value : !canMaintain.value)) return
  const current = generation, kind = dialog.value
  const input = kind === 'adopt' ? identity(selected.value) : installationMaintenanceRequest(preview.value, selected.value)
  if (!input) return
  if (kind === 'adopt') Object.assign(input, { path: candidate.value.path, fingerprint: candidate.value.fingerprint })
  submitting.value = true; dialogError.value = ''
  try {
    const result = await (kind === 'adopt' ? gameInstallationsV2API.adopt(input) : preview.value.mode === 'release' ? gameReleasesV2API.create(input) : gameInstallationsV2API.install(input))
    if (!alive || current !== generation) return
    job.value = result; release.value = null; persist(result.id); dialog.value = ''; poll(result.id, current)
  } catch (e) { if (alive && current === generation) { dialogError.value = e.message; if (kind === 'install') preview.value = null } }
  finally { if (alive && current === generation) submitting.value = false }
}
async function resetScope() {
  preflightSequence += 1; preparing.value = false; preview.value = null; release.value = null
  generation += 1; probeSequence += 1; clearTimeout(timer); scope.value = getManagementScope(); items.value = []; job.value = null; dialog.value = ''; submitting.value = false; probing.value = false
  const current = generation; await load(current)
  if (!alive || current !== generation) return
  try { const id = sessionStorage.getItem(key()); if (id) { job.value = { id, status: 'pending' }; poll(id, current) } } catch { /* optional */ }
}
function handleScopeChange() { if (!props.targetId) resetScope() }
watch(() => props.targetId, resetScope)
onMounted(() => { window.addEventListener(MANAGEMENT_SCOPE_CHANGED_EVENT, handleScopeChange); resetScope() })
onBeforeUnmount(() => { alive = false; generation += 1; preflightSequence += 1; clearTimeout(timer); window.removeEventListener(MANAGEMENT_SCOPE_CHANGED_EVENT, handleScopeChange) })
defineExpose({ refresh })
</script>

<template>
  <Card id="installations" size="sm" class="min-w-0 scroll-mt-6">
    <CardHeader>
      <CardTitle class="flex items-center gap-2"><Server class="size-4 text-muted-foreground" />{{ t('gameInstallation.title') }}</CardTitle>
      <CardDescription v-if="!items.length || items.some(item => !item.installed)">{{ t('gameInstallation.description') }}</CardDescription>
      <CardAction><Button variant="ghost" size="icon-sm" :disabled="loading || submitting || disabled" :aria-label="t('gameInstallation.refresh')" :title="t('gameInstallation.refresh')" @click="refresh"><RefreshCw /></Button></CardAction>
    </CardHeader>
    <CardContent class="flex flex-1 flex-col gap-3 pt-0 group-data-[size=sm]/card:pt-0">
      <p v-if="loading && !items.length" role="status" class="flex items-center gap-2 text-sm text-muted-foreground"><Spinner />{{ t('gameInstallation.loading') }}</p>
      <p v-else-if="!items.length" class="text-sm text-muted-foreground">{{ t('gameInstallation.empty') }}</p>
      <section v-for="item in items" :key="`${item.targetId}/${item.installationId}`" class="flex min-w-0 flex-1 flex-col gap-3 border-b pb-4 last:border-0 last:pb-0">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="flex min-w-0 flex-col gap-1">
            <span class="text-xs text-muted-foreground">{{ t('gameInstallation.currentVersion') }}<template v-if="items.length > 1"> · {{ item.targetName }} / {{ item.installationId }}</template></span>
            <strong class="text-2xl font-semibold tabular-nums">{{ item.gameVersion || '—' }}</strong>
          </div>
          <Badge :variant="item.error ? 'destructive' : !item.online ? 'outline' : item.installed ? 'success' : 'secondary'">{{ t(`gameInstallation.${state(item)}`) }}</Badge>
        </div>
        <p v-if="item.error || item.reason || !item.steamcmdAvailable" class="text-sm text-muted-foreground">{{ item.error || item.reason || t('gameInstallation.steamMissing') }}</p>
        <dl class="grid min-w-0 gap-2 sm:grid-cols-2">
          <div class="min-w-0"><dt class="text-xs text-muted-foreground">{{ t('gameInstallation.location') }}</dt><dd class="mt-1 break-all text-sm">{{ item.serverPath || '—' }}</dd></div>
          <div class="min-w-0"><dt class="text-xs text-muted-foreground">{{ t('gameInstallation.saves') }}</dt><dd class="mt-1 break-all text-sm">{{ item.savePath || '—' }}</dd></div>
          <div v-if="item.resolvedPath && item.resolvedPath !== item.serverPath" class="min-w-0 sm:col-span-2"><dt class="text-xs text-muted-foreground">{{ t('gameInstallation.actualLocation') }}</dt><dd class="mt-1 break-all text-sm">{{ item.resolvedPath }}</dd></div>
        </dl>
        <div class="mt-auto flex flex-wrap items-center gap-2 pt-1">
			<SteamLoginSettings v-if="item.installationId" :target-id="item.targetId" :installation-id="item.installationId" :node-label="items.length > 1 ? `${item.targetName} / ${item.installationId}` : ''" :disabled="busy || !item.online || !item.steamcmdAvailable" />
          <DropdownMenu v-if="item.installed && maintenanceMenu">
            <DropdownMenuTrigger as-child>
              <Button size="sm" variant="outline" :disabled="busy || !item.online || Boolean(item.error) || !item.canInstall">{{ t('gameInstallation.moreMaintenance') }}<ChevronDown data-icon="inline-end" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuGroup>
                <DropdownMenuItem @select="open(item, 'install')"><Wrench />{{ t('gameInstallation.validateFiles') }}</DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button v-else size="sm" :variant="item.installed ? 'outline' : 'default'" :disabled="busy || !item.online || Boolean(item.error) || !item.canInstall" @click="open(item, 'install')"><Download data-icon="inline-start" />{{ t(item.installed ? 'gameInstallation.update' : 'gameInstallation.install') }}</Button>
          <Button v-if="!item.installed" size="sm" variant="outline" :disabled="busy || !item.online || Boolean(item.error) || !item.canAdopt" @click="open(item, 'adopt')"><FolderOpen data-icon="inline-start" />{{ t('gameInstallation.adopt') }}</Button>
          <Button v-if="item.installed" size="sm" variant="outline" @click="router.push('/rooms')">{{ t('gameInstallation.rooms') }}</Button>
        </div>
      </section>
      <div v-if="job" role="status" aria-live="polite" class="flex flex-col gap-3">
        <div class="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span>{{ running ? releaseJob ? t(`gameReleases.stages.${release?.stage || 'previewed'}`) : t(`gameInstallation.stages.${stage.split('.').pop()}`, t('gameInstallation.working')) : t(jobError(job) ? 'gameInstallation.failed' : 'gameInstallation.done') }}</span>
          <span v-if="stagePercent !== null" class="tabular-nums">{{ stagePercent.toFixed(1) }}%</span>
        </div>
        <Progress :model-value="stagePercent" :aria-label="t('gameInstallation.progress')" class="h-2" />
        <div v-if="running && !releaseJob" class="flex flex-wrap justify-between gap-2 text-sm text-muted-foreground">
          <span v-if="transfer?.totalBytes" class="tabular-nums">{{ formatJobBytes(transfer.currentBytes) || '0 B' }} / {{ formatJobBytes(transfer.totalBytes) }}</span>
          <span v-else>{{ t('gameInstallation.waitingProgress') }}</span>
          <span v-if="stage === 'game.download'" class="tabular-nums">{{ t('gameInstallation.speed') }} · {{ rate || t('gameInstallation.measuring') }}</span>
        </div>
        <p v-if="running && stage === 'game.download'" class="text-xs text-muted-foreground">{{ t('gameInstallation.speedHint') }}</p>
        <details v-if="job.message" class="min-w-0 text-sm"><summary class="cursor-pointer text-muted-foreground">{{ t('gameInstallation.latestOutput') }}</summary><pre class="mt-2 max-h-32 overflow-auto whitespace-pre-wrap break-all rounded-md bg-muted p-3 text-xs">{{ job.message }}</pre></details>
        <Button v-if="releaseJob" variant="link" size="sm" class="self-start" @click="viewRelease">{{ t('gameInstallation.maintenance.viewDetails') }}</Button>
      </div>
      <Alert v-if="error" variant="destructive"><AlertTitle>{{ t('gameInstallation.failed') }}</AlertTitle><AlertDescription class="break-words">{{ error }}</AlertDescription></Alert>
    </CardContent>
    <slot name="footer" :items="items" :busy="busy" />
  </Card>
  <Dialog v-if="dialog" :open="Boolean(dialog)" @update:open="value => { if (!value) closeDialog() }">
    <DialogContent>
      <DialogHeader><DialogTitle>{{ t(dialog === 'adopt' ? 'gameInstallation.adoptTitle' : selected?.installed ? 'gameInstallation.maintenance.title' : 'gameInstallation.installTitle') }}</DialogTitle><DialogDescription>{{ dialog === 'adopt' ? t('gameInstallation.adoptDescription') : t('gameInstallation.installDescription', { target: selected?.targetName, path: selected?.serverPath }) }}</DialogDescription></DialogHeader>
      <template v-if="dialog === 'adopt'">
        <p class="break-all text-sm">{{ t('gameInstallation.saves') }}：{{ selected?.savePath }}</p>
        <FieldGroup><Field><FieldLabel for="existing-game-path">{{ t('gameInstallation.path') }}</FieldLabel><Input id="existing-game-path" v-model="path" :placeholder="t('gameInstallation.pathPlaceholder')" :disabled="submitting" /><FieldDescription>{{ t('gameInstallation.preserve') }}</FieldDescription></Field></FieldGroup>
        <Button variant="outline" class="self-start" :disabled="!path.trim() || probing || submitting" @click="probe"><Spinner v-if="probing" data-icon="inline-start" />{{ t(probing ? 'gameInstallation.checking' : 'gameInstallation.probe') }}</Button>
        <Alert v-if="candidate"><AlertTitle>{{ t('gameInstallation.detected', { version: candidate.gameVersion }) }}</AlertTitle><AlertDescription class="break-all">{{ candidate.resolvedPath }}</AlertDescription></Alert>
      </template>
      <template v-else>
        <p v-if="preparing" role="status" class="flex items-center gap-2 text-sm text-muted-foreground"><Spinner />{{ t('gameInstallation.maintenance.checking') }}</p>
        <template v-else-if="preview">
          <Alert v-if="preview.blockers.length" variant="destructive">
            <AlertTitle>{{ t('gameInstallation.maintenance.blocked') }}</AlertTitle>
            <AlertDescription class="flex flex-col gap-2"><span v-for="(blocker, index) in preview.blockers" :key="index">{{ blockerLabel(blocker) }}</span></AlertDescription>
          </Alert>
          <Alert v-else>
            <AlertTitle>{{ t(runningWorlds.length ? 'gameInstallation.maintenance.downtime' : 'gameInstallation.maintenance.ready') }}</AlertTitle>
            <AlertDescription>{{ t(preview.mode === 'release' ? 'gameInstallation.maintenance.managedDescription' : 'gameInstallation.maintenance.idleDescription') }}</AlertDescription>
          </Alert>
          <div v-if="affectedWorlds.length" class="flex max-h-52 flex-col gap-2 overflow-y-auto" :aria-label="t('gameInstallation.maintenance.affected')">
            <div v-for="world in affectedWorlds" :key="`${world.roomId}/${world.worldId}`" class="flex items-start justify-between gap-3 text-sm">
              <div class="min-w-0"><p class="break-words font-medium">{{ world.roomName }} / {{ world.worldName }}</p><p class="text-xs text-muted-foreground">{{ world.targetName }}</p></div>
              <Badge class="shrink-0" :variant="world.wasRunning ? 'warning' : 'secondary'">{{ t(world.wasRunning ? 'gameInstallation.maintenance.willStop' : world.runtimeState === 'stopped' ? 'gameInstallation.maintenance.staysStopped' : 'gameInstallation.maintenance.unknownState') }}</Badge>
            </div>
          </div>
          <p v-if="preview.plan?.installations.length > 1" class="text-sm text-muted-foreground">{{ t('gameInstallation.maintenance.sharedScope') }}</p>
          <FieldGroup v-if="runningWorlds.length">
            <Field orientation="horizontal"><FieldContent><FieldLabel for="game-maintenance-restart">{{ t('gameInstallation.maintenance.restart') }}</FieldLabel><FieldDescription>{{ t('gameInstallation.maintenance.restartHint') }}</FieldDescription></FieldContent><Switch id="game-maintenance-restart" :model-value="restartRunning" :disabled="submitting" @update:model-value="setRestart" /></Field>
          </FieldGroup>
        </template>
      </template>
      <Alert v-if="dialogError" variant="destructive"><AlertTitle>{{ t('gameInstallation.failed') }}</AlertTitle><AlertDescription>{{ dialogError }}</AlertDescription></Alert>
      <DialogFooter><Button variant="outline" :disabled="submitting" @click="closeDialog">{{ t('gameInstallation.cancel') }}</Button><Button v-if="dialog === 'install'" variant="outline" :disabled="preparing || submitting" @click="checkMaintenance">{{ t('gameInstallation.maintenance.recheck') }}</Button><Button :disabled="submitting || (dialog === 'adopt' ? !candidate : !canMaintain)" @click="submit"><Spinner v-if="submitting" data-icon="inline-start" />{{ t(`gameInstallation.${confirmKey}`) }}</Button></DialogFooter>
    </DialogContent>
  </Dialog>
</template>
