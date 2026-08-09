<template>
  <div class="command-manager-page">
    <header class="page-header">
      <div>
        <h1>命令管理</h1>
        <p>向世界分片执行 Lua 命令，并维护可复用的命令模板。</p>
      </div>
      <UiButton size="sm" variant="outline" :disabled="loading" @click="reloadCommandData">
        <Spinner v-if="loading" data-icon="inline-start" />
        <RefreshCw v-else data-icon="inline-start" />
        刷新
      </UiButton>
    </header>

    <Alert v-if="loadError" variant="destructive">
      <CircleAlert />
      <AlertTitle>命令数据加载失败</AlertTitle>
      <AlertDescription>{{ loadError }}</AlertDescription>
      <AlertAction><UiButton size="sm" variant="outline" @click="reloadCommandData">重新加载</UiButton></AlertAction>
    </Alert>

    <Card>
      <CardHeader><CardTitle>执行命令</CardTitle><CardDescription>使用结构化模板或直接向分片发送 Lua 命令。</CardDescription><CardAction class="max-sm:col-span-full max-sm:row-auto max-sm:justify-self-start"><ToggleGroup v-model="commandMode" type="single"><ToggleGroupItem value="structured">结构化命令</ToggleGroupItem><ToggleGroupItem value="raw">原始命令</ToggleGroupItem></ToggleGroup></CardAction></CardHeader>
      <CardContent class="content-stack">
        <FieldGroup v-if="commandMode === 'structured'">
          <Field><FieldLabel>选择服务器</FieldLabel><UiSelect v-model="executeForm.server"><SelectTrigger class="w-full"><SelectValue placeholder="请选择服务器" /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="server in servers" :key="server.id" :value="server.session_name">{{ server.name }}</SelectItem></SelectGroup></SelectContent></UiSelect></Field>
          <Field><FieldLabel>选择命令</FieldLabel><UiSelect v-model="executeForm.commandId" @update:model-value="handleCommandChange"><SelectTrigger class="w-full"><SelectValue placeholder="请选择要执行的命令" /></SelectTrigger><SelectContent><SelectGroup v-for="group in commandGroups" :key="group.type"><SelectLabel>{{ group.type }}</SelectLabel><SelectItem v-for="command in group.commands" :key="command.id" :value="command.id">{{ command.name }}</SelectItem></SelectGroup></SelectContent></UiSelect></Field>
          <template v-if="currentCommand && (currentCommand.parameterized || currentCommand.needs_params)">
            <Separator /><h3 class="subheading">命令参数</h3>
            <Field v-for="param in currentCommand.parameters" :key="param.name">
              <FieldLabel :for="`execute-${param.name}`">{{ param.label || param.name }}</FieldLabel>
              <div v-if="param.type === 'string' || !param.type" class="input-action"><UiInput :id="`execute-${param.name}`" v-model="executeForm.params[param.name]" :placeholder="currentCommand.example ? '示例: ' + currentCommand.example : '请输入' + (param.label || param.name)" /><UiButton v-if="currentCommand.example" size="sm" variant="outline" @click="applyExample(param.name)">使用示例</UiButton></div>
              <UiInput v-else-if="param.type === 'number' || param.type === 'integer'" :id="`execute-${param.name}`" v-model.number="executeForm.params[param.name]" type="number" :min="param.minimum" :max="param.maximum" />
              <UiSwitch v-else-if="param.type === 'boolean'" :id="`execute-${param.name}`" v-model="executeForm.params[param.name]" />
              <UiSelect v-else-if="param.type === 'enum'" v-model="executeForm.params[param.name]"><SelectTrigger class="w-full"><SelectValue :placeholder="'请选择' + (param.label || param.name)" /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="option in param.options" :key="option" :value="option">{{ option }}</SelectItem></SelectGroup></SelectContent></UiSelect>
              <FieldDescription v-if="param.description || currentCommand.example">{{ param.description }}<span v-if="currentCommand.example"> 示例：{{ currentCommand.example }}</span></FieldDescription>
            </Field>
          </template>
          <div v-else-if="currentCommand" class="command-preview"><strong>命令预览</strong><pre>{{ currentCommand.command || currentCommand.script }}</pre></div>
          <UiButton :disabled="executing" @click="executeCommand"><Spinner v-if="executing" data-icon="inline-start" /><Play v-else data-icon="inline-start" />执行命令</UiButton>
        </FieldGroup>

        <FieldGroup v-else>
          <Field><FieldLabel>选择服务器</FieldLabel><UiSelect v-model="rawCommandForm.server"><SelectTrigger class="w-full"><SelectValue placeholder="请选择服务器" /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="server in servers" :key="server.id" :value="server.session_name">{{ server.name }}</SelectItem></SelectGroup></SelectContent></UiSelect></Field>
          <Field><FieldLabel for="raw-command">命令内容</FieldLabel><UiTextarea id="raw-command" v-model="rawCommandForm.command" rows="4" placeholder="请输入原始命令，例如：c_announce('欢迎来到服务器')" /></Field>
          <div class="form-actions"><UiButton :disabled="executing" @click="executeRawCommand"><Spinner v-if="executing" data-icon="inline-start" /><Play v-else data-icon="inline-start" />执行命令</UiButton>
            <Popover><PopoverTrigger as-child><UiButton variant="outline"><BookOpen data-icon="inline-start" />常用命令</UiButton></PopoverTrigger><PopoverContent class="common-command-popover"><Field><FieldLabel class="sr-only" for="command-search">搜索命令</FieldLabel><UiInput id="command-search" v-model="commandSearch" placeholder="搜索命令" /></Field><div class="common-command-list"><UiButton v-for="command in filteredCommonCommands" :key="command.command" variant="ghost" class="common-command-item" @click="applyCommonCommand(command.command)"><strong>{{ command.name }}</strong><span>{{ command.description }}</span></UiButton></div></PopoverContent></Popover>
            <UiButton variant="outline" @click="showBatchCommandDialog"><ListPlus data-icon="inline-start" />批量命令</UiButton>
          </div>
        </FieldGroup>

        <Alert v-if="executionResult" :variant="executionResult.status === 200 ? 'default' : 'destructive'"><CircleCheck v-if="executionResult.status === 200" /><CircleAlert v-else /><AlertTitle>{{ executionResult.status === 200 ? '执行成功' : '执行失败' }}</AlertTitle><AlertDescription><pre>{{ executionResult.msg }}</pre></AlertDescription></Alert>

        <div v-if="commandHistory.length" class="command-history"><Separator /><div class="section-heading"><h3>命令历史记录</h3><div><UiButton size="sm" variant="ghost" @click="clearHistory">清空历史</UiButton><UiButton size="sm" variant="ghost" @click="saveHistoryToFile"><Download data-icon="inline-start" />保存文件</UiButton></div></div><ShadcnTable><TableHeader><TableRow><TableHead>执行时间</TableHead><TableHead>服务器</TableHead><TableHead>命令</TableHead><TableHead>状态</TableHead><TableHead>操作</TableHead></TableRow></TableHeader><TableBody><TableRow v-for="item in commandHistory" :key="item.id"><TableCell>{{ item.time }}</TableCell><TableCell>{{ item.serverName }}</TableCell><TableCell class="truncate-cell">{{ item.mode === 'structured' ? item.commandName : item.command }}</TableCell><TableCell><Badge :variant="historyStatusVariant(item.status)">{{ historyStatusLabel(item.status) }}</Badge></TableCell><TableCell><div class="table-actions"><UiButton size="xs" variant="ghost" @click="rerunCommand(item)">重新执行</UiButton><UiButton size="xs" variant="ghost" @click="copyCommand(item)">复制命令</UiButton></div></TableCell></TableRow></TableBody></ShadcnTable></div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader><CardTitle>服务器命令管理</CardTitle><CardDescription>维护自定义 Lua 命令及参数定义。</CardDescription><CardAction class="form-actions max-sm:col-span-full max-sm:row-auto max-sm:justify-self-stretch"><UiButton size="sm" variant="outline" @click="exportCommands"><Download data-icon="inline-start" />导出</UiButton><UiButton size="sm" variant="outline" @click="importCommands"><Upload data-icon="inline-start" />导入</UiButton><UiButton size="sm" @click="showAddCommandDialog"><Plus data-icon="inline-start" />添加命令</UiButton></CardAction></CardHeader>
      <CardContent class="content-stack">
        <ToggleGroup :model-value="currentType || '__all'" type="single" class="type-filter" @update:model-value="filterCommandsByType($event === '__all' ? '' : $event)"><ToggleGroupItem value="__all">全部命令</ToggleGroupItem><ToggleGroupItem v-for="type in commandTypes" :key="type" :value="type">{{ type }}</ToggleGroupItem></ToggleGroup>
        <div v-if="loading" class="command-skeleton" aria-busy="true" aria-label="正在读取命令">
          <Skeleton v-for="row in 5" :key="row" class="h-12 w-full" />
        </div>
        <div v-else-if="displayCommands.length" class="table-wrap"><ShadcnTable><TableHeader><TableRow><TableHead>命令名称</TableHead><TableHead>命令类型</TableHead><TableHead>命令描述</TableHead><TableHead>内置命令</TableHead><TableHead>操作</TableHead></TableRow></TableHeader><TableBody><TableRow v-for="command in displayCommands" :key="command.id"><TableCell class="font-medium">{{ command.name }}</TableCell><TableCell>{{ command.type || command.category }}</TableCell><TableCell>{{ command.description }}</TableCell><TableCell><Badge :variant="command.isBuiltin || command.is_builtin ? 'default' : 'outline'">{{ command.isBuiltin || command.is_builtin ? '是' : '否' }}</Badge></TableCell><TableCell><div class="table-actions"><UiButton size="xs" variant="outline" :disabled="command.isBuiltin || command.is_builtin" @click="editCommand(command)"><Pencil data-icon="inline-start" />编辑</UiButton><UiButton size="xs" variant="destructive" :disabled="command.isBuiltin || command.is_builtin" @click="handleDelete(command)"><Trash2 data-icon="inline-start" />删除</UiButton></div></TableCell></TableRow></TableBody></ShadcnTable></div>
        <Empty v-else-if="!loadError"><EmptyHeader><EmptyMedia variant="icon"><SquareTerminal /></EmptyMedia><EmptyTitle>当前分类没有命令</EmptyTitle><EmptyDescription>切换分类，或添加新的自定义命令。</EmptyDescription></EmptyHeader></Empty>
      </CardContent>
    </Card>

    <UiDialog v-model:open="dialogVisible"><DialogScrollContent class="sm:max-w-3xl"><DialogHeader><DialogTitle>{{ dialogType === 'add' ? '添加命令' : '编辑命令' }}</DialogTitle><DialogDescription>定义命令脚本、分类及可选参数。</DialogDescription></DialogHeader><FieldGroup>
      <Field><FieldLabel for="command-name">命令名称</FieldLabel><UiInput id="command-name" v-model="commandForm.name" placeholder="请输入命令名称" /></Field>
      <Field><FieldLabel>命令类型</FieldLabel><UiSelect v-model="commandForm.type"><SelectTrigger class="w-full"><SelectValue placeholder="请选择命令类型" /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="type in commandTypes" :key="type" :value="type">{{ type }}</SelectItem></SelectGroup></SelectContent></UiSelect></Field>
      <Field><FieldLabel for="command-description">命令描述</FieldLabel><UiTextarea id="command-description" v-model="commandForm.description" rows="2" placeholder="请输入命令描述" /></Field>
      <Field><FieldLabel for="command-script">命令脚本</FieldLabel><UiTextarea id="command-script" v-model="commandForm.command" rows="5" placeholder="请输入 Lua 命令脚本，例如: c_announce('Hello World')" /></Field>
      <Field orientation="horizontal"><UiSwitch id="command-parameterized" v-model="commandForm.parameterized" @update:model-value="handleParamSwitch" /><FieldLabel for="command-parameterized">包含参数</FieldLabel></Field>
      <template v-if="commandForm.parameterized"><Separator /><div v-for="(param, index) in commandForm.parameters" :key="index" class="parameter-editor"><div class="parameter-grid"><Field><FieldLabel :for="`param-name-${index}`">参数名</FieldLabel><UiInput :id="`param-name-${index}`" v-model="param.name" placeholder="message" /></Field><Field><FieldLabel :for="`param-label-${index}`">标签</FieldLabel><UiInput :id="`param-label-${index}`" v-model="param.label" placeholder="消息内容" /></Field><Field><FieldLabel>类型</FieldLabel><UiSelect v-model="param.type"><SelectTrigger class="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="string">字符串</SelectItem><SelectItem value="number">数字</SelectItem><SelectItem value="boolean">布尔值</SelectItem></SelectGroup></SelectContent></UiSelect></Field><Field><FieldLabel :for="`param-default-${index}`">默认值</FieldLabel><UiInput :id="`param-default-${index}`" v-model="param.default" placeholder="默认值" /></Field><Field orientation="horizontal"><UiSwitch :id="`param-required-${index}`" v-model="param.required" /><FieldLabel :for="`param-required-${index}`">必填</FieldLabel></Field><UiButton size="icon" variant="destructive" aria-label="删除参数" title="删除参数" @click="removeParam(index)"><Trash2 /></UiButton></div></div><UiButton variant="outline" @click="addParameter"><Plus data-icon="inline-start" />添加参数</UiButton></template>
    </FieldGroup><DialogFooter><UiButton variant="outline" @click="dialogVisible = false">取消</UiButton><UiButton @click="submitForm">确定</UiButton></DialogFooter></DialogScrollContent></UiDialog>

    <input
      ref="importInput"
      type="file"
      accept=".json"
      style="display: none"
      @change="handleImportFile"
    />

    <UiDialog v-model:open="batchCommandDialogVisible"><DialogScrollContent class="sm:max-w-3xl"><DialogHeader><DialogTitle>批量执行命令</DialogTitle><DialogDescription>每行一条命令，按顺序执行；以 # 开头的行会被忽略。</DialogDescription></DialogHeader><FieldGroup>
      <Field><FieldLabel>选择服务器</FieldLabel><UiSelect v-model="batchCommandForm.server"><SelectTrigger class="w-full"><SelectValue placeholder="请选择服务器" /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="server in servers" :key="server.id" :value="server.session_name">{{ server.name }}</SelectItem></SelectGroup></SelectContent></UiSelect></Field>
      <Field><FieldLabel for="batch-commands">命令列表</FieldLabel><UiTextarea id="batch-commands" v-model="batchCommandForm.commands" rows="10" placeholder="# 每行输入一条命令" /></Field>
      <Field><FieldLabel for="batch-interval">执行间隔（毫秒）</FieldLabel><UiInput id="batch-interval" v-model.number="batchCommandForm.interval" type="number" min="100" max="5000" step="100" /></Field>
      <div v-if="batchResults.length" class="batch-results"><UiProgress :model-value="batchProgress" /><div class="batch-result-list"><div v-for="(result, index) in batchResults" :key="index" class="batch-result-item"><span class="batch-command">{{ result.command }}</span><Badge :variant="result.success ? 'default' : 'destructive'">{{ result.success ? '成功' : '失败' }}</Badge></div></div></div>
    </FieldGroup><DialogFooter><UiButton variant="outline" @click="batchCommandDialogVisible = false">关闭</UiButton><UiButton :disabled="executingBatch || !batchCommandForm.server || !batchCommandForm.commands" @click="executeBatchCommands"><Spinner v-if="executingBatch" data-icon="inline-start" />开始执行</UiButton></DialogFooter></DialogScrollContent></UiDialog>
  </div>
