<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { Copy, CircleAlert, RefreshCw, Pencil, Settings, ArrowUpCircle, Terminal, Trash2, X } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { agentsV2API, gameInstallationsV2API, runtimeTargetsV2API, topologyV2API } from '@/api/v2'
import { waitForV2Job } from '@/api/v2ConfigurationAdapters'
import { machinePresentation, orderMachineTargets } from '@/lib/machineManagement.mjs'
import { formatSystemDateTime } from '@/lib/dateTime.mjs'
import { cn } from '@/lib/utils'
import { announceRuntimeTargetsUpdated } from '@/utils/runtimeTarget'
import GameInstallationManager from '@/components/GameInstallationManager.vue'
import AgentSoftwareUpdatePanel from '@/components/agents/AgentSoftwareUpdatePanel.vue'
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Empty, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const props = defineProps({
  targets: { type: Array, default: () => [] }, agents: { type: Array, default: () => [] },
  localStatus: { type: Object, default: () => ({}) }, refreshKey: { type: Number, default: 0 },
  unavailable: { type: Boolean, default: false },
})
const emit = defineEmits(['rename', 'configure', 'upgrade', 'command', 'forget', 'target-updated', 'software-updated'])
const { t, locale } = useI18n()
const router = useRouter()
const infrastructure = ref(null), installations = ref([]), loading = ref(false), installLoading = ref(false)
const loadError = ref(''), installError = ref(''), selectedId = ref(''), open = ref(false), tab = ref('overview')
const editingAddress = ref(false), addressValue = ref(''), savingAddress = ref(false)
const editingNetwork = ref(false), networkForm = ref({}), savingNetwork = ref(false), refreshing = ref(false)
const now = ref(Date.now())
let sequence = 0, alive = true, focusOrigin = null, staleTimer = 0

const machines = computed(() => orderMachineTargets(props.targets).map(target => machinePresentation({ target,
  agent: props.agents.find(agent => agent.id === target.agentId), infrastructure: infrastructure.value,
  installations: installations.value, localStatus: props.localStatus, failed: Boolean(loadError.value || props.unavailable), installationFailed: Boolean(installError.value), now: now.value,
})))
const selected = computed(() => machines.value.find(item => item.id === selectedId.value))
const profile = computed(() => (infrastructure.value?.networkProfiles || []).find(item => item.id === selected.value?.environment?.networkProfileId))
const machineName = item => item.name || t(item.target.kind === 'local' ? 'machines.local' : 'machines.unnamed')
const bytes = value => {
  const number = Number(value)
  if (!Number.isFinite(number) || number < 0) return '—'
  if (number === 0) return '0 B'
  const index = Math.max(0, Math.min(4, Math.floor(Math.log(number) / Math.log(1024))))
  return `${new Intl.NumberFormat(locale.value, { maximumFractionDigits: 1 }).format(number / 1024 ** index)} ${['B', 'KB', 'MB', 'GB', 'TB'][index]}`
}
const time = value => formatSystemDateTime(typeof value === 'number' ? value * 1000 : value, { locale: locale.value, fallback: '—' })
function gameText(item) {
  if (item.unknown && item.running) return t('machines.partial', { count: item.running })
  if (installError.value && ['waiting', 'missing', 'stopped'].includes(item.game)) return t('machines.checkFailed')
  return t(`machines.${item.game === 'configure' ? 'configureGame' : item.game}`, { count: item.running })
}
function show(item, nextTab = 'overview') {
  focusOrigin = document.activeElement
  selectedId.value = item.id; tab.value = nextTab; editingAddress.value = false; editingNetwork.value = false; open.value = true
}
function primary(item) {
  if (item.primary === 'configure' && item.agent) { emit('configure', item.agent); return }
  show(item, item.primary === 'diagnose' ? 'diagnostics' : 'overview')
}
function restoreFocus(event) { event.preventDefault(); if (focusOrigin?.isConnected) focusOrigin.focus() }
async function copy(value) {
  try {
    if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(value)
    else {
      const field = document.createElement('textarea'); field.value = value; field.style.position = 'fixed'; field.style.opacity = '0'
      const previous = document.activeElement; document.body.appendChild(field); field.select()
      const copied = document.execCommand('copy'); field.remove(); previous?.focus()
      if (!copied) throw new Error('copy unavailable')
    }
    toast.success(t('machines.copied'))
  } catch { toast.error(t('machines.copyFailed')) }
}

