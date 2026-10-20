<script setup>
import { computed, nextTick, onMounted, ref, useId, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ArrowDown, CircleAlert, KeyRound, Paperclip, Send, Settings2, Sparkles, Square, Trash2, X } from '@lucide/vue'
import { aiPageRoom, useAIAssistant } from '@/composables/useAIAssistant'
import { cn } from '@/lib/utils'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import AIChatMessage from './AIChatMessage.vue'

const props = defineProps({ floating: Boolean })
defineEmits(['configure'])
const { t } = useI18n()
const route = useRoute()
const session = useAIAssistant()
const { loading, initialized, error, rooms, calls, config, selectedRoom, draft, attachments, privateInputs, uploading, uploadProgress, messages, busy, phase, chatReady, persistenceError } = session
const id = useId()
const thread = ref(null)
const filePicker = ref(null)
const privateOpen = ref(false), privateName = ref(''), privateValue = ref(''), privateSaving = ref(false), privateError = ref('')
watch(privateOpen, value => { privateError.value = ''; if (!value) { privateName.value = ''; privateValue.value = '' } })
async function savePrivateInput() {
  if (privateSaving.value) return
  privateSaving.value = true
  privateError.value = ''
  try { if (await session.addPrivateInput(privateName.value, privateValue.value)) privateOpen.value = false; else privateError.value = error.value || t('ai.failure') }
  finally { privateSaving.value = false }
}
async function pickFile(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (file) await session.upload(file)
}
let followBottom = true
const newReply = ref(false)
const messageKeys = new WeakMap()
let nextMessageKey = 0
function messageKey(message) {
  if (!messageKeys.has(message)) messageKeys.set(message, ++nextMessageKey)
  return messageKeys.get(message)
}
const statuses = computed(() => new Map(calls.value.map(call => [call.id, call.status])))
const roomName = computed(() => rooms.value.find(room => String(room.id) === selectedRoom.value)?.name || t('ai.allRooms'))
const example = index => t(`ai.${selectedRoom.value === 'all' ? 'examplesAll' : 'examples'}.${index}`)
function trackScroll() {
  const element = thread.value
  if (element) followBottom = element.scrollHeight - element.scrollTop - element.clientHeight < 100
}
function revealLatest() {
  const element = thread.value
  if (!element) return
  const answer = element.querySelector('[data-ai-message]:last-child [data-ai-answer]')
  if (answer) element.scrollTop += answer.getBoundingClientRect().top - element.getBoundingClientRect().top - 12
  else element.scrollTop = element.scrollHeight
  newReply.value = false
}
function submit(event) {
  if (event?.isComposing || event?.keyCode === 229) return
  if (event?.type === 'keydown' && !(event.ctrlKey || event.metaKey)) return
  event?.preventDefault()
  followBottom = true
  newReply.value = false
  session.send()
}
watch(() => {
  const message = messages.value.at(-1)
  return { message, content: message?.content, count: message?.calls?.length, busy: busy.value }
}, async (current, previous) => {
  const following = followBottom
  const answered = current.message?.role === 'assistant' && current.content && (current.message !== previous?.message || current.content !== previous?.content)
  await nextTick()
  if (answered) {
    if (following) revealLatest()
    else newReply.value = true
  } else if (following && !current.content && thread.value) thread.value.scrollTop = thread.value.scrollHeight
  if (!current.message) newReply.value = false
}, { flush: 'pre' })
onMounted(async () => { await session.load({ roomId: aiPageRoom(route) }); await nextTick(); if (followBottom) revealLatest() })
</script>