</template>

<script>
import {
  BookOpen, CircleAlert, CircleCheck, Download, ListPlus, Pencil, Play, Plus, RefreshCw,
  SquareTerminal, Trash2, Upload
} from '@lucide/vue';
import { toast } from 'vue-sonner';
import { commandManager, commandApi, COMMAND_TYPES } from '@/api';
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button as UiButton } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog as UiDialog, DialogDescription, DialogFooter, DialogHeader, DialogScrollContent, DialogTitle } from '@/components/ui/dialog';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input as UiInput } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Progress as UiProgress } from '@/components/ui/progress';
import { Select as UiSelect, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { Switch as UiSwitch } from '@/components/ui/switch';
import { Table as ShadcnTable, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea as UiTextarea } from '@/components/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { confirmAction, promptText } from '@/lib/feedback';
import { RUNTIME_TARGET_CHANGED_EVENT } from '@/utils/runtimeTarget';

export default {
  name: 'CommandManager',
  components: {
    Alert, AlertAction, AlertDescription, AlertTitle, Badge, BookOpen, Card, CardAction, CardContent, CardDescription,
    CardHeader, CardTitle, CircleAlert, CircleCheck, DialogDescription, DialogFooter,
    DialogHeader, DialogScrollContent, DialogTitle, Download, Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle,
    Field, FieldDescription, FieldGroup, FieldLabel, ListPlus,
    Pencil, Play, Plus, Popover, PopoverContent, PopoverTrigger, RefreshCw, SelectContent, SelectGroup,
    SelectItem, SelectLabel, SelectTrigger, SelectValue, Separator, ShadcnTable, Skeleton, Spinner, TableBody,
    SquareTerminal, TableCell, TableHead, TableHeader, TableRow, ToggleGroup, ToggleGroupItem, Trash2, UiButton,
    UiDialog, UiInput, UiProgress, UiSelect, UiSwitch, UiTextarea, Upload
  },
  data() {
    return {
      loading: false,
      loadError: '',
      commands: [],
      displayCommands: [],
      currentType: '',

      // 命令执行相关
      executeForm: {
        server: '',
        commandId: '',
        params: {}
      },
      servers: [],
      currentCommand: null,
      executing: false,
      executionResult: null,

      // 对话框相关
      dialogVisible: false,
      dialogType: 'add', // 'add' or 'edit'
      commandForm: {
        name: '',
        type: '',
        description: '',
        command: '',
        parameterized: false,
        parameters: []
      },

      // 表单验证规则
      formRules: {
        name: [
          { required: true, message: '请输入命令名称', trigger: 'blur' },
          { min: 2, max: 50, message: '长度在 2 到 50 个字符', trigger: 'blur' }
        ],
        type: [
          { required: true, message: '请选择命令类型', trigger: 'change' }
        ],
        description: [
          { required: true, message: '请输入命令描述', trigger: 'blur' }
        ],
        command: [
          { required: true, message: '请输入命令脚本', trigger: 'blur' }
        ]
      },

      // 当前编辑的命令ID (用于编辑操作)
      currentCommandId: null,

      // 原始命令模式相关
      rawCommandForm: {
        server: '',
        command: ''
      },

      // 命令模式
      commandMode: 'structured',

      // 常用命令
      commonCommands: [
        {
          name: '公告消息',
          command: 'c_announce(\'这里输入你的公告内容\')',
          description: '向所有玩家发送一条公告'
        },
        {
          name: '生成物品',
          command: 'c_give(\'prefab_name\')',
          description: '生成指定物品'
        },
        {
          name: '生成生物',
          command: 'c_spawn(\'prefab_name\')',
          description: '在当前位置生成生物'
        },
        {
          name: '重生世界',
          command: 'c_regenerateworld()',
          description: '重新生成世界'
        },
        {
          name: '滚回',
          command: 'c_rollback(1)',
          description: '回滚世界到x天前(参数为天数)'
        },
        {
          name: '踢出玩家',
          command: 'TheNet:Kick(UserToPlayer(\'玩家名称\'))',
          description: '踢出指定玩家'
        },
        {
          name: '禁止玩家',
          command: 'TheNet:Ban(UserToPlayer(\'玩家名称\'))',
          description: '永久禁止指定玩家'
        },
        {
          name: '显示玩家列表',
          command: 'c_listallplayers()',
          description: '显示所有在线玩家'
        },
        {
          name: '查看当前季节',
          command: 'print(\'当前季节: \' .. TheWorld.state.season)',
          description: '显示当前世界季节'
        },
        {
          name: '查看当前天数',
          command: 'print(\'当前天数: \' .. TheWorld.state.cycles + 1)',
          description: '显示当前世界天数'
        },
        {
          name: '保存世界',
          command: 'c_save()',
          description: '手动保存当前世界状态'
        }
      ],

      // 命令历史记录
      commandHistory: [],

      // 常用命令相关
      commandSearch: '',

      // 批量命令相关
      batchCommandDialogVisible: false,
      batchCommandForm: {
        server: '',
        commands: '',
        interval: 500
      },
      executingBatch: false,
      batchResults: [],
      batchProgress: 0,
      batchStatus: '', // 为进度条设置状态: success, exception
    };
  },
  computed: {
    commandTypes() {
      return [...new Set([
        ...Object.values(COMMAND_TYPES),
        ...this.commands.map(command => command.type || command.category).filter(Boolean)
      ])];
    },
    commandGroups() {
      // 按类型分组命令，用于下拉选择
      const groups = {};

      this.commands.forEach(cmd => {
        const type = cmd.type || cmd.category;
        if (!groups[type]) {
          groups[type] = {
            type: type,
            commands: []
          };
        }
        groups[type].commands.push(cmd);
      });

      return Object.values(groups);
    },

    // 过滤后的常用命令
    filteredCommonCommands() {
      if (!this.commandSearch) {
        return this.commonCommands;
      }

      const keyword = this.commandSearch.toLowerCase();
      return this.commonCommands.filter(cmd =>
        cmd.name.toLowerCase().includes(keyword) ||
        cmd.description.toLowerCase().includes(keyword) ||
        cmd.command.toLowerCase().includes(keyword)
      );
    }
  },
  watch: {
    // 监听命令模式变化
    commandMode() {
      // 当模式变化时重置执行结果
      this.executionResult = null;
    }
  },
  async created() {
    await Promise.all([this.fetchCommands(), this.fetchServers()]);
    await this.loadCommandHistory();
  },
  mounted() {
    window.addEventListener(RUNTIME_TARGET_CHANGED_EVENT, this.handleRuntimeTargetChange);
  },
  beforeUnmount() {
    window.removeEventListener(RUNTIME_TARGET_CHANGED_EVENT, this.handleRuntimeTargetChange);
  },
  methods: {
    async handleRuntimeTargetChange() {
      this.commands = [];
      this.displayCommands = [];
      this.servers = [];
      this.commandHistory = [];
      this.currentCommand = null;
      this.executionResult = null;
      await this.reloadCommandData();
      await this.loadCommandHistory();
    },
    async fetchCommands() {
      this.loading = true;
      this.loadError = '';
      try {
        const response = await commandApi.getAllCommands();
        this.commands = response.items;
        this.localFilterCommandsByType(this.currentType);
      } catch (error) {
        this.commands = [];
        this.displayCommands = [];
        this.loadError = error.message || '获取命令列表失败';
        toast.error('获取命令列表失败: ' + error.message);
      } finally {
        this.loading = false;
      }
    },

    async reloadCommandData() {
      await Promise.all([this.fetchCommands(), this.fetchServers()]);
    },

    filterCommandsByType(type) {
      this.currentType = type;
      this.localFilterCommandsByType(type);
    },

    localFilterCommandsByType(type) {
      if (!type) {
        this.displayCommands = [...this.commands];
      } else {
        this.displayCommands = this.commands.filter(cmd =>
          cmd.type === type || cmd.category === type
        );
      }
    },

    showAddCommandDialog() {
      this.dialogType = 'add';
      this.currentCommandId = null;
      // 重置表单
      this.resetForm();
      this.dialogVisible = true;
    },

    editCommand(command) {
      this.dialogType = 'edit';
      this.currentCommandId = command.id;

      // 填充表单数据
      this.commandForm = {
        name: command.name,
        type: command.type || command.category,
        description: command.description,
        command: command.command || command.script,
        parameterized: command.parameterized || command.needs_params || false,
        parameters: command.parameters ? [...command.parameters] : []
      };

      this.dialogVisible = true;
    },

    resetForm() {
      // 重置表单数据
      this.commandForm = {
        name: '',
        type: COMMAND_TYPES.CUSTOM, // 默认为自定义命令
        description: '',
        command: '',
        parameterized: false,
        parameters: []
      };

    },

    handleParamSwitch(value) {
      if (value && this.commandForm.parameters.length === 0) {
        // 如果开启了参数但没有参数，添加一个默认参数
        this.addParameter();
      }
    },

    addParameter() {
      // 添加一个新参数
      this.commandForm.parameters.push({
        name: '',
        label: '',
        type: 'string',
        required: false,
        default: ''
      });
    },

    removeParam(index) {
      // 移除指定索引的参数
      this.commandForm.parameters.splice(index, 1);
    },

    async submitForm() {
      const name = this.commandForm.name.trim();
      const invalidParameter = this.commandForm.parameterized && this.commandForm.parameters.some(param => !param.name.trim());
      if (!name || name.length < 2 || name.length > 50 || !this.commandForm.type || !this.commandForm.description.trim() || !this.commandForm.command.trim() || invalidParameter) {
        toast.warning(invalidParameter ? '参数名不能为空' : '请完整填写命令名称、类型、描述和脚本');
        return;
      }
        try {
          const requestData = {
            name: this.commandForm.name,
            type: this.commandForm.type,
            description: this.commandForm.description,
            command: this.commandForm.command,
            parameterized: this.commandForm.parameterized,
            parameters: this.commandForm.parameterized ? this.commandForm.parameters : []
          };

          if (this.dialogType === 'add') {
            await commandManager.addCommand(requestData);
            toast.success('添加命令成功');
          } else {
            await commandManager.updateCommand(this.currentCommandId, requestData);
            toast.success('更新命令成功');
          }

          await this.fetchCommands();
          this.dialogVisible = false;
        } catch (error) {
          toast.error(error.message || '操作失败');
        }
    },

    async handleDelete(command) {
      try {
        await confirmAction(`确定要删除命令"${command.name}"吗？`, '删除命令', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
        });
          await commandManager.deleteCommand(command.id);
          toast.success('删除命令成功');
          await this.fetchCommands();
      } catch (error) {
        if (error !== 'cancel') toast.error(error.message || '删除命令失败');
      }
    },

    importCommands() {
      // 触发隐藏的文件输入
      this.$refs.importInput.click();
    },

    handleImportFile(event) {
      const file = event.target.files[0];
      if (!file) {
        return;
      }

      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const importedCommands = await commandManager.importCommands(e.target.result);
          toast.success(`成功导入 ${importedCommands.length} 个命令`);
        } catch (error) {
          if (error.importedCount > 0) {
            toast.warning(`已导入 ${error.importedCount}/${error.totalCount} 个命令；${error.message}`);
          } else {
            toast.error('导入命令失败: ' + error.message);
          }
        } finally {
          await this.fetchCommands();
        }
      };

      reader.readAsText(file);

      // 重置文件输入，允许重复选择相同文件
      event.target.value = '';
    },

    exportCommands() {
      try {
        // 获取要导出的命令（自定义命令）
        const jsonContent = commandManager.exportCommands();

        // 创建Blob对象
        const blob = new Blob([jsonContent], { type: 'application/json' });

        // 创建下载链接
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'dstadmin_commands.json';

        document.body.appendChild(link);
        link.click();

        // 清理
        URL.revokeObjectURL(url);
        document.body.removeChild(link);

        toast.success('命令导出成功');
      } catch (error) {
        toast.error('导出命令失败: ' + error.message);
      }
    },

    async fetchServers() {
      try {
        this.servers = await commandApi.getServers();
      } catch (error) {
        this.servers = [];
        this.loadError = error.message || '获取服务器列表失败';
        toast.error('获取服务器列表失败: ' + error.message);
      }
    },

    async handleCommandChange(commandId) {
      this.executing = true;
      try {
        this.currentCommand = await commandApi.getCommand(commandId);
        const params = {};
        (this.currentCommand.parameters || []).forEach(param => {
          if (param.default !== undefined) params[param.name] = param.default;
          else if (param.type === 'boolean') params[param.name] = false;
          else params[param.name] = '';
        });
        this.executeForm = {
          server: this.executeForm.server,
          commandId,
          params
        };
      } catch (error) {
        this.currentCommand = null;
        toast.error('获取命令详情失败: ' + error.message);
      } finally {
        this.executing = false;
      }
    },

    applyExample(paramName) {
      if (this.currentCommand && this.currentCommand.example) {
        this.executeForm.params[paramName] = this.currentCommand.example;
        toast.success('已应用示例值');
      }
    },

    async executeCommand() {
      if (!this.executeForm.server) {
        toast.warning('请选择服务器');
        return;
      }

      if (!this.executeForm.commandId) {
        toast.warning('请选择要执行的命令');
        return;
      }

      let confirmation = '';
      if (['high', 'critical'].includes(this.currentCommand?.risk)) {
        try {
          confirmation = await this.requestRoomConfirmation(this.executeForm.server);
        } catch {
          return;
        }
      }

      this.executing = true;
      try {
        const run = await commandApi.executeCommand(
          this.executeForm.server,
          this.executeForm.commandId,
          this.executeForm.params,
          confirmation
        );
        this.showRunResult(run);
        if (run.status === 'sent') toast.success('命令已发送');
        await this.loadCommandHistory();
      } catch (error) {
        this.showExecutionError(error);
      } finally {
        this.executing = false;
      }
    },

    async executeRawCommand() {
      if (!this.rawCommandForm.server) {
        toast.warning('请选择服务器');
        return;
      }

      if (!this.rawCommandForm.command) {
        toast.warning('请输入命令内容');
        return;
      }

      let confirmation;
      try {
        confirmation = await this.requestRoomConfirmation(this.rawCommandForm.server);
      } catch {
        return;
      }

      this.executing = true;
      try {
        const run = await commandApi.executeRawCommand(
          this.rawCommandForm.server,
          this.rawCommandForm.command,
          confirmation
        );
        this.showRunResult(run);
        if (run.status === 'sent') toast.success('命令已发送');
        await this.loadCommandHistory();
      } catch (error) {
        this.showExecutionError(error);
      } finally {
        this.executing = false;
      }
    },

    async requestRoomConfirmation(serverKey) {
      const server = this.servers.find(item => item.session_name === serverKey);
      if (!server) throw new Error('未找到目标服务器');
      const response = await promptText(
        `该操作会向游戏控制台发送 Lua 命令，请输入房间名“${server.room_name}”确认`,
        '执行确认',
        {
          confirmButtonText: '确认执行',
          cancelButtonText: '取消',
          inputValidator: value => value === server.room_name || '房间名不匹配'
        }
      );
      return response.value;
    },

    showRunResult(run) {
      const success = run.status === 'sent';
      this.executionResult = {
        status: success ? 200 : 500,
        msg: run.message || run.errorMessage || (success ? '命令已发送到分片控制台' : '命令发送失败'),
        data: { elapsed_time: 'N/A', run_id: run.id }
      };
    },

    showExecutionError(error) {
      this.executionResult = {
        status: 500,
        msg: error.message || '执行命令时发生错误',
        data: {}
      };
      toast.error('命令执行出错: ' + (error.message || '未知错误'));
    },

    // 根据服务器ID获取服务器名称
    getServerNameById(sessionName) {
      const server = this.servers.find(s => s.session_name === sessionName);
      return server ? server.name : sessionName;
    },

    async loadCommandHistory() {
      try {
        const runs = await commandApi.getCommandHistory();
        this.commandHistory = runs.map(run => this.mapHistoryRun(run));
      } catch (error) {
        this.commandHistory = [];
        toast.error('加载命令历史记录失败: ' + error.message);
      }
    },

    mapHistoryRun(run) {
      const server = this.servers.find(item => item.room_id === run.roomId && item.world_id === run.worldId);
      return {
        id: run.id,
        mode: run.mode === 'raw' ? 'raw' : 'structured',
        time: new Date(run.createdAt).toLocaleString(),
        serverName: server?.name || `${run.roomId} - ${run.worldId}`,
        server: server?.session_name || `${run.roomId}::${run.worldId}`,
        commandId: run.commandId,
        commandName: run.name,
        params: run.arguments || {},
        command: run.rawCommand || '',
        status: run.status
      };
    },

    historyStatusVariant(status) {
      if (status === 'sent') return 'default';
      if (status === 'sending') return 'secondary';
      return 'destructive';
    },

    historyStatusLabel(status) {
      return { sent: '成功', sending: '发送中', failed: '失败' }[status] || '未知';
    },

    // 清空历史记录
    async clearHistory() {
      try {
        await confirmAction('确定要清空所有命令历史记录吗？', '清空命令历史', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        });
        const deleted = await commandApi.clearCommandHistory();
        await this.loadCommandHistory();
        toast.success(`已清空 ${deleted} 条历史记录`);
      } catch (error) {
        if (error === 'cancel' || error === 'close') return;
        toast.error('清空历史记录失败: ' + (error.message || '未知错误'));
      }
    },

    // 保存历史记录到文件
    saveHistoryToFile() {
      const historyData = JSON.stringify(this.commandHistory, null, 2);
      const blob = new Blob([historyData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'command_history_' + new Date().toISOString().slice(0, 10) + '.json';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    },

    // 重新执行历史命令
    async rerunCommand(historyItem) {
      if (historyItem.mode === 'structured') {
        this.commandMode = 'structured';
        this.executeForm.server = historyItem.server;
        this.executeForm.commandId = historyItem.commandId;
        await this.handleCommandChange(historyItem.commandId);

        // 如果有参数，填充参数
        if (historyItem.params) {
          this.executeForm.params = {...historyItem.params};
        }

        toast.info('已加载命令，点击执行按钮运行');
      } else {
        this.commandMode = 'raw';
        this.rawCommandForm.server = historyItem.server;
        this.rawCommandForm.command = historyItem.command;

        toast.info('已加载命令，点击执行按钮运行');
      }
    },

    // 复制命令
    copyCommand(historyItem) {
      let textToCopy = '';

      if (historyItem.mode === 'raw') {
        textToCopy = historyItem.command;
      } else if (historyItem.mode === 'structured') {
        // 对于结构化命令，获取其实际执行的脚本
        const command = this.commands.find(cmd => cmd.id === historyItem.commandId);
        textToCopy = command ? (command.command || command.script) : '';
      } else if (historyItem.mode === 'batch') {
        // 对于批量命令，不支持直接复制
        toast.warning('批量命令无法直接复制');
        return;
      }

      if (textToCopy) {
        // 使用Clipboard API复制文本
        navigator.clipboard.writeText(textToCopy).then(() => {
          toast.success('命令已复制到剪贴板');
        }).catch(() => {
          toast.error('复制命令失败');
        });
      }
    },

    // 应用常用命令
    applyCommonCommand(command) {
      this.rawCommandForm.command = command;
    },

    // 显示批量命令对话框
    showBatchCommandDialog() {
      this.batchCommandDialogVisible = true;
      this.batchCommandForm.server = this.rawCommandForm.server || '';
      this.batchResults = [];
      this.batchProgress = 0;
      this.batchStatus = '';
    },

    // 执行批量命令
    async executeBatchCommands() {
      if (!this.batchCommandForm.server) {
        toast.warning('请选择服务器');
        return;
      }

      if (!this.batchCommandForm.commands.trim()) {
        toast.warning('请输入命令列表');
        return;
      }

      this.executingBatch = true;
      this.batchResults = [];
      this.batchProgress = 0;
      this.batchStatus = '';

      try {
        const commandLines = this.batchCommandForm.commands
          .split('\n')
          .filter(line => line.trim() && !line.trim().startsWith('#'));

        if (commandLines.length === 0) {
          toast.warning('没有有效的命令');
          this.executingBatch = false;
          return;
        }

        const totalCommands = commandLines.length;
        let executedCount = 0;
        const confirmation = await this.requestRoomConfirmation(this.batchCommandForm.server);

        for (const command of commandLines) {
          try {
            const run = await commandApi.executeRawCommand(
              this.batchCommandForm.server,
              command.trim(),
              confirmation
            );
            this.batchResults.push({
              command: command.trim(),
              success: run.status === 'sent',
              message: run.message || run.errorMessage
            });

            executedCount++;
            this.batchProgress = Math.floor((executedCount / totalCommands) * 100);

            if (executedCount < totalCommands) {
              await new Promise(resolve => setTimeout(resolve, this.batchCommandForm.interval));
            }
          } catch (error) {
            this.batchResults.push({
              command: command.trim(),
              success: false,
              message: error.message || '执行出错'
            });

            executedCount++;
            this.batchProgress = Math.floor((executedCount / totalCommands) * 100);

            if (executedCount < totalCommands) {
              await new Promise(resolve => setTimeout(resolve, this.batchCommandForm.interval));
            }
          }
        }

        const successCount = this.batchResults.filter(r => r.success).length;
        this.batchStatus = successCount === totalCommands ? 'success' : 'exception';
        const summary = `批量命令执行完成：共 ${totalCommands} 条命令，成功 ${successCount} 条，失败 ${totalCommands - successCount} 条`;
        if (successCount === totalCommands) toast.success(summary);
        else if (successCount > 0) toast.warning(summary);
        else toast.error(summary);
        await this.loadCommandHistory();
      } catch (error) {
        if (error === 'cancel' || error === 'close') return;
        this.batchStatus = 'exception';
        toast.error('批量命令执行失败: ' + (error.message || '未知错误'));
      } finally {
        this.executingBatch = false;
      }
    }
  }
};
</script>