// A one-shot expiry marks old samples honestly without a background fetch loop.
function scheduleExpiry() {
  clearTimeout(staleTimer)
  now.value = Date.now()
  const times = [props.localStatus.observedAt, ...props.agents.map(item => item.metrics_observed_at), ...(infrastructure.value?.machines || []).map(item => item.observedAt)]
  const deadlines = times.map(value => Date.parse(value || '')).filter(value => value <= now.value + 30000 && value + 90000 > now.value).map(value => value + 90000)
  if (deadlines.length) staleTimer = window.setTimeout(scheduleExpiry, Math.min(...deadlines) - now.value + 20)
}
async function load() {
  const current = ++sequence
  loading.value = true; installLoading.value = true
  await Promise.allSettled([
    topologyV2API.infrastructure().then(value => { if (alive && current === sequence) { infrastructure.value = value; loadError.value = ''; scheduleExpiry() } })
      .catch(error => { if (alive && current === sequence) loadError.value = error.message || t('common.errors.unknown') })
      .finally(() => { if (alive && current === sequence) loading.value = false }),
    gameInstallationsV2API.list().then(value => { if (alive && current === sequence) { installations.value = value || []; installError.value = '' } })
      .catch(error => { if (alive && current === sequence) installError.value = error.message || t('common.errors.unknown') })
      .finally(() => { if (alive && current === sequence) installLoading.value = false }),
  ])
}
async function saveAddress() {
  if (!selected.value || savingAddress.value) return
  const id = selected.value.id
  savingAddress.value = true
  try {
    const target = await runtimeTargetsV2API.setDisplayAddress(id, addressValue.value.trim())
    emit('target-updated', target); announceRuntimeTargetsUpdated(); editingAddress.value = false; toast.success(t('machines.saved'))
  } catch (error) { toast.error(error.message || t('machines.saveFailed')) }
  finally { savingAddress.value = false }
}
function editNetwork() {
  networkForm.value = { name: profile.value.name, bindAddress: profile.value.bindAddress, advertiseAddress: profile.value.advertiseAddress }
  editingNetwork.value = true
}
async function saveNetwork() {
  if (!profile.value || savingNetwork.value) return
  savingNetwork.value = true
  try {
    const updated = await topologyV2API.updateNetworkProfile(profile.value.id, networkForm.value)
    infrastructure.value = { ...infrastructure.value, networkProfiles: infrastructure.value.networkProfiles.map(item => item.id === updated.id ? updated : item) }
    editingNetwork.value = false; toast.success(t('distributed.infrastructure.networkDialog.saved'))
  } catch (error) { toast.error(error.message || t('machines.saveFailed')) }
  finally { savingNetwork.value = false }
}
async function refreshInventory() {
  if (!selected.value?.agent || refreshing.value) return
  const id = selected.value.agent.id
  refreshing.value = true
  try { const job = await agentsV2API.refreshInventory(id); await waitForV2Job(job, 45000); if (alive) await load() }
  catch (error) { toast.error(error.message || t('common.errors.unknown')) }
  finally { refreshing.value = false }
}
watch(() => props.refreshKey, load, { immediate: true })
watch(() => [props.localStatus, props.agents], scheduleExpiry)
onBeforeUnmount(() => { alive = false; sequence += 1; clearTimeout(staleTimer) })
defineExpose({ refresh: load })
</script>

