<template>
  <div class="create-task-container">
    <div class="page-header">
      <div><h2 class="page-title">{{ isEdit ? '编辑任务' : '创建新任务' }}</h2><p class="page-description">设置执行范围、调度计划和任务操作</p></div>
      <UiButton variant="outline" @click="goBack"><ArrowLeft data-icon="inline-start" />返回列表</UiButton>
    </div>
    <Card><CardContent class="pt-6"><form @submit.prevent="submitForm"><div class="flex flex-col gap-8">
      <FieldSet><FieldLegend>基本信息</FieldLegend><FieldGroup><div class="grid gap-4 md:grid-cols-2"><Field :data-invalid="Boolean(formErrors.name)"><FieldLabel for="scheduled-name">任务名称</FieldLabel><UiInput id="scheduled-name" v-model="taskForm.name" :aria-invalid="Boolean(formErrors.name)" placeholder="请输入任务名称" /><FieldError v-if="formErrors.name">{{ formErrors.name }}</FieldError></Field><Field :data-invalid="Boolean(formErrors.type)"><FieldLabel>任务类型</FieldLabel><UiSelect v-model="taskForm.type"><SelectTrigger :aria-invalid="Boolean(formErrors.type)"><SelectValue placeholder="请选择任务类型" /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="item in taskTypes" :key="item.value" :value="item.value">{{ item.label }}</SelectItem></SelectGroup></SelectContent></UiSelect><FieldError v-if="formErrors.type">{{ formErrors.type }}</FieldError></Field></div><Field><FieldLabel for="scheduled-description">任务描述</FieldLabel><UiTextarea id="scheduled-description" v-model="taskForm.description" rows="3" placeholder="请输入任务描述" /></Field></FieldGroup></FieldSet>
      <Separator />
      <FieldSet><FieldLegend>执行设置</FieldLegend><FieldGroup><FieldSet :data-invalid="Boolean(formErrors.targets)"><FieldLegend variant="label">目标服务器</FieldLegend><FieldDescription>至少选择一个执行目标。</FieldDescription><div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><Field v-for="server in serverList" :key="server.id" orientation="horizontal"><Checkbox :id="`target-${server.id}`" :model-value="taskForm.targets.map(String).includes(String(server.id))" @update:model-value="toggleTarget(server.id, $event)" /><FieldLabel :for="`target-${server.id}`" class="font-normal">{{ server.name }}</FieldLabel></Field></div><FieldError v-if="formErrors.targets">{{ formErrors.targets }}</FieldError></FieldSet><FieldSet><FieldLegend variant="label">任务优先级</FieldLegend><RadioGroup v-model="taskForm.priority" class="flex flex-wrap gap-4"><Field v-for="priority in priorityOptions" :key="priority.value" orientation="horizontal"><RadioGroupItem :id="`priority-${priority.value}`" :value="priority.value" /><FieldLabel :for="`priority-${priority.value}`">{{ priority.label }}</FieldLabel></Field></RadioGroup></FieldSet><FieldSet><FieldLegend variant="label">调度类型</FieldLegend><RadioGroup v-model="taskForm.scheduleType" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" @update:model-value="onScheduleTypeChange"><Field v-for="schedule in scheduleOptions" :key="schedule.value" orientation="horizontal"><RadioGroupItem :id="`schedule-${schedule.value}`" :value="schedule.value" /><FieldLabel :for="`schedule-${schedule.value}`">{{ schedule.label }}</FieldLabel></Field></RadioGroup></FieldSet>
        <Field v-if="taskForm.scheduleType === 'once'" :data-invalid="Boolean(formErrors.schedule)"><FieldLabel for="once-time">执行时间</FieldLabel><UiInput id="once-time" v-model="taskForm.schedule.once.dateTime" type="datetime-local" :min="minimumDateTime" :aria-invalid="Boolean(formErrors.schedule)" /><FieldError v-if="formErrors.schedule">{{ formErrors.schedule }}</FieldError></Field>
        <div v-if="taskForm.scheduleType === 'daily'" class="grid gap-4 md:grid-cols-2"><Field :data-invalid="Boolean(formErrors.schedule)"><FieldLabel for="daily-time">执行时间</FieldLabel><UiInput id="daily-time" v-model="taskForm.schedule.daily.time" type="time" :aria-invalid="Boolean(formErrors.schedule)" /><FieldError v-if="formErrors.schedule">{{ formErrors.schedule }}</FieldError></Field><Field><FieldLabel for="daily-repeat">重复间隔（天）</FieldLabel><UiInput id="daily-repeat" v-model.number="taskForm.schedule.daily.repeatDays" type="number" min="1" max="30" /></Field></div>
        <div v-if="taskForm.scheduleType === 'weekly'" class="flex flex-col gap-4"><Field :data-invalid="Boolean(formErrors.schedule)"><FieldLabel for="weekly-time">执行时间</FieldLabel><UiInput id="weekly-time" v-model="taskForm.schedule.weekly.time" type="time" :aria-invalid="Boolean(formErrors.schedule)" /></Field><FieldSet><FieldLegend variant="label">执行日</FieldLegend><div class="flex flex-wrap gap-4"><Field v-for="day in weekDays" :key="day.value" orientation="horizontal"><Checkbox :id="`weekday-${day.value}`" :model-value="taskForm.schedule.weekly.days.includes(day.value)" @update:model-value="toggleWeekDay(day.value, $event)" /><FieldLabel :for="`weekday-${day.value}`">{{ day.label }}</FieldLabel></Field></div><FieldError v-if="formErrors.schedule">{{ formErrors.schedule }}</FieldError></FieldSet></div>
        <div v-if="taskForm.scheduleType === 'custom'" class="grid gap-4 md:grid-cols-2"><Field :data-invalid="Boolean(formErrors.schedule)"><FieldLabel for="custom-cron">Cron 表达式</FieldLabel><UiInput id="custom-cron" v-model="taskForm.schedule.custom.expression" class="font-mono" :aria-invalid="Boolean(formErrors.schedule)" placeholder="例如：0 0 * * *" @input="parseCronExpression" /><FieldError v-if="formErrors.schedule">{{ formErrors.schedule }}</FieldError><UiButton type="button" variant="link" class="w-fit px-0" @click="showCronHelp">查看 Cron 表达式帮助</UiButton></Field><Field><FieldLabel>表达式说明</FieldLabel><UiTextarea v-model="cronDescription" rows="3" readonly placeholder="Cron 表达式解析将在这里显示" /></Field></div>
      </FieldGroup></FieldSet>
      <Separator />
      <FieldSet><FieldLegend>任务操作</FieldLegend><FieldGroup><Field :data-invalid="Boolean(formErrors.action)"><FieldLabel>操作类型</FieldLabel><UiSelect v-model="taskForm.action.type" @update:model-value="onActionTypeChange"><SelectTrigger :aria-invalid="Boolean(formErrors.action)"><SelectValue placeholder="请选择操作类型" /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="action in actionTypes" :key="action.value" :value="action.value">{{ action.label }}</SelectItem></SelectGroup></SelectContent></UiSelect><FieldError v-if="formErrors.action">{{ formErrors.action }}</FieldError></Field>
        <template v-if="taskForm.action.type === 'server_restart'"><FieldSet><FieldLegend variant="label">重启模式</FieldLegend><RadioGroup v-model="taskForm.action.params.restartMode" class="flex flex-wrap gap-4"><Field orientation="horizontal"><RadioGroupItem id="restart-graceful" value="graceful" /><FieldLabel for="restart-graceful">优雅重启（等待玩家保存）</FieldLabel></Field><Field orientation="horizontal"><RadioGroupItem id="restart-force" value="force" /><FieldLabel for="restart-force">强制重启</FieldLabel></Field></RadioGroup></FieldSet><Field orientation="horizontal"><FieldContent><FieldLabel for="notify-players">通知玩家</FieldLabel><FieldDescription>提前通知玩家服务器即将重启。</FieldDescription></FieldContent><UiSwitch id="notify-players" v-model="taskForm.action.params.notifyPlayers" /></Field><Field v-if="taskForm.action.params.notifyPlayers"><FieldLabel>通知时间</FieldLabel><UiSelect v-model="taskForm.action.params.notifyTime"><SelectTrigger><SelectValue placeholder="选择通知时间" /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="minutes in [1, 3, 5, 10, 15, 30]" :key="minutes" :value="String(minutes)">{{ minutes }} 分钟前</SelectItem></SelectGroup></SelectContent></UiSelect></Field></template>
        <template v-if="taskForm.action.type === 'game_event'"><div class="grid gap-4 md:grid-cols-2"><Field><FieldLabel>事件类型</FieldLabel><UiSelect v-model="taskForm.action.params.eventType"><SelectTrigger><SelectValue placeholder="选择事件类型" /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="event in eventOptions" :key="event.value" :value="event.value">{{ event.label }}</SelectItem></SelectGroup></SelectContent></UiSelect></Field><Field><FieldLabel for="event-duration">活动持续时间（小时）</FieldLabel><UiInput id="event-duration" v-model.number="taskForm.action.params.duration" type="number" min="1" max="72" /></Field></div></template>
      </FieldGroup></FieldSet>
      <div class="flex justify-end gap-2"><UiButton type="button" variant="outline" @click="goBack">取消</UiButton><UiButton type="submit" :disabled="submitting || loading"><Spinner v-if="submitting" data-icon="inline-start" />{{ isEdit ? '保存修改' : '创建任务' }}</UiButton></div>
    </div></form></CardContent></Card>

    <UiDialog v-model:open="cronHelpOpen"><DialogContent><DialogHeader><DialogTitle>Cron 表达式帮助</DialogTitle><DialogDescription>标准五段式 Cron：分钟、小时、日期、月份、星期</DialogDescription></DialogHeader><div class="flex flex-col gap-3 text-sm"><code>* * * * *</code><p>常用示例：</p><ul class="list-disc pl-5"><li>0 4 * * *：每天凌晨 4 点</li><li>0 18 * * 5：每周五 18 点</li><li>0 */6 * * *：每 6 小时</li><li>0 12,18 * * *：每天 12 点和 18 点</li></ul></div><DialogFooter><UiButton @click="cronHelpOpen = false">我知道了</UiButton></DialogFooter></DialogContent></UiDialog>
  </div>
