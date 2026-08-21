<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { BellRing, CircleAlert, Eye, RefreshCw, Send, ShieldCheck } from '@lucide/vue'
import { gameNotificationsV2API, roomsV2API } from '@/api/v2'
import { waitForV2Job } from '@/api/v2ConfigurationAdapters'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogScrollContent,
  DialogTitle
} from '@/components/ui/dialog'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldTitle } from '@/components/ui/field'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { formatSystemDateTime } from '@/lib/dateTime.mjs'
import { toast } from 'vue-sonner'

defineOptions({ name: 'GameNotificationsView' })

const route = useRoute()
const router = useRouter()
const { locale, t } = useI18n()

const rooms = ref([])
const selectedRoomId = ref('')
const worlds = ref([])
const message = ref('')
const messageError = ref('')
const policy = ref({ enabled: true, countdownSeconds: 60 })
const notifications = ref([])
const notificationTotal = ref(0)
const historyOffset = ref(0)
const pageSize = 25
const loading = ref(false)
const roomLoading = ref(false)
const sending = ref(false)
const savingPolicy = ref(false)
const historyLoading = ref(false)
const loadError = ref('')
const detailOpen = ref(false)
const selectedNotification = ref(null)
let roomLoadSequence = 0
let roomWatchReady = false

const selectedRoom = computed(() => rooms.value.find(room => room.id === selectedRoomId.value) || null)
const runningWorlds = computed(() => worlds.value.filter(world => world.status === 'running'))
const messageLength = computed(() => Array.from(message.value.trim()).length)
const canSend = computed(() => Boolean(selectedRoomId.value && messageLength.value > 0 && messageLength.value <= 500 && !sending.value))
const hasPreviousPage = computed(() => historyOffset.value > 0)
const hasNextPage = computed(() => historyOffset.value + pageSize < notificationTotal.value)

function localeValue() {
  return typeof locale.value === 'string' ? locale.value : 'zh-CN'
}

function formatDate(value) {
  return formatSystemDateTime(value, { locale: localeValue() })
}

function statusVariant(status) {
  if (status === 'succeeded') return 'default'
  if (status === 'failed') return 'destructive'
  if (status === 'partial' || status === 'sending') return 'secondary'
  return 'outline'
}

function worldStatusVariant(status) {
  if (status === 'running') return 'default'
  if (status === 'failed') return 'destructive'
  if (status === 'starting') return 'secondary'
  return 'outline'
}

function statusLabel(status) {
  const known = ['queued', 'sending', 'succeeded', 'partial', 'failed', 'skipped', 'canceled']
  return known.includes(status) ? t(`announcements.statuses.${status}`) : t('common.states.unknown')
}

function deliveryStatusLabel(status) {
  const known = ['queued', 'succeeded', 'failed', 'skipped', 'canceled']
  return known.includes(status) ? t(`announcements.deliveryStatuses.${status}`) : t('common.states.unknown')
}

function sourceLabel(source) {
  const known = ['manual', 'room_stop', 'room_restart', 'game_update', 'mod_sync', 'automation']
  return known.includes(source) ? t(`announcements.sources.${source}`) : source
}

function worldStatusLabel(status) {
  const known = ['running', 'starting', 'stopped', 'failed', 'unknown']
  return t(`announcements.worldStatuses.${known.includes(status) ? status : 'unknown'}`)
}

function deliveryTarget(delivery) {
  if (delivery.agentId) return t('announcements.detail.agentTarget', { agent: delivery.agentId })
  if (delivery.targetId) return delivery.targetId === 'local' ? t('announcements.detail.localTarget') : delivery.targetId
  return t('announcements.detail.noTarget')
}

async function loadRooms() {
  const result = await roomsV2API.list()
  rooms.value = (result.items || []).filter(room => room.managed)
  const requestedRoomId = String(route.query.roomId || '')
  if (rooms.value.some(room => room.id === requestedRoomId)) {
    selectedRoomId.value = requestedRoomId
  } else if (!rooms.value.some(room => room.id === selectedRoomId.value)) {
    selectedRoomId.value = rooms.value[0]?.id || ''
  }
}

