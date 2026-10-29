<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { toast } from 'vue-sonner'
import { Download, RefreshCw, Settings } from '@lucide/vue'
import { serviceLogsV2API as api } from '@/api/v2'
import { mergeServiceLogPages, serviceLogFilters } from '@/lib/serviceLogs.mjs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import { Field, FieldGroup, FieldLabel, FieldDescription } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
const { t, locale } = useI18n(), route = useRoute()
const sources = ref([]), sourceId = ref('controller'), source = ref(null), page = ref(null)
const level = ref('all'), hours = ref('1'), keyword = ref(''), jobId = ref(''), requestId = ref('')
const loading = ref(false), error = ref(''), follow = ref(false), records = ref([]), activeQuery = ref(null)
const selected = ref(null), context = ref(null), contextError = ref(''), contextLoading = ref(false)
const settingsOpen = ref(false), settings = ref(null), saving = ref(false), debug = ref(false), exporting = ref(false), diagnostics = ref(null)
let alive = true, sequence = 0, detailSequence = 0, timer
const catalogSource = computed(() => sources.value.find(item => item.id === sourceId.value))
const unavailable = computed(() => catalogSource.value && (!catalogSource.value.online || !catalogSource.value.supported))
const health = computed(() => page.value?.health || source.value?.health || {})
const stamp = value => value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString(locale.value) : '—'
const badge = entry => ['fatal', 'error'].includes(entry.level) ? 'destructive' : entry.level === 'warn' ? 'outline' : 'secondary'
function cancelPoll() { clearTimeout(timer) }
function schedule() {
  cancelPoll()
  if (alive && follow.value && !document.hidden && !unavailable.value && !settingsOpen.value && !selected.value) {
    timer = setTimeout(async () => { await load(false, true); schedule() }, 5000)
  }
}
async function load(more = false, quiet = false) {
  if (unavailable.value) return
  const current = ++sequence, id = sourceId.value
  if (!quiet) loading.value = true
  error.value = ''
  if (more) follow.value = false
  const query = more ? { ...activeQuery.value, cursor: page.value?.nextCursor } : serviceLogFilters({ sourceId: id, level: level.value, hours: hours.value, keyword: keyword.value, jobId: jobId.value, requestId: requestId.value })
  try {
    const result = await api.query(query)
    if (!alive || current !== sequence) return
    records.value = more ? mergeServiceLogPages(records.value, result.items) : result.items || []
    page.value = result; activeQuery.value = query
    if (!more) diagnostics.value = null
  } catch (e) {
    if (alive && current === sequence) error.value = e.code === 'SERVICE_LOGS_CURSOR_EXPIRED' ? t('serviceLogs.contextExpired') : e.message || t('serviceLogs.failed')
  } finally { if (alive && current === sequence) loading.value = false }
}
async function selectSource() {
  cancelPoll(); const current = ++sequence, id = sourceId.value
  detailSequence++; selected.value = null; records.value = []; page.value = null; source.value = null; diagnostics.value = null; error.value = ''; loading.value = true
  if (unavailable.value) { loading.value = false; return }
  try {
    const result = await api.source(id)
    if (!alive || current !== sequence) return
    source.value = result
    await load()
  } catch (e) { if (alive && current === sequence) { error.value = e.message; loading.value = false } }
  schedule()
}
async function openSettings() {
  const id = sourceId.value
  try {
    const value = await api.settings(id)
    if (!alive || id !== sourceId.value) return
    settings.value = { ...value }; debug.value = !!value.debugUntil && Date.parse(value.debugUntil) > Date.now(); settingsOpen.value = true
  } catch (e) { toast.error(e.message) }
}
async function saveSettings() {
  saving.value = true; const id = sourceId.value
  try {
    await api.saveSettings(id, { ...settings.value, retentionDays: Number(settings.value.retentionDays), maxMiB: Number(settings.value.maxMiB), debugUntil: debug.value ? new Date(Date.now() + 30 * 60000).toISOString() : null })
    if (!alive || id !== sourceId.value) return
    settingsOpen.value = false; toast.success(t('serviceLogs.saved')); await selectSource()
  } catch (e) { toast.error(e.message) }
  finally { saving.value = false }
}
function openEntry(entry) { detailSequence++; selected.value = entry; context.value = null; contextError.value = ''; contextLoading.value = false }
async function loadContext() {
  const current = ++detailSequence, entry = selected.value, id = sourceId.value
  contextLoading.value = true; contextError.value = ''
  try {
    const result = await api.context({ sourceId: id, entryId: entry.id, radius: 15 })
    if (alive && current === detailSequence) context.value = result
  } catch (e) { if (alive && current === detailSequence) contextError.value = e.message }
  finally { if (alive && current === detailSequence) contextLoading.value = false }
}
async function diagnose() {
  const current = ++sequence
  loading.value = true; error.value = ''; follow.value = false
  try {
    const query = { sourceId: sourceId.value, ...(jobId.value.trim() ? { jobId: jobId.value.trim() } : { requestId: requestId.value.trim() }) }
    const result = await api.diagnostics(query)
    if (alive && current === sequence) { diagnostics.value = result; records.value = result.logs?.items || []; page.value = result.logs; activeQuery.value = { ...query, from: result.logs.from, to: result.logs.to, limit: 100 } }
  } catch (e) { if (alive && current === sequence) error.value = e.message }
  finally { if (alive && current === sequence) loading.value = false }
}
async function exportPage() {
  exporting.value = true
  try {
    const blob = await api.export(activeQuery.value || serviceLogFilters({ sourceId: sourceId.value }))
    if (!alive) return
    const url = URL.createObjectURL(blob), a = document.createElement('a')
    a.href = url; a.download = 'dst-admin-service-logs.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
  } catch (e) { toast.error(e.message) }
  finally { exporting.value = false }
}
async function copyDetail() {
  try { await navigator.clipboard.writeText(JSON.stringify(selected.value, null, 2)); toast.success(t('serviceLogs.copied')) }
  catch (e) { toast.error(e.message) }
}
function visibility() { if (!document.hidden) schedule(); else cancelPoll() }
watch(sourceId, selectSource)
watch([follow, settingsOpen, selected], schedule)
watch(() => route.query, query => {
  if (typeof query.jobId === 'string') jobId.value = query.jobId
  if (typeof query.requestId === 'string') requestId.value = query.requestId
}, { immediate: true })
onMounted(async () => {
  document.addEventListener('visibilitychange', visibility)
  try {
    const result = await api.sources()
    if (!alive) return
    sources.value = result.items || []; await selectSource()
  } catch (e) { if (alive) error.value = e.message }
})
onBeforeUnmount(() => { alive = false; sequence++; detailSequence++; cancelPoll(); document.removeEventListener('visibilitychange', visibility) })
</script>

