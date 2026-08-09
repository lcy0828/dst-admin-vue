<template>
  <div class="flex min-w-0 flex-col gap-6">
    <header class="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
      <div class="min-w-0"><h1 class="text-2xl font-semibold tracking-normal">{{ text(isEdit ? 'form.editTitle' : 'form.addTitle') }}</h1><p class="mt-1 text-sm text-muted-foreground">{{ text('form.subtitle') }}</p></div>
      <div class="flex flex-wrap items-center gap-2"><automation-room-select @ready="handleAutomationRoom" @change="handleAutomationRoom" /><UiButton size="sm" variant="outline" @click="$router.push('/cron/tasks')"><ArrowLeft data-icon="inline-start" />{{ text('common.actions.backToList') }}</UiButton></div>
    </header>
    <Card>
      <CardHeader><CardTitle>{{ text('form.cardTitle') }}</CardTitle><CardDescription>{{ text('form.cardDescription') }}</CardDescription></CardHeader>
      <CardContent>
        <form @submit.prevent="submitForm">
          <Tabs v-model="activeTab"><TabsList><TabsTrigger value="basic">{{ text('form.tabs.basic') }}</TabsTrigger><TabsTrigger value="advanced">{{ text('form.tabs.advanced') }}</TabsTrigger></TabsList>
            <TabsContent value="basic"><FieldGroup class="mt-4">
              <Field :data-invalid="Boolean(formErrors.name)"><FieldLabel for="task-name">{{ text('form.fields.name') }}</FieldLabel><UiInput id="task-name" v-model="taskForm.name" :aria-invalid="Boolean(formErrors.name)" :placeholder="text('form.fields.namePlaceholder')" /><FieldError v-if="formErrors.name">{{ formErrorText(formErrors.name) }}</FieldError></Field>
              <Field :data-invalid="Boolean(formErrors.description)"><FieldLabel for="task-description">{{ text('form.fields.description') }}</FieldLabel><UiTextarea id="task-description" v-model="taskForm.description" rows="3" :aria-invalid="Boolean(formErrors.description)" :placeholder="text('form.fields.descriptionPlaceholder')" /><FieldError v-if="formErrors.description">{{ formErrorText(formErrors.description) }}</FieldError></Field>
              <Field><FieldLabel for="task-group">{{ text('form.fields.group') }}</FieldLabel><UiSelect :model-value="String(taskForm.group_id)" @update:model-value="taskForm.group_id = Number($event)"><SelectTrigger id="task-group"><SelectValue :placeholder="text('form.fields.selectGroup')" /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="0">{{ text('common.values.noGroup') }}</SelectItem><SelectItem v-for="group in groupList" :key="group.id" :value="String(group.id)">{{ groupLabel(group.name) }}</SelectItem></SelectGroup></SelectContent></UiSelect></Field>
              <Field :data-invalid="Boolean(formErrors.spec)"><FieldLabel for="task-spec">{{ text('form.fields.cron') }}</FieldLabel><UiInput id="task-spec" v-model="taskForm.spec" class="font-mono" :aria-invalid="Boolean(formErrors.spec)" :placeholder="text('form.fields.cronPlaceholder')" /><FieldError v-if="formErrors.spec">{{ formErrorText(formErrors.spec) }}</FieldError><FieldDescription>{{ text('form.fields.cronDescription') }}</FieldDescription></Field>
              <FieldSet><FieldLegend variant="label">{{ text('form.fields.taskType') }}</FieldLegend><RadioGroup v-model="taskForm.type" class="grid gap-3 sm:grid-cols-2"><Field v-for="option in typeOptions" :key="option.value" orientation="horizontal"><RadioGroupItem :id="`task-type-${option.value}`" :value="option.value" /><FieldLabel :for="`task-type-${option.value}`">{{ option.label }}</FieldLabel></Field></RadioGroup></FieldSet>

              <Field v-if="taskForm.type === 'function'" :data-invalid="Boolean(formErrors.target)"><FieldLabel for="task-function">{{ text('form.fields.function') }}</FieldLabel><UiSelect :model-value="taskForm.target" @update:model-value="handleFunctionChange"><SelectTrigger id="task-function" :aria-invalid="Boolean(formErrors.target)"><SelectValue :placeholder="text('form.fields.selectFunction')" /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="func in functionList" :key="func.name" :value="func.name">{{ functionOptionLabel(func) }}</SelectItem></SelectGroup></SelectContent></UiSelect><FieldError v-if="formErrors.target">{{ formErrorText(formErrors.target) }}</FieldError></Field>

              <FieldSet v-else-if="taskForm.type === 'tmux_command'"><FieldLegend>{{ text('form.fields.tmux') }}</FieldLegend><FieldGroup>
                <Field><FieldLabel for="tmux-session">{{ text('form.fields.server') }}</FieldLabel><UiSelect v-model="tmuxSession" @update:model-value="updateTmuxTarget"><SelectTrigger id="tmux-session"><SelectValue :placeholder="text('form.fields.selectServer')" /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="session in tmuxSessions" :key="session.session_name" :value="session.session_name">{{ session.archive_name }} - {{ session.world_name }}</SelectItem></SelectGroup></SelectContent></UiSelect></Field>
                <Field><FieldLabel for="tmux-command">{{ text('form.fields.command') }}</FieldLabel><UiSelect v-model="tmuxCommandId" @update:model-value="updateTmuxTarget"><SelectTrigger id="tmux-command"><SelectValue :placeholder="text('form.fields.selectCommand')" /></SelectTrigger><SelectContent><SelectGroup v-for="group in tmuxCommandGroups" :key="group.type"><SelectLabel>{{ group.type }}</SelectLabel><SelectItem v-for="command in group.commands" :key="command.id" :value="String(command.id)" :disabled="command.risk === 'high' || command.risk === 'critical'">{{ command.name }}{{ command.risk === 'high' || command.risk === 'critical' ? text('form.fields.unavailableForSchedule') : '' }}</SelectItem></SelectGroup></SelectContent></UiSelect></Field>
                <Field v-if="currentTmuxCommand"><FieldLabel for="tmux-command-preview">{{ text('form.fields.commandContent') }}</FieldLabel><UiTextarea id="tmux-command-preview" :model-value="currentTmuxCommand.script || currentTmuxCommand.command" rows="2" readonly /></Field>
                <Field v-if="currentTmuxCommand && currentTmuxCommand.needs_params" :data-invalid="Boolean(formErrors.target)"><FieldTitle>{{ text('form.fields.commandParameters') }}</FieldTitle><div class="flex flex-col gap-2"><Field v-for="(parameter, index) in currentTmuxCommand.parameters" :key="parameter.name"><FieldLabel :for="`command-parameter-${parameter.name}`">{{ parameter.label || parameter.name }}</FieldLabel><UiSelect v-if="parameter.type === 'enum'" :model-value="String(tmuxParams[index] || '')" @update:model-value="updateCommandParameter(index, $event)"><SelectTrigger :id="`command-parameter-${parameter.name}`" :aria-invalid="Boolean(formErrors.target)"><SelectValue :placeholder="parameter.description || text('form.fields.select')" /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="option in parameter.options" :key="option" :value="option">{{ option }}</SelectItem></SelectGroup></SelectContent></UiSelect><UiInput v-else :id="`command-parameter-${parameter.name}`" v-model="tmuxParams[index]" :type="parameter.type === 'integer' ? 'number' : 'text'" :min="parameter.minimum" :max="parameter.maximum" :aria-invalid="Boolean(formErrors.target)" :placeholder="parameter.description || text('form.fields.parameterValue')" @input="updateTmuxTarget" /></Field></div><FieldError v-if="formErrors.target">{{ formErrorText(formErrors.target) }}</FieldError><FieldDescription v-if="currentTmuxCommand.example">{{ text('form.fields.example', { value: currentTmuxCommand.example }) }}</FieldDescription></Field>
              </FieldGroup></FieldSet>

              <Field v-if="taskForm.type === 'function' && currentFunction?.param_types?.length"><FieldTitle>{{ text('form.fields.functionParameters') }}</FieldTitle><div class="flex flex-col gap-2"><InputGroup v-for="(parameter, index) in currentFunction.param_types" :key="parameter"><InputGroupAddon>{{ parameter }}</InputGroupAddon><InputGroupInput v-model="taskForm.args[index]" :type="parameter === 'keep' ? 'number' : 'text'" :min="parameter === 'keep' ? 1 : undefined" :max="parameter === 'keep' ? 100 : undefined" :aria-label="parameter" :placeholder="text('form.fields.parameterValue')" /></InputGroup></div></Field>
            </FieldGroup></TabsContent>

            <TabsContent value="advanced"><FieldGroup class="mt-4">
              <Field :data-invalid="Boolean(formErrors.timeout)"><FieldLabel for="task-timeout">{{ text('form.fields.timeout') }}</FieldLabel><UiInput id="task-timeout" v-model.number="taskForm.timeout" type="number" min="5" max="3600" :aria-invalid="Boolean(formErrors.timeout)" /><FieldError v-if="formErrors.timeout">{{ formErrorText(formErrors.timeout) }}</FieldError><FieldDescription>{{ text('form.fields.timeoutDescription') }}</FieldDescription></Field>
              <Field><FieldLabel for="task-retry-times">{{ text('form.fields.retries') }}</FieldLabel><UiInput id="task-retry-times" v-model.number="taskForm.retry_times" type="number" min="0" max="10" /><FieldDescription>{{ text('form.fields.retriesDescription') }}</FieldDescription></Field>
              <Field v-if="taskForm.retry_times > 0"><FieldLabel for="task-retry-interval">{{ text('form.fields.retryInterval') }}</FieldLabel><UiInput id="task-retry-interval" v-model.number="taskForm.retry_interval" type="number" min="1" max="3600" /></Field>
              <FieldSet><FieldLegend variant="label">{{ text('form.fields.dependencies') }}</FieldLegend><FieldDescription>{{ text('form.fields.dependenciesDescription') }}</FieldDescription><ScrollArea class="max-h-64 rounded-md border p-3"><FieldGroup class="gap-3"><Field v-for="task in availableTasks" :key="task.id" orientation="horizontal" :data-disabled="String(task.id) === String(taskId)"><Checkbox :id="`dependency-${task.id}`" :model-value="taskForm.dependencies.map(String).includes(String(task.id))" :disabled="String(task.id) === String(taskId)" @update:model-value="toggleDependency(task.id, $event)" /><FieldLabel :for="`dependency-${task.id}`" class="font-normal">{{ task.name }}</FieldLabel></Field></FieldGroup></ScrollArea></FieldSet>
            </FieldGroup></TabsContent>
          </Tabs>
          <Separator class="my-6" />
          <Field orientation="horizontal"><FieldContent><FieldLabel for="task-status">{{ text('form.fields.enabled') }}</FieldLabel><FieldDescription>{{ text('form.fields.enabledDescription') }}</FieldDescription></FieldContent><UiSwitch id="task-status" :model-value="taskForm.status === 1" @update:model-value="taskForm.status = $event ? 1 : 0" /></Field>
          <div class="mt-6 flex justify-end gap-2"><UiButton type="button" variant="outline" @click="cancel">{{ text('common.actions.cancel') }}</UiButton><UiButton type="submit" :disabled="submitting"><Spinner v-if="submitting" data-icon="inline-start" />{{ text('common.actions.save') }}</UiButton></div>
        </form>
      </CardContent>
    </Card>
  </div>
