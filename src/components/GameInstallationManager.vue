<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { Download, FolderOpen, RefreshCw } from '@lucide/vue'
import { gameInstallationsV2API, jobsV2API } from '@/api/v2'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Spinner } from '@/components/ui/spinner'
import { getManagementScope, managementScopeTargetId, MANAGEMENT_SCOPE_CHANGED_EVENT } from '@/lib/managementScope.mjs'
import { luaJITJobTerminal, luaJITJobError } from '@/lib/luajitInstaller.mjs'

const emit = defineEmits(['changed'])
const { t } = useI18n()
const router = useRouter()
const jobError = value => luaJITJobError(value, t('gameInstallation.failed'))
const items = ref([]), loading = ref(false), error = ref(''), submitting = ref(false), probing = ref(false)
const selected = ref(null), dialog = ref(''), path = ref(''), candidate = ref(null), dialogError = ref('')
const job = ref(null), scope = ref(getManagementScope())
let generation = 0, timer = 0, alive = true, probeSequence = 0
const running = computed(() => job.value && !luaJITJobTerminal(job.value))
const busy = computed(() => loading.value || submitting.value || running.value)
const key = () => `dstGameInstallationJob:${managementScopeTargetId(scope.value) || 'all'}`
const identity = item => ({ targetId: item.targetId, installationId: item.installationId })
const state = item => !item.online ? 'offline' : item.error ? 'unknown' : item.installed ? 'installed' : 'missing'
watch(path, () => { candidate.value = null; dialogError.value = ''; probeSequence += 1; probing.value = false })

async function load(current = generation) {
  loading.value = true; error.value = ''
  try {
    const values = await gameInstallationsV2API.list(managementScopeTargetId(scope.value))
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
    if (luaJITJobTerminal(value)) { persist(); await load(current); if (alive && current === generation) { error.value = jobError(value) || error.value; if (!jobError(value)) emit('changed') } return }
    timer = window.setTimeout(() => poll(id, current), 2000)
  } catch (e) { if (alive && current === generation) error.value = e.message || t('gameInstallation.trackingFailed') }
}
async function refresh() { await load(); if (running.value) poll(job.value.id) }
function open(item, kind) { selected.value = item; path.value = ''; candidate.value = null; dialogError.value = ''; dialog.value = kind; probeSequence += 1 }
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
  if (!selected.value || busy.value || (dialog.value === 'adopt' && !candidate.value)) return
  const current = generation, input = identity(selected.value), kind = dialog.value
  if (kind === 'adopt') Object.assign(input, { path: candidate.value.path, fingerprint: candidate.value.fingerprint })
  submitting.value = true; dialogError.value = ''
  try {
    const result = await (kind === 'adopt' ? gameInstallationsV2API.adopt(input) : gameInstallationsV2API.install(input))
    if (!alive || current !== generation) return
    job.value = result; persist(result.id); dialog.value = ''; poll(result.id, current)
  } catch (e) { if (alive && current === generation) dialogError.value = e.message }
  finally { if (alive && current === generation) submitting.value = false }
}
async function resetScope() {
  generation += 1; probeSequence += 1; clearTimeout(timer); scope.value = getManagementScope(); items.value = []; job.value = null; dialog.value = ''; submitting.value = false; probing.value = false
  const current = generation; await load(current)
  if (!alive || current !== generation) return
  try { const id = sessionStorage.getItem(key()); if (id) { job.value = { id, status: 'pending' }; poll(id, current) } } catch { /* optional */ }
}
onMounted(() => { window.addEventListener(MANAGEMENT_SCOPE_CHANGED_EVENT, resetScope); resetScope() })
onBeforeUnmount(() => { alive = false; generation += 1; clearTimeout(timer); window.removeEventListener(MANAGEMENT_SCOPE_CHANGED_EVENT, resetScope) })
</script>

