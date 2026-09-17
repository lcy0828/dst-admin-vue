<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Download, RefreshCw, Upload } from '@lucide/vue'
import { jobsV2API, luaJITV2API } from '@/api/v2'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Spinner } from '@/components/ui/spinner'
import { getManagementScope, managementScopeTargetId, MANAGEMENT_SCOPE_CHANGED_EVENT } from '@/lib/managementScope.mjs'
import { luaJITInstallationKey, luaJITJobTerminal, luaJITJobError } from '@/lib/luajitInstaller.mjs'

const { t } = useI18n()
const installations = ref([])
const transfers = ref([])
const packageSource = ref('runtime')
const inspecting = ref(false)
const installationKey = ref('')
const releaseID = ref('')
const sourceURL = ref('')
const sourceSHA = ref('')
const packageFile = ref(null)
const activeJob = ref(null)
const loading = ref(false)
const submitting = ref(false)
const error = ref('')
const scope = ref(getManagementScope())
let generation = 0
let timer = 0
let inspection = 0
let pendingReleaseID = ''
let alive = true
const target = computed(() => installations.value.find(item => luaJITInstallationKey(item) === installationKey.value))
const releases = computed(() => packageSource.value === 'controller' ? transfers.value : (target.value?.releases || []))
watch(releases, values => {
  if (!values.some(item => item.id === releaseID.value)) releaseID.value = values[0]?.id || ''
}, { flush: 'sync' })
const running = computed(() => Boolean(activeJob.value && !luaJITJobTerminal(activeJob.value)))
const busy = computed(() => submitting.value || loading.value || inspecting.value || running.value)
const installedVersion = computed(() => target.value?.performance?.packageVersion || '')
const ready = computed(() => target.value?.performance?.canEnable === true)
const storageKey = () => `dstLuaJITJob:${managementScopeTargetId(scope.value) || 'all'}`

function persistJob(id = '') {
  try { if (id) sessionStorage.setItem(storageKey(), id); else sessionStorage.removeItem(storageKey()) } catch { /* optional */ }
}
async function load() {
  const current = generation
  loading.value = true
  error.value = ''
  try {
    const data = await luaJITV2API.catalog(managementScopeTargetId(scope.value))
    if (!alive || current !== generation) return
    installations.value = data.installations || []
    transfers.value = data.transfers || []
    if (!transfers.value.length) packageSource.value = 'runtime'
    if (!target.value) installationKey.value = installations.value.length ? luaJITInstallationKey(installations.value[0]) : ''
    if (target.value?.targetId !== 'local') await inspectSelected(current)
  } catch (e) { if (alive && current === generation) error.value = e.message }
  finally { if (alive && current === generation) loading.value = false }
}
async function inspectSelected(current = generation, refreshUpstream = false) {
  const selected = target.value
  if (!selected?.online) return
  const selectedKey = luaJITInstallationKey(selected)
  const check = ++inspection
  inspecting.value = true
  try {
    const value = await luaJITV2API.status(selected.targetId, selected.installationId, refreshUpstream)
    if (!alive || current !== generation || selectedKey !== installationKey.value || check !== inspection) return
    installations.value = installations.value.map(item => luaJITInstallationKey(item) === luaJITInstallationKey(value) ? value : item)
  } catch (e) { if (alive && current === generation && selectedKey === installationKey.value) error.value = e.message }
  finally { if (alive && current === generation && check === inspection) inspecting.value = false }
}
function selectInstallation() {
  packageSource.value = 'runtime'
  releaseID.value = ''
  error.value = ''
  inspectSelected()
}
async function poll(id, current = generation) {
  clearTimeout(timer)
  try {
    const job = await jobsV2API.controlPlaneGet(id)
    if (!alive || current !== generation) return
    activeJob.value = job
    if (luaJITJobTerminal(job)) {
      persistJob()
      await load()
      if (alive && current === generation && pendingReleaseID && releases.value.some(item => item.id === pendingReleaseID)) releaseID.value = pendingReleaseID
      pendingReleaseID = ''
      if (alive && current === generation) error.value = luaJITJobError(job) || error.value
      return
    }
    timer = window.setTimeout(() => poll(id, current), 1500)
  } catch (e) {
    if (alive && current === generation) error.value = t('luajitInstaller.trackingFailed', { message: e.message })
  }
}
async function submit(action) {
  if (busy.value) return
  const current = generation
  submitting.value = true
  error.value = ''
  try {
    const job = await action()
    if (!alive || current !== generation) return
    activeJob.value = job
    persistJob(job.id)
    poll(job.id, current)
  } catch (e) { if (alive && current === generation) error.value = e.message }
  finally { if (alive && current === generation) submitting.value = false }
}
function install() {
  if (!target.value?.canInstall || !releaseID.value) return
  const { targetId, installationId } = target.value
  submit(() => luaJITV2API.install({ targetId, installationId, releaseId: releaseID.value, source: packageSource.value }))
}
function download() {
  if (!target.value?.canInstall || busy.value) return
  const { targetId, installationId } = target.value
  packageSource.value = 'runtime'
  pendingReleaseID = sourceSHA.value.trim().toLowerCase()
  submit(() => luaJITV2API.download({ targetId, installationId, url: sourceURL.value.trim(), sha256: pendingReleaseID }))
}
async function upload() {
  if (!packageFile.value || busy.value) return
  const current = generation
  submitting.value = true
  error.value = ''
  try {
    const release = await luaJITV2API.upload(packageFile.value)
    if (!alive || current !== generation) return
    await load()
    if (!alive || current !== generation) return
    packageSource.value = 'controller'
    releaseID.value = release.id
  } catch (e) { if (alive && current === generation) error.value = e.message }
  finally { if (alive && current === generation) submitting.value = false }
}
async function refresh() {
  await load()
  if (running.value) poll(activeJob.value.id)
}
async function resetScope() {
  generation += 1
  clearTimeout(timer)
  scope.value = getManagementScope()
  installations.value = []
  activeJob.value = null
  submitting.value = false
  inspecting.value = false
  packageSource.value = 'runtime'
  pendingReleaseID = ''
  const current = generation
  await load()
  if (!alive || current !== generation) return
  try {
    const id = sessionStorage.getItem(storageKey())
    if (id) { activeJob.value = { id, status: 'pending' }; poll(id, current) }
  } catch { /* optional */ }
}
onMounted(() => { window.addEventListener(MANAGEMENT_SCOPE_CHANGED_EVENT, resetScope); resetScope() })
onBeforeUnmount(() => { alive = false; generation += 1; clearTimeout(timer); window.removeEventListener(MANAGEMENT_SCOPE_CHANGED_EVENT, resetScope) })
</script>