async function loadHistory() {
  if (!selectedRoomId.value) {
    notifications.value = []
    notificationTotal.value = 0
    return
  }
  historyLoading.value = true
  try {
    const result = await gameNotificationsV2API.list(selectedRoomId.value, pageSize, historyOffset.value)
    notifications.value = result.items || []
    notificationTotal.value = Number(result.total) || 0
  } finally {
    historyLoading.value = false
  }
}

async function loadRoomContext() {
  const roomId = selectedRoomId.value
  if (!roomId) {
    worlds.value = []
    notifications.value = []
    notificationTotal.value = 0
    return
  }
  const sequence = ++roomLoadSequence
  roomLoading.value = true
  loadError.value = ''
  try {
    const [worldResult, policyResult] = await Promise.all([
      roomsV2API.worlds(roomId),
      gameNotificationsV2API.policy(roomId)
    ])
    if (sequence !== roomLoadSequence) return
    worlds.value = worldResult.items || []
    policy.value = {
      enabled: policyResult.enabled !== false,
      countdownSeconds: Number(policyResult.countdownSeconds) || 60
    }
    await loadHistory()
  } catch (error) {
    if (sequence === roomLoadSequence) loadError.value = error?.message || t('announcements.feedback.loadFailed')
  } finally {
    if (sequence === roomLoadSequence) roomLoading.value = false
  }
}

async function refreshPage() {
  loading.value = true
  loadError.value = ''
  try {
    await loadRooms()
    await loadRoomContext()
  } catch (error) {
    loadError.value = error?.message || t('announcements.feedback.loadFailed')
  } finally {
    loading.value = false
  }
}

async function sendNotification() {
  messageError.value = ''
  if (messageLength.value === 0) {
    messageError.value = t('announcements.validation.messageRequired')
    return
  }
  if (messageLength.value > 500) {
    messageError.value = t('announcements.validation.messageLength')
    return
  }
  sending.value = true
  try {
    const submitted = await gameNotificationsV2API.send({
      roomId: selectedRoomId.value,
      message: message.value.trim()
    })
    const completed = await waitForV2Job(submitted, 5 * 60 * 1000, undefined, { allowFailure: true })
    historyOffset.value = 0
    await loadHistory()
    const sent = notifications.value.find(item => item.jobId === completed.id)
    if (sent?.successCount > 0) {
      toast.success(t('announcements.feedback.sent', { count: sent.successCount }))
      message.value = ''
    } else if (sent?.status === 'skipped') {
      toast.warning(t('announcements.feedback.noRunningWorlds'))
    } else {
      toast.error(t('announcements.feedback.sendFailed'))
    }
  } catch (error) {
    toast.error(error?.message || t('announcements.feedback.sendFailed'))
    await loadHistory().catch(() => {})
  } finally {
    sending.value = false
  }
}

async function savePolicy() {
  savingPolicy.value = true
  try {
    const saved = await gameNotificationsV2API.savePolicy(selectedRoomId.value, {
      enabled: policy.value.enabled,
      countdownSeconds: Number(policy.value.countdownSeconds)
    })
    policy.value = { enabled: saved.enabled, countdownSeconds: saved.countdownSeconds }
    toast.success(t('announcements.feedback.policySaved'))
  } catch (error) {
    toast.error(error?.message || t('announcements.feedback.policySaveFailed'))
  } finally {
    savingPolicy.value = false
  }
}

function openDetails(notification) {
  selectedNotification.value = notification
  detailOpen.value = true
}

async function changePage(direction) {
  const next = Math.max(0, historyOffset.value + direction * pageSize)
  if (next === historyOffset.value) return
  historyOffset.value = next
  try {
    await loadHistory()
  } catch (error) {
    toast.error(error?.message || t('announcements.feedback.loadFailed'))
  }
}

async function refreshHistory() {
  try {
    await loadHistory()
  } catch (error) {
    toast.error(error?.message || t('announcements.feedback.loadFailed'))
  }
}

