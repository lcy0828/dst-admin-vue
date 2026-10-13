<script setup>
import { computed, onBeforeUnmount, onMounted, ref, useId } from 'vue'
import { useI18n } from 'vue-i18n'
import { Mail, Webhook, Plus, RefreshCw, Send, Pencil, Trash2, CircleAlert } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { notificationsV2API } from '@/api/v2'
import { notificationEvents, notificationForm, notificationInput, notificationHistoryPending, webhookPresets } from '@/lib/notificationChannels.mjs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'

const props = defineProps({ defaultEmail: { type: String, default: '' } })
const { t, locale } = useI18n(), id = useId()
const channels = ref([]), deliveries = ref([]), total = ref(0), offset = ref(0)
const loading = ref(true), action = ref(''), error = ref(''), formError = ref('')
const open = ref(false), remove = ref(null), detail = ref(null), compose = ref(false)
const form = ref(notificationForm(null)), message = ref({ title: '', body: '' })
const customEnabled = computed(() => channels.value.some(channel => channel.enabled && !channel.failuresOnly && channel.events.includes('custom')))
let timer, alive = true, sequence = 0
const fieldId = name => `${id}-${name}`
const eventLabel = kind => t(`notifications.eventLabels.${kind.replaceAll('.', '_')}`)
const time = value => new Date(value).toLocaleString(locale.value)
const statusVariant = status => ({ sent: 'success', failed: 'destructive', queued: 'warning', sending: 'info' })[status] || 'secondary'

function schedule() {
  clearTimeout(timer)
  if (alive && notificationHistoryPending(deliveries.value)) timer = setTimeout(loadHistory, 2000)
}
async function loadHistory() {
  const current = ++sequence
  try {
    const result = await notificationsV2API.history(25, offset.value)
    if (!alive || current !== sequence) return
    deliveries.value = result.items || []; total.value = result.total || 0; error.value = ''
    if (detail.value) detail.value = deliveries.value.find(item => item.id === detail.value.id) || detail.value
    schedule()
  } catch (e) { if (alive && current === sequence) { error.value = e.message || t('notifications.failed'); clearTimeout(timer) } }
}
async function load() {
  loading.value = true; error.value = ''
  try {
    const result = await notificationsV2API.channels()
    if (alive) channels.value = result.items || []
    await loadHistory()
  } catch (e) { if (alive) error.value = e.message || t('notifications.failed') }
  finally { if (alive) loading.value = false }
}
function edit(channel) { form.value = notificationForm(channel, props.defaultEmail); formError.value = ''; open.value = true }
function selectEvent(kind, selected) {
  form.value.events = selected ? [...new Set([...form.value.events, kind])] : form.value.events.filter(value => value !== kind)
}
function preset(value) {
  form.value.responseMode = value
  Object.assign(form.value, webhookPresets[value])
}
async function save() {
  if (action.value) return
  let input
  formError.value = ''
  try { input = notificationInput(form.value) }
  catch (e) { formError.value = t(`notifications.validation.${e.message}`); return }
  action.value = 'save'
  try {
    await notificationsV2API.save(form.value.id, input)
    if (!alive) return
    open.value = false; form.value = notificationForm(null); toast.success(t('notifications.saved')); await load()
  } catch (e) { if (alive) formError.value = e.message || t('notifications.failed') }
  finally { if (alive) action.value = '' }
}
async function perform(key, run) {
  if (action.value) return
  action.value = key
  try { await run(); if (alive) { offset.value = 0; toast.success(t('notifications.queued')); await loadHistory() } }
  catch (e) { if (alive) toast.error(e.message || t('notifications.failed')) }
  finally { if (alive) action.value = '' }
}
async function deleteChannel() {
  const channel = remove.value
  if (!channel || action.value) return
  remove.value = null; action.value = 'delete'
  try { await notificationsV2API.remove(channel.id, channel.revision); if (alive) { toast.success(t('notifications.removed')); await load() } }
  catch (e) { if (alive) toast.error(e.message || t('notifications.failed')) }
  finally { if (alive) action.value = '' }
}
async function sendMessage() {
  await perform('custom', async () => {
    await notificationsV2API.send(message.value.title, message.value.body)
    if (alive) { compose.value = false; message.value = { title: '', body: '' } }
  })
}
function page(next) { offset.value = next; void loadHistory() }
onMounted(load)
onBeforeUnmount(() => { alive = false; sequence++; clearTimeout(timer); form.value.url = ''; form.value.headers = '' })
</script>

