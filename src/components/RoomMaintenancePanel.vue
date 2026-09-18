<script setup>
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { RefreshCw } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { automationV2API, modUpdatesV2API } from '@/api/v2'
import { cronTaskApi } from '@/api/index'
import { roomMaintenanceMessages } from '@/i18n/roomMaintenanceMessages'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Field, FieldGroup, FieldLabel, FieldDescription } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectGroup, SelectItem } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'

const props = defineProps({ roomId: { type: String, required: true } })
const { t, locale } = useI18n({ messages: roomMaintenanceMessages })
const router = useRouter()
const loading = ref(true), error = ref(''), saving = ref('')
const modOverview = ref(null), tasks = ref([]), groups = ref([])
const modForm = ref({ enabled: false, interval: 15, grace: 60, announce: true })
const gameForm = ref({ enabled: false, schedule: '*/15 * * * *', timezone: 'Asia/Shanghai' })
const preset = ref('every15')
const schedules = { every15: '*/15 * * * *', every30: '*/30 * * * *', hourly: '0 * * * *' }
const gameTask = computed(() => tasks.value[0])
const groupPaused = computed(() => gameTask.value && !groups.value.find(group => group.id === gameTask.value.groupId)?.enabled)
const disabled = computed(() => loading.value || Boolean(error.value) || Boolean(saving.value))
const modError = ref(''), gameError = ref('')
const formatTime = value => new Date(value).toLocaleString(locale.value)

async function load() {
  loading.value = true; error.value = ''
  try {
    const [mods, taskList, groupList] = await Promise.all([
      modUpdatesV2API.overview(props.roomId), automationV2API.tasks(props.roomId), automationV2API.groups(props.roomId)
    ])
    modOverview.value = mods
    groups.value = groupList.items || []
    tasks.value = (taskList.items || []).filter(task => task.action === 'game.update-empty')
    const policy = mods.policy
    modForm.value = { enabled: policy.autoCheck && policy.autoPrepare && policy.applyWhenEmpty, interval: policy.revision ? policy.checkIntervalMinutes : 15, grace: policy.emptyGraceSeconds, announce: policy.gameAnnouncement }
    gameForm.value = { enabled: gameTask.value?.enabled ?? false, schedule: gameTask.value?.schedule || schedules.every15, timezone: gameTask.value?.timezone || 'Asia/Shanghai' }
    preset.value = Object.keys(schedules).find(key => schedules[key] === gameForm.value.schedule) || 'custom'
  } catch (cause) { error.value = cause.message } finally { loading.value = false }
}
function applyPreset(value) { if (schedules[value]) gameForm.value.schedule = schedules[value] }
async function saveMods() {
  saving.value = 'mods'; modError.value = ''
  try {
    const { enabled, interval, grace, announce } = modForm.value
    if (!Number.isInteger(Number(interval)) || Number(interval) < 5 || Number(interval) > 1440 || !Number.isInteger(Number(grace)) || Number(grace) < 30 || Number(grace) > 1800) throw new Error(t('invalid'))
    modOverview.value = await modUpdatesV2API.updatePolicy(props.roomId, {
      autoCheck: enabled, autoPrepare: enabled, applyWhenEmpty: enabled, restartWithPlayers: false,
      gameAnnouncement: announce, checkIntervalMinutes: Number(interval), emptyGraceSeconds: Number(grace), expectedRevision: modOverview.value.policy.revision || ''
    })
    toast.success(t('saved'))
  } catch (cause) { modError.value = cause.message } finally { saving.value = '' }
}
async function saveGame() {
  saving.value = 'game'; gameError.value = ''
  try {
    if (tasks.value.length > 1) throw new Error(t('multiple'))
    let group = groups.value.find(group => group.id === gameTask.value?.groupId) || groups.value.find(group => group.name === 'room-maintenance')
    if (group && !group.enabled && gameForm.value.enabled) throw new Error(t('groupPaused'))
    if (!group) {
      group = await automationV2API.createGroup(props.roomId, { name: 'room-maintenance', description: '', type: 'custom', enabled: true })
      groups.value.push(group)
    }
    const task = gameTask.value
    const input = { ...gameForm.value, groupId: group.id, name: task?.name || t('gameTaskName'), description: task?.description || '', action: 'game.update-empty', worldIds: [], parameters: {}, timeoutSeconds: 3600, retryTimes: 0, retryIntervalSeconds: 60, dependencies: task?.dependencies || [], expectedRevision: task?.revision || '' }
    const value = task ? await automationV2API.updateTask(props.roomId, task.id, input) : await automationV2API.createTask(props.roomId, input)
    tasks.value = [value]
    toast.success(t('saved'))
  } catch (cause) { gameError.value = cause.message } finally { saving.value = '' }
}
async function openTasks() {
  try { await cronTaskApi.getRoomScope(); cronTaskApi.setRoom(props.roomId); await router.push('/cron/tasks') }
  catch (cause) { toast.error(cause.message) }
}
onMounted(load)
</script>

