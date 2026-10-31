<template>
  <Card>
    <CardHeader>
      <CardTitle>{{ t('title') }}</CardTitle>
      <CardDescription>{{ t('description') }}</CardDescription>
      <CardAction><UiButton size="sm" variant="outline" :disabled="loading || saving || Boolean(error)" @click="edit()"><Plus data-icon="inline-start" />{{ t('add') }}</UiButton></CardAction>
    </CardHeader>
    <CardContent class="flex flex-col gap-3">
      <Alert v-if="error" variant="destructive"><AlertTitle>{{ t('failed') }}</AlertTitle><AlertDescription>{{ error }}</AlertDescription><AlertAction><UiButton size="sm" variant="outline" @click="load">{{ t('retry') }}</UiButton></AlertAction></Alert>
      <p v-else-if="loading" class="text-sm text-muted-foreground">{{ t('loading') }}</p>
      <p v-else-if="!tasks.length && !legacyPolicy?.enabled" class="text-sm text-muted-foreground">{{ t('empty') }}</p>
      <Alert v-if="legacyPolicy?.enabled">
        <AlertTitle>{{ t('legacyTitle') }}</AlertTitle>
        <AlertDescription>{{ t('legacyDescription', { interval: legacyPolicy.intervalMinutes, keep: legacyPolicy.maxSnapshots }) }}<span v-if="legacyPolicy.lastError">{{ legacyPolicy.lastError }}</span></AlertDescription>
        <AlertAction><UiButton size="sm" variant="outline" :disabled="saving" @click="pauseLegacy">{{ t('pauseLegacy') }}</UiButton></AlertAction>
      </Alert>
      <div v-for="task in tasks" :key="task.id" class="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3">
        <div class="flex min-w-0 flex-col gap-1">
          <div class="flex flex-wrap items-center gap-2"><span class="font-medium">{{ task.name }}</span><Badge variant="outline">{{ t(!task.enabled ? 'disabled' : !groupEnabled(task) ? 'groupDisabled' : 'enabled') }}</Badge></div>
          <p class="text-sm text-muted-foreground">{{ scheduleLabel(task) }} · {{ task.timezone }} · {{ modeLabel(task) }}</p>
          <p class="text-xs text-muted-foreground">{{ task.parameters?.keep ? t('retentionSummary', { keep: task.parameters.keep }) : t('noRetention') }}</p>
          <p v-if="task.enabled && groupEnabled(task) && task.nextRunAt" class="text-xs text-muted-foreground">{{ t('next') }} {{ formatTime(task.nextRunAt) }}</p>
        </div>
        <div class="flex gap-2"><UiButton size="sm" variant="outline" :disabled="saving" @click="edit(task)">{{ t('edit') }}</UiButton><UiButton size="sm" variant="ghost" @click="openTasks">{{ t('history') }}</UiButton></div>
      </div>
    </CardContent>
    <Dialog v-model:open="open">
      <DialogContent class="max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <DialogHeader><DialogTitle>{{ t(selected ? 'edit' : 'add') }}</DialogTitle><DialogDescription>{{ t('description') }}</DialogDescription></DialogHeader>
        <FieldGroup>
          <Field><FieldLabel for="backup-schedule-name">{{ t('name') }}</FieldLabel><UiInput id="backup-schedule-name" v-model="form.name" maxlength="50" /></Field>
          <Field v-if="supportsMode">
            <FieldLabel id="backup-schedule-mode-label">{{ t('mode') }}</FieldLabel>
            <ToggleGroup type="single" :model-value="form.mode" variant="outline" :spacing="1" aria-labelledby="backup-schedule-mode-label" class="grid w-full grid-cols-1 sm:grid-cols-3" @update:model-value="value => { if (backupModes.includes(value)) form.mode = value }">
              <ToggleGroupItem v-for="mode in backupModes" :key="mode" :value="mode">{{ t(`modeNames.${mode}`) }}</ToggleGroupItem>
            </ToggleGroup>
            <FieldDescription>{{ t(`modeHelp.${form.mode}`) }}</FieldDescription>
            <FieldDescription v-if="form.mode !== 'hot-consistent'">{{ t('announcementHelp') }}</FieldDescription>
          </Field>
          <p v-else class="text-sm text-muted-foreground">{{ t('olderModeHelp') }}</p>
          <Field><FieldLabel for="backup-schedule-preset">{{ t('frequency') }}</FieldLabel><UiSelect v-model="preset" @update:model-value="applyPreset"><SelectTrigger id="backup-schedule-preset"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="hourly">{{ t('hourly') }}</SelectItem><SelectItem value="daily">{{ t('daily') }}</SelectItem><SelectItem value="custom">{{ t('custom') }}</SelectItem></SelectGroup></SelectContent></UiSelect></Field>
          <Field v-if="preset === 'daily'"><FieldLabel for="backup-schedule-time">{{ t('time') }}</FieldLabel><UiInput id="backup-schedule-time" v-model="time" type="time" @update:model-value="updateTime" /></Field>
          <Field v-if="preset === 'hourly'"><FieldLabel for="backup-schedule-interval">{{ t('interval') }}</FieldLabel><UiInput id="backup-schedule-interval" v-model="interval" type="number" min="1" max="23" @update:model-value="updateTime" /></Field>
          <Field v-if="preset === 'custom'"><FieldLabel for="backup-schedule-cron">{{ t('customExpression') }}</FieldLabel><UiInput id="backup-schedule-cron" v-model="form.schedule" @input="preset = 'custom'" /><FieldDescription>{{ t('cronHelp') }}</FieldDescription></Field>
          <p class="text-sm text-muted-foreground">{{ scheduleLabel(form) }} · {{ form.timezone }}</p>
          <UiButton variant="ghost" size="sm" class="self-start" :aria-expanded="advanced" @click="advanced = !advanced">{{ t(advanced ? 'hideOptions' : 'options') }}</UiButton>
          <Field v-if="advanced"><FieldLabel for="backup-schedule-zone">{{ t('timezone') }}</FieldLabel><UiInput id="backup-schedule-zone" v-model="form.timezone" placeholder="Asia/Shanghai" /></Field>
          <Field><FieldLabel for="backup-schedule-keep">{{ t('retention') }}</FieldLabel><UiInput id="backup-schedule-keep" type="number" min="1" max="100" :model-value="String(keep)" @update:model-value="keep = $event" /><FieldDescription>{{ t('retentionHelp') }}</FieldDescription></Field>
          <Field orientation="horizontal"><UiSwitch id="backup-schedule-enabled" v-model="form.enabled" /><FieldLabel for="backup-schedule-enabled">{{ t('enabled') }}</FieldLabel></Field>
          <Alert v-if="saveError" variant="destructive"><AlertTitle>{{ t('failed') }}</AlertTitle><AlertDescription>{{ saveError }}</AlertDescription></Alert>
        </FieldGroup>
        <DialogFooter><UiButton variant="outline" :disabled="saving" @click="open = false">{{ t('cancel') }}</UiButton><UiButton :disabled="saving || !form.name.trim() || !form.schedule.trim()" @click="save"><Spinner v-if="saving" data-icon="inline-start" />{{ t('save') }}</UiButton></DialogFooter>
      </DialogContent>
    </Dialog>
  </Card>