<template>
  <Card id="installations" class="scroll-mt-6">
    <CardHeader>
      <div class="flex flex-wrap items-center justify-between gap-3">
        <CardTitle>{{ t('gameInstallation.title') }}</CardTitle>
        <Button variant="outline" size="sm" :disabled="loading || submitting" @click="refresh"><RefreshCw data-icon="inline-start" />{{ t('gameInstallation.refresh') }}</Button>
      </div>
      <CardDescription>{{ t('gameInstallation.description') }}</CardDescription>
    </CardHeader>
    <CardContent class="flex flex-col gap-4">
      <p v-if="loading && !items.length" role="status" class="flex items-center gap-2 text-sm text-muted-foreground"><Spinner />{{ t('gameInstallation.loading') }}</p>
      <p v-else-if="!items.length" class="text-sm text-muted-foreground">{{ t('gameInstallation.empty') }}</p>
      <Card v-for="item in items" :key="`${item.targetId}/${item.installationId}`" size="sm">
        <CardHeader>
          <div class="flex flex-wrap items-center gap-2"><CardTitle>{{ item.targetName }}<span v-if="item.installationId"> · {{ item.installationId }}</span></CardTitle><Badge :variant="item.error ? 'destructive' : item.installed ? 'secondary' : 'outline'">{{ t(`gameInstallation.${state(item)}`) }}</Badge><Badge v-if="item.gameVersion" variant="outline">{{ t('gameInstallation.version', { version: item.gameVersion }) }}</Badge></div>
          <CardDescription>{{ item.error || item.reason || (item.steamcmdAvailable ? t('gameInstallation.steamReady') : t('gameInstallation.steamMissing')) }}</CardDescription>
        </CardHeader>
        <CardContent class="flex flex-col gap-3">
          <dl class="grid min-w-0 gap-x-4 gap-y-1 text-sm sm:grid-cols-[auto_1fr]">
            <dt class="text-muted-foreground">{{ t('gameInstallation.location') }}</dt><dd class="break-all">{{ item.serverPath || '—' }}</dd>
            <template v-if="item.resolvedPath && item.resolvedPath !== item.serverPath"><dt class="text-muted-foreground">{{ t('gameInstallation.actualLocation') }}</dt><dd class="break-all">{{ item.resolvedPath }}</dd></template>
            <dt class="text-muted-foreground">{{ t('gameInstallation.saves') }}</dt><dd class="break-all">{{ item.savePath || '—' }}</dd>
          </dl>
          <div class="flex flex-wrap gap-2">
            <Button size="sm" :disabled="busy || !item.online || Boolean(item.error) || !item.canInstall" @click="open(item, 'install')"><Download data-icon="inline-start" />{{ t(item.installed ? 'gameInstallation.update' : 'gameInstallation.install') }}</Button>
            <Button v-if="!item.installed" size="sm" variant="outline" :disabled="busy || !item.online || Boolean(item.error) || !item.canAdopt" @click="open(item, 'adopt')"><FolderOpen data-icon="inline-start" />{{ t('gameInstallation.adopt') }}</Button>
            <Button v-if="item.installed" size="sm" variant="outline" @click="router.push('/rooms')">{{ t('gameInstallation.rooms') }}</Button>
          </div>
        </CardContent>
      </Card>
      <div v-if="job" role="status" aria-live="polite" class="flex flex-col gap-2"><p class="text-sm">{{ luaJITJobTerminal(job) ? t(jobError(job) ? 'gameInstallation.failed' : 'gameInstallation.done') : (job.message || t('gameInstallation.working')) }}</p><Progress :model-value="Number(job.progress || 0)" :aria-label="t('gameInstallation.progress')" /></div>
      <Alert v-if="error" variant="destructive"><AlertTitle>{{ t('gameInstallation.failed') }}</AlertTitle><AlertDescription class="break-words">{{ error }}</AlertDescription></Alert>
    </CardContent>
  </Card>
  <Dialog :open="Boolean(dialog)" @update:open="value => { if (!value && !submitting) { dialog = ''; probeSequence += 1; probing = false } }">
    <DialogContent>
      <DialogHeader><DialogTitle>{{ t(dialog === 'adopt' ? 'gameInstallation.adoptTitle' : 'gameInstallation.installTitle') }}</DialogTitle><DialogDescription>{{ dialog === 'adopt' ? t('gameInstallation.adoptDescription') : t('gameInstallation.installDescription', { target: selected?.targetName, path: selected?.serverPath }) }}</DialogDescription></DialogHeader>
      <template v-if="dialog === 'adopt'">
        <p class="break-all text-sm">{{ t('gameInstallation.saves') }}：{{ selected?.savePath }}</p>
        <FieldGroup><Field><FieldLabel for="existing-game-path">{{ t('gameInstallation.path') }}</FieldLabel><Input id="existing-game-path" v-model="path" :placeholder="t('gameInstallation.pathPlaceholder')" :disabled="submitting" /><FieldDescription>{{ t('gameInstallation.preserve') }}</FieldDescription></Field></FieldGroup>
        <Button variant="outline" class="self-start" :disabled="!path.trim() || probing || submitting" @click="probe"><Spinner v-if="probing" data-icon="inline-start" />{{ t(probing ? 'gameInstallation.checking' : 'gameInstallation.probe') }}</Button>
        <Alert v-if="candidate"><AlertTitle>{{ t('gameInstallation.detected', { version: candidate.gameVersion }) }}</AlertTitle><AlertDescription class="break-all">{{ candidate.resolvedPath }}</AlertDescription></Alert>
      </template>
      <Alert v-if="dialogError" variant="destructive"><AlertTitle>{{ t('gameInstallation.failed') }}</AlertTitle><AlertDescription>{{ dialogError }}</AlertDescription></Alert>
      <DialogFooter><Button variant="outline" :disabled="submitting" @click="dialog = ''">{{ t('gameInstallation.cancel') }}</Button><Button :disabled="submitting || (dialog === 'adopt' && !candidate)" @click="submit"><Spinner v-if="submitting" data-icon="inline-start" />{{ t(dialog === 'adopt' ? 'gameInstallation.confirmAdopt' : 'gameInstallation.confirmInstall') }}</Button></DialogFooter>
    </DialogContent>
  </Dialog>
</template>