<template>
  <section class="flex min-w-0 flex-col gap-4">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="flex min-w-0 flex-col gap-1"><h2 class="text-lg font-semibold">{{ t('title') }}</h2><p class="text-sm text-muted-foreground">{{ t('description') }}</p></div>
      <Button size="sm" variant="outline" :disabled="loading || Boolean(saving)" @click="load"><RefreshCw data-icon="inline-start" />{{ t('refresh') }}</Button>
    </div>
    <p v-if="loading" role="status" class="flex items-center gap-2 text-sm text-muted-foreground"><Spinner />{{ t('loading') }}</p>
    <Alert v-if="error" variant="destructive"><AlertTitle>{{ t('failed') }}</AlertTitle><AlertDescription>{{ error }}</AlertDescription></Alert>
    <div v-if="!loading && !error" class="grid min-w-0 gap-4 xl:grid-cols-2">
      <Card class="min-w-0">
        <CardHeader><CardTitle>{{ t('mods') }}</CardTitle><CardDescription>{{ t('modsHelp') }}</CardDescription></CardHeader>
        <CardContent class="flex flex-1 flex-col gap-4">
          <FieldGroup>
            <Field orientation="horizontal"><Switch id="maintenance-mods-enabled" v-model="modForm.enabled" :disabled="disabled" /><FieldLabel for="maintenance-mods-enabled">{{ t('enabled') }}</FieldLabel></Field>
            <Field><FieldLabel for="maintenance-mods-interval">{{ t('interval') }}</FieldLabel><Input id="maintenance-mods-interval" v-model="modForm.interval" type="number" min="5" max="1440" :disabled="disabled" /></Field>
            <Field><FieldLabel for="maintenance-mods-grace">{{ t('grace') }}</FieldLabel><Input id="maintenance-mods-grace" v-model="modForm.grace" type="number" min="30" max="1800" :disabled="disabled" /></Field>
            <Field orientation="horizontal"><Switch id="maintenance-mods-announce" v-model="modForm.announce" :disabled="disabled" /><FieldLabel for="maintenance-mods-announce">{{ t('announce') }}</FieldLabel></Field>
          </FieldGroup>
          <p v-if="modOverview.policy.autoCheck && !modOverview.policy.autoPrepare" class="text-sm text-muted-foreground">{{ t('notifyOnly') }}</p>
          <p v-if="modOverview.state.availableModIds?.length" class="text-sm">{{ t('pendingMods', { count: modOverview.state.availableModIds.length }) }}</p>
          <p v-if="modOverview.policy.autoCheck && modOverview.state.nextCheckAt" class="text-xs text-muted-foreground">{{ t('next', { time: formatTime(modOverview.state.nextCheckAt) }) }}</p>
          <Alert v-if="modError || modOverview.state.errorMessage" variant="destructive"><AlertTitle>{{ t('failed') }}</AlertTitle><AlertDescription>{{ modError || modOverview.state.errorMessage }}</AlertDescription></Alert>
        </CardContent>
        <CardFooter><Button :disabled="disabled" @click="saveMods"><Spinner v-if="saving === 'mods'" data-icon="inline-start" />{{ t('save') }}</Button></CardFooter>
      </Card>
      <Card class="min-w-0">
        <CardHeader><CardTitle>{{ t('game') }}</CardTitle><CardDescription>{{ t('gameHelp') }}</CardDescription></CardHeader>
        <CardContent class="flex flex-1 flex-col gap-4">
          <FieldGroup>
            <Field orientation="horizontal"><Switch id="maintenance-game-enabled" v-model="gameForm.enabled" :disabled="disabled || tasks.length > 1" /><FieldLabel for="maintenance-game-enabled">{{ t('enabled') }}</FieldLabel></Field>
            <Field><FieldLabel for="maintenance-game-frequency">{{ t('frequency') }}</FieldLabel><Select v-model="preset" :disabled="disabled || tasks.length > 1" @update:model-value="applyPreset"><SelectTrigger id="maintenance-game-frequency"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="value in ['every15', 'every30', 'hourly', 'custom']" :key="value" :value="value">{{ t(value) }}</SelectItem></SelectGroup></SelectContent></Select></Field>
            <Field v-if="preset === 'custom'"><FieldLabel for="maintenance-game-cron">{{ t('cron') }}</FieldLabel><Input id="maintenance-game-cron" v-model="gameForm.schedule" :disabled="disabled || tasks.length > 1" /><FieldDescription>{{ t('cronHelp') }}</FieldDescription></Field>
            <Field><FieldLabel for="maintenance-game-zone">{{ t('timezone') }}</FieldLabel><Input id="maintenance-game-zone" v-model="gameForm.timezone" :disabled="disabled || tasks.length > 1" /></Field>
          </FieldGroup>
          <Badge v-if="gameTask" variant="outline" class="self-start">{{ t(gameTask.enabled && !groupPaused ? 'active' : 'paused') }}</Badge>
          <p v-else class="text-sm text-muted-foreground">{{ t('noGameTask') }}</p>
          <p v-if="gameTask?.enabled && !groupPaused && gameTask.nextRunAt" class="text-xs text-muted-foreground">{{ t('next', { time: formatTime(gameTask.nextRunAt) }) }}</p>
          <p v-if="gameTask?.lastRunAt" class="text-xs text-muted-foreground">{{ t('last', { time: formatTime(gameTask.lastRunAt) }) }}</p>
          <p v-if="gameTask?.lastStatus === 'failed'" class="text-sm text-muted-foreground">{{ t('gameFailure') }}</p>
          <Alert v-if="gameError || groupPaused || tasks.length > 1" variant="destructive"><AlertTitle>{{ t('failed') }}</AlertTitle><AlertDescription>{{ gameError || t(tasks.length > 1 ? 'multiple' : 'groupPaused') }}</AlertDescription></Alert>
        </CardContent>
        <CardFooter class="flex flex-wrap gap-2"><Button :disabled="disabled || tasks.length > 1 || !gameForm.schedule.trim()" @click="saveGame"><Spinner v-if="saving === 'game'" data-icon="inline-start" />{{ t('save') }}</Button><Button variant="outline" @click="openTasks">{{ t('history') }}</Button></CardFooter>
      </Card>
    </div>
  </section>
</template>