</template>

<script setup>
import { onBeforeUnmount, ref, watch } from 'vue'
import { readBackupSchedule, writeBackupSchedule } from '@/lib/backupSchedule.mjs'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { Plus } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { cronTaskApi } from '@/api/index'
import { backupsV2API } from '@/api/v2'
import { Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent } from '@/components/ui/card'
import { Alert, AlertTitle, AlertDescription, AlertAction } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button as UiButton } from '@/components/ui/button'
import { Input as UiInput } from '@/components/ui/input'
import { Switch as UiSwitch } from '@/components/ui/switch'
import { Spinner } from '@/components/ui/spinner'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Field, FieldGroup, FieldLabel, FieldDescription } from '@/components/ui/field'
import { Select as UiSelect, SelectTrigger, SelectValue, SelectContent, SelectGroup, SelectItem } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
const props = defineProps({ roomId: { type: String, required: true } })
const router = useRouter()
const { t, locale } = useI18n({ messages: {
  'zh-CN': { mode: '备份方式', modeNames: { automatic: '自动选择', 'hot-consistent': '不停服备份', 'cold-consistent': '停服后备份' }, modeHelp: { automatic: '所有世界运行时不停服备份；有世界未运行时，停止仍在运行的世界后备份，再恢复原来的运行状态。', 'hot-consistent': '保持世界运行。需要所有世界运行并完成同一次保存；无法完成时本次备份失败，不会自动改为停服。', 'cold-consistent': '暂时停止运行中的世界，完成备份和校验后恢复；原本未运行的世界保持停止。' }, announcementHelp: '需要停服时，按房间的停服提醒设置发送游戏公告和倒计时；无人在线或已关闭提醒时跳过。', olderModeHelp: '当前服务自动选择备份方式；升级管理服务后可指定是否停服。', unknownMode: '其他备份方式', retention: '保留最近快照数', retentionHelp: '填写 1–100；留空不自动清理。按房间共享保留策略，仅清理成功的自动快照，手动和保护备份不受影响。旧 ZIP 快照单独保留。', retentionSummary: '保留最近 {keep} 份自动快照', noRetention: '不自动清理', invalidRetention: '保留数量请填写 1–100，或留空。', legacyTitle: '已有备份计划仍在运行', legacyDescription: '旧计划每 {interval} 分钟执行，保留 {keep} 份。添加新计划前可先暂停，避免重复备份。', pauseLegacy: '暂停旧计划', title: '定时备份', description: '按计划备份当前房间的全部世界，可选择是否停服。', add: '添加计划', edit: '编辑计划', history: '任务与记录', name: '计划名称', frequency: '备份频率', hourly: '每隔几小时', daily: '每天', custom: '自定义', time: '备份时间', interval: '间隔小时数', customExpression: '自定义时间表达式', options: '时区设置', hideOptions: '收起时区设置', dailySummary: '每天 {time}', hourlySummary: '每 {hours} 小时，第 {minute} 分钟', customSummary: '自定义计划', invalidTime: '请填写有效的时间或 1–23 小时间隔', cronHelp: '支持 5 位（分 时 日 月 周）或 6 位（秒 分 时 日 月 周）。例如 0 */6 * * * 为每 6 小时。', timezone: '时区', enabled: '已启用', disabled: '已暂停', groupDisabled: '任务组已暂停', next: '下次备份：', empty: '当前房间尚未设置定时备份。', failed: '操作失败', retry: '重试', loading: '正在读取备份计划…', cancel: '取消', save: '保存', saved: '备份计划已保存', defaultName: '房间定时备份' },
  'en-US': { mode: 'Backup method', modeNames: { automatic: 'Automatic', 'hot-consistent': 'Keep running', 'cold-consistent': 'Stop and back up' }, modeHelp: { automatic: 'Back up online when every world runs. Otherwise stop the running worlds, back up and restore their previous state.', 'hot-consistent': 'Keep worlds running. Every world must run and complete a coordinated save. A failed backup never falls back to stopping worlds.', 'cold-consistent': 'Stop running worlds, create and verify the backup, then resume them. Worlds already stopped remain stopped.' }, announcementHelp: 'Before stopping, use the room’s maintenance announcement and countdown settings. Skip when no players are online or announcements are disabled.', olderModeHelp: 'This service chooses the method automatically. Upgrade the management service to choose whether to stop worlds.', unknownMode: 'Other backup method', retention: 'Recent snapshots to keep', retentionHelp: 'Enter 1–100, or leave blank to disable cleanup. Retention is shared per room and removes only successful automatic snapshots; manual and protection backups are kept. Legacy ZIP snapshots are retained separately.', retentionSummary: 'Keep {keep} recent automatic snapshots', noRetention: 'No automatic cleanup', invalidRetention: 'Enter 1–100 for retention, or leave it blank.', legacyTitle: 'An existing backup schedule is active', legacyDescription: 'The legacy schedule runs every {interval} minutes and keeps {keep} snapshots. Pause it before adding a new schedule to avoid duplicate backups.', pauseLegacy: 'Pause old schedule', title: 'Scheduled backups', description: 'Schedule backups of all worlds and choose whether to stop the room.', add: 'Add schedule', edit: 'Edit schedule', history: 'Tasks and history', name: 'Schedule name', frequency: 'Frequency', hourly: 'Every few hours', daily: 'Daily', custom: 'Custom', time: 'Backup time', interval: 'Interval in hours', customExpression: 'Custom time expression', options: 'Time zone settings', hideOptions: 'Hide time zone settings', dailySummary: 'Daily at {time}', hourlySummary: 'Every {hours} hours at minute {minute}', customSummary: 'Custom schedule', invalidTime: 'Enter a valid time or an interval of 1–23 hours', cronHelp: 'Use 5 fields (minute hour day month weekday) or 6 fields (second first). Example: 0 */6 * * * runs every 6 hours.', timezone: 'Time zone', enabled: 'Enabled', disabled: 'Paused', groupDisabled: 'Group paused', next: 'Next backup:', empty: 'This room has no scheduled backups.', failed: 'Operation failed', retry: 'Retry', loading: 'Loading schedules…', cancel: 'Cancel', save: 'Save', saved: 'Backup schedule saved', defaultName: 'Scheduled room backup' }
} })
const keep = ref('7'), legacyPolicy = ref(null)
const defaults = ref({ schedule: '0 4 * * *', timezone: 'Asia/Shanghai', keep: 7 })
const backupModes = ['automatic', 'hot-consistent', 'cold-consistent']
const supportsMode = ref(false)
const tasks = ref([]), groups = ref([]), loading = ref(false), error = ref('')
const open = ref(false), saving = ref(false), saveError = ref(''), selected = ref(null), preset = ref('daily')
const time = ref('04:00'), interval = ref(1), minute = ref(0), advanced = ref(false)
let loadEpoch = 0
const form = ref({ name: '', schedule: '0 4 * * *', timezone: 'Asia/Shanghai', enabled: true, mode: 'automatic' })
function formatTime(value) { return new Date(value).toLocaleString(locale.value) }
function groupEnabled(task) { return groups.value.find(group => group.id === task.groupId)?.enabled === true }
async function load() {
  const epoch = ++loadEpoch, roomId = props.roomId
  loading.value = true; error.value = ''
  try {
    const response = await backupsV2API.schedules(roomId)
    if (epoch !== loadEpoch) return
    legacyPolicy.value = response.legacyPolicy
    tasks.value = response.items || []
    groups.value = response.groups || []
    supportsMode.value = backupModes.includes(response.defaults?.mode)
    defaults.value = { ...defaults.value, ...response.defaults }
  } catch (cause) { if (epoch === loadEpoch) error.value = cause.message } finally { if (epoch === loadEpoch) loading.value = false }
}
function edit(task = null) {
  selected.value = task; saveError.value = ''
  keep.value = task ? String(task.parameters?.keep ?? '') : String(defaults.value.keep)
  form.value = { name: task?.name || t('defaultName'), schedule: task?.schedule || defaults.value.schedule, timezone: task?.timezone || defaults.value.timezone, enabled: task?.enabled ?? true, mode: task?.parameters?.mode ?? defaults.value.mode ?? 'automatic' }
  const parsed = readBackupSchedule(form.value.schedule)
  preset.value = parsed.kind; time.value = parsed.time || '04:00'; interval.value = parsed.interval || 1; minute.value = parsed.minute || 0
  advanced.value = false; open.value = true
}
function updateTime() {
  const schedule = writeBackupSchedule({ kind: preset.value, time: time.value, interval: Number(interval.value), minute: minute.value })
  if (schedule) form.value.schedule = schedule
}
function applyPreset(value) { if (value !== 'custom') updateTime() }
function scheduleLabel(task) {
  const parsed = readBackupSchedule(task.schedule)
  return parsed.kind === 'daily' ? t('dailySummary', { time: parsed.time })
    : parsed.kind === 'hourly' ? t('hourlySummary', { hours: parsed.interval, minute: parsed.minute }) : t('customSummary')
}
function modeLabel(task) { const mode = task.parameters?.mode ?? 'automatic'; return backupModes.includes(mode) ? t(`modeNames.${mode}`) : t('unknownMode') }
async function openTasks() {
  try { await cronTaskApi.getRoomScope(); cronTaskApi.setRoom(props.roomId); await router.push('/cron/tasks') }
  catch (cause) { toast.error(cause.message) }
}
async function save() {
  if (saving.value) return
  const roomId = props.roomId
  saving.value = true; saveError.value = ''
  try {
    if (preset.value !== 'custom' && !writeBackupSchedule({ kind: preset.value, time: time.value, interval: Number(interval.value), minute: minute.value })) throw new Error(t('invalidTime'))
    const task = selected.value
    const retention = String(keep.value).trim()
    if (retention && (!/^\d+$/.test(retention) || Number(retention) < 1 || Number(retention) > 100)) throw new Error(t('invalidRetention'))
    const { mode, ...fields } = form.value
    const input = { ...fields, ...(supportsMode.value && (!task || mode !== (task.parameters?.mode ?? 'automatic')) ? { mode } : {}), ...(retention ? { keep: Number(retention) } : { clearRetention: true }),
      ...(task ? { taskId: task.id, expectedRevision: task.revision } : { createNew: true }) }
    await backupsV2API.configureSchedule(roomId, input)
    if (roomId !== props.roomId) return
    open.value = false; toast.success(t('saved')); await load()
  } catch (cause) { if (roomId === props.roomId) saveError.value = cause.message } finally { saving.value = false }
}
async function pauseLegacy() {
  if (!legacyPolicy.value || saving.value) return
  const roomId = props.roomId
  saving.value = true
  try {
    await backupsV2API.savePolicy(roomId, { ...legacyPolicy.value, enabled: false })
    if (roomId === props.roomId) await load()
  } catch (cause) { if (roomId === props.roomId) toast.error(cause.message) } finally { saving.value = false }
}
watch(() => props.roomId, () => { open.value = false; tasks.value = []; groups.value = []; legacyPolicy.value = null; load() }, { immediate: true })
onBeforeUnmount(() => { loadEpoch++ })
</script>
