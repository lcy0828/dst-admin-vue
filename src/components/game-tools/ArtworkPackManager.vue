<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Download, Images, RefreshCw, Trash2, Upload } from '@lucide/vue'
import { artworkPackV2API } from '@/api/v2'
import { artworkPackState as status, refreshArtworkPack } from '@/composables/useArtworkPack'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Spinner } from '@/components/ui/spinner'

const { t } = useI18n()
const open = ref(false), source = ref('domestic'), pending = ref(false), error = ref(''), upload = ref(null), uploadProgress = ref(null)
let timer = 0
const installed = computed(() => status.value?.installed)
const available = computed(() => status.value?.available)
const busy = computed(() => pending.value || status.value?.busy)
const action = computed(() => !installed.value ? 'install' : installed.value.version !== available.value?.version ? 'update' : 'reinstall')
const phase = computed(() => uploadProgress.value !== null ? 'uploading' : status.value?.phase || 'idle')
const progress = computed(() => uploadProgress.value ?? (['downloading', 'uploading'].includes(phase.value) ? Math.min(100, (status.value?.receivedBytes || 0) / (status.value?.totalBytes || 1) * 100) : null))
const bytes = value => `${((value || 0) / 1048576).toFixed(1)} MiB`

function schedule() {
  clearTimeout(timer)
  if (open.value && busy.value) timer = setTimeout(async () => { await refresh(); schedule() }, 1500)
}
async function refresh() {
  try { await refreshArtworkPack() } catch (e) { error.value = e.message }
}
async function act(request) {
  pending.value = true; error.value = ''; schedule()
  try { await request() } catch (e) { error.value = e.message }
  finally { pending.value = false; uploadProgress.value = null; await refresh(); schedule() }
}
function importFile(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  if (file.size > 20 * 1024 * 1024) { error.value = t('workbench.pack.tooLarge'); return }
  uploadProgress.value = 0
  act(() => artworkPackV2API.upload(file, event => {
    uploadProgress.value = event.total ? Math.min(100, event.loaded / event.total * 100) : null
  }))
}
watch(open, async value => {
  clearTimeout(timer)
  if (value) { error.value = ''; await refresh(); schedule() }
})
onMounted(refresh)
onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <Dialog v-model:open="open">
    <DialogTrigger as-child><Button variant="outline" size="sm"><Images data-icon="inline-start" />{{ t('workbench.pack.button') }}</Button></DialogTrigger>
    <DialogContent>
      <DialogHeader><DialogTitle>{{ t('workbench.pack.title') }}</DialogTitle><DialogDescription>{{ t('workbench.pack.description') }}</DialogDescription></DialogHeader>
      <Alert v-if="error" variant="destructive"><AlertDescription>{{ error }}</AlertDescription></Alert>
      <template v-if="available">
        <div class="flex flex-wrap items-center justify-between gap-2"><Badge :variant="installed ? 'secondary' : 'outline'">{{ t(installed ? 'workbench.pack.installed' : 'workbench.pack.notInstalled') }}</Badge><span class="text-xs text-muted-foreground">{{ t('workbench.pack.shared') }}</span></div>
        <dl class="grid grid-cols-2 gap-3 text-sm">
          <div><dt class="text-muted-foreground">{{ t('workbench.pack.version') }}</dt><dd>{{ installed?.version || available.version }}</dd></div>
          <div><dt class="text-muted-foreground">{{ t('workbench.pack.storage') }}</dt><dd>{{ bytes(installed?.bytes || available.installedBytes) }}</dd></div>
          <div><dt class="text-muted-foreground">{{ t('workbench.pack.entities') }}</dt><dd>{{ installed?.entities || available.entities }}</dd></div>
          <div><dt class="text-muted-foreground">{{ t('workbench.pack.illustrated') }}</dt><dd>{{ installed?.illustrated || available.illustrated }}</dd></div>
        </dl>
        <p class="text-xs text-muted-foreground">{{ t('workbench.pack.coverage', { version: installed?.gameVersion || available.gameVersion }) }}</p>
        <Separator />
        <FieldGroup><Field><FieldLabel>{{ t('workbench.pack.source') }}</FieldLabel><Select v-model="source" :disabled="busy"><SelectTrigger class="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="domestic">{{ t('workbench.pack.domestic') }}</SelectItem><SelectItem value="github">GitHub</SelectItem></SelectGroup></SelectContent></Select></Field></FieldGroup>
        <div v-if="busy" class="flex flex-col gap-2" role="status" aria-live="polite">
          <div class="flex items-center gap-2 text-sm"><Spinner />{{ t(`workbench.pack.phases.${phase}`) }}</div>
          <Progress :model-value="progress" :aria-label="t('workbench.pack.progress')" />
          <div v-if="phase === 'downloading'" class="flex justify-between gap-2 text-xs text-muted-foreground"><span>{{ bytes(status?.receivedBytes) }} / {{ bytes(status?.totalBytes) }}</span><span>{{ bytes(status?.bytesPerSecond) }}/s</span></div>
        </div>
        <Alert v-if="status?.error && !busy" variant="destructive"><AlertDescription>{{ t(`workbench.pack.errors.${status.error}`) }}</AlertDescription></Alert>
        <div class="flex flex-wrap gap-2">
          <Button :disabled="busy" @click="act(() => artworkPackV2API.install(source))"><RefreshCw v-if="installed" data-icon="inline-start" /><Download v-else data-icon="inline-start" />{{ t(`workbench.pack.${action}`) }} · {{ bytes(available.archiveBytes) }}</Button>
          <Button variant="outline" :disabled="busy" @click="upload?.click()"><Upload data-icon="inline-start" />{{ t('workbench.pack.import') }}</Button>
          <input ref="upload" type="file" class="sr-only" tabindex="-1" accept=".tar.gz,.tgz,application/gzip" :aria-label="t('workbench.pack.import')" @change="importFile">
          <Button v-if="status?.busy && phase !== 'uploading'" variant="outline" :disabled="pending" @click="act(() => artworkPackV2API.cancel())">{{ t('workbench.pack.cancel') }}</Button>
        </div>
        <div v-if="installed || status?.error === 'invalid_installed_pack'" class="flex flex-wrap items-center justify-between gap-2"><p class="text-xs text-muted-foreground">{{ t('workbench.pack.uninstallHint') }}</p><Button variant="ghost" size="sm" :disabled="busy" @click="act(() => artworkPackV2API.uninstall())"><Trash2 data-icon="inline-start" />{{ t('workbench.pack.uninstall') }}</Button></div>
      </template>
      <Button v-else variant="outline" @click="refresh"><RefreshCw data-icon="inline-start" />{{ t('workbench.pack.retry') }}</Button>
    </DialogContent>
  </Dialog>
</template>