<template>
  <div class="flex min-w-0 flex-col gap-5">
    <header class="flex flex-wrap items-center justify-between gap-3">
      <div><h1 class="text-2xl font-semibold">{{ t('serviceLogs.title') }}</h1><p class="text-sm text-muted-foreground">{{ t('serviceLogs.description') }}</p></div>
      <div class="flex flex-wrap items-center gap-2">
        <Button variant="outline" :disabled="loading || unavailable" @click="load()"><RefreshCw data-icon="inline-start" />{{ t('serviceLogs.refresh') }}</Button>
        <Button variant="outline" :disabled="exporting || !page || unavailable" @click="exportPage"><Download data-icon="inline-start" />{{ t('serviceLogs.export') }}</Button>
        <Button variant="outline" :disabled="unavailable || !source" @click="openSettings"><Settings data-icon="inline-start" />{{ t('serviceLogs.settings') }}</Button>
      </div>
    </header>
    <Card>
      <CardHeader><CardTitle>{{ t('serviceLogs.search') }}</CardTitle><CardDescription v-if="source">{{ t('serviceLogs.storage', { size: (source.bytes / 1048576).toFixed(1), files: source.files }) }}</CardDescription></CardHeader>
      <CardContent>
        <form class="flex flex-col gap-4" @submit.prevent="load()">
          <FieldGroup class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Field><FieldLabel for="service-source">{{ t('serviceLogs.source') }}</FieldLabel><Select v-model="sourceId" :disabled="saving"><SelectTrigger id="service-source" class="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="item in sources" :key="item.id" :value="item.id">{{ item.id === 'controller' ? t('serviceLogs.controller') : item.name }}</SelectItem></SelectGroup></SelectContent></Select></Field>
            <Field><FieldLabel for="service-level">{{ t('serviceLogs.level') }}</FieldLabel><Select v-model="level"><SelectTrigger id="service-level" class="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="all">{{ t('serviceLogs.all') }}</SelectItem><SelectItem v-for="value in ['debug', 'info', 'warn', 'error', 'fatal']" :key="value" :value="value">{{ t(`serviceLogs.levels.${value}`) }}</SelectItem></SelectGroup></SelectContent></Select></Field>
            <Field><FieldLabel for="service-hours">{{ t('serviceLogs.hours') }}</FieldLabel><Select v-model="hours"><SelectTrigger id="service-hours" class="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="1">{{ t('serviceLogs.hour') }}</SelectItem><SelectItem value="24">{{ t('serviceLogs.day') }}</SelectItem><SelectItem value="168">{{ t('serviceLogs.week') }}</SelectItem></SelectGroup></SelectContent></Select></Field>
            <Field><FieldLabel for="service-keyword">{{ t('serviceLogs.keyword') }}</FieldLabel><Input id="service-keyword" v-model="keyword" maxlength="256" :placeholder="t('serviceLogs.keywordPlaceholder')" /></Field>
            <Field><FieldLabel for="service-job">{{ t('serviceLogs.jobId') }}</FieldLabel><Input id="service-job" v-model="jobId" maxlength="128" /></Field>
            <Field><FieldLabel for="service-request">{{ t('serviceLogs.requestId') }}</FieldLabel><Input id="service-request" v-model="requestId" maxlength="128" /></Field>
          </FieldGroup>
          <div class="flex flex-wrap items-center gap-3">
            <Button type="submit" :disabled="loading || unavailable"><Spinner v-if="loading" data-icon="inline-start" />{{ t('serviceLogs.search') }}</Button>
            <Button v-if="Boolean(jobId.trim()) !== Boolean(requestId.trim())" type="button" variant="outline" :disabled="loading || unavailable" @click="diagnose">{{ t('serviceLogs.diagnose') }}</Button>
            <Field orientation="horizontal" class="w-auto"><Switch id="service-follow" v-model="follow" :disabled="unavailable" /><FieldLabel for="service-follow">{{ t('serviceLogs.follow') }}</FieldLabel></Field>
          </div>
        </form>
      </CardContent>
    </Card>
    <Alert v-if="unavailable"><AlertDescription>{{ t(catalogSource.online ? 'serviceLogs.unsupported' : 'serviceLogs.offline') }}</AlertDescription></Alert>
    <Alert v-if="error" variant="destructive"><AlertDescription>{{ error }}</AlertDescription></Alert>
    <Alert v-if="health.persistence === 'degraded'" variant="destructive"><AlertDescription>{{ t('serviceLogs.degraded', { error: health.lastError || t('serviceLogs.unknown') }) }}</AlertDescription></Alert>
    <Alert v-if="health.persistence === 'disabled' || health.persistence === 'not_initialized'"><AlertDescription>{{ t(health.persistence === 'disabled' ? 'serviceLogs.disabled' : 'serviceLogs.notReady') }}</AlertDescription></Alert>
    <Alert v-if="health.dropped"><AlertDescription>{{ t('serviceLogs.dropped', { count: health.dropped }) }}</AlertDescription></Alert>
    <Alert v-if="page?.coverageLost || page?.limited"><AlertDescription>{{ t('serviceLogs.incomplete') }}</AlertDescription></Alert>
    <Alert v-if="diagnostics"><AlertDescription><p>{{ t('serviceLogs.evidence') }}</p><p v-if="diagnostics.job">{{ diagnostics.job.kind }} · {{ diagnostics.job.status }} · {{ diagnostics.job.id }}</p><p v-if="diagnostics.missing?.length">{{ t('serviceLogs.missing', { reason: diagnostics.missing.join(', ') }) }}</p><p v-for="(target, index) in diagnostics.job?.targets || []" :key="index">{{ target.name }} · {{ target.status }} {{ target.errorCode }} {{ target.errorMessage }}</p></AlertDescription></Alert>
    <p v-if="loading && !records.length" role="status" class="text-sm text-muted-foreground">{{ t('serviceLogs.loading') }}</p>
    <Empty v-else-if="!records.length && !error && !unavailable"><EmptyHeader><EmptyTitle>{{ t('serviceLogs.empty') }}</EmptyTitle><EmptyDescription>{{ t('serviceLogs.emptyHint') }}</EmptyDescription></EmptyHeader></Empty>
    <div v-if="records.length" class="min-w-0 overflow-hidden rounded-lg border">
      <button v-for="entry in records" :key="entry.id" type="button" class="flex w-full min-w-0 flex-col gap-2 border-b p-3 text-left last:border-b-0 hover:bg-muted/50 sm:flex-row sm:items-start" @click="openEntry(entry)">
        <div class="flex shrink-0 items-center gap-2 sm:w-64 sm:flex-wrap"><time class="text-xs text-muted-foreground">{{ stamp(entry.time) }}</time><Badge :variant="badge(entry)">{{ t(`serviceLogs.levels.${entry.level}`) }}</Badge><span class="text-xs text-muted-foreground">{{ entry.component }}</span></div>
        <div class="min-w-0 flex-1"><p v-if="entry.code" class="break-all text-xs font-medium">{{ entry.code }}</p><p class="line-clamp-3 whitespace-pre-wrap break-all font-mono text-xs">{{ entry.message }}</p><p v-if="entry.jobId || entry.requestId" class="mt-1 break-all text-xs text-muted-foreground">{{ entry.jobId ? `${t('serviceLogs.jobId')}: ${entry.jobId}` : `${t('serviceLogs.requestId')}: ${entry.requestId}` }}</p><p v-if="entry.repeated" class="text-xs text-muted-foreground">{{ t('serviceLogs.repeated', { count: entry.repeated }) }}</p></div>
      </button>
    </div>
    <Button v-if="page?.hasMore && records.length < 1000" variant="outline" :disabled="loading" @click="load(true)">{{ t('serviceLogs.more') }}</Button>
    <p v-if="records.length >= 1000" class="text-sm text-muted-foreground">{{ t('serviceLogs.limit') }}</p>
    <Dialog :open="!!selected" @update:open="value => { if (!value) { selected = null; detailSequence++ } }">
      <DialogContent class="max-h-[85dvh] overflow-y-auto sm:max-w-3xl"><DialogHeader><DialogTitle>{{ t('serviceLogs.detail') }}</DialogTitle><DialogDescription>{{ t('serviceLogs.contextHint') }}</DialogDescription></DialogHeader>
        <template v-if="selected"><div class="flex flex-wrap items-center gap-2"><Badge :variant="badge(selected)">{{ selected.level }}</Badge><span class="text-sm">{{ stamp(selected.time) }} · {{ selected.component }} {{ selected.version }}</span><Badge v-if="selected.truncated" variant="outline">{{ t('serviceLogs.truncated') }}</Badge></div>
        <dl class="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-xs"><template v-for="key in ['code', 'jobId', 'requestId', 'operationId', 'roomId', 'worldId', 'bootId']" :key="key"><template v-if="selected[key]"><dt class="text-muted-foreground">{{ key }}</dt><dd class="break-all font-mono">{{ selected[key] }}</dd></template></template></dl>
        <pre class="whitespace-pre-wrap break-all rounded-md bg-muted p-3 text-xs">{{ selected.message }}<template v-if="selected.stack">{{ '\n' + selected.stack }}</template></pre></template>
        <Alert v-if="contextError" variant="destructive"><AlertDescription>{{ contextError }}</AlertDescription></Alert>
        <div v-if="context" class="flex flex-col gap-2"><p v-if="context.limited || context.coverageLost" class="text-sm text-muted-foreground">{{ t('serviceLogs.incomplete') }}</p><pre v-for="item in context.items" :key="item.id" class="whitespace-pre-wrap break-all rounded-md bg-muted p-2 text-xs">{{ stamp(item.time) }} [{{ item.level }}] {{ item.message }}</pre></div>
        <DialogFooter><Button variant="outline" @click="copyDetail">{{ t('serviceLogs.copy') }}</Button><Button :disabled="contextLoading" @click="loadContext"><Spinner v-if="contextLoading" data-icon="inline-start" />{{ t('serviceLogs.context') }}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
    <Dialog v-model:open="settingsOpen"><DialogContent><DialogHeader><DialogTitle>{{ t('serviceLogs.settingsTitle') }}</DialogTitle><DialogDescription>{{ t('serviceLogs.settingsDescription') }}</DialogDescription></DialogHeader>
      <form v-if="settings" class="flex flex-col gap-4" @submit.prevent="saveSettings"><FieldGroup>
        <Field orientation="horizontal"><Switch id="log-enabled" v-model="settings.enabled" /><FieldLabel for="log-enabled">{{ t('serviceLogs.enabled') }}</FieldLabel></Field>
        <Field><FieldLabel for="log-retention">{{ t('serviceLogs.retention') }}</FieldLabel><Input id="log-retention" v-model="settings.retentionDays" type="number" min="1" max="30" required /></Field>
        <Field><FieldLabel for="log-capacity">{{ t('serviceLogs.capacity') }}</FieldLabel><Input id="log-capacity" v-model="settings.maxMiB" type="number" min="10" max="1024" required /></Field>
        <Field><div class="flex items-center gap-3"><Switch id="log-debug" v-model="debug" /><FieldLabel for="log-debug">{{ t('serviceLogs.debug') }}</FieldLabel></div><FieldDescription>{{ t('serviceLogs.debugHint') }}</FieldDescription></Field>
      </FieldGroup><DialogFooter><Button type="button" variant="outline" :disabled="saving" @click="settingsOpen = false">{{ t('serviceLogs.cancel') }}</Button><Button type="submit" :disabled="saving"><Spinner v-if="saving" data-icon="inline-start" />{{ t('serviceLogs.save') }}</Button></DialogFooter></form>
    </DialogContent></Dialog>
  </div>
</template>