<style scoped>
.command-manager-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
  min-width: 0;
}

.content-stack {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}

.page-header,
.form-actions,
.section-heading,
.table-actions,
.input-action,
.loading-state,
.parameter-grid {
  display: flex;
  align-items: center;
  gap: 8px;
}

.page-header {
  justify-content: space-between;
  align-items: flex-start;
}

.page-header h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
}

.page-header p {
  margin: 4px 0 0;
  color: var(--muted-foreground);
  font-size: 14px;
}

.section-heading {
  justify-content: space-between;
  align-items: flex-start;
  flex-direction: row;
}

.form-actions,
.table-actions,
.type-filter {
  flex-wrap: wrap;
}

.subheading,
.section-heading h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.command-preview,
.parameter-editor {
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--muted);
}

.command-preview pre {
  margin: 8px 0 0;
  white-space: pre-wrap;
  word-break: break-all;
}

.input-action > :first-child {
  flex: 1;
}

.common-command-popover {
  width: min(420px, calc(100vw - 32px));
}

.common-command-list {
  display: flex;
  flex-direction: column;
  max-height: 300px;
  margin-top: 8px;
  overflow-y: auto;
}

.common-command-item {
  display: flex;
  height: auto;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: 8px;
  white-space: normal;
  text-align: left;
}

.common-command-list span {
  color: var(--muted-foreground);
  font-size: 12px;
}

.command-history {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.truncate-cell {
  max-width: 260px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.command-skeleton {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.table-wrap {
  width: 100%;
  overflow-x: auto;
}

.parameter-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.batch-result-list {
  max-height: 200px;
  overflow-y: auto;
  margin-top: 15px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.batch-result-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 15px;
  border-bottom: 1px solid var(--border);
}

.batch-result-item:last-child {
  border-bottom: none;
}

.batch-command {
  font-family: monospace;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-right: 10px;
  max-width: 80%;
}

@media (max-width: 768px) {
  .page-header,
  .section-heading {
    align-items: stretch;
    flex-direction: column;
  }

  .parameter-grid {
    grid-template-columns: 1fr;
  }

  .input-action {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
