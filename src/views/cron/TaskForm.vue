<template>
  <div class="app-container">
    <Card>
      <CardHeader>
        <CardTitle>{{ isEdit ? '编辑任务' : '添加任务' }}</CardTitle><CardDescription>配置调度、执行目标和失败重试策略</CardDescription><CardAction class="flex flex-wrap items-center justify-end gap-2"><automation-room-select @ready="handleAutomationRoom" @change="handleAutomationRoom" /><UiButton size="sm" variant="outline" @click="$router.push('/cron/tasks')"><ArrowLeft data-icon="inline-start" />返回列表</UiButton></CardAction>
      </CardHeader>
      <CardContent>
        <form @submit.prevent="submitForm">
          <Tabs v-model="activeTab"><TabsList><TabsTrigger value="basic">基本信息</TabsTrigger><TabsTrigger value="advanced">高级选项</TabsTrigger></TabsList>
            <TabsContent value="basic"><FieldGroup class="mt-4">
              <Field :data-invalid="Boolean(formErrors.name)"><FieldLabel for="task-name">任务名称</FieldLabel><UiInput id="task-name" v-model="taskForm.name" :aria-invalid="Boolean(formErrors.name)" placeholder="请输入任务名称" /><FieldError v-if="formErrors.name">{{ formErrors.name }}</FieldError></Field>
              <Field :data-invalid="Boolean(formErrors.description)"><FieldLabel for="task-description">任务描述</FieldLabel><UiTextarea id="task-description" v-model="taskForm.description" rows="3" :aria-invalid="Boolean(formErrors.description)" placeholder="请输入任务描述" /><FieldError v-if="formErrors.description">{{ formErrors.description }}</FieldError></Field>
              <Field><FieldLabel for="task-group">所属任务组</FieldLabel><UiSelect :model-value="String(taskForm.group_id)" @update:model-value="taskForm.group_id = Number($event)"><SelectTrigger id="task-group"><SelectValue placeholder="请选择任务组" /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="0">无分组</SelectItem><SelectItem v-for="group in groupList" :key="group.id" :value="String(group.id)">{{ group.name }}</SelectItem></SelectGroup></SelectContent></UiSelect></Field>
              <Field :data-invalid="Boolean(formErrors.spec)"><FieldLabel for="task-spec">Cron 表达式</FieldLabel><UiInput id="task-spec" v-model="taskForm.spec" class="font-mono" :aria-invalid="Boolean(formErrors.spec)" placeholder="例如：0 0 * * * *" /><FieldError v-if="formErrors.spec">{{ formErrors.spec }}</FieldError><FieldDescription>格式：秒 分 时 日 月 星期 [年]。示例：每 5 分钟执行一次为 0 */5 * * * *</FieldDescription></Field>
              <FieldSet><FieldLegend variant="label">任务类型</FieldLegend><RadioGroup v-model="taskForm.type" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Field v-for="option in typeOptions" :key="option.value" orientation="horizontal"><RadioGroupItem :id="`task-type-${option.value}`" :value="option.value" /><FieldLabel :for="`task-type-${option.value}`">{{ option.label }}</FieldLabel></Field></RadioGroup></FieldSet>
              <Alert v-if="taskForm.type === 'shell' || taskForm.type === 'tmux_raw_command'"><TriangleAlert /><AlertTitle>任意命令已受限</AlertTitle><AlertDescription>当前 v2 后端禁止定时执行任意命令，请改用受控函数或内建 TMUX 命令。</AlertDescription></Alert>

              <Field v-if="taskForm.type === 'function'" :data-invalid="Boolean(formErrors.target)"><FieldLabel for="task-function">选择函数</FieldLabel><UiSelect v-model="taskForm.target"><SelectTrigger id="task-function" :aria-invalid="Boolean(formErrors.target)"><SelectValue placeholder="请选择函数" /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="func in functionList" :key="func.name" :value="func.name">{{ func.name }} - {{ func.description }}</SelectItem></SelectGroup></SelectContent></UiSelect><FieldError v-if="formErrors.target">{{ formErrors.target }}</FieldError></Field>
              <Field v-else-if="taskForm.type === 'shell'" :data-invalid="Boolean(formErrors.target)"><FieldLabel for="shell-target">Shell 命令</FieldLabel><UiTextarea id="shell-target" v-model="taskForm.target" rows="3" :aria-invalid="Boolean(formErrors.target)" placeholder="请输入 Shell 命令" /><FieldError v-if="formErrors.target">{{ formErrors.target }}</FieldError></Field>

              <FieldSet v-else-if="taskForm.type === 'tmux_command'"><FieldLegend>TMUX 命令</FieldLegend><FieldGroup>
                <Field><FieldLabel for="tmux-session">选择服务器</FieldLabel><UiSelect v-model="tmuxSession" @update:model-value="updateTmuxTarget"><SelectTrigger id="tmux-session"><SelectValue placeholder="请选择服务器" /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="session in tmuxSessions" :key="session.session_name" :value="session.session_name">{{ session.archive_name }} - {{ session.world_name }}</SelectItem></SelectGroup></SelectContent></UiSelect></Field>
                <Field><FieldLabel for="tmux-command">选择命令</FieldLabel><UiSelect v-model="tmuxCommandId" @update:model-value="updateTmuxTarget"><SelectTrigger id="tmux-command"><SelectValue placeholder="请选择命令" /></SelectTrigger><SelectContent><SelectGroup v-for="group in tmuxCommandGroups" :key="group.type"><SelectLabel>{{ group.type }}</SelectLabel><SelectItem v-for="command in group.commands" :key="command.id" :value="String(command.id)" :disabled="command.risk === 'high' || command.risk === 'critical'">{{ command.name }}{{ command.risk === 'high' || command.risk === 'critical' ? '（不可用于定时任务）' : '' }}</SelectItem></SelectGroup></SelectContent></UiSelect></Field>
                <Field v-if="currentTmuxCommand"><FieldLabel for="tmux-command-preview">命令内容</FieldLabel><UiTextarea id="tmux-command-preview" :model-value="currentTmuxCommand.script || currentTmuxCommand.command" rows="2" readonly /></Field>
                <Field v-if="currentTmuxCommand && currentTmuxCommand.needs_params"><FieldTitle>命令参数</FieldTitle><div class="flex flex-col gap-2"><div v-for="(param, index) in tmuxParams" :key="index"><InputGroup><InputGroupAddon>参数 {{ index + 1 }}</InputGroupAddon><InputGroupInput v-model="tmuxParams[index]" :aria-label="`命令参数 ${index + 1}`" :placeholder="currentTmuxCommand.param_desc || '参数值'" /><InputGroupAddon align="inline-end"><UiButton size="icon-xs" variant="ghost" type="button" title="移除参数" :aria-label="`移除命令参数 ${index + 1}`" @click="removeTmuxParam(index)"><Trash2 /></UiButton></InputGroupAddon></InputGroup><FieldDescription v-if="currentTmuxCommand.example">示例：{{ currentTmuxCommand.example }}</FieldDescription></div></div><UiButton size="sm" variant="outline" type="button" @click="addTmuxParam"><Plus data-icon="inline-start" />添加参数</UiButton></Field>
              </FieldGroup></FieldSet>

              <FieldSet v-else-if="taskForm.type === 'tmux_raw_command'"><FieldLegend>TMUX 原始命令</FieldLegend><FieldGroup><Field><FieldLabel for="tmux-raw-session">选择服务器</FieldLabel><UiSelect v-model="tmuxSession" @update:model-value="updateTmuxRawTarget"><SelectTrigger id="tmux-raw-session"><SelectValue placeholder="请选择服务器" /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="session in tmuxSessions" :key="session.session_name" :value="session.session_name">{{ session.archive_name }} - {{ session.world_name }}</SelectItem></SelectGroup></SelectContent></UiSelect></Field><Field><FieldLabel for="tmux-raw-command">原始命令</FieldLabel><UiTextarea id="tmux-raw-command" v-model="tmuxRawCommand" rows="3" placeholder="例如：c_announce('欢迎来到服务器')" @update:model-value="updateTmuxRawTarget" /></Field></FieldGroup></FieldSet>

              <Field v-if="taskForm.type === 'function'"><FieldTitle>函数参数</FieldTitle><div class="flex flex-col gap-2"><InputGroup v-for="(arg, index) in taskForm.args" :key="index"><InputGroupAddon>参数 {{ index + 1 }}</InputGroupAddon><InputGroupInput v-model="taskForm.args[index]" :aria-label="`函数参数 ${index + 1}`" placeholder="参数值" /><InputGroupAddon align="inline-end"><UiButton size="icon-xs" variant="ghost" type="button" title="移除参数" :aria-label="`移除函数参数 ${index + 1}`" @click="removeArg(index)"><Trash2 /></UiButton></InputGroupAddon></InputGroup></div><UiButton size="sm" variant="outline" type="button" @click="addArg"><Plus data-icon="inline-start" />添加参数</UiButton></Field>
            </FieldGroup></TabsContent>

            <TabsContent value="advanced"><FieldGroup class="mt-4">
              <Field><FieldLabel for="task-timeout">超时设置（秒）</FieldLabel><UiInput id="task-timeout" v-model.number="taskForm.timeout" type="number" min="0" /><FieldDescription>任务最大执行时间，0 表示不限制。</FieldDescription></Field>
              <Field><FieldLabel for="task-retry-times">重试次数</FieldLabel><UiInput id="task-retry-times" v-model.number="taskForm.retry_times" type="number" min="0" max="10" /><FieldDescription>任务失败后自动重试的次数，0 表示不重试。</FieldDescription></Field>
              <Field v-if="taskForm.retry_times > 0"><FieldLabel for="task-retry-interval">重试间隔（秒）</FieldLabel><UiInput id="task-retry-interval" v-model.number="taskForm.retry_interval" type="number" min="1" max="3600" /></Field>
              <FieldSet><FieldLegend variant="label">依赖任务</FieldLegend><FieldDescription>当前任务会在所选依赖任务全部成功后执行，请避免循环依赖。</FieldDescription><ScrollArea class="max-h-64 rounded-md border p-3"><FieldGroup class="gap-3"><Field v-for="task in availableTasks" :key="task.id" orientation="horizontal" :data-disabled="String(task.id) === String(taskId)"><Checkbox :id="`dependency-${task.id}`" :model-value="taskForm.dependencies.map(String).includes(String(task.id))" :disabled="String(task.id) === String(taskId)" @update:model-value="toggleDependency(task.id, $event)" /><FieldLabel :for="`dependency-${task.id}`" class="font-normal">{{ task.name }}</FieldLabel></Field></FieldGroup></ScrollArea></FieldSet>
            </FieldGroup></TabsContent>
          </Tabs>
          <Separator class="my-6" />
          <Field orientation="horizontal"><FieldContent><FieldLabel for="task-status">启用任务</FieldLabel><FieldDescription>禁用后调度器不会自动执行此任务。</FieldDescription></FieldContent><UiSwitch id="task-status" :model-value="taskForm.status === 1" @update:model-value="taskForm.status = $event ? 1 : 0" /></Field>
          <div class="mt-6 flex justify-end gap-2"><UiButton type="button" variant="outline" @click="cancel">取消</UiButton><UiButton type="submit" :disabled="submitting"><Spinner v-if="submitting" data-icon="inline-start" />保存</UiButton></div>
        </form>
      </CardContent>
    </Card>
  </div>