<template>
  <section :class="cn('flex min-h-0 min-w-0 flex-col gap-4', props.floating ? 'h-full' : 'h-[min(46rem,76dvh)] min-h-[28rem]')" :aria-label="t('ai.chat')">
    <div class="flex shrink-0 items-center justify-between gap-3">
      <Field v-if="rooms.length > 1" class="min-w-0 flex-1">
        <FieldLabel :for="`${id}-room`" class="sr-only">{{ t('ai.room') }}</FieldLabel>
        <Select :model-value="selectedRoom" :disabled="busy" @update:model-value="session.selectRoom">
          <SelectTrigger :id="`${id}-room`" class="w-full" :aria-label="t('ai.room')"><SelectValue /></SelectTrigger>
          <SelectContent><SelectGroup><SelectItem value="all">{{ t('ai.allRooms') }}</SelectItem><SelectItem v-for="room in rooms" :key="room.id" :value="String(room.id)">{{ room.name }}</SelectItem></SelectGroup></SelectContent>
        </Select>
      </Field>
      <p v-else class="min-w-0 truncate text-sm text-muted-foreground" :title="roomName">{{ t('ai.room') }} · {{ roomName }}</p>
      <Button size="icon-sm" variant="ghost" :disabled="busy || (!messages.length && !draft)" :aria-label="t('ai.clear')" :title="t('ai.clear')" @click="session.clear"><Trash2 /></Button>
    </div>

    <div ref="thread" class="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain pr-1 [overflow-anchor:none]" role="log" :aria-label="t('ai.chat')" aria-live="polite" @scroll="trackScroll">
      <Alert v-if="error" variant="destructive"><CircleAlert /><AlertTitle>{{ t('ai.failure') }}</AlertTitle><AlertDescription class="flex flex-col items-start gap-2 break-words">{{ error }}<Button v-if="!initialized" variant="outline" size="sm" :disabled="loading" @click="session.load({ roomId: aiPageRoom(route), force: true })">{{ t('ai.retry') }}</Button></AlertDescription></Alert>
      <template v-if="loading && !initialized"><Skeleton class="h-16 w-4/5 shrink-0" /><Skeleton class="h-24 w-full shrink-0" /></template>
      <Empty v-else-if="initialized && !chatReady" class="my-auto shrink-0 px-2">
        <EmptyHeader><EmptyMedia variant="icon"><Settings2 /></EmptyMedia><EmptyTitle>{{ config.enabled ? t('ai.modelMissing') : t('ai.disabled') }}</EmptyTitle><EmptyDescription>{{ t('ai.disabledDescription') }}</EmptyDescription></EmptyHeader>
        <EmptyContent><Button @click="$emit('configure')">{{ t('ai.configure') }}</Button></EmptyContent>
      </Empty>
      <Empty v-else-if="initialized && !messages.length" class="my-auto shrink-0 px-2">
        <EmptyHeader><EmptyMedia variant="icon"><Sparkles /></EmptyMedia><EmptyTitle>{{ t('ai.welcome') }}</EmptyTitle><EmptyDescription>{{ t('ai.welcomeDescription') }}</EmptyDescription></EmptyHeader>
        <EmptyContent class="max-w-full"><Button v-for="index in [0, 1, 2]" :key="index" variant="outline" class="h-auto w-full justify-start whitespace-normal py-2 text-left" @click="draft = example(index)">{{ example(index) }}</Button></EmptyContent>
      </Empty>
      <AIChatMessage v-for="message in messages" :key="messageKey(message)" :message="message" :statuses="statuses" :pending="busy && message === messages.at(-1)" :phase="phase" />
    </div>

    <form class="flex shrink-0 flex-col gap-3" @submit.prevent="submit">
      <Button v-if="newReply" type="button" variant="secondary" size="sm" class="self-center" @click="revealLatest"><ArrowDown data-icon="inline-start" />{{ t('ai.newReply') }}</Button>
      <FieldGroup><Field><FieldLabel :for="`${id}-question`" class="sr-only">{{ t('ai.chat') }}</FieldLabel><Textarea :id="`${id}-question`" v-model="draft" :placeholder="t('ai.placeholder')" :disabled="busy || !chatReady" class="max-h-36 resize-none" rows="3" maxlength="8192" @keydown.enter="submit" /></Field></FieldGroup>
      <div v-if="attachments.length" class="flex flex-wrap gap-2"><Badge v-for="file in attachments" :key="file.id" variant="secondary" class="max-w-full gap-1"><span class="truncate">{{ file.name }}</span><Button type="button" variant="ghost" size="icon-sm" class="size-6 shrink-0" :disabled="busy || uploading" :aria-label="t('ai.removeFile', { name: file.name })" @click="session.removeAttachment(file.id)"><X /></Button></Badge></div>
      <div v-if="privateInputs.length" class="flex flex-wrap gap-2"><Badge v-for="input in privateInputs" :key="input.id" variant="secondary" class="max-w-full gap-1"><KeyRound class="size-3" /><span class="truncate">{{ input.name }}</span><Button type="button" variant="ghost" size="icon-sm" class="size-6 shrink-0" :disabled="busy" :aria-label="t('ai.removeFile', { name: input.name })" @click="session.removePrivateInput(input.id)"><X /></Button></Badge></div>
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div class="flex items-center gap-2"><input ref="filePicker" type="file" class="hidden" :aria-label="t('ai.attachFile')" @change="pickFile"><Button type="button" variant="ghost" size="icon-sm" :disabled="busy || uploading || !chatReady || attachments.length >= 8" :aria-label="t('ai.attachFile')" :title="t('ai.attachFile')" @click="filePicker?.click()"><Paperclip /></Button><Button type="button" variant="ghost" size="icon-sm" :disabled="busy || !chatReady || privateInputs.length >= 8" :aria-label="t('ai.privateInput')" :title="t('ai.privateInput')" @click="privateOpen = true"><KeyRound /></Button><span class="text-xs text-muted-foreground">{{ t('ai.sendShortcut') }}</span></div>
        <Button v-if="busy || uploading" type="button" variant="outline" @click="session.stop"><Spinner v-if="uploading" data-icon="inline-start" /><Square v-else data-icon="inline-start" />{{ uploading ? t('ai.uploadProgress', { progress: uploadProgress }) : t('ai.stop') }}</Button><Button v-else type="submit" :disabled="!chatReady || (!draft.trim() && !attachments.length && !privateInputs.length)"><Send data-icon="inline-start" />{{ t('ai.send') }}</Button>
      </div>
      <p class="text-xs text-muted-foreground" :role="persistenceError ? 'alert' : undefined">{{ t(persistenceError ? 'ai.persistenceFailed' : 'ai.conversationOnly') }}</p>
    </form>
    <Dialog v-model:open="privateOpen"><DialogContent><DialogHeader><DialogTitle>{{ t('ai.privateInput') }}</DialogTitle><DialogDescription>{{ t('ai.privateInputHelp') }}</DialogDescription></DialogHeader><FieldGroup><Field><FieldLabel :for="`${id}-private-name`">{{ t('ai.privateName') }}</FieldLabel><Input :id="`${id}-private-name`" v-model="privateName" maxlength="100" :placeholder="t('ai.privateNamePlaceholder')" /></Field><Field><FieldLabel :for="`${id}-private-value`">{{ t('ai.privateValue') }}</FieldLabel><Input :id="`${id}-private-value`" v-model="privateValue" type="password" maxlength="8192" autocomplete="off" /></Field><Alert v-if="privateError" variant="destructive"><AlertTitle>{{ t('ai.failure') }}</AlertTitle><AlertDescription>{{ privateError }}</AlertDescription></Alert></FieldGroup><DialogFooter><Button :disabled="privateSaving || !privateName.trim() || !privateValue" @click="savePrivateInput"><Spinner v-if="privateSaving" data-icon="inline-start" />{{ t('ai.attachPrivateInput') }}</Button></DialogFooter></DialogContent></Dialog>
  </section>
</template>