<template>
  <section class="machine-panel flex min-w-0 flex-col gap-3">
    <Alert v-if="loadError" variant="destructive">
      <CircleAlert /><AlertTitle>{{ t('machines.loadFailed') }}</AlertTitle><AlertDescription>{{ loadError }}</AlertDescription>
      <AlertAction><Button size="sm" variant="outline" :disabled="loading" @click="load">{{ t('machines.retry') }}</Button></AlertAction>
    </Alert>
    <Alert v-if="installError" variant="destructive">
      <CircleAlert /><AlertTitle>{{ t('machines.installFailed') }}</AlertTitle><AlertDescription>{{ installError }}</AlertDescription>
      <AlertAction><Button size="sm" variant="outline" :disabled="installLoading" @click="load">{{ t('machines.retry') }}</Button></AlertAction>
    </Alert>
    <div class="rounded-lg border px-4 sm:px-5">
      <div class="machine-columns machine-head text-xs text-muted-foreground" aria-hidden="true">
        <span>{{ t('agents.list.fields.node') }}</span><span>{{ t('machines.address') }}</span><span>{{ t('machines.game') }}</span><span>{{ t('machines.resources') }}</span><span>{{ t('agents.list.fields.actions') }}</span>
      </div>
      <ul class="m-0 list-none divide-y p-0" :aria-label="t('agents.list.title')">
        <li v-for="item in machines" :key="item.id" class="machine-columns machine-row" :data-machine-target-id="item.id">
          <div class="machine-name min-w-0">
            <button type="button" class="max-w-full cursor-pointer text-left font-medium break-words hover:underline focus-visible:outline-ring" @click="show(item)">{{ machineName(item) }}</button>
            <div :class="cn('mt-1.5 flex items-center gap-1.5 text-xs', unavailable ? 'text-muted-foreground' : item.target.online ? 'text-success-foreground' : 'text-destructive')">
              <span class="size-1.5 shrink-0 rounded-full bg-current" aria-hidden="true" />{{ t(unavailable ? 'machines.connectionUnknown' : item.target.online ? 'machines.online' : 'machines.disconnected') }}
            </div>
            <button v-if="item.agent?.version" type="button" class="mt-1 flex cursor-pointer flex-wrap items-center gap-1.5 text-left text-xs text-muted-foreground hover:underline" @click="show(item, 'diagnostics')"><span>{{ item.agent.update?.software?.current?.version || (item.agent.version.startsWith('v') ? item.agent.version : 'v' + item.agent.version) }}</span><Badge v-if="item.agent.update?.updateAvailable" variant="secondary">{{ t('softwareUpdate.available') }}</Badge></button>
          </div>
          <div class="machine-address min-w-0">
            <div v-if="item.address" class="flex min-w-0 items-center gap-1">
              <button type="button" class="min-w-0 cursor-pointer text-left font-mono text-sm font-medium break-all hover:underline focus-visible:outline-ring" @click="show(item, 'network')">{{ item.address }}</button>
              <Button variant="ghost" size="icon-sm" :aria-label="t('machines.copyAddress', { address: item.address })" @click="copy(item.address)"><Copy /></Button>
            </div>
            <Button v-else size="sm" variant="link" @click="show(item, 'network')">{{ t('machines.noAddress') }}</Button>
            <button v-if="item.addressNeedsReview" type="button" class="mt-1 cursor-pointer text-left text-xs text-warning-foreground underline underline-offset-4" @click="show(item, 'network')">{{ t('machines.reviewAddress') }}</button>
          </div>
          <div class="machine-game flex min-w-0 flex-col items-start gap-1">
            <span class="machine-mobile-label text-xs text-muted-foreground">{{ t('machines.game') }}</span>
            <Skeleton v-if="loading && !infrastructure" class="h-4 w-24" />
            <span v-else class="text-sm">{{ gameText(item) }}</span>
            <button v-if="item.roomCount" type="button" class="cursor-pointer text-xs text-muted-foreground underline underline-offset-4" @click="show(item, 'worlds')">{{ t('machines.rooms', { count: item.roomCount }) }}</button>
            <span v-if="item.game === 'unknown' && item.observations.some(value => value.available)" class="text-xs text-muted-foreground">{{ t('machines.lastRunning', { count: item.lastRunning }) }} · {{ time(item.lastWorldObservedAt) }}</span>
          </div>
          <div class="machine-resources flex min-w-0 flex-col gap-1 text-sm tabular-nums">
            <span class="machine-mobile-label text-xs text-muted-foreground">{{ t('machines.resources') }}</span>
            <template v-if="item.resourceFresh">
              <span>{{ t('machines.memory', { used: bytes(item.memory.usedBytes), total: bytes(item.memory.totalBytes) }) }}</span>
              <span v-if="item.cpu !== null" class="text-xs text-muted-foreground">{{ t('machines.cpu', { value: Number(item.cpu).toFixed(0) }) }}</span>
              <button v-if="item.memoryRisk" type="button" class="cursor-pointer text-left text-xs text-destructive underline underline-offset-4" @click="show(item)">{{ t('machines.lowMemory') }}</button>
            </template>
            <span v-else class="text-xs text-muted-foreground">{{ t(item.target.online ? 'machines.stale' : 'machines.disconnected') }}</span>
          </div>
          <div class="machine-action"><Button size="sm" variant="outline" @click="primary(item)">{{ t(`machines.${item.primary}`) }}</Button></div>
        </li>
      </ul>
    </div>

    <Sheet v-model:open="open">
      <SheetContent class="data-[side=right]:w-full data-[side=right]:sm:max-w-2xl" :show-close-button="false" @close-auto-focus="restoreFocus">
        <SheetHeader class="pr-14">
          <SheetTitle>{{ selected ? machineName(selected) : t('agents.list.details.title') }}</SheetTitle>
          <SheetDescription>{{ selected?.address || t('machines.detailsDescription') }}</SheetDescription>
        </SheetHeader>
        <SheetClose as-child><Button class="absolute top-3 right-3" variant="ghost" size="icon-sm" :aria-label="t('machines.close')"><X /></Button></SheetClose>
        <div v-if="selected" class="min-h-0 min-w-0 flex-1 overflow-y-auto px-4 pb-6">
          <Tabs v-model="tab" class="min-w-0">
            <TabsList class="h-auto w-full flex-wrap">
              <TabsTrigger value="overview">{{ t('machines.overview') }}</TabsTrigger><TabsTrigger value="network">{{ t('machines.network') }}</TabsTrigger><TabsTrigger value="worlds">{{ t('machines.worlds') }}</TabsTrigger><TabsTrigger value="diagnostics">{{ t('machines.diagnostics') }}</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" class="flex min-w-0 flex-col gap-5 pt-4">
              <Alert v-if="selected.memoryRisk"><CircleAlert /><AlertTitle>{{ t('machines.lowMemory') }}</AlertTitle><AlertDescription>{{ t('machines.memoryAvailable', { value: bytes(selected.memory?.availableBytes) }) }}</AlertDescription></Alert>
              <dl class="grid grid-cols-2 gap-4 text-sm">
                <div><dt class="text-xs text-muted-foreground">{{ t('common.fields.status') }}</dt><dd class="mt-1">{{ t(selected.target.online ? 'machines.online' : 'machines.disconnected') }}</dd></div>
                <div><dt class="text-xs text-muted-foreground">{{ t('machines.game') }}</dt><dd class="mt-1">{{ gameText(selected) }}</dd></div>
                <div><dt class="text-xs text-muted-foreground">{{ t('agents.list.fields.memory') }}</dt><dd class="mt-1">{{ selected.resourceFresh ? bytes(selected.memory.usedBytes) + ' / ' + bytes(selected.memory.totalBytes) : t('machines.stale') }}</dd></div>
                <div><dt class="text-xs text-muted-foreground">{{ t('agents.list.fields.cpu') }}</dt><dd class="mt-1">{{ t('machines.cpuCores', { count: selected.environment?.cpu?.logical_processors || selected.agent?.logical_processors || (selected.target.kind === 'local' ? localStatus.cpu?.threads : null) || '—' }) }}</dd></div>
              </dl>
              <div class="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" @click="emit('rename', selected.target)"><Pencil data-icon="inline-start" />{{ t('agents.list.actions.rename') }}</Button>
                <Button v-if="selected.agent" size="sm" variant="outline" @click="emit('configure', selected.agent)"><Settings data-icon="inline-start" />{{ t('machines.configureGame') }}</Button>
                <Button v-else size="sm" variant="outline" @click="router.push('/system/settings')"><Settings data-icon="inline-start" />{{ t('agents.list.actions.systemSettings') }}</Button>
              </div>
              <Separator />
              <GameInstallationManager :key="selected.id" :target-id="selected.id" @changed="load" />
            </TabsContent>
            <TabsContent value="network" class="flex min-w-0 flex-col gap-5 pt-4">
              <form v-if="editingAddress" class="flex flex-col gap-3" @submit.prevent="saveAddress">
                <FieldGroup><Field><FieldLabel for="machine-display-address">{{ t('machines.displayAddress') }}</FieldLabel><Input id="machine-display-address" v-model="addressValue" maxlength="253" :disabled="savingAddress" /><FieldDescription>{{ t('machines.displayDescription') }}</FieldDescription></Field></FieldGroup>
                <div class="flex flex-wrap gap-2"><Button type="submit" :disabled="savingAddress"><Spinner v-if="savingAddress" data-icon="inline-start" />{{ t('common.actions.save') }}</Button><Button type="button" variant="outline" :disabled="savingAddress" @click="editingAddress = false">{{ t('common.actions.cancel') }}</Button></div>
              </form>
              <template v-else>
                <dl class="flex flex-col gap-4 text-sm">
                  <div><dt class="text-xs text-muted-foreground">{{ t('machines.displayAddress') }}</dt><dd class="mt-1 flex items-center gap-2"><span class="min-w-0 font-mono break-all">{{ selected.address || t('machines.missingAddress') }}</span><Button v-if="selected.address" variant="ghost" size="icon-sm" :aria-label="t('machines.copyAddress', { address: selected.address })" @click="copy(selected.address)"><Copy /></Button></dd><dd class="mt-1 text-xs text-muted-foreground">{{ t(selected.target.displayAddress ? 'machines.manual' : selected.container ? 'machines.containerAddress' : 'machines.automatic') }}</dd></div>
                  <div><dt class="text-xs text-muted-foreground">{{ t('machines.reportedAddresses') }}</dt><dd class="mt-1 font-mono break-all">{{ selected.addresses.join(' · ') || '—' }}</dd></div>
                </dl>
                <Button class="self-start" size="sm" variant="outline" @click="addressValue = selected.target.displayAddress || ''; editingAddress = true">{{ t('machines.editAddress') }}</Button>
              </template>
              <Separator />
              <form v-if="editingNetwork" class="flex flex-col gap-3" @submit.prevent="saveNetwork">
                <FieldGroup>
                  <Field><FieldLabel for="machine-player-address">{{ t('distributed.infrastructure.networkDialog.advertiseAddress') }}</FieldLabel><Input id="machine-player-address" v-model="networkForm.advertiseAddress" :disabled="savingNetwork" /><FieldDescription>{{ t('distributed.infrastructure.networkDialog.advertiseDescription') }}</FieldDescription></Field>
                  <Field><FieldLabel for="machine-bind-address">{{ t('distributed.infrastructure.networkDialog.bindAddress') }}</FieldLabel><Input id="machine-bind-address" v-model="networkForm.bindAddress" :disabled="savingNetwork" /><FieldDescription>{{ t('distributed.infrastructure.networkDialog.bindDescription') }}</FieldDescription></Field>
                </FieldGroup>
                <div class="flex flex-wrap gap-2"><Button type="submit" :disabled="savingNetwork"><Spinner v-if="savingNetwork" data-icon="inline-start" />{{ t('common.actions.save') }}</Button><Button type="button" variant="outline" :disabled="savingNetwork" @click="editingNetwork = false">{{ t('common.actions.cancel') }}</Button></div>
              </form>
              <template v-else-if="profile">
                <dl class="text-sm"><dt class="text-xs text-muted-foreground">{{ t('distributed.infrastructure.networkDialog.advertiseAddress') }}</dt><dd class="mt-1 break-all">{{ profile.advertiseAddress || t('machines.noPlayerAddress') }}</dd></dl>
                <details><summary class="cursor-pointer text-sm text-muted-foreground">{{ t('machines.advancedNetwork') }}</summary><dl class="mt-3 text-sm"><dt class="text-xs text-muted-foreground">{{ t('distributed.infrastructure.networkDialog.bindAddress') }}</dt><dd class="mt-1 break-all">{{ profile.bindAddress }}</dd></dl></details>
                <Button class="self-start" size="sm" variant="outline" @click="editNetwork">{{ t('machines.editNetwork') }}</Button>
              </template>
              <p v-else class="text-sm text-muted-foreground">{{ t('machines.networkMissing') }}</p>
            </TabsContent>
            <TabsContent value="worlds" class="flex min-w-0 flex-col gap-4 pt-4">
              <Button class="self-start" size="sm" variant="outline" @click="router.push('/rooms/topology')">{{ t('agents.list.actions.assignWorlds') }}</Button>
              <Empty v-if="!selected.worlds.length"><EmptyHeader><EmptyTitle>{{ t(infrastructure && !loadError ? 'machines.noWorlds' : 'machines.worldsUnknown') }}</EmptyTitle></EmptyHeader></Empty>
              <ul v-else class="flex list-none flex-col divide-y p-0">
                <li v-for="world in selected.worlds" :key="`${world.roomId}/${world.worldId}`" class="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div class="min-w-0"><p class="text-sm font-medium break-words">{{ world.worldName }}</p><p class="mt-1 text-xs text-muted-foreground break-words">{{ world.roomName }}<span v-if="world.serverPort"> · {{ world.serverPort }}</span></p></div>
                  <div class="flex flex-col items-end gap-1"><Badge :variant="world.known && world.running ? 'secondary' : 'outline'">{{ world.known ? t(world.running ? 'agents.list.values.running' : 'agents.list.values.stopped') : t('machines.unknown') }}</Badge><span v-if="!world.known && world.observedAt" class="text-xs text-muted-foreground">{{ time(world.observedAt) }}</span></div>
                </li>
              </ul>
            </TabsContent>
            <TabsContent value="diagnostics" class="flex min-w-0 flex-col gap-4 pt-4">
              <Alert v-if="!selected.target.online"><CircleAlert /><AlertTitle>{{ t('machines.disconnected') }}</AlertTitle><AlertDescription>{{ t('machines.offlineDescription') }}</AlertDescription></Alert>
              <dl class="grid grid-cols-2 gap-4 text-sm">
                <div><dt class="text-xs text-muted-foreground">{{ t('machines.observed') }}</dt><dd class="mt-1">{{ time(selected.observedAt) }}</dd></div>
                <div v-if="selected.agent"><dt class="text-xs text-muted-foreground">{{ t('agents.list.details.version') }}</dt><dd class="mt-1">{{ selected.agent.update?.software?.current?.version || selected.agent.version || '—' }}</dd></div>
              </dl>
              <template v-if="selected.agent">
                <AgentSoftwareUpdatePanel v-if="selected.agent.capabilities?.includes('agent.software-update.v1') && open && tab === 'diagnostics'" :key="selected.agent.id" :agent-id="selected.agent.id" :online="selected.target.online" @changed="emit('software-updated')" />
                <p v-else-if="selected.agent.update?.updateAvailable" class="text-sm">{{ t('agents.list.updates.available', { version: selected.agent.update.latestVersion }) }}</p>
                <div class="flex flex-wrap gap-2">
                  <Button v-if="selected.target.configured && selected.target.capabilities?.includes('runtime.inventory.read')" size="sm" variant="outline" :disabled="!selected.target.online || refreshing" @click="refreshInventory"><Spinner v-if="refreshing" data-icon="inline-start" /><RefreshCw v-else data-icon="inline-start" />{{ t('agents.list.actions.refreshInventory') }}</Button>
                  <Button size="sm" variant="outline" @click="emit('command', selected.agent.id)"><Terminal data-icon="inline-start" />{{ t('agents.list.actions.executeCommand') }}</Button>
                  <Button v-if="!selected.agent.capabilities?.includes('agent.software-update.v1') && selected.agent.update?.supported && selected.agent.update?.updateAvailable" size="sm" variant="outline" :disabled="!selected.target.online" @click="emit('upgrade', selected.agent)"><ArrowUpCircle data-icon="inline-start" />{{ t('agents.list.updates.upgrade') }}</Button>
                  <Button v-if="!selected.target.online" size="sm" variant="destructive" @click="emit('forget', selected.agent)"><Trash2 data-icon="inline-start" />{{ t('agents.list.actions.remove') }}</Button>
                </div>
              </template>
              <details><summary class="cursor-pointer text-sm text-muted-foreground">{{ t('machines.technical') }}</summary>
                <dl class="mt-4 flex flex-col gap-4 text-sm">
                  <div><dt class="text-xs text-muted-foreground">{{ t('agents.list.details.hostname') }}</dt><dd class="mt-1 break-all">{{ selected.target.hostname || '—' }}</dd></div>
                  <div><dt class="text-xs text-muted-foreground">{{ t('agents.list.fields.system') }}</dt><dd class="mt-1">{{ selected.target.os }} / {{ selected.target.arch }}</dd></div>
                  <div><dt class="text-xs text-muted-foreground">Agent ID</dt><dd class="mt-1 font-mono break-all">{{ selected.target.agentId || selected.id }}</dd></div>
                  <div><dt class="text-xs text-muted-foreground">{{ t('agents.list.details.capabilities') }}</dt><dd class="mt-1 text-xs break-all">{{ selected.target.capabilities?.join(', ') }}</dd></div>
                </dl>
              </details>
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  </section>
</template>

<style scoped>
.machine-panel { container-type: inline-size; }
.machine-columns { display: grid; grid-template-columns: minmax(100px, 1fr) minmax(150px, 1.35fr) minmax(110px, 1fr) minmax(130px, 1.1fr) auto; align-items: center; gap: 16px; }
.machine-head { padding-block: 12px; }
.machine-row { padding-block: 18px; }
.machine-mobile-label { display: none; }
@container (max-width: 740px) {
  .machine-head { display: none; }
  .machine-row { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 14px; }
  .machine-name { grid-column: 1; grid-row: 1; }
  .machine-action { grid-column: 2; grid-row: 1; justify-self: end; }
  .machine-address { grid-column: 1 / -1; grid-row: 2; }
  .machine-game { grid-column: 1; grid-row: 3; }
  .machine-resources { grid-column: 2; grid-row: 3; }
  .machine-mobile-label { display: block; }
}
</style>