</template>

<script>
import { ArrowLeft } from '@lucide/vue';
import { toast } from 'vue-sonner';
import { cronTaskApi } from '@/api/index';
import AutomationRoomSelect from '@/components/AutomationRoomSelect.vue';
import { Button as UiButton } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet, FieldTitle } from '@/components/ui/field';
import { Input as UiInput } from '@/components/ui/input';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select as UiSelect, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { Switch as UiSwitch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea as UiTextarea } from '@/components/ui/textarea';
import {
  createCronTaskFailure,
  cronTaskActionDescription,
  cronTaskActionName,
  cronTaskFailureText,
  cronTaskGroupLabel,
  cronTaskText,
  cronTaskTypeLabel
} from '@/i18n/cronTaskMessages';

export default {
  name: 'TaskForm',
  components: {
    ArrowLeft, AutomationRoomSelect, Card, CardContent,
    CardDescription, CardHeader, CardTitle, Checkbox, Field, FieldContent, FieldDescription,
    FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet, FieldTitle, InputGroup, InputGroupAddon,
    InputGroupInput, RadioGroup, RadioGroupItem, ScrollArea, SelectContent, SelectGroup,
    SelectItem, SelectLabel, SelectTrigger, SelectValue, Separator, Spinner, Tabs, TabsContent,
    TabsList, TabsTrigger, UiButton, UiInput, UiSelect, UiSwitch, UiTextarea
  },
  data() {
    return {
      isEdit: false,
      taskId: null,
      submitting: false,
      functionList: [],
      groupList: [],
      availableTasks: [],
      activeTab: 'basic',
      // TMUX相关数据
      tmuxSessions: [],
      tmuxCommands: [],
      tmuxCommandGroups: [],
      tmuxSession: '',
      tmuxCommandId: '',
      tmuxParams: [],
      currentTmuxCommand: null,
      // 新的TMUX任务数据结构
      tmuxTaskData: {
        session_name: '',
        command_id: '',
        command_params: []
      },
      taskForm: {
        name: '',
        description: '',
        group_id: 0,
        spec: '0 0 * * * *', // 默认每小时执行一次
        type: 'function',
        target: '',
        args: [],
        timeout: 300,
        retry_times: 0,
        retry_interval: 60,
        dependencies: [],
        status: 1
      },
      formErrors: {}
    };
  },
  created() {
    // 判断是否是编辑模式
    const { id } = this.$route.params;
    if (id) {
      this.isEdit = true;
      this.taskId = id;
    }
    if (this.$route.query.group_id) this.taskForm.group_id = this.$route.query.group_id;
  },
  computed: {
    activeLocale() {
      const state = this.$i18n?.locale;
      return typeof state === 'string' ? state : (state?.value || 'zh-CN');
    },
    typeOptions() {
      return ['function', 'tmux_command'].map(value => ({
        value,
        label: cronTaskTypeLabel(value, this.activeLocale)
      }));
    },
    currentFunction() {
      return this.functionList.find(item => item.name === this.taskForm.target) || null;
    }
  },
  methods: {
    text(key, parameters) {
      return cronTaskText(key, this.activeLocale, parameters);
    },
    failureText(key, error) {
      return cronTaskFailureText(createCronTaskFailure(key, error), this.activeLocale);
    },
    formErrorText(key) {
      return this.text(key);
    },
    groupLabel(name) {
      return cronTaskGroupLabel(name, this.activeLocale);
    },
    functionOptionLabel(func) {
      const name = cronTaskActionName(func.name, this.activeLocale, func.name);
      const description = cronTaskActionDescription(func.name, this.activeLocale, func.description);
      return description ? `${name} - ${description}` : name;
    },
    handleAutomationRoom() {
      this.functionList = [];
      this.groupList = [];
      this.availableTasks = [];
      this.tmuxSessions = [];
      this.tmuxCommands = [];
      Promise.all([
        this.getFunctions(),
        this.getGroups(),
        this.getAvailableTasks(),
        this.getTmuxSessions(),
        this.getTmuxCommands()
      ]).then(() => {
        if (this.isEdit && this.taskId) this.getTaskDetail(this.taskId);
      });
    },
    getFunctions() {
      return cronTaskApi.getFunctions()
        .then(response => {
          console.log('函数列表响应:', response);

          // 处理函数列表数据
          if (response && response.code === 200 && response.data) {
            // 处理新的API响应格式，将对象转换为数组
            const functionsData = response.data;
            const functionsList = [];

            // 遍历函数对象，转换为数组格式
            for (const key in functionsData) {
              if (Object.prototype.hasOwnProperty.call(functionsData, key)) {
                const func = functionsData[key];
                functionsList.push({
                  name: func.name,
                  description: func.description,
                  param_types: func.param_types || []
                });
              }
            }

            console.log('处理后的函数列表:', functionsList);
            this.functionList = functionsList;
          }
          // 兼容旧的API响应格式
          else if (response.data && response.data.status === 200) {
            this.functionList = response.data.data || [];
          }
          // 其他格式处理
          else if (response.data && response.data.code === 200) {
            const functionsData = response.data.data;
            const functionsList = [];

            // 如果是对象，转换为数组
            if (functionsData && typeof functionsData === 'object' && !Array.isArray(functionsData)) {
              for (const key in functionsData) {
                if (Object.prototype.hasOwnProperty.call(functionsData, key)) {
                  const func = functionsData[key];
                  functionsList.push({
                    name: func.name,
                    description: func.description,
                    param_types: func.param_types || []
                  });
                }
              }
              this.functionList = functionsList;
            } else if (Array.isArray(functionsData)) {
              this.functionList = functionsData;
            } else {
              toast.error(this.text('form.feedback.functionsInvalid'));
            }
          } else {
            console.error('响应格式不符合预期:', response);
            toast.error(this.text('form.feedback.functionsInvalid'));
          }
        })
        .catch(error => {
          console.error('获取函数列表失败:', error);
          toast.error(this.failureText('form.feedback.functionsFailed', error));
        });
    },
    getGroups() {
      return cronTaskApi.getGroups()
        .then(response => {
          console.log('获取任务组列表响应:', response);

          // 处理各种可能的响应格式
          let groupsData = [];

          if (response && response.data) {
            // 处理标准格式 {code: 200, data: [...], msg: "success"}
            if (response.data.code === 200 && Array.isArray(response.data.data)) {
              groupsData = response.data.data;
            }
            // 处理嵌套格式 {code: 200, data: {items: [...], total: 10}}
            else if (response.data.code === 200 && response.data.data && Array.isArray(response.data.data.items)) {
              groupsData = response.data.data.items;
            }
            // 处理旧API格式 {status: 200, data: [...]}
            else if (response.data.status === 200 && Array.isArray(response.data.data)) {
              groupsData = response.data.data;
            }
            // 直接返回数组的情况
            else if (Array.isArray(response.data)) {
              groupsData = response.data;
            }
          }

          console.log('处理后的任务组数据:', groupsData);
          this.groupList = groupsData;
        })
        .catch(error => {
          console.error('获取任务组列表失败:', error);
          toast.error(this.failureText('form.feedback.groupsFailed', error));
        });
    },
    getAvailableTasks() {
      return cronTaskApi.getTasks()
        .then(response => {
          console.log('获取可用任务列表响应:', response);

          // 处理各种可能的响应格式
          let tasksData = [];

          if (response && response.data) {
            // 处理标准格式 {code: 200, data: [...], msg: "success"}
            if (response.data.code === 200 && Array.isArray(response.data.data)) {
              tasksData = response.data.data;
            }
            // 处理嵌套格式 {code: 200, data: {items: [...], total: 10}}
            else if (response.data.code === 200 && response.data.data && Array.isArray(response.data.data.items)) {
              tasksData = response.data.data.items;
            }
            // 处理旧API格式 {status: 200, data: [...]}
            else if (response.data.status === 200 && Array.isArray(response.data.data)) {
              tasksData = response.data.data;
            }
            // 处理旧API格式嵌套版本
            else if (response.data.status === 200 && response.data.data && Array.isArray(response.data.data.items)) {
              tasksData = response.data.data.items;
            }
            // 直接返回数组的情况
            else if (Array.isArray(response.data)) {
              tasksData = response.data;
            }
          }

          console.log('处理后的可用任务数据:', tasksData);
          this.availableTasks = tasksData.map(task => ({
            id: task.id,
            name: task.name
          }));
        })
        .catch(error => {
          console.error('获取可用任务列表失败:', error);
          toast.error(this.failureText('form.feedback.tasksFailed', error));
        });
    },
    getTaskDetail(id) {
      cronTaskApi.getTaskDetail(id)
        .then(response => {
          console.log('获取任务详情响应:', response);

          let taskData = null;

          if (response && response.data) {
            // 处理标准格式 {code: 200, data: {...}, msg: "success"}
            if (response.data.code === 200) {
              taskData = response.data.data;
            }
            // 处理旧API格式 {status: 200, data: {...}}
            else if (response.data.status === 200) {
              taskData = response.data.data;
            }
            // 直接返回对象的情况
            else if (typeof response.data === 'object' && !Array.isArray(response.data) && response.data.id) {
              taskData = response.data;
            }
          }

          if (taskData) {
            console.log('处理后的任务详情数据:', taskData);

            // 处理dependencies，确保其是数组形式
            let dependencies = [];
            if (taskData.dependencies) {
              if (typeof taskData.dependencies === 'string') {
                try {
                  dependencies = JSON.parse(taskData.dependencies);
                  if (!Array.isArray(dependencies)) {
                    dependencies = [];
                  }
                } catch (e) {
                  console.warn('解析dependencies失败:', e);
                  dependencies = [];
                }
              } else if (Array.isArray(taskData.dependencies)) {
                dependencies = taskData.dependencies;
              }
            }

            // 处理args，确保其是数组形式
            let args = [];
            if (taskData.args) {
              if (typeof taskData.args === 'string') {
                try {
                  args = JSON.parse(taskData.args);
                  if (!Array.isArray(args)) {
                    args = [taskData.args];
                  }
                } catch (e) {
                  console.warn('解析args失败:', e);
                  args = [taskData.args];
                }
              } else if (Array.isArray(taskData.args)) {
                args = taskData.args;
              }
            }

            // 处理TMUX相关数据
            if (taskData.type === 'tmux_command') {
              // 优先使用新的直接字段
              if (taskData.session_name && taskData.command_id) {
                this.tmuxSession = taskData.session_name;
                this.tmuxCommandId = String(taskData.command_id);
                this.tmuxParams = taskData.command_params || [];

                // 更新tmuxTaskData
                this.tmuxTaskData = {
                  session_name: this.tmuxSession,
                  command_id: this.tmuxCommandId,
                  command_params: this.tmuxParams,
                  raw_command: ''
                };

                // 查找当前命令
                setTimeout(() => {
                  if (this.tmuxCommands.length > 0) {
                    this.currentTmuxCommand = this.tmuxCommands.find(cmd => cmd.id === this.tmuxCommandId);
                  }
                }, 500);
              }
              // 其次使用tmux_task字段
              else if (taskData.tmux_task) {
                this.tmuxSession = taskData.tmux_task.session_name;
                this.tmuxCommandId = String(taskData.tmux_task.command_id);
                this.tmuxParams = taskData.tmux_task.command_params || [];

                // 更新tmuxTaskData
                this.tmuxTaskData = {
                  session_name: this.tmuxSession,
                  command_id: this.tmuxCommandId,
                  command_params: this.tmuxParams,
                  raw_command: ''
                };

                // 查找当前命令
                setTimeout(() => {
                  if (this.tmuxCommands.length > 0) {
                    this.currentTmuxCommand = this.tmuxCommands.find(cmd => cmd.id === this.tmuxCommandId);
                  }
                }, 500);
              }
              // 兼容旧的target字段
              else if (taskData.target) {
                try {
                  const targetArray = JSON.parse(taskData.target);
                  if (Array.isArray(targetArray) && targetArray.length >= 2) {
                    this.tmuxSession = targetArray[0];
                    this.tmuxCommandId = String(targetArray[1]);
                    this.tmuxParams = targetArray.slice(2);

                    // 更新tmuxTaskData
                    this.tmuxTaskData = {
                      session_name: this.tmuxSession,
                      command_id: this.tmuxCommandId,
                      command_params: this.tmuxParams,
                      raw_command: ''
                    };

                    // 查找当前命令
                    setTimeout(() => {
                      if (this.tmuxCommands.length > 0) {
                        this.currentTmuxCommand = this.tmuxCommands.find(cmd => cmd.id === this.tmuxCommandId);
                      }
                    }, 500);
                  }
                } catch (e) {
                  console.warn('解析TMUX命令参数失败:', e);
                }
              }
            }

            this.taskForm = {
              name: taskData.name,
              description: taskData.description,
              group_id: taskData.group_id || 0,
              spec: taskData.spec,
              type: taskData.type,
              target: taskData.target,
              args: args,
              timeout: taskData.timeout || 0,
              retry_times: taskData.retry_times || 0,
              retry_interval: taskData.retry_interval || 60,
              dependencies: dependencies.map(dep => (typeof dep === 'object' ? dep.id : dep)),
              status: taskData.status
            };
          } else {
            const detail = response.data?.msg || response.data?.message;
            toast.error(detail
              ? this.failureText('form.feedback.detailFailed', detail)
              : this.text('form.feedback.detailInvalid'));
          }
        })
        .catch(error => {
          console.error('获取任务详情失败:', error);
          toast.error(this.failureText('form.feedback.detailFailed', error));
        });
    },
    handleFunctionChange(value) {
      this.taskForm.target = value;
      const definition = this.functionList.find(item => item.name === value);
      this.taskForm.args = (definition?.param_types || []).map((_, index) => this.taskForm.args[index] || '');
    },
    // TMUX相关方法
    getTmuxSessions() {
      return cronTaskApi.getTmuxSessions()
        .then(response => {
          if (response.data && response.data.code === 200) {
            this.tmuxSessions = response.data.data || [];
            console.log('获取TMUX会话列表成功:', this.tmuxSessions);
          } else {
            toast.warning(this.failureText('form.feedback.sessionsFailed', response.data?.msg));
          }
        })
        .catch(error => {
          console.error('获取TMUX会话列表失败:', error);
          toast.error(this.failureText('form.feedback.sessionsFailed', error));
        });
    },

    getTmuxCommands() {
      return cronTaskApi.getTmuxCommands()
        .then(response => {
          if (response.data && response.data.code === 200) {
            this.tmuxCommands = response.data.data || [];
            this.processTmuxCommands();
            console.log('获取TMUX命令列表成功:', this.tmuxCommands);
          } else {
            toast.warning(this.failureText('form.feedback.commandsFailed', response.data?.msg));
          }
        })
        .catch(error => {
          console.error('获取TMUX命令列表失败:', error);
          toast.error(this.failureText('form.feedback.commandsFailed', error));
        });
    },

    processTmuxCommands() {
      // 按类型分组命令，用于下拉选择
      const groups = {};

      this.tmuxCommands.forEach(cmd => {
        const type = cmd.type || cmd.category;
        if (!groups[type]) {
          groups[type] = {
            type: type,
            commands: []
          };
        }
        groups[type].commands.push(cmd);
      });

      this.tmuxCommandGroups = Object.values(groups);
    },

    updateTmuxTarget() {
      if (this.tmuxSession && this.tmuxCommandId) {
        // 查找当前选中的命令
        this.currentTmuxCommand = this.tmuxCommands.find(cmd => String(cmd.id) === String(this.tmuxCommandId));

        this.tmuxParams = (this.currentTmuxCommand?.parameters || []).map((_, index) => this.tmuxParams[index] || '');

        // 更新TMUX任务数据
        this.tmuxTaskData.session_name = this.tmuxSession;
        this.tmuxTaskData.command_id = this.tmuxCommandId;
        this.tmuxTaskData.command_params = [...this.tmuxParams];

        // 为了兼容性，仍然保留target字段
        const targetArray = [this.tmuxSession, this.tmuxCommandId, ...this.tmuxParams];
        this.taskForm.target = JSON.stringify(targetArray);

        console.log('更新TMUX命令目标:', this.tmuxTaskData);
      }
    },

    updateCommandParameter(index, value) {
      this.tmuxParams[index] = value;
      this.updateTmuxTarget();
    },

    toggleDependency(taskId, checked) {
      const dependencies = this.taskForm.dependencies.filter(id => String(id) !== String(taskId));
      if (checked) dependencies.push(taskId);
      this.taskForm.dependencies = dependencies;
    },

    validateForm() {
      const errors = {};
      const name = (this.taskForm.name || '').trim();
      const description = (this.taskForm.description || '').trim();
      if (!name) errors.name = 'form.validation.nameRequired';
      else if (name.length < 2 || name.length > 50) errors.name = 'form.validation.nameLength';
      if (description.length > 200) errors.description = 'form.validation.descriptionLength';
      if (!(this.taskForm.spec || '').trim()) errors.spec = 'form.validation.cronRequired';
      if (!(this.taskForm.target || '').trim() && this.taskForm.type === 'function') errors.target = 'form.validation.targetRequired';
      if (this.taskForm.type === 'tmux_command' && (!this.tmuxSession || !this.tmuxCommandId)) errors.target = 'form.validation.tmuxTargetRequired';
      if (this.taskForm.type === 'tmux_command' && this.currentTmuxCommand?.parameters?.some((parameter, index) => parameter.required && (this.tmuxParams[index] === '' || this.tmuxParams[index] == null))) errors.target = 'form.validation.commandParametersRequired';
      if (this.taskForm.timeout < 5 || this.taskForm.timeout > 3600) errors.timeout = 'form.validation.timeoutRange';
      this.formErrors = errors;
      if (Object.keys(errors).length > 0) this.activeTab = 'basic';
      return Object.keys(errors).length === 0;
    },

    submitForm() {
      if (!this.validateForm()) {
        toast.warning(this.text('form.validation.incomplete'));
        return;
      }
      this.submitting = true;

          // 过滤空参数
          this.taskForm.args = this.taskForm.args.filter(arg => arg.trim() !== '');

          // 处理TMUX命令参数
          if (this.taskForm.type === 'tmux_command') {
            this.updateTmuxTarget();
            // 根据接口文档，直接在主请求中添加tmux相关字段
            this.taskForm.session_name = this.tmuxTaskData.session_name;
            this.taskForm.command_id = this.tmuxTaskData.command_id;
            this.taskForm.command_params = this.tmuxTaskData.command_params;

            // 为了兼容性，仍然保留tmux_task字段
            this.taskForm.tmux_task = {
              session_name: this.tmuxTaskData.session_name,
              command_id: this.tmuxTaskData.command_id,
              command_params: this.tmuxTaskData.command_params
            };
          }

          const apiMethod = this.isEdit
            ? cronTaskApi.updateTask(this.taskId, this.taskForm)
            : cronTaskApi.addTask(this.taskForm);

          apiMethod
            .then(response => {
              console.log(this.isEdit ? '更新任务响应:' : '添加任务响应:', response);
              // 处理多种可能的响应格式
              if (
                (response.code === 200) || // 直接返回 {code: 200, data: {...}}
                (response.data && response.data.code === 200) || // 嵌套格式 {data: {code: 200, ...}}
                (response.status === 200) || // 旧格式 {status: 200, ...}
                (response.data && response.data.status === 200) // 嵌套旧格式
              ) {
                toast.success(this.text(this.isEdit ? 'form.feedback.updated' : 'form.feedback.added'));
                this.$router.push('/cron/tasks');
              } else {
                const errorMsg =
                  response.msg ||
                  response.message ||
                  (response.data && (response.data.msg || response.data.message)) ||
                  '';
                toast.error(errorMsg
                  ? this.failureText(this.isEdit ? 'form.feedback.updateFailed' : 'form.feedback.addFailed', errorMsg)
                  : this.text(this.isEdit ? 'form.feedback.updateFailed' : 'form.feedback.addFailed'));
              }
            })
            .catch(error => {
              console.error(this.isEdit ? '更新任务失败:' : '添加任务失败:', error);
              toast.error(this.failureText(this.isEdit ? 'form.feedback.updateFailed' : 'form.feedback.addFailed', error));
            })
            .finally(() => {
              this.submitting = false;
            });
    },
    cancel() {
      this.$router.push('/cron/tasks');
    }
  }
};
</script>

<style scoped>
.param-help {
  margin-top: 5px;
  font-size: 12px;
  color: var(--muted-foreground);
}

.param-example {
  font-style: italic;
}
.box-card {
  margin-bottom: 0;
  border-radius: 4px;
  box-shadow: none;
}
.cron-help {
  margin-top: 5px;
  color: var(--muted-foreground);
  font-size: 12px;
  background-color: var(--muted);
  padding: 10px;
  border-radius: 4px;
}
.cron-help p {
  margin: 5px 0;
}
.cron-help ul {
  margin: 5px 0;
  padding-left: 20px;
}
.arg-item {
  margin-bottom: 10px;
}
.form-help-text {
  font-size: 12px;
  color: var(--muted-foreground);
  margin-left: 10px;
}
</style>