<template>
  <section class="flex min-w-0 flex-col gap-4">
    <Alert v-if="error" variant="destructive"><CircleAlert /><AlertTitle>{{ t('notifications.failed') }}</AlertTitle><AlertDescription>{{ error }}</AlertDescription><Button size="sm" variant="outline" :disabled="loading" @click="load">{{ t('notifications.refresh') }}</Button></Alert>
    <Card>
      <CardHeader class="flex flex-wrap items-start justify-between gap-3">
        <div class="flex flex-col gap-1"><CardTitle>{{ t('notifications.channels') }}</CardTitle><CardDescription>{{ t('notifications.description') }}</CardDescription></div>
        <div class="flex flex-wrap gap-2"><Button size="sm" variant="outline" :disabled="Boolean(action) || !customEnabled" :title="customEnabled ? t('notifications.sendHelp') : t('notifications.noCustomChannels')" @click="compose = true"><Send data-icon="inline-start" />{{ t('notifications.send') }}</Button><Button size="sm" :disabled="Boolean(action)" @click="edit(null)"><Plus data-icon="inline-start" />{{ t('notifications.add') }}</Button></div>
      </CardHeader>
      <CardContent>
        <Skeleton v-if="loading && !channels.length" class="h-28 w-full" />
        <Empty v-else-if="!channels.length"><EmptyHeader><EmptyTitle>{{ t('notifications.empty') }}</EmptyTitle><EmptyDescription>{{ t('notifications.emptyDescription') }}</EmptyDescription></EmptyHeader><EmptyContent><Button variant="outline" @click="edit(null)">{{ t('notifications.add') }}</Button></EmptyContent></Empty>
        <ul v-else class="m-0 flex list-none flex-col divide-y p-0">
          <li v-for="channel in channels" :key="channel.id" class="flex flex-col items-start gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div class="flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:flex-1">
              <div class="flex flex-wrap items-center gap-2"><Mail v-if="channel.type === 'email'" class="size-4 shrink-0" /><Webhook v-else class="size-4 shrink-0" /><span class="font-medium break-words">{{ channel.name }}</span><Badge :variant="channel.enabled ? 'success' : 'secondary'">{{ t(channel.enabled ? 'common.states.enabled' : 'common.states.disabled') }}</Badge><Badge v-if="channel.failuresOnly" variant="outline">{{ t('notifications.failuresOnly') }}</Badge></div>
              <p v-if="channel.type === 'email'" class="text-sm text-muted-foreground break-all">{{ channel.recipients.join(' · ') }}</p>
              <p class="text-xs text-muted-foreground break-words">{{ channel.events.map(eventLabel).join(' · ') }}</p>
            </div>
            <div class="flex shrink-0 flex-wrap gap-1.5"><Button variant="outline" size="sm" :disabled="Boolean(action)" @click="perform(channel.id, () => notificationsV2API.test(channel.id))"><Spinner v-if="action === channel.id" data-icon="inline-start" /><Send v-else data-icon="inline-start" />{{ t('notifications.test') }}</Button><Button variant="ghost" size="icon-sm" :disabled="Boolean(action)" :aria-label="`${t('notifications.edit')} ${channel.name}`" @click="edit(channel)"><Pencil /></Button><Button variant="ghost" size="icon-sm" :disabled="Boolean(action)" :aria-label="`${t('notifications.remove')} ${channel.name}`" @click="remove = channel"><Trash2 /></Button></div>
          </li>
        </ul>
      </CardContent>
    </Card>
    <Card>
      <CardHeader class="flex flex-wrap items-start justify-between gap-3"><div class="flex flex-col gap-1"><CardTitle>{{ t('notifications.history') }}</CardTitle><CardDescription>{{ t('notifications.historyDescription') }}</CardDescription></div><Button size="sm" variant="outline" :disabled="loading" @click="loadHistory"><RefreshCw data-icon="inline-start" />{{ t('notifications.refresh') }}</Button></CardHeader>
      <CardContent>
        <Empty v-if="!deliveries.length"><EmptyHeader><EmptyTitle>{{ t('notifications.noHistory') }}</EmptyTitle></EmptyHeader></Empty>
        <template v-else>
          <ul class="m-0 flex list-none flex-col divide-y p-0 md:hidden">
            <li v-for="item in deliveries" :key="item.id" class="flex flex-col gap-2 py-3">
              <div class="flex items-start justify-between gap-3"><button type="button" class="min-w-0 flex-1 cursor-pointer text-left break-words hover:underline" @click="detail = item">{{ item.event.title }}</button><Badge class="shrink-0" :variant="statusVariant(item.status)">{{ t(`notifications.statuses.${item.status}`) }}</Badge></div>
              <div class="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground"><span class="break-words">{{ item.channelName }}</span><time :datetime="item.createdAt">{{ time(item.createdAt) }}</time></div>
            </li>
          </ul>
          <Table class="hidden md:table"><TableHeader><TableRow><TableHead>{{ t('notifications.message') }}</TableHead><TableHead>{{ t('notifications.channel') }}</TableHead><TableHead>{{ t('notifications.status') }}</TableHead><TableHead>{{ t('notifications.time') }}</TableHead></TableRow></TableHeader><TableBody><TableRow v-for="item in deliveries" :key="item.id"><TableCell><button type="button" class="max-w-72 cursor-pointer text-left break-words hover:underline" @click="detail = item">{{ item.event.title }}</button></TableCell><TableCell>{{ item.channelName }}</TableCell><TableCell><Badge :variant="statusVariant(item.status)">{{ t(`notifications.statuses.${item.status}`) }}</Badge></TableCell><TableCell class="whitespace-nowrap text-xs text-muted-foreground">{{ time(item.createdAt) }}</TableCell></TableRow></TableBody></Table>
        </template>
      </CardContent>
      <CardFooter v-if="offset > 0 || offset + 25 < total" class="flex justify-end gap-2"><Button size="sm" variant="outline" :disabled="offset === 0" @click="page(Math.max(0, offset - 25))">{{ t('notifications.previous') }}</Button><Button size="sm" variant="outline" :disabled="offset + 25 >= total" @click="page(offset + 25)">{{ t('notifications.next') }}</Button></CardFooter>
    </Card>

    <Dialog :open="open" @update:open="value => { if (!action) { open = value; if (!value) form = notificationForm(null) } }">
      <DialogContent class="sm:max-w-2xl" :show-close-button="!action">
        <DialogHeader><DialogTitle>{{ t(form.id ? 'notifications.edit' : 'notifications.add') }}</DialogTitle><DialogDescription>{{ t('notifications.description') }}</DialogDescription></DialogHeader>
        <form class="flex min-w-0 flex-col gap-5" @submit.prevent="save">
          <FieldGroup>
            <Field><FieldLabel :for="fieldId('name')">{{ t('notifications.name') }}</FieldLabel><Input :id="fieldId('name')" v-model="form.name" maxlength="100" :disabled="Boolean(action)" required /></Field>
            <Field><FieldLabel :for="fieldId('type')">{{ t('notifications.type') }}</FieldLabel><Select v-model="form.type" :disabled="Boolean(action)"><SelectTrigger :id="fieldId('type')" class="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="email">{{ t('notifications.email') }}</SelectItem><SelectItem value="webhook">{{ t('notifications.webhook') }}</SelectItem></SelectGroup></SelectContent></Select></Field>
            <Field orientation="horizontal"><Switch :id="fieldId('enabled')" v-model="form.enabled" :disabled="Boolean(action)" /><FieldLabel :for="fieldId('enabled')">{{ t('notifications.enabled') }}</FieldLabel></Field>
            <Field v-if="form.type === 'email'"><FieldLabel :for="fieldId('recipients')">{{ t('notifications.recipients') }}</FieldLabel><Textarea :id="fieldId('recipients')" v-model="form.recipients" rows="3" :disabled="Boolean(action)" required /><FieldDescription>{{ t('notifications.recipientsHelp') }}</FieldDescription></Field>
            <template v-else>
              <Field><FieldLabel :for="fieldId('url')">{{ t('notifications.url') }}</FieldLabel><Input :id="fieldId('url')" v-model="form.url" type="url" autocomplete="off" :placeholder="form.urlConfigured ? t('notifications.urlSaved') : 'https://example.com/webhook'" :disabled="Boolean(action)" :required="!form.urlConfigured" /><FieldDescription>{{ t('notifications.urlHelp') }}</FieldDescription></Field>
              <details class="min-w-0"><summary class="cursor-pointer text-sm font-medium">{{ t('notifications.advanced') }}</summary>
                <FieldGroup class="mt-4">
                  <Field><FieldLabel :for="fieldId('preset')">{{ t('notifications.preset') }}</FieldLabel><Select :model-value="form.responseMode" :disabled="Boolean(action)" @update:model-value="preset"><SelectTrigger :id="fieldId('preset')" class="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="value in ['http', 'wecom', 'dingtalk', 'feishu']" :key="value" :value="value">{{ t(`notifications.${value}`) }}</SelectItem></SelectGroup></SelectContent></Select></Field>
                  <Field><FieldLabel :for="fieldId('method')">{{ t('notifications.method') }}</FieldLabel><Select v-model="form.method" :disabled="Boolean(action)"><SelectTrigger :id="fieldId('method')" class="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="POST">POST</SelectItem><SelectItem value="PUT">PUT</SelectItem></SelectGroup></SelectContent></Select></Field>
                  <Field><FieldLabel :for="fieldId('format')">{{ t('notifications.format') }}</FieldLabel><Select v-model="form.format" :disabled="Boolean(action)"><SelectTrigger :id="fieldId('format')" class="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="json">{{ t('notifications.json') }}</SelectItem><SelectItem value="text">{{ t('notifications.text') }}</SelectItem></SelectGroup></SelectContent></Select></Field>
                  <Field><FieldLabel :for="fieldId('headers')">{{ t('notifications.headers') }}</FieldLabel><Textarea :id="fieldId('headers')" v-model="form.headers" rows="3" autocomplete="off" :placeholder="form.headersConfigured ? t('notifications.headersSaved') : '{}'" :disabled="Boolean(action)" /><FieldDescription>{{ t('notifications.headersHelp') }}</FieldDescription></Field>
                  <Field><FieldLabel :for="fieldId('template')">{{ t('notifications.template') }}</FieldLabel><Textarea :id="fieldId('template')" v-model="form.template" rows="8" class="font-mono" :disabled="Boolean(action)" required /><FieldDescription>{{ t('notifications.templateHelp') }}</FieldDescription></Field>
                </FieldGroup>
              </details>
            </template>
            <FieldSet><FieldLegend>{{ t('notifications.events') }}</FieldLegend><FieldGroup class="grid gap-3 sm:grid-cols-2"><Field v-for="kind in notificationEvents" :key="kind" orientation="horizontal"><Checkbox :id="fieldId(kind)" :model-value="form.events.includes(kind)" :disabled="Boolean(action)" @update:model-value="selected => selectEvent(kind, selected)" /><FieldLabel :for="fieldId(kind)">{{ eventLabel(kind) }}</FieldLabel></Field></FieldGroup></FieldSet>
            <Field><div class="flex items-center gap-3"><Switch :id="fieldId('failures')" v-model="form.failuresOnly" :disabled="Boolean(action)" /><FieldLabel :for="fieldId('failures')">{{ t('notifications.failuresOnly') }}</FieldLabel></div><FieldDescription>{{ t('notifications.failuresHelp') }}</FieldDescription></Field>
          </FieldGroup>
          <Alert v-if="formError" variant="destructive"><CircleAlert /><AlertTitle>{{ t('notifications.failed') }}</AlertTitle><AlertDescription>{{ formError }}</AlertDescription></Alert>
          <DialogFooter><Button type="button" variant="outline" :disabled="Boolean(action)" @click="open = false; form = notificationForm(null)">{{ t('notifications.cancel') }}</Button><Button type="submit" :disabled="Boolean(action)"><Spinner v-if="action === 'save'" data-icon="inline-start" />{{ t('notifications.save') }}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    <AlertDialog :open="Boolean(remove)" @update:open="value => { if (!value) remove = null }"><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{{ t('notifications.removeTitle') }}</AlertDialogTitle><AlertDialogDescription>{{ remove?.name }} · {{ t('notifications.removeDescription') }}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>{{ t('notifications.cancel') }}</AlertDialogCancel><Button variant="destructive" :disabled="Boolean(action)" @click="deleteChannel">{{ t('notifications.remove') }}</Button></AlertDialogFooter></AlertDialogContent></AlertDialog>
    <Dialog :open="Boolean(detail)" @update:open="value => { if (!value) detail = null }"><DialogContent><DialogHeader><DialogTitle>{{ t('notifications.details') }}</DialogTitle><DialogDescription>{{ detail?.channelName }}</DialogDescription></DialogHeader><template v-if="detail"><p class="font-medium break-words">{{ detail.event.title }}</p><p class="whitespace-pre-wrap break-words">{{ detail.event.message }}</p><div class="flex flex-wrap items-center gap-2"><Badge :variant="statusVariant(detail.status)">{{ t(`notifications.statuses.${detail.status}`) }}</Badge><span class="text-xs text-muted-foreground">{{ t('notifications.attempts') }}: {{ detail.attempts }}</span><span v-if="detail.httpStatus" class="text-xs text-muted-foreground">HTTP {{ detail.httpStatus }}</span></div><Alert v-if="detail.errorCode" variant="destructive"><AlertTitle>{{ t('notifications.statuses.failed') }}</AlertTitle><AlertDescription>{{ t(`notifications.errors.${detail.errorCode}`) }}</AlertDescription></Alert><template v-if="detail.status === 'failed'"><p class="text-xs text-muted-foreground">{{ t('notifications.retryHint') }}</p><Button :disabled="Boolean(action)" @click="perform('retry', () => notificationsV2API.retry(detail.id))">{{ t('notifications.retry') }}</Button></template></template></DialogContent></Dialog>
    <Dialog :open="compose" @update:open="value => { if (!action) compose = value }"><DialogContent :show-close-button="!action"><DialogHeader><DialogTitle>{{ t('notifications.send') }}</DialogTitle><DialogDescription>{{ t('notifications.sendHelp') }}</DialogDescription></DialogHeader><form class="flex flex-col gap-4" @submit.prevent="sendMessage"><FieldGroup><Field><FieldLabel :for="fieldId('title')">{{ t('notifications.title') }}</FieldLabel><Input :id="fieldId('title')" v-model="message.title" maxlength="200" required :disabled="Boolean(action)" /></Field><Field><FieldLabel :for="fieldId('body')">{{ t('notifications.body') }}</FieldLabel><Textarea :id="fieldId('body')" v-model="message.body" rows="6" maxlength="8192" required :disabled="Boolean(action)" /></Field></FieldGroup><DialogFooter><Button type="button" variant="outline" :disabled="Boolean(action)" @click="compose = false">{{ t('notifications.cancel') }}</Button><Button type="submit" :disabled="Boolean(action) || !message.title.trim() || !message.body.trim()"><Spinner v-if="action === 'custom'" data-icon="inline-start" />{{ t('notifications.send') }}</Button></DialogFooter></form></DialogContent></Dialog>
  </section>
</template>
