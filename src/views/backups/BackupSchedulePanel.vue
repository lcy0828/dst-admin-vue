<template>
  <Card>
    <CardHeader>
      <CardTitle>{{ t('title') }}</CardTitle>
      <CardDescription>{{ t('description') }}</CardDescription>
      <CardAction><UiButton size="sm" variant="outline" :disabled="loading || Boolean(error)" @click="edit()"><Plus data-icon="inline-start" />{{ t('add') }}</UiButton></CardAction>
    </CardHeader>
    <CardContent class="flex flex-col gap-3">
      <Alert v-if="error" variant="destructive"><AlertTitle>{{ t('failed') }}</AlertTitle><AlertDescription>{{ error }}</AlertDescription><AlertAction><UiButton size="sm" variant="outline" @click="load">{{ t('retry') }}</UiButton></AlertAction></Alert>
      <p v-else-if="loading" class="text-sm text-muted-foreground">{{ t('loading') }}</p>
      <p v-else-if="!tasks.length" class="text-sm text-muted-foreground">{{ t('empty') }}</p>
      <div v-for="task in tasks" :key="task.id" class="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3">
        <div class="flex min-w-0 flex-col gap-1">
          <div class="flex flex-wrap items-center gap-2"><span class="font-medium">{{ task.name }}</span><Badge variant="outline">{{ t(!task.enabled ? 'disabled' : !groupEnabled(task) ? 'groupDisabled' : 'enabled') }}</Badge></div>
          <p class="text-sm text-muted-foreground"><code>{{ task.schedule }}</code> · {{ task.timezone }}</p>
          <p v-if="task.enabled && groupEnabled(task) && task.nextRunAt" class="text-xs text-muted-foreground">{{ t('next') }} {{ formatTime(task.nextRunAt) }}</p>
        </div>
        <div class="flex gap-2"><UiButton size="sm" variant="outline" @click="edit(task)">{{ t('edit') }}</UiButton><UiButton size="sm" variant="ghost" @click="openTasks">{{ t('history') }}</UiButton></div>
      </div>
    </CardContent>
    <Dialog v-model:open="open">
      <DialogContent>
        <DialogHeader><DialogTitle>{{ t(selected ? 'edit' : 'add') }}</DialogTitle><DialogDescription>{{ t('description') }}</DialogDescription></DialogHeader>
        <FieldGroup>
          <Field><FieldLabel for="backup-schedule-name">{{ t('name') }}</FieldLabel><UiInput id="backup-schedule-name" v-model="form.name" maxlength="50" /></Field>
          <Field><FieldLabel for="backup-schedule-preset">{{ t('frequency') }}</FieldLabel><UiSelect v-model="preset" @update:model-value="applyPreset"><SelectTrigger id="backup-schedule-preset"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="hourly">{{ t('hourly') }}</SelectItem><SelectItem value="daily">{{ t('daily') }}</SelectItem><SelectItem value="custom">{{ t('custom') }}</SelectItem></SelectGroup></SelectContent></UiSelect></Field>
          <Field><FieldLabel for="backup-schedule-cron">Cron</FieldLabel><UiInput id="backup-schedule-cron" v-model="form.schedule" @input="preset = 'custom'" /><FieldDescription>{{ t('cronHelp') }}</FieldDescription></Field>
          <Field><FieldLabel for="backup-schedule-zone">{{ t('timezone') }}</FieldLabel><UiInput id="backup-schedule-zone" v-model="form.timezone" placeholder="Asia/Shanghai" /></Field>
          <Field orientation="horizontal"><UiSwitch id="backup-schedule-enabled" v-model="form.enabled" /><FieldLabel for="backup-schedule-enabled">{{ t('enabled') }}</FieldLabel></Field>
          <Alert v-if="saveError" variant="destructive"><AlertTitle>{{ t('failed') }}</AlertTitle><AlertDescription>{{ saveError }}</AlertDescription></Alert>
        </FieldGroup>
        <DialogFooter><UiButton variant="outline" :disabled="saving" @click="open = false">{{ t('cancel') }}</UiButton><UiButton :disabled="saving || !form.name.trim() || !form.schedule.trim()" @click="save"><Spinner v-if="saving" data-icon="inline-start" />{{ t('save') }}</UiButton></DialogFooter>
      </DialogContent>
    </Dialog>
  </Card>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { Plus } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { cronTaskApi } from '@/api/index'