<template>
  <Card id="luajit" class="scroll-mt-6">
    <CardHeader>
      <CardTitle>{{ t('luajitInstaller.title') }}</CardTitle>
      <CardDescription>{{ t('luajitInstaller.description') }}</CardDescription>
    </CardHeader>
    <CardContent class="flex flex-col gap-5">
      <p v-if="loading && !installations.length" role="status" class="flex items-center gap-2 text-sm text-muted-foreground"><Spinner />{{ t('luajitInstaller.loading') }}</p>
      <FieldGroup>
        <Field v-if="installations.length > 1">
          <FieldLabel for="luajit-target">{{ t('luajitInstaller.target') }}</FieldLabel>
          <Select v-model="installationKey" :disabled="busy" @update:model-value="selectInstallation">
            <SelectTrigger id="luajit-target" class="w-full"><SelectValue /></SelectTrigger>
            <SelectContent><SelectGroup><SelectItem v-for="item in installations" :key="luaJITInstallationKey(item)" :value="luaJITInstallationKey(item)">{{ item.targetName }} / {{ item.installationId }}</SelectItem></SelectGroup></SelectContent>
          </Select>
        </Field>
        <p v-if="target" class="text-sm text-muted-foreground">{{ target.targetName }} · {{ installedVersion ? t('luajitInstaller.installed', { version: installedVersion }) : t('luajitInstaller.notInstalled') }}<span v-if="installedVersion"> · {{ ready ? t('luajitInstaller.ready') : t('luajitInstaller.needsRepair') }}</span></p>
        <p v-else-if="!loading" class="text-sm text-muted-foreground">{{ t('luajitInstaller.noInstallation') }}</p>
        <Field v-if="transfers.length">
          <FieldLabel id="luajit-source-label">{{ t('luajitInstaller.source') }}</FieldLabel>
          <ToggleGroup type="single" :model-value="packageSource" variant="outline" :disabled="busy" aria-labelledby="luajit-source-label" @update:model-value="value => { if (value) packageSource = value }">
            <ToggleGroupItem value="runtime">{{ t('luajitInstaller.runtimeSource') }}</ToggleGroupItem>
            <ToggleGroupItem value="controller">{{ t('luajitInstaller.controllerSource') }}</ToggleGroupItem>
          </ToggleGroup>
        </Field>
        <Field v-if="releases.length">
          <FieldLabel for="luajit-release">{{ t('luajitInstaller.version') }}</FieldLabel>
          <Select v-model="releaseID" :disabled="busy">
            <SelectTrigger id="luajit-release" class="w-full sm:w-96"><SelectValue /></SelectTrigger>
            <SelectContent><SelectGroup><SelectItem v-for="item in releases" :key="item.id" :value="item.id">{{ t('luajitInstaller.releaseLabel', { version: item.version }) }} · {{ t(`luajitInstaller.${['upstream', 'compatibility'].includes(item.channel) ? item.channel : 'imported'}`) }} · {{ item.id.slice(0, 8) }}</SelectItem></SelectGroup></SelectContent>
          </Select>
        </Field>
        <p v-else-if="!loading" class="text-sm text-muted-foreground">{{ t('luajitInstaller.noPackage') }}</p>
      </FieldGroup>
      <p v-if="target && !target.canInstall" class="text-sm text-muted-foreground">{{ target.reason }}</p>
      <div class="flex flex-wrap items-center gap-2">
        <Button :disabled="busy || !target?.canInstall || !releaseID" @click="install"><Spinner v-if="submitting || running" data-icon="inline-start" /><Download v-else data-icon="inline-start" />{{ packageSource === 'controller' ? t('luajitInstaller.transferInstall') : (installedVersion ? t('luajitInstaller.reinstall') : t('luajitInstaller.install')) }}</Button>
        <Button variant="outline" :disabled="busy || !target?.online" @click="error = ''; inspectSelected(generation, true)">{{ t('luajitInstaller.checkUpstream') }}</Button>
        <Button variant="outline" :disabled="loading || submitting" @click="refresh"><RefreshCw data-icon="inline-start" />{{ t('luajitInstaller.refresh') }}</Button>
      </div>
      <p class="text-sm text-muted-foreground">{{ t('luajitInstaller.nodeManaged') }}</p>
      <p class="text-sm text-muted-foreground">{{ t('luajitInstaller.stopFirst') }}</p>
      <div v-if="activeJob" role="status" aria-live="polite" class="flex flex-col gap-2">
        <p class="text-sm">{{ luaJITJobTerminal(activeJob) ? t(`luajitInstaller.job.${luaJITJobError(activeJob) ? 'failed' : 'done'}`) : (activeJob.message || t('luajitInstaller.job.running')) }}</p>
        <Progress :model-value="Number(activeJob.progress || 0)" :aria-label="t('luajitInstaller.progress')" />
      </div>
      <Alert v-if="error" variant="destructive"><AlertTitle>{{ t('luajitInstaller.failed') }}</AlertTitle><AlertDescription class="break-words">{{ error }}</AlertDescription></Alert>
      <details class="rounded-md border p-4">
        <summary class="cursor-pointer text-sm font-medium">{{ t('luajitInstaller.importTitle') }}</summary>
        <div class="mt-4 flex flex-col gap-4">
          <p class="text-sm text-muted-foreground">{{ t('luajitInstaller.importDescription') }}</p>
          <FieldGroup>
            <Field><FieldLabel for="luajit-url">{{ t('luajitInstaller.url') }}</FieldLabel><Input id="luajit-url" v-model="sourceURL" type="url" placeholder="https://…/luajit.zip" :disabled="busy" /></Field>
            <Field><FieldLabel for="luajit-sha">SHA-256</FieldLabel><Input id="luajit-sha" v-model="sourceSHA" autocomplete="off" :disabled="busy" /></Field>
          </FieldGroup>
          <Button variant="outline" class="self-start" :disabled="busy || !target?.canInstall || !sourceURL.startsWith('https://') || !/^[a-fA-F0-9]{64}$/.test(sourceSHA.trim())" @click="download"><Download data-icon="inline-start" />{{ t('luajitInstaller.download') }}</Button>
          <p class="text-sm text-muted-foreground">{{ t('luajitInstaller.transferDescription') }}</p>
          <FieldGroup>
            <Field><FieldLabel for="luajit-file">{{ t('luajitInstaller.file') }}</FieldLabel><Input id="luajit-file" type="file" accept=".zip,application/zip" :disabled="busy" @change="packageFile = $event.target.files?.[0] || null" /></Field>
          </FieldGroup>
          <Button variant="outline" class="self-start" :disabled="busy || !packageFile" @click="upload"><Upload data-icon="inline-start" />{{ t('luajitInstaller.upload') }}</Button>
        </div>
      </details>
    </CardContent>
  </Card>
</template>
