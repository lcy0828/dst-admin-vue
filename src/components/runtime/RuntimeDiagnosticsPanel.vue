<template>
  <Card>
    <CardHeader>
      <CardTitle>{{ $t('runtime.diagnostics.title') }}</CardTitle>
      <CardDescription>{{ $t('runtime.diagnostics.description') }}</CardDescription>
    </CardHeader>
    <CardContent>
      <Alert v-if="!roomId || !worldId">
        <Activity />
        <AlertTitle>{{ $t('runtime.diagnostics.title') }}</AlertTitle>
        <AlertDescription>{{ $t('runtime.diagnostics.unavailable') }}</AlertDescription>
      </Alert>
      <Tabs v-else default-value="events">
        <TabsList>
          <TabsTrigger value="events">{{ $t('runtime.diagnostics.eventsTab') }}</TabsTrigger>
          <TabsTrigger value="diagnostics">{{ $t('runtime.diagnostics.diagnosticsTab') }}</TabsTrigger>
        </TabsList>
        <TabsContent value="events" class="runtime-tab">
          <div class="tab-toolbar">
            <div class="tab-meta">
              <Badge variant="outline">{{ eventBatch?.shardId || worldName }}</Badge>
              <span v-if="eventBatch">{{ eventBatch.firstSequence }}-{{ eventBatch.lastSequence }}</span>
            </div>
            <UiButton size="sm" variant="outline" :disabled="eventsLoading" @click="loadEvents">
              <Spinner v-if="eventsLoading" data-icon="inline-start" />
              <RefreshCw v-else data-icon="inline-start" />
              {{ $t('runtime.diagnostics.refreshEvents') }}
            </UiButton>
          </div>
          <Alert v-if="eventsError" variant="destructive">
            <TriangleAlert />
            <AlertTitle>{{ $t('runtime.diagnostics.eventsTab') }}</AlertTitle>
            <AlertDescription>{{ $t('runtime.diagnostics.eventLoadFailed', { error: eventsError.message }) }}</AlertDescription>
          </Alert>
          <Empty v-else-if="!eventsLoading && events.length === 0">
            <EmptyHeader><EmptyMedia variant="icon"><ListTree /></EmptyMedia><EmptyTitle>{{ $t('runtime.diagnostics.noEvents') }}</EmptyTitle><EmptyDescription>{{ $t('runtime.diagnostics.noEventsDescription') }}</EmptyDescription></EmptyHeader>
          </Empty>
          <div v-else class="table-wrap">
            <UiTable>
              <TableHeader><TableRow><TableHead>{{ $t('runtime.diagnostics.columns.sequence') }}</TableHead><TableHead>{{ $t('runtime.diagnostics.columns.kind') }}</TableHead><TableHead>{{ $t('runtime.diagnostics.columns.occurredAt') }}</TableHead><TableHead>{{ $t('runtime.diagnostics.columns.fields') }}</TableHead></TableRow></TableHeader>
              <TableBody>
                <TableRow v-for="event in events" :key="event.sequence">
                  <TableCell>{{ event.sequence }}</TableCell>
                  <TableCell><Badge variant="outline">{{ event.kind }}</Badge></TableCell>
                  <TableCell>{{ formatTimestamp(event.occurredAtUnix) }}</TableCell>
                  <TableCell><code>{{ compactJSON(event.fields) }}</code></TableCell>
                </TableRow>
              </TableBody>
            </UiTable>
          </div>
        </TabsContent>
        <TabsContent value="diagnostics" class="runtime-tab">
          <FieldGroup class="diagnostic-form">
            <Field>
              <FieldLabel for="runtime-profile">{{ $t('runtime.diagnostics.profile') }}</FieldLabel>
              <UiSelect id="runtime-profile" v-model="form.profile">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectGroup><SelectItem v-for="profile in profiles" :key="profile" :value="profile">{{ $t(`runtime.diagnostics.profiles.${profile}`) }}</SelectItem></SelectGroup></SelectContent>
              </UiSelect>
            </Field>
            <Field v-if="form.profile === 'prefab'">
              <FieldLabel for="runtime-prefab">{{ $t('runtime.diagnostics.prefab') }}</FieldLabel>
              <UiInput id="runtime-prefab" v-model="form.prefab" :placeholder="$t('runtime.diagnostics.prefabPlaceholder')" />
            </Field>
            <Field v-if="form.profile === 'prefab'">
              <FieldLabel for="runtime-limit">{{ $t('runtime.diagnostics.sampleLimit') }}</FieldLabel>
              <UiInput id="runtime-limit" v-model.number="form.sampleLimit" type="number" min="0" max="50" />
            </Field>
            <Field v-if="form.profile === 'performance'">
              <FieldLabel for="runtime-duration">{{ $t('runtime.diagnostics.duration') }}</FieldLabel>
              <UiInput id="runtime-duration" v-model.number="form.durationSeconds" type="number" min="1" max="5" />
            </Field>
            <Field class="diagnostic-action">
              <FieldLabel class="sr-only">{{ $t('runtime.diagnostics.capture') }}</FieldLabel>
              <UiButton :disabled="capturing || !canCapture" @click="captureDiagnostic">
                <Spinner v-if="capturing" data-icon="inline-start" />
                <Gauge v-else data-icon="inline-start" />
                {{ $t('runtime.diagnostics.capture') }}
              </UiButton>
            </Field>
          </FieldGroup>
          <Alert v-if="diagnosticError" variant="destructive">
            <TriangleAlert />
            <AlertTitle>{{ $t('runtime.diagnostics.latest') }}</AlertTitle>
            <AlertDescription>{{ $t('runtime.diagnostics.diagnosticLoadFailed', { error: diagnosticError.message }) }}</AlertDescription>
          </Alert>
          <Empty v-else-if="!diagnostic">
            <EmptyHeader><EmptyMedia variant="icon"><Gauge /></EmptyMedia><EmptyTitle>{{ $t('runtime.diagnostics.noDiagnostic') }}</EmptyTitle><EmptyDescription>{{ $t('runtime.diagnostics.noDiagnosticDescription') }}</EmptyDescription></EmptyHeader>
          </Empty>
          <div v-else class="diagnostic-report">
            <div class="report-header">
              <div><h4>{{ $t('runtime.diagnostics.latest') }}</h4><p>{{ diagnostic.message || '--' }}</p></div>
              <Badge :variant="diagnostic.ok ? 'secondary' : 'destructive'">{{ diagnostic.code }}</Badge>
            </div>
            <dl>
              <div><dt>{{ $t('runtime.diagnostics.profile') }}</dt><dd>{{ $t(`runtime.diagnostics.profiles.${diagnostic.profile}`) }}</dd></div>
              <div><dt>{{ $t('runtime.diagnostics.completedAt') }}</dt><dd>{{ formatTimestamp(diagnostic.completedAtUnix) }}</dd></div>
            </dl>
            <div><strong>{{ $t('runtime.diagnostics.result') }}</strong><pre>{{ formattedResult }}</pre></div>
          </div>
        </TabsContent>
      </Tabs>
    </CardContent>
  </Card>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { Activity, Gauge, ListTree, RefreshCw, TriangleAlert } from '@lucide/vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { runtimeV2API } from '@/api/v2'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button as UiButton } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input as UiInput } from '@/components/ui/input'