import { automationV2API } from '@/api/v2'
import { Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent } from '@/components/ui/card'
import { Alert, AlertTitle, AlertDescription, AlertAction } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button as UiButton } from '@/components/ui/button'
import { Input as UiInput } from '@/components/ui/input'
import { Switch as UiSwitch } from '@/components/ui/switch'
import { Spinner } from '@/components/ui/spinner'
import { Field, FieldGroup, FieldLabel, FieldDescription } from '@/components/ui/field'
import { Select as UiSelect, SelectTrigger, SelectValue, SelectContent, SelectGroup, SelectItem } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
const props = defineProps({ roomId: { type: String, required: true } })
const router = useRouter()
const { t, locale } = useI18n({ messages: {
  'zh-CN': { title: '定时备份', description: '为当前房间设置独立备份计划，包含全部世界。远程房间全部运行时使用热备份；部分运行时短暂停止并恢复原运行世界。', add: '添加计划', edit: '编辑计划', history: '任务与记录', name: '计划名称', frequency: '备份频率', hourly: '每小时', daily: '每天凌晨 4 点', custom: '自定义', cronHelp: '支持 5 位（分 时 日 月 周）或 6 位（秒 分 时 日 月 周）。例如 0 */6 * * * 为每 6 小时。', timezone: '时区', enabled: '已启用', disabled: '已暂停', groupDisabled: '任务组已暂停', next: '下次备份：', empty: '当前房间尚未设置定时备份。', failed: '操作失败', retry: '重试', loading: '正在读取备份计划…', cancel: '取消', save: '保存', saved: '备份计划已保存', defaultName: '房间定时备份' },
  'en-US': { title: 'Scheduled backups', description: 'Schedule backups for all worlds in this room. Remote rooms use hot snapshots when all worlds run; partially running rooms briefly stop and resume their running worlds.', add: 'Add schedule', edit: 'Edit schedule', history: 'Tasks and history', name: 'Schedule name', frequency: 'Frequency', hourly: 'Every hour', daily: 'Daily at 04:00', custom: 'Custom', cronHelp: 'Use 5 fields (minute hour day month weekday) or 6 fields (second first). Example: 0 */6 * * * runs every 6 hours.', timezone: 'Time zone', enabled: 'Enabled', disabled: 'Paused', groupDisabled: 'Group paused', next: 'Next backup:', empty: 'This room has no scheduled backups.', failed: 'Operation failed', retry: 'Retry', loading: 'Loading schedules…', cancel: 'Cancel', save: 'Save', saved: 'Backup schedule saved', defaultName: 'Scheduled room backup' }
} })
const tasks = ref([]), groups = ref([]), loading = ref(false), error = ref('')
const open = ref(false), saving = ref(false), saveError = ref(''), selected = ref(null), preset = ref('daily')
const form = ref({ name: '', schedule: '0 4 * * *', timezone: 'Asia/Shanghai', enabled: true })
function formatTime(value) { return new Date(value).toLocaleString(locale.value) }
function groupEnabled(task) { return groups.value.find(group => group.id === task.groupId)?.enabled === true }
async function load() {
  loading.value = true; error.value = ''
  try {
    const [taskResponse, groupResponse] = await Promise.all([automationV2API.tasks(props.roomId), automationV2API.groups(props.roomId)])
    tasks.value = (taskResponse.items || []).filter(task => task.action === 'backup.create')
    groups.value = groupResponse.items || []
  } catch (cause) { error.value = cause.message } finally { loading.value = false }
}
function edit(task = null) {
  selected.value = task; saveError.value = ''
  form.value = { name: task?.name || t('defaultName'), schedule: task?.schedule || '0 4 * * *', timezone: task?.timezone || 'Asia/Shanghai', enabled: task?.enabled ?? true }
  preset.value = task ? 'custom' : 'daily'; open.value = true
}
function applyPreset(value) { if (value !== 'custom') form.value.schedule = value === 'hourly' ? '0 * * * *' : '0 4 * * *' }
async function openTasks() {
  try { await cronTaskApi.getRoomScope(); cronTaskApi.setRoom(props.roomId); await router.push('/cron/tasks') }
  catch (cause) { toast.error(cause.message) }
}
async function save() {
  saving.value = true; saveError.value = ''
  try {
    const task = selected.value
    let groupId = task?.groupId
    if (!groupId) {
      let group = groups.value.find(item => item.name === 'room-backups')
      if (group && !group.enabled) throw new Error(t('groupDisabled'))
      if (!group) { group = await automationV2API.createGroup(props.roomId, { name: 'room-backups', description: '', type: 'custom', enabled: true }); groups.value.push(group) }
      groupId = group.id
    }
    const input = { ...form.value, groupId, action: 'backup.create', description: task?.description || '', worldIds: task?.worldIds || [], parameters: task?.parameters || {}, timeoutSeconds: task?.timeoutSeconds || 600, retryTimes: task?.retryTimes || 0, retryIntervalSeconds: task?.retryIntervalSeconds || 60, dependencies: task?.dependencies || [], expectedRevision: task?.revision || '' }
    if (task) await automationV2API.updateTask(props.roomId, task.id, input)
    else await automationV2API.createTask(props.roomId, input)
    open.value = false; toast.success(t('saved')); await load()
  } catch (cause) { saveError.value = cause.message } finally { saving.value = false }
}
onMounted(load)
</script>