watch(selectedRoomId, async (roomId, previous) => {
  if (!roomWatchReady || !roomId || roomId === previous) return
  historyOffset.value = 0
  await router.replace({ query: { ...route.query, roomId } })
  await loadRoomContext()
})

onMounted(async () => {
  await refreshPage()
  roomWatchReady = true
})
</script>

<template>
  <div class="flex min-w-0 flex-col gap-6">
    <header class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div class="min-w-0">
        <h1 class="text-2xl font-semibold tracking-normal">{{ t('announcements.title') }}</h1>
        <p class="mt-1 text-sm text-muted-foreground">{{ t('announcements.subtitle') }}</p>
      </div>
      <Button variant="outline" size="sm" :disabled="loading || roomLoading" @click="refreshPage">
        <Spinner v-if="loading || roomLoading" data-icon="inline-start" />
        <RefreshCw v-else data-icon="inline-start" />
        {{ t('common.actions.refresh') }}
      </Button>
    </header>

    <Alert v-if="loadError" variant="destructive">
      <CircleAlert />
      <AlertTitle>{{ t('announcements.feedback.loadFailed') }}</AlertTitle>
      <AlertDescription>{{ loadError }}</AlertDescription>
    </Alert>

    <div v-if="loading && rooms.length === 0" class="grid gap-4 xl:grid-cols-2">
      <Skeleton class="h-96 w-full" />
      <Skeleton class="h-96 w-full" />
    </div>

    <Empty v-else-if="rooms.length === 0">
      <EmptyHeader>
        <EmptyMedia variant="icon"><BellRing /></EmptyMedia>
        <EmptyTitle>{{ t('announcements.emptyRooms.title') }}</EmptyTitle>
        <EmptyDescription>{{ t('announcements.emptyRooms.description') }}</EmptyDescription>
      </EmptyHeader>
    </Empty>

    <template v-else>
      <div class="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.65fr)]">
        <Card>
          <CardHeader>
            <CardTitle>{{ t('announcements.composer.title') }}</CardTitle>
            <CardDescription>{{ t('announcements.composer.description') }}</CardDescription>
            <CardAction>
              <Badge :variant="runningWorlds.length ? 'secondary' : 'outline'">
                {{ t('announcements.composer.runningCount', { running: runningWorlds.length, total: worlds.length }) }}
              </Badge>
            </CardAction>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Field>
                <FieldLabel for="notification-room">{{ t('announcements.composer.room') }}</FieldLabel>
                <Select v-model="selectedRoomId" :disabled="sending">
                  <SelectTrigger id="notification-room"><SelectValue :placeholder="t('announcements.composer.roomPlaceholder')" /></SelectTrigger>
                  <SelectContent><SelectGroup>
                    <SelectItem v-for="room in rooms" :key="room.id" :value="room.id">{{ room.name }}</SelectItem>
                  </SelectGroup></SelectContent>
                </Select>
                <FieldDescription>{{ selectedRoom?.description || t('announcements.composer.roomDescription') }}</FieldDescription>
              </Field>

              <Field>
                <FieldTitle>{{ t('announcements.composer.worlds') }}</FieldTitle>
                <div v-if="roomLoading" class="flex flex-wrap gap-2"><Skeleton v-for="index in 2" :key="index" class="h-6 w-24" /></div>
                <div v-else class="flex flex-wrap gap-2">
                  <Badge v-for="world in worlds" :key="world.id" :variant="worldStatusVariant(world.status)">
                    {{ world.name }} · {{ worldStatusLabel(world.status) }}
                  </Badge>
                </div>
                <FieldDescription>{{ t('announcements.composer.worldDescription') }}</FieldDescription>
              </Field>

              <Field :data-invalid="Boolean(messageError)">
                <FieldLabel for="notification-message">{{ t('announcements.composer.message') }}</FieldLabel>
                <Textarea
                  id="notification-message"
                  v-model="message"
                  :aria-invalid="Boolean(messageError)"
                  :placeholder="t('announcements.composer.messagePlaceholder')"
                  maxlength="500"
                  rows="7"
                  @input="messageError = ''"
                />
                <FieldDescription>{{ t('announcements.composer.messageCount', { count: messageLength }) }}</FieldDescription>
                <FieldError v-if="messageError">{{ messageError }}</FieldError>
              </Field>
            </FieldGroup>
          </CardContent>
          <CardFooter class="justify-end">
            <Button :disabled="!canSend" @click="sendNotification">
              <Spinner v-if="sending" data-icon="inline-start" />
              <Send v-else data-icon="inline-start" />
              {{ t('announcements.actions.send') }}
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{{ t('announcements.policy.title') }}</CardTitle>
            <CardDescription>{{ t('announcements.policy.description') }}</CardDescription>
          </CardHeader>
          <CardContent class="flex flex-col gap-5">
            <FieldGroup>
              <Field orientation="horizontal">
                <FieldContent>
                  <FieldLabel for="operation-notification-enabled">{{ t('announcements.policy.enabled') }}</FieldLabel>
                  <FieldDescription>{{ t('announcements.policy.enabledDescription') }}</FieldDescription>
                </FieldContent>
                <Switch id="operation-notification-enabled" v-model="policy.enabled" />
              </Field>
              <Field orientation="responsive" :data-disabled="!policy.enabled">
                <FieldContent>
                  <FieldLabel for="operation-countdown">{{ t('announcements.policy.countdown') }}</FieldLabel>
                  <FieldDescription>{{ t('announcements.policy.countdownDescription') }}</FieldDescription>
                </FieldContent>
                <Select v-model="policy.countdownSeconds" :disabled="!policy.enabled">
                  <SelectTrigger id="operation-countdown" class="w-full sm:w-44"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectGroup>
                    <SelectItem :value="30">{{ t('announcements.policy.seconds', { count: 30 }) }}</SelectItem>
                    <SelectItem :value="60">{{ t('announcements.policy.seconds', { count: 60 }) }}</SelectItem>
                    <SelectItem :value="120">{{ t('announcements.policy.seconds', { count: 120 }) }}</SelectItem>
                    <SelectItem :value="300">{{ t('announcements.policy.seconds', { count: 300 }) }}</SelectItem>
                    <SelectItem :value="600">{{ t('announcements.policy.seconds', { count: 600 }) }}</SelectItem>
                  </SelectGroup></SelectContent>
                </Select>
              </Field>
            </FieldGroup>
            <Alert>
              <ShieldCheck />
              <AlertTitle>{{ t('announcements.policy.behaviorTitle') }}</AlertTitle>
              <AlertDescription>{{ t('announcements.policy.behaviorDescription') }}</AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter class="justify-end">
            <Button :disabled="savingPolicy || roomLoading" @click="savePolicy">
              <Spinner v-if="savingPolicy" data-icon="inline-start" />
              {{ t('common.actions.save') }}
            </Button>
          </CardFooter>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{{ t('announcements.history.title') }}</CardTitle>
          <CardDescription>{{ t('announcements.history.description') }}</CardDescription>
          <CardAction>
            <Button variant="ghost" size="sm" :disabled="historyLoading" @click="refreshHistory">
              <Spinner v-if="historyLoading" data-icon="inline-start" />
              <RefreshCw v-else data-icon="inline-start" />
              {{ t('common.actions.refresh') }}
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          <div class="min-w-0 overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>{{ t('announcements.history.columns.time') }}</TableHead>
                <TableHead>{{ t('announcements.history.columns.source') }}</TableHead>
                <TableHead>{{ t('announcements.history.columns.message') }}</TableHead>
                <TableHead>{{ t('announcements.history.columns.result') }}</TableHead>
                <TableHead class="w-14"><span class="sr-only">{{ t('announcements.history.columns.details') }}</span></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                <TableRow v-for="item in notifications" :key="item.id">
                  <TableCell class="whitespace-nowrap">{{ formatDate(item.createdAt) }}</TableCell>
                  <TableCell><Badge variant="outline">{{ sourceLabel(item.source) }}</Badge></TableCell>
                  <TableCell><p class="max-w-xl truncate">{{ item.message }}</p></TableCell>
                  <TableCell>
                    <div class="flex flex-col items-start gap-1">
                      <Badge :variant="statusVariant(item.status)">{{ statusLabel(item.status) }}</Badge>
                      <span class="whitespace-nowrap text-xs text-muted-foreground">
                        {{ t('announcements.history.counts', { success: item.successCount, failed: item.failureCount, skipped: item.skippedCount }) }}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Tooltip>
                      <TooltipTrigger as-child>
                        <Button variant="ghost" size="icon-sm" :aria-label="t('announcements.actions.details')" @click="openDetails(item)"><Eye /></Button>
                      </TooltipTrigger>
                      <TooltipContent>{{ t('announcements.actions.details') }}</TooltipContent>
                    </Tooltip>
                  </TableCell>
                </TableRow>
                <TableEmpty v-if="historyLoading" :colspan="5">
                  <div class="flex flex-col gap-2 py-3"><Skeleton v-for="index in 4" :key="index" class="h-10 w-full" /></div>
                </TableEmpty>
                <TableEmpty v-else-if="notifications.length === 0" :colspan="5">
                  <Empty>
                    <EmptyHeader>
                      <EmptyMedia variant="icon"><BellRing /></EmptyMedia>
                      <EmptyTitle>{{ t('announcements.history.empty') }}</EmptyTitle>
                      <EmptyDescription>{{ t('announcements.history.emptyDescription') }}</EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                </TableEmpty>
              </TableBody>
            </Table>
          </div>
        </CardContent>
        <CardFooter v-if="notificationTotal > pageSize" class="justify-between">
          <span class="text-sm text-muted-foreground">{{ t('announcements.history.total', { count: notificationTotal }) }}</span>
          <div class="flex gap-2">
            <Button variant="outline" size="sm" :disabled="!hasPreviousPage || historyLoading" @click="changePage(-1)">{{ t('common.pagination.previous') }}</Button>
            <Button variant="outline" size="sm" :disabled="!hasNextPage || historyLoading" @click="changePage(1)">{{ t('common.pagination.next') }}</Button>
          </div>
        </CardFooter>
      </Card>
    </template>

    <Dialog v-model:open="detailOpen">
      <DialogScrollContent class="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{{ t('announcements.detail.title') }}</DialogTitle>
          <DialogDescription v-if="selectedNotification">
            {{ t('announcements.detail.description', { room: selectedNotification.roomName, time: formatDate(selectedNotification.createdAt) }) }}
          </DialogDescription>
        </DialogHeader>
        <template v-if="selectedNotification">
          <div class="flex flex-col gap-4">
            <div class="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{{ sourceLabel(selectedNotification.source) }}</Badge>
              <Badge :variant="statusVariant(selectedNotification.status)">{{ statusLabel(selectedNotification.status) }}</Badge>
            </div>
            <p class="whitespace-pre-wrap text-sm leading-6">{{ selectedNotification.message }}</p>
            <div class="overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>{{ t('announcements.detail.columns.world') }}</TableHead>
                  <TableHead>{{ t('announcements.detail.columns.target') }}</TableHead>
                  <TableHead>{{ t('announcements.detail.columns.status') }}</TableHead>
                  <TableHead>{{ t('announcements.detail.columns.message') }}</TableHead>
                  <TableHead>{{ t('announcements.detail.columns.time') }}</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  <TableRow v-for="delivery in selectedNotification.deliveries" :key="delivery.id">
                    <TableCell>{{ delivery.worldName }}</TableCell>
                    <TableCell>{{ deliveryTarget(delivery) }}</TableCell>
                    <TableCell><Badge :variant="statusVariant(delivery.status)">{{ deliveryStatusLabel(delivery.status) }}</Badge></TableCell>
                    <TableCell>{{ delivery.errorMessage || delivery.message || '--' }}</TableCell>
                    <TableCell class="whitespace-nowrap">{{ formatDate(delivery.observedAt || delivery.sentAt) }}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        </template>
        <DialogFooter><Button variant="outline" @click="detailOpen = false">{{ t('common.actions.close') }}</Button></DialogFooter>
      </DialogScrollContent>
    </Dialog>
  </div>
</template>