import { Select as UiSelect, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { Table as UiTable, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const props = defineProps({
  roomId: { type: String, default: '' },
  worldId: { type: String, default: '' },
  worldName: { type: String, default: '' }
})
const { t, locale } = useI18n()
const eventBatch = ref(null)
const eventsLoading = ref(false)
const eventsError = ref(null)
const diagnostic = ref(null)
const diagnosticError = ref(null)
const capturing = ref(false)
const profiles = ['summary', 'prefab', 'performance']
const form = reactive({ profile: 'summary', prefab: '', sampleLimit: 10, durationSeconds: 3 })
const events = computed(() => eventBatch.value?.events || [])
const formattedResult = computed(() => JSON.stringify(diagnostic.value?.result || {}, null, 2))
const canCapture = computed(() => form.profile !== 'prefab' || /^[a-z0-9_]{1,80}$/.test(form.prefab.trim()))

function formatTimestamp(value) {
  if (!value) return '--'
  return new Intl.DateTimeFormat(locale.value, { dateStyle: 'medium', timeStyle: 'medium' }).format(new Date(Number(value) * 1000))
}
function compactJSON(value) {
  const text = JSON.stringify(value || {})
  return text.length > 180 ? `${text.slice(0, 177)}...` : text
}
async function loadEvents() {
  if (!props.roomId || !props.worldId) return
  eventsLoading.value = true
  eventsError.value = null
  try {
    eventBatch.value = await runtimeV2API.events(props.roomId, props.worldId)
  } catch (cause) {
    eventsError.value = cause
    eventBatch.value = null
  } finally {
    eventsLoading.value = false
  }
}
async function loadLatestDiagnostic() {
  if (!props.roomId || !props.worldId) return
  diagnosticError.value = null
  try {
    diagnostic.value = await runtimeV2API.latestDiagnostic(props.roomId, props.worldId)
  } catch (cause) {
    diagnostic.value = null
    if (!['RUNTIME_RESULT_ABSENT', 'RESOURCE_NOT_FOUND'].includes(cause.code)) diagnosticError.value = cause
  }
}
async function captureDiagnostic() {
  if (!canCapture.value) return
  capturing.value = true
  diagnosticError.value = null
  try {
    const input = { profile: form.profile }
    if (form.profile === 'prefab') Object.assign(input, { prefab: form.prefab.trim(), sampleLimit: Number(form.sampleLimit) })
    if (form.profile === 'performance') input.durationSeconds = Number(form.durationSeconds)
    diagnostic.value = await runtimeV2API.captureDiagnostic(props.roomId, props.worldId, input)
    toast.success(t('runtime.diagnostics.captureSucceeded'))
  } catch (cause) {
    diagnosticError.value = cause
    toast.error(t('runtime.diagnostics.captureFailed', { error: cause.message }))
  } finally {
    capturing.value = false
  }
}

watch(() => [props.roomId, props.worldId], ([roomId, worldId]) => {
  eventBatch.value = null
  diagnostic.value = null
  eventsError.value = null
  diagnosticError.value = null
  if (roomId && worldId) {
    loadEvents()
    loadLatestDiagnostic()
  }
}, { immediate: true })
</script>

<style scoped>
.runtime-tab,
.diagnostic-report {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-top: 16px;
}
.tab-toolbar,
.tab-meta,
.report-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.tab-meta {
  justify-content: flex-start;
  color: var(--muted-foreground);
  font-size: 13px;
}
.diagnostic-form {
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  align-items: end;
}
.diagnostic-action {
  justify-content: flex-end;
}
.table-wrap {
  overflow-x: auto;
}
code,
pre {
  font-family: var(--font-mono);
  font-size: 12px;
}
pre {
  max-height: 320px;
  overflow: auto;
  margin-top: 8px;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--muted);
}
.report-header h4,
.report-header p {
  margin: 0;
}
.report-header p {
  color: var(--muted-foreground);
}
.diagnostic-report dl {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
  margin: 0;
}
.diagnostic-report dl div {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.diagnostic-report dt {
  color: var(--muted-foreground);
  font-size: 12px;
}
.diagnostic-report dd {
  margin: 0;
}
</style>