</template>

<script>
import { ArrowLeft } from '@lucide/vue';
import { toast } from 'vue-sonner';
import { cronTaskApi } from '@/api/index';
import cronstrue from 'cronstrue/i18n';
import { Button as UiButton } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog as UiDialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field';
import { Input as UiInput } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select as UiSelect, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { Switch as UiSwitch } from '@/components/ui/switch';
import { Textarea as UiTextarea } from '@/components/ui/textarea';

export default {
  name: 'CreateTask',
  components: {
    ArrowLeft, Card, CardContent, Checkbox, DialogContent, DialogDescription,
    DialogFooter, DialogHeader, DialogTitle, Field, FieldContent, FieldDescription, FieldError,
    FieldGroup, FieldLabel, FieldLegend, FieldSet, RadioGroup, RadioGroupItem, SelectContent,
    SelectGroup, SelectItem, SelectTrigger, SelectValue, Separator, Spinner, UiButton, UiInput,
    UiDialog, UiSelect, UiSwitch, UiTextarea
  },
  data() {
    return {
      isEdit: false,
      taskId: null,
      loading: false,
      submitting: false,
      cronHelpOpen: false,
      formErrors: {},
      minimumDateTime: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16),
      taskForm: {
        name: '',
        type: '',
        description: '',
        targets: [],
        priority: 'normal',
        scheduleType: 'once',
        schedule: {
          once: {
            dateTime: null
          },
          daily: {
            time: null,
            repeatDays: 1
          },
          weekly: {
            time: null,
            days: []
          },
          custom: {
            expression: ''
          }
        },
        action: {
          type: '',
          params: {}
        }
      },
      taskTypes: [
        { value: 'server_maintenance', label: '服务器维护' },
        { value: 'game_event', label: '游戏活动' },
        { value: 'data_backup', label: '数据备份' },
        { value: 'system_maintenance', label: '系统维护' },
        { value: 'announcement', label: '公告通知' },
        { value: 'mod_management', label: '模组管理' },
        { value: 'data_analysis', label: '数据分析' }
      ],
      actionTypes: [
        { value: 'server_restart', label: '服务器重启' },
        { value: 'backup_save', label: '备份存档' },
        { value: 'send_announcement', label: '发送公告' },
        { value: 'mod_update', label: '更新模组' },
        { value: 'resource_cleanup', label: '资源清理' },
        { value: 'game_event', label: '游戏事件' },
        { value: 'run_command', label: '运行命令' }
      ],
      cronDescription: '',
      serverList: [],
      priorityOptions: [{ value: 'low', label: '低' }, { value: 'normal', label: '中' }, { value: 'high', label: '高' }],
      scheduleOptions: [{ value: 'once', label: '单次任务' }, { value: 'daily', label: '每日任务' }, { value: 'weekly', label: '每周任务' }, { value: 'custom', label: '自定义定时' }],
      weekDays: [{ value: 1, label: '周一' }, { value: 2, label: '周二' }, { value: 3, label: '周三' }, { value: 4, label: '周四' }, { value: 5, label: '周五' }, { value: 6, label: '周六' }, { value: 0, label: '周日' }],
      eventOptions: [{ value: 'resource_refresh', label: '资源刷新' }, { value: 'monster_attack', label: '怪物攻击' }, { value: 'drop_boost', label: '物品掉落提升' }, { value: 'seasonal_event', label: '季节性活动' }, { value: 'custom_event', label: '自定义活动' }]
    };
  },
  async created() {
    await this.loadRoomScope();
    // 检查是否是编辑模式
    const { id } = this.$route.query;
    if (id) {
      this.isEdit = true;
      this.taskId = parseInt(id);
      this.loadTaskData();
    }
  },
  methods: {
    async loadRoomScope() {
      try {
        const scope = await cronTaskApi.getRoomScope(true);
        this.serverList = scope.rooms;
      } catch (error) {
        this.serverList = [];
        toast.error(error.message || '读取真实房间列表失败');
      }
    },
    goBack() {
      this.$router.push('/scheduled/tasks');
    },
    
    onScheduleTypeChange(type) {
      // 根据类型重置表单验证规则
      this.taskForm.scheduleType = type;
    },

    toggleTarget(serverId, checked) {
      const targets = this.taskForm.targets.filter(id => String(id) !== String(serverId));
      if (checked) targets.push(serverId);
      this.taskForm.targets = targets;
    },

    toggleWeekDay(day, checked) {
      const days = this.taskForm.schedule.weekly.days.filter(value => value !== day);
      if (checked) days.push(day);
      this.taskForm.schedule.weekly.days = days;
    },
    
    onActionTypeChange(actionType) {
      // 根据操作类型初始化参数
      const defaultParams = {
        server_restart: {
          restartMode: 'graceful',
          notifyPlayers: true,
          notifyTime: '5'
        },
        backup_save: {
          backupName: `备份_${new Date().toLocaleDateString().replace(/\//g, '-')}`,
          compress: true
        },
        send_announcement: {
          title: '',
          content: '',
          level: 'info'
        },
        mod_update: {
          checkOnly: false,
          updateAll: true,
          specificMods: []
        },
        resource_cleanup: {
          cleanLogs: true,
          cleanTemp: true,
          backupBeforeCleaning: true
        },
        game_event: {
          eventType: 'resource_refresh',
          duration: 24
        },
        run_command: {
          command: '',
          runAsAdmin: false
        }
      };
      
      this.taskForm.action.params = defaultParams[actionType] || {};
    },
    
    showCronHelp() {
      this.cronHelpOpen = true;
    },
    
    parseCronExpression() {
      // 解析cron表达式并显示人类可读的描述
      const expression = this.taskForm.schedule.custom.expression;
      if (!expression) {
        this.cronDescription = '';
        return;
      }
      
      try {
        const parts = expression.split(' ');
        if (parts.length !== 5) {
          this.cronDescription = '表达式格式不正确，应该包含5个部分';
          return;
        }
        
        let description = '该任务将';
        
        // 解析分钟
        const minute = parts[0];
        if (minute === '*') {
          description += '每分钟';
        } else if (minute.includes('/')) {
          const interval = minute.split('/')[1];
          description += `每${interval}分钟`;
        } else {
          description += `在分钟为${minute}时`;
        }
        
        // 解析小时
        const hour = parts[1];
        if (hour === '*') {
          description += '的每小时';
        } else if (hour.includes('/')) {
          const interval = hour.split('/')[1];
          description += `的每${interval}小时`;
        } else if (hour.includes(',')) {
          description += `的${hour.split(',').join('、')}点`;
        } else {
          description += `的${hour}点`;
        }
        
        // 解析日期
        const day = parts[2];
        if (day === '*') {
          description += '每天';
        } else {
          description += `每月${day}日`;
        }
        
        // 解析月份
        const month = parts[3];
        if (month === '*') {
          description += '每月';
        } else {
          const monthNames = ['', '一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
          if (month.includes(',')) {
            description += `的${month.split(',').map(m => monthNames[parseInt(m)]).join('、')}`;
          } else {
            description += `的${monthNames[parseInt(month)]}`;
          }
        }
        
        // 解析星期
        const weekday = parts[4];
        if (weekday === '*') {
          description += '';
        } else {
          const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
          if (weekday.includes(',')) {
            description += `的${weekday.split(',').map(w => dayNames[parseInt(w)]).join('、')}`;
          } else {
            description += `的${dayNames[parseInt(weekday)]}`;
          }
        }
        
        description += '运行。';
        this.cronDescription = description;
        
      } catch (e) {
        this.cronDescription = '无法解析表达式，请检查格式是否正确';
      }
    },
    
    validateForm() {
      const errors = {};
      const name = (this.taskForm.name || '').trim();
      if (!name) errors.name = '请输入任务名称';
      else if (name.length < 2 || name.length > 50) errors.name = '长度应在 2 到 50 个字符之间';
      if (!this.taskForm.type) errors.type = '请选择任务类型';
      if (this.taskForm.targets.length === 0) errors.targets = '至少选择一个服务器';
      if (!this.taskForm.action.type) errors.action = '请选择操作类型';
      if (this.taskForm.scheduleType === 'once' && !this.taskForm.schedule.once.dateTime) errors.schedule = '请选择执行时间';
      if (this.taskForm.scheduleType === 'daily' && !this.taskForm.schedule.daily.time) errors.schedule = '请选择每日执行时间';
      if (this.taskForm.scheduleType === 'weekly' && (!this.taskForm.schedule.weekly.time || this.taskForm.schedule.weekly.days.length === 0)) errors.schedule = '请选择每周执行时间和执行日';
      if (this.taskForm.scheduleType === 'custom' && !this.taskForm.schedule.custom.expression.trim()) errors.schedule = '请输入 Cron 表达式';
      this.formErrors = errors;
      return Object.keys(errors).length === 0;
    },

    submitForm() {
      if (this.validateForm()) {
          // 从表单数据构建API所需的任务对象
          const apiTaskData = this.buildApiTaskData();
          
          this.submitting = true;
          
          // 根据是编辑还是新建选择API
          const apiPromise = this.isEdit 
            ? cronTaskApi.updateTask(this.taskId, apiTaskData) 
            : cronTaskApi.addTask(apiTaskData);
          
          apiPromise
            .then(response => {
              if (response.data && response.data.status === 200) {
                toast.success(this.isEdit ? '任务更新成功' : '任务创建成功');
                
                // 跳转回任务列表
                this.goBack();
              } else {
                toast.error(response.data.message || (this.isEdit ? '更新任务失败' : '创建任务失败'));
              }
            })
            .catch(error => {
              console.error(this.isEdit ? '更新任务失败:' : '创建任务失败:', error);
              toast.error(this.isEdit ? '更新任务失败' : '创建任务失败');
            })
            .finally(() => {
              this.submitting = false;
            });
      } else {
        toast.error('请正确填写表单');
      }
    },
    
    // 从表单数据构建API所需的任务对象
    buildApiTaskData() {
      // 基本信息
      const apiTask = {
        name: this.taskForm.name,
        description: this.taskForm.description,
        status: this.taskForm.enabled ? 1 : 0,
        type: 'shell', // 默认为shell类型
        target: '',   // 将根据不同操作类型设置
        timeout: this.taskForm.timeout || 0,
        retry_times: this.taskForm.retryTimes || 0,
        retry_interval: this.taskForm.retryInterval || 60,
        group_id: 0
      };
      
      // 设置cron表达式
      switch (this.taskForm.scheduleType) {
        case 'once': {
          // 将单次执行的日期时间转换为cron表达式
          const dateTime = new Date(this.taskForm.schedule.once.dateTime);
          apiTask.spec = `${dateTime.getMinutes()} ${dateTime.getHours()} ${dateTime.getDate()} ${dateTime.getMonth() + 1} * ${dateTime.getFullYear()}`;
          break;
        }
        case 'daily': {
          // 每日任务
          const [hours, minutes] = this.taskForm.schedule.daily.time.split(':');
          apiTask.spec = `${minutes} ${hours} */${this.taskForm.schedule.daily.repeatDays} * *`;
          break;
        }
        case 'weekly': {
          // 每周任务
          const [weekHours, weekMinutes] = this.taskForm.schedule.weekly.time.split(':');
          const days = this.taskForm.schedule.weekly.days.sort().join(',');
          apiTask.spec = `${weekMinutes} ${weekHours} * * ${days}`;
          break;
        }
        case 'custom':
          // 自定义cron表达式
          apiTask.spec = this.taskForm.schedule.custom.expression;
          break;
      }
      
      // 设置目标和命令，基于操作类型
      switch (this.taskForm.action.type) {
        case 'server_restart':
          apiTask.target = this.buildServerRestartCommand();
          break;
        case 'backup':
          apiTask.target = this.buildBackupCommand();
          break;
        case 'custom_command':
          apiTask.target = this.taskForm.action.params.command;
          break;
        case 'mod_update':
          apiTask.target = 'mod_update.sh';
          break;
        case 'event':
          apiTask.target = this.buildEventCommand();
          break;
        case 'function':
          apiTask.type = 'function';
          apiTask.target = this.taskForm.action.params.functionName;
          apiTask.args = this.taskForm.action.params.functionArgs || [];
          break;
      }
      
      return apiTask;
    },
    
    // 构建服务器重启命令
    buildServerRestartCommand() {
      const servers = this.taskForm.targets.join(' ');
      const mode = this.taskForm.action.params.restartMode;
      const notify = this.taskForm.action.params.notifyPlayers ? '--notify' : '';
      
      return `restart_servers.sh ${servers} --mode=${mode} ${notify}`;
    },
    
    // 构建备份命令
    buildBackupCommand() {
      const servers = this.taskForm.targets.join(' ');
      const backupType = this.taskForm.action.params.backupType;
      
      return `backup.sh ${servers} --type=${backupType}`;
    },
    
    // 构建活动命令
    buildEventCommand() {
      const eventId = this.taskForm.action.params.eventId;
      const action = this.taskForm.action.params.eventAction;
      const servers = this.taskForm.targets.join(' ');
      
      return `event.sh ${eventId} --action=${action} --servers=${servers}`;
    },
    
    // 加载任务数据（编辑模式）
    loadTaskData() {
      if (this.isEdit && this.taskId) {
        this.loading = true;
        
        cronTaskApi.getTaskDetail(this.taskId)
          .then(response => {
            if (response.data && response.data.status === 200) {
              const task = response.data.data;
              
              // 填充基本信息
              this.taskForm.name = task.name;
              this.taskForm.description = task.description || '';
              this.taskForm.enabled = task.status === 1;
              
              // 设置超时和重试
              this.taskForm.timeout = task.timeout || 0;
              this.taskForm.retryTimes = task.retry_times || 0;
              this.taskForm.retryInterval = task.retry_interval || 60;
              
              // 解析cron表达式，设置调度类型
              this.parseScheduleFromCron(task.spec);
              
              // 解析命令，设置操作类型
              this.parseActionFromCommand(task.type, task.target, task.args);
            } else {
              toast.error(response.data.message || '加载任务详情失败');
            }
          })
          .catch(error => {
            console.error('加载任务详情失败:', error);
            toast.error('加载任务详情失败');
          })
          .finally(() => {
            this.loading = false;
          });
      }
    },
    
    // 从cron表达式解析调度设置
    parseScheduleFromCron(cronExpr) {
      // 默认使用自定义模式
      this.taskForm.scheduleType = 'custom';
      this.taskForm.schedule.custom.expression = cronExpr;
      
      try {
        // 尝试解析cron表达式的人类可读描述
        this.cronDescription = cronstrue.toString(cronExpr, { locale: 'zh_CN' });
      } catch (e) {
        this.cronDescription = '无效的cron表达式';
      }
      
      // TODO: 可以尝试识别常见模式，设置为daily或weekly
    },
    
    // 从命令解析操作类型
    parseActionFromCommand(type, command, args) {
      if (type === 'function') {
        this.taskForm.action.type = 'function';
        this.taskForm.action.params.functionName = command;
        this.taskForm.action.params.functionArgs = args || [];
        return;
      }
      
      // 解析shell命令
      if (command.includes('restart_servers.sh')) {
        this.taskForm.action.type = 'server_restart';
        
        // 提取参数
        const notifyMatch = command.match(/--notify/);
        this.taskForm.action.params.notifyPlayers = !!notifyMatch;
        
        const modeMatch = command.match(/--mode=(\w+)/);
        this.taskForm.action.params.restartMode = modeMatch ? modeMatch[1] : 'graceful';
        
        // 提取服务器
        const servers = command.split(' ')[1].split(' ');
        this.taskForm.targets = servers.filter(s => !s.startsWith('--'));
      } else if (command.includes('backup.sh')) {
        this.taskForm.action.type = 'backup';
        
        const typeMatch = command.match(/--type=(\w+)/);
        this.taskForm.action.params.backupType = typeMatch ? typeMatch[1] : 'full';
        
        // 提取服务器
        const servers = command.split(' ')[1].split(' ');
        this.taskForm.targets = servers.filter(s => !s.startsWith('--'));
      } else if (command.includes('event.sh')) {
        this.taskForm.action.type = 'event';
        
        const eventId = command.split(' ')[1];
        this.taskForm.action.params.eventId = eventId;
        
        const actionMatch = command.match(/--action=(\w+)/);
        this.taskForm.action.params.eventAction = actionMatch ? actionMatch[1] : 'start';
        
        const serversMatch = command.match(/--servers=(.+)/);
        if (serversMatch) {
          this.taskForm.targets = serversMatch[1].split(',');
        }
      } else if (command === 'mod_update.sh') {
        this.taskForm.action.type = 'mod_update';
      } else {
        // 默认为自定义命令
        this.taskForm.action.type = 'custom_command';
        this.taskForm.action.params.command = command;
      }
    },
    
    // 获取类型显示标签
    getTypeLabel(typeValue) {
      const type = this.taskTypes.find(t => t.value === typeValue);
      return type ? type.label : typeValue;
    },
    
    // 格式化调度信息
    formatSchedule() {
      if (this.taskForm.scheduleType === 'once') {
        return this.taskForm.schedule.once.dateTime;
      } else if (this.taskForm.scheduleType === 'daily') {
        return `每天 ${this.taskForm.schedule.daily.time}${this.taskForm.schedule.daily.repeatDays > 1 ? `，每${this.taskForm.schedule.daily.repeatDays}天` : ''}`;
      } else if (this.taskForm.scheduleType === 'weekly') {
        const dayMap = {
          0: '日',
          1: '一',
          2: '二',
          3: '三',
          4: '四',
          5: '五',
          6: '六'
        };
        
        const days = this.taskForm.schedule.weekly.days.map(d => `周${dayMap[d]}`).join('、');
        return `${days} ${this.taskForm.schedule.weekly.time}`;
      } else {
        return this.taskForm.schedule.custom.expression;
      }
    },
    
    // 格式化目标服务器
    formatTargets() {
      if (this.taskForm.targets.length === this.serverList.length) {
        return '全部服务器';
      } else if (this.taskForm.targets.length === 1) {
        const serverId = this.taskForm.targets[0];
        const server = this.serverList.find(s => s.id === serverId);
        return server ? server.name : '未知服务器';
      } else {
        return `${this.taskForm.targets.length}个服务器`;
      }
    },
    
    // 映射任务类型文本到值
    mapTypeToValue(typeText) {
      const typeMap = {
        '服务器维护': 'server_maintenance',
        '游戏活动': 'game_event',
        '数据备份': 'data_backup',
        '系统维护': 'system_maintenance',
        '公告通知': 'announcement',
        '模组管理': 'mod_management',
        '数据分析': 'data_analysis'
      };
      
      return typeMap[typeText] || '';
    },
    
    // 解析目标服务器
    parseTargets(targetText) {
      if (targetText === '全部服务器') {
        return this.serverList.map(server => server.id);
      }
      
      const server = this.serverList.find(s => s.name === targetText);
      return server ? [server.id] : [];
    },
    
    // 解析调度类型
    parseScheduleType(scheduleText) {
      if (scheduleText.includes('每天')) {
        return 'daily';
      } else if (scheduleText.includes('每周')) {
        return 'weekly';
      } else if (scheduleText.includes('每')) {
        return 'custom';
      } else {
        return 'once';
      }
    },
    
    // 解析调度详情
    parseSchedule(scheduleText) {
      // 默认值
      const schedule = {
        once: {
          dateTime: null
        },
        daily: {
          time: null,
          repeatDays: 1
        },
        weekly: {
          time: null,
          days: []
        },
        custom: {
          expression: ''
        }
      };
      
      // 根据文本解析
      if (scheduleText.includes('每天')) {
        const timeMatch = scheduleText.match(/(\d{1,2}:\d{2})/);
        if (timeMatch) {
          schedule.daily.time = timeMatch[1];
        }
      } else if (scheduleText.includes('每周')) {
        const dayMatch = scheduleText.match(/(一|二|三|四|五|六|日)/);
        const timeMatch = scheduleText.match(/(\d{1,2}:\d{2})/);
        
        if (dayMatch) {
          const dayMap = { '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '日': 0 };
          schedule.weekly.days = [dayMap[dayMatch[1]]];
        }
        
        if (timeMatch) {
          schedule.weekly.time = timeMatch[1];
        }
      } else if (!scheduleText.includes('每')) {
        // 尝试解析为单次任务日期
        try {
          schedule.once.dateTime = scheduleText;
        } catch (e) {
          console.error('无法解析日期:', scheduleText);
        }
      } else {
        // 自定义调度表达式
        schedule.custom.expression = scheduleText;
      }
      
      return schedule;
    },
    
  }
};
</script>

<style scoped>
.create-task-container {
  width: 100%;
  min-width: 0;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--border);
}

.page-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--foreground);
}
.page-description {
  margin: 4px 0 0;
  color: var(--muted-foreground);
  font-size: 13px;
}
</style>