</template>

<script>
import { ArrowLeft, Plus, Trash2, TriangleAlert } from '@lucide/vue';
import { toast } from 'vue-sonner';
import { cronTaskApi } from '@/api/index';
import AutomationRoomSelect from '@/components/AutomationRoomSelect.vue';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button as UiButton } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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

export default {
  name: 'TaskForm',
  components: {
    Alert, AlertDescription, AlertTitle, ArrowLeft, AutomationRoomSelect, Card, CardAction, CardContent,
    CardDescription, CardHeader, CardTitle, Checkbox, Field, FieldContent, FieldDescription,
    FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet, FieldTitle, InputGroup, InputGroupAddon,
    InputGroupInput, Plus, RadioGroup, RadioGroupItem, ScrollArea, SelectContent, SelectGroup,
    SelectItem, SelectLabel, SelectTrigger, SelectValue, Separator, Spinner, Tabs, TabsContent,
    TabsList, TabsTrigger, Trash2, TriangleAlert, UiButton, UiInput, UiSelect, UiSwitch, UiTextarea
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
      tmuxRawCommand: '',
      tmuxParams: [],
      currentTmuxCommand: null,
      // 新的TMUX任务数据结构
      tmuxTaskData: {
        session_name: '',
        command_id: '',
        raw_command: '',
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
        timeout: 0,
        retry_times: 0,
        retry_interval: 60,
        dependencies: [],
        status: 1
      },
      formErrors: {},
      typeOptions: [
        { value: 'function', label: '函数' },
        { value: 'shell', label: 'Shell 命令' },
        { value: 'tmux_command', label: 'TMUX 命令' },
        { value: 'tmux_raw_command', label: 'TMUX 原始命令' }
      ]
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
  methods: {
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
              toast.error('获取函数列表失败：响应格式不符合预期');
            }
          } else {
            console.error('响应格式不符合预期:', response);
            toast.error('获取函数列表失败：响应格式不符合预期');
          }
        })
        .catch(error => {
          console.error('获取函数列表失败:', error);
          toast.error('获取函数列表失败：' + (error.message || '未知错误'));
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
          toast.error('获取任务组列表失败');
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
          toast.error('获取可用任务列表失败');
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
            } else if (taskData.type === 'tmux_raw_command') {
              // 优先使用新的直接字段
              if (taskData.session_name && taskData.raw_command) {
                this.tmuxSession = taskData.session_name;
                this.tmuxRawCommand = taskData.raw_command;

                // 更新tmuxTaskData
                this.tmuxTaskData = {
                  session_name: this.tmuxSession,
                  command_id: '',
                  command_params: [],
                  raw_command: this.tmuxRawCommand
                };
              }
              // 其次使用tmux_task字段
              else if (taskData.tmux_task) {
                this.tmuxSession = taskData.tmux_task.session_name;
                this.tmuxRawCommand = taskData.tmux_task.raw_command;

                // 更新tmuxTaskData
                this.tmuxTaskData = {
                  session_name: this.tmuxSession,
                  command_id: '',
                  command_params: [],
                  raw_command: this.tmuxRawCommand
                };
              }
              // 兼容旧的target字段
              else if (taskData.target) {
                try {
                  const targetArray = JSON.parse(taskData.target);
                  if (Array.isArray(targetArray) && targetArray.length >= 2) {
                    this.tmuxSession = targetArray[0];
                    this.tmuxRawCommand = targetArray[1];

                    // 更新tmuxTaskData
                    this.tmuxTaskData = {
                      session_name: this.tmuxSession,
                      command_id: '',
                      command_params: [],
                      raw_command: this.tmuxRawCommand
                    };
                  }
                } catch (e) {
                  console.warn('解析TMUX原始命令参数失败:', e);
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
            toast.error(response.data?.msg || response.data?.message || '获取任务详情失败：无效的响应格式');
          }
        })
        .catch(error => {
          console.error('获取任务详情失败:', error);
          toast.error('获取任务详情失败');
        });
    },
    addArg() {
      this.taskForm.args.push('');
    },
    removeArg(index) {
      this.taskForm.args.splice(index, 1);
    },
    // TMUX相关方法
    getTmuxSessions() {
      return cronTaskApi.getTmuxSessions()
        .then(response => {
          if (response.data && response.data.code === 200) {
            this.tmuxSessions = response.data.data || [];
            console.log('获取TMUX会话列表成功:', this.tmuxSessions);
          } else {
            toast.warning('获取 TMUX 会话列表失败：' + response.data?.msg);
          }
        })
        .catch(error => {
          console.error('获取TMUX会话列表失败:', error);
          toast.error('获取 TMUX 会话列表失败');
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
            toast.warning('获取 TMUX 命令列表失败：' + response.data?.msg);
          }
        })
        .catch(error => {
          console.error('获取TMUX命令列表失败:', error);
          toast.error('获取 TMUX 命令列表失败');
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

        // 如果命令需要参数但当前没有参数，自动添加一个空参数
        if (this.currentTmuxCommand && this.currentTmuxCommand.needs_params && this.tmuxParams.length === 0) {
          this.tmuxParams.push('');
        }

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

    updateTmuxRawTarget() {
      if (this.tmuxSession && this.tmuxRawCommand) {
        // 更新TMUX任务数据
        this.tmuxTaskData.session_name = this.tmuxSession;
        this.tmuxTaskData.raw_command = this.tmuxRawCommand;

        // 为了兼容性，仍然保留target字段
        const targetArray = [this.tmuxSession, this.tmuxRawCommand];
        this.taskForm.target = JSON.stringify(targetArray);

        console.log('更新TMUX原始命令目标:', this.tmuxTaskData);
      }
    },

    addTmuxParam() {
      this.tmuxParams.push('');
      this.updateTmuxTarget();
    },

    removeTmuxParam(index) {
      this.tmuxParams.splice(index, 1);
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
      if (!name) errors.name = '请输入任务名称';
      else if (name.length < 2 || name.length > 50) errors.name = '长度应在 2 到 50 个字符之间';
      if (description.length > 200) errors.description = '描述不能超过 200 个字符';
      if (!(this.taskForm.spec || '').trim()) errors.spec = '请输入 Cron 表达式';
      if (!(this.taskForm.target || '').trim() && ['function', 'shell'].includes(this.taskForm.type)) errors.target = '请输入或选择执行目标';
      if (this.taskForm.type === 'tmux_command' && (!this.tmuxSession || !this.tmuxCommandId)) errors.target = '请选择服务器和 TMUX 命令';
      if (this.taskForm.type === 'tmux_raw_command' && (!this.tmuxSession || !this.tmuxRawCommand.trim())) errors.target = '请选择服务器并输入原始命令';
      this.formErrors = errors;
      if (Object.keys(errors).length > 0) this.activeTab = 'basic';
      return Object.keys(errors).length === 0;
    },

    submitForm() {
      if (!this.validateForm()) {
        toast.warning('请完善表单信息');
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
          } else if (this.taskForm.type === 'tmux_raw_command') {
            this.updateTmuxRawTarget();
            // 根据接口文档，直接在主请求中添加tmux相关字段
            this.taskForm.session_name = this.tmuxTaskData.session_name;
            this.taskForm.raw_command = this.tmuxTaskData.raw_command;

            // 为了兼容性，仍然保留tmux_task字段
            this.taskForm.tmux_task = {
              session_name: this.tmuxTaskData.session_name,
              raw_command: this.tmuxTaskData.raw_command
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
                toast.success(this.isEdit ? '更新成功' : '添加成功');
                this.$router.push('/cron/tasks');
              } else {
                const errorMsg =
                  response.msg ||
                  response.message ||
                  (response.data && (response.data.msg || response.data.message)) ||
                  (this.isEdit ? '更新失败' : '添加失败');
                toast.error(errorMsg);
              }
            })
            .catch(error => {
              console.error(this.isEdit ? '更新任务失败:' : '添加任务失败:', error);
              toast.error(error.message || (this.isEdit ? '更新任务失败' : '添加任务失败'));
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
