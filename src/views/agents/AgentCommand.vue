<template>
  <div class="flex min-w-0 flex-col gap-6">
    <header class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div class="min-w-0"><h1 class="text-2xl font-semibold tracking-normal">Agent 命令管理</h1><p class="mt-1 text-sm text-muted-foreground">向已连接节点发送白名单动作并检查执行结果。</p></div>
      <UiButton size="sm" @click="showCommandTemplates"><LayoutTemplate data-icon="inline-start" />使用模板</UiButton>
    </header>

    <Alert v-if="agentLoadError" variant="destructive"><CircleAlert /><AlertTitle>Agent 列表加载失败</AlertTitle><AlertDescription>{{ agentLoadError }}</AlertDescription><AlertAction><UiButton size="sm" variant="outline" @click="fetchAgentList">重试</UiButton></AlertAction></Alert>

    <Card>
      <CardHeader>
        <CardTitle class="flex items-center gap-2"><SquareTerminal />命令执行</CardTitle>
        <CardDescription>选择一个或多个在线 Agent，并执行后端允许的动作。</CardDescription>
        <CardAction><Field orientation="horizontal"><UiSwitch id="batch-mode" v-model="batchMode" @update:model-value="onBatchModeChange" /><FieldLabel for="batch-mode">批量执行</FieldLabel></Field></CardAction>
      </CardHeader>
      <CardContent>
          <FieldGroup>
            <Field v-if="!batchMode"><FieldLabel for="command-agent">Agent ID</FieldLabel><UiSelect v-model="commandForm.agent_id" @update:open="handleAgentSelectVisibleChange"><SelectTrigger id="command-agent" class="w-full"><SelectValue placeholder="请选择 Agent" /></SelectTrigger><SelectContent><SelectGroup>
              <SelectItem v-for="agent in agentList" :key="agent.id" :value="agent.id">{{ agent.hostname || '未知' }} ({{ agent.id || '未知' }})</SelectItem>
            </SelectGroup></SelectContent></UiSelect></Field>
            <FieldSet v-else><FieldLegend variant="label">Agent ID</FieldLegend><FieldDescription>选择一个或多个在线 Agent。</FieldDescription><FieldGroup class="agent-checkboxes">
              <Field v-for="agent in agentList" :key="agent.id" orientation="horizontal"><UiCheckbox :id="`command-agent-${agent.id}`" :model-value="isBatchAgentSelected(agent.id)" @update:model-value="toggleBatchAgent(agent.id, $event)" /><FieldLabel :for="`command-agent-${agent.id}`" class="font-normal">{{ agent.hostname || '未知' }} · {{ agent.id }}</FieldLabel></Field>
            </FieldGroup></FieldSet>
            <Field><FieldLabel for="command-type">命令类型</FieldLabel><UiSelect v-model="commandForm.type"><SelectTrigger id="command-type" class="w-full"><SelectValue placeholder="请选择命令类型" /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="shell">Shell 命令</SelectItem><SelectItem value="powershell">PowerShell 命令</SelectItem></SelectGroup></SelectContent></UiSelect></Field>
            <Field><FieldLabel for="agent-command-content">命令内容</FieldLabel><UiTextarea id="agent-command-content" v-model="commandForm.content" rows="4" placeholder="请输入要执行的命令内容" /></Field>
            <Field><FieldLabel for="agent-command-timeout">超时时间（秒）</FieldLabel><UiInput id="agent-command-timeout" v-model.number="commandForm.timeout" type="number" min="1" max="600" step="5" /></Field>
          </FieldGroup>
      </CardContent>
      <CardFooter class="flex flex-wrap justify-end gap-2"><UiButton variant="outline" @click="resetCommand">重置</UiButton><UiButton :disabled="commandLoading" @click="executeCommand"><Spinner v-if="commandLoading" data-icon="inline-start" /><Play v-else data-icon="inline-start" />执行命令</UiButton></CardFooter>
    </Card>

    <Card>
      <CardHeader><CardTitle class="flex items-center gap-2"><History />命令历史</CardTitle><CardDescription>按节点、状态和时间范围检索历史结果。</CardDescription><CardAction class="flex flex-wrap gap-2"><UiButton size="sm" variant="outline" :disabled="historyLoading" @click="refreshHistory"><Spinner v-if="historyLoading" data-icon="inline-start" /><RefreshCw v-else data-icon="inline-start" />刷新</UiButton><UiButton size="sm" variant="ghost" @click="getAllHistory">重置筛选</UiButton></CardAction></CardHeader>
      <CardContent class="flex flex-col gap-4">
          <FieldGroup class="history-filter">
            <Field><FieldLabel for="history-agent">Agent</FieldLabel><UiSelect v-model="historyFilter.agent_id" @update:model-value="onAgentFilterChange"><SelectTrigger id="history-agent"><SelectValue placeholder="选择 Agent" /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="all">全部 Agent</SelectItem><SelectItem v-for="agent in agentList" :key="agent.id" :value="agent.id">{{ agent.hostname }} ({{ agent.id }})</SelectItem></SelectGroup></SelectContent></UiSelect></Field>
            <Field><FieldLabel for="history-status">状态</FieldLabel><UiSelect v-model="historyFilter.status" @update:model-value="onStatusFilterChange"><SelectTrigger id="history-status"><SelectValue placeholder="命令状态" /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="all">全部状态</SelectItem><SelectItem v-for="status in commandStatuses" :key="status.value" :value="status.value">{{ status.label }}</SelectItem></SelectGroup></SelectContent></UiSelect></Field>
            <Field><FieldLabel for="history-search">关键词</FieldLabel><UiInput id="history-search" v-model="historyFilter.search" placeholder="搜索命令内容" @input="onSearchChange" /></Field>
            <Field><FieldLabel for="history-start">开始日期</FieldLabel><UiInput id="history-start" v-model="historyFilter.date_range[0]" type="date" @change="onDateRangeChange" /></Field>
            <Field><FieldLabel for="history-end">结束日期</FieldLabel><UiInput id="history-end" v-model="historyFilter.date_range[1]" type="date" @change="onDateRangeChange" /></Field>
          </FieldGroup>

          <Alert v-if="historyError" variant="destructive"><CircleAlert /><AlertTitle>命令历史加载失败</AlertTitle><AlertDescription>{{ historyError }}</AlertDescription></Alert>
          <div v-if="historyLoading" class="flex flex-col gap-2"><Skeleton v-for="index in 4" :key="index" class="h-10 w-full" /></div>
          <Empty v-else-if="commandHistory.length === 0"><EmptyHeader><EmptyTitle>暂无命令历史</EmptyTitle><EmptyDescription>当前筛选条件下没有执行记录。</EmptyDescription></EmptyHeader></Empty>
          <ShadcnTable v-else><TableHeader><TableRow><TableHead>命令 ID</TableHead><TableHead>Agent ID</TableHead><TableHead>类型</TableHead><TableHead>命令内容</TableHead><TableHead>状态</TableHead><TableHead>结果</TableHead><TableHead>执行时间</TableHead><TableHead class="text-right">操作</TableHead></TableRow></TableHeader><TableBody>
            <TableRow v-for="command in commandHistory" :key="command.command_id"><TableCell>{{ command.command_id }}</TableCell><TableCell class="max-w-56 truncate">{{ command.agent_id }}</TableCell><TableCell><Badge variant="outline">{{ command.type }}</Badge></TableCell><TableCell class="max-w-56 truncate">{{ command.content }}</TableCell><TableCell><Badge :variant="getStatusVariant(command.status)">{{ command.status }}</Badge></TableCell><TableCell><Badge v-if="command.status === 'completed'" :variant="command.success ? 'default' : 'destructive'">{{ command.success ? '成功' : '失败' }}</Badge><span v-else>-</span></TableCell><TableCell>{{ formatTime(command.start_time) }}</TableCell><TableCell class="text-right"><UiButton size="xs" variant="ghost" @click="viewCommandDetail(command)">查看详情</UiButton></TableCell></TableRow>
          </TableBody></ShadcnTable>
      </CardContent>
      <CardFooter v-if="total > 0" class="pagination-container"><span>共 {{ total }} 条</span><UiSelect :model-value="String(pageSize)" @update:model-value="handleSizeChange(Number($event))"><SelectTrigger class="page-size" aria-label="每页显示条数"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="size in [10, 20, 50, 100]" :key="size" :value="String(size)">{{ size }} 条/页</SelectItem></SelectGroup></SelectContent></UiSelect><UiButton size="icon-sm" variant="outline" :disabled="currentPage <= 1" aria-label="上一页" @click="handleCurrentChange(currentPage - 1)"><ChevronLeft /></UiButton><span>{{ currentPage }} / {{ totalPages }}</span><UiButton size="icon-sm" variant="outline" :disabled="currentPage >= totalPages" aria-label="下一页" @click="handleCurrentChange(currentPage + 1)"><ChevronRight /></UiButton></CardFooter>
    </Card>

        <UiDialog v-model:open="dialogVisible"><DialogScrollContent class="wide-dialog"><DialogHeader><DialogTitle>命令详情</DialogTitle><DialogDescription>查看命令参数、状态和节点返回内容。</DialogDescription></DialogHeader>
          <div v-if="selectedCommand" class="command-detail">
            <dl class="detail-grid"><div><dt>命令 ID</dt><dd>{{ selectedCommand.command_id }}</dd></div><div><dt>Agent ID</dt><dd>{{ selectedCommand.agent_id }}</dd></div><div><dt>命令类型</dt><dd>{{ selectedCommand.type }}</dd></div><div><dt>状态</dt><dd><Badge :variant="getStatusVariant(selectedCommand.status)">{{ selectedCommand.status }}</Badge></dd></div><div><dt>退出码</dt><dd>{{ selectedCommand.status === 'completed' ? selectedCommand.exit_code : '-' }}</dd></div><div><dt>结果</dt><dd>{{ selectedCommand.status === 'completed' ? (selectedCommand.success ? '成功' : '失败') : '-' }}</dd></div><div><dt>开始时间</dt><dd>{{ formatTime(selectedCommand.start_time) }}</dd></div><div><dt>结束时间</dt><dd>{{ formatTime(selectedCommand.end_time) }}</dd></div></dl>
            <pre class="command-content">{{ selectedCommand.content }}</pre>
            <Tabs default-value="output"><TabsList><TabsTrigger value="output">输出</TabsTrigger><TabsTrigger v-if="selectedCommand.error_msg" value="error">错误</TabsTrigger></TabsList><TabsContent value="output"><pre v-if="selectedCommand.output" class="command-output">{{ selectedCommand.output }}</pre><Empty v-else><EmptyHeader><EmptyTitle>无输出内容</EmptyTitle></EmptyHeader></Empty></TabsContent><TabsContent v-if="selectedCommand.error_msg" value="error"><Alert variant="destructive"><CircleAlert /><AlertTitle>命令执行错误</AlertTitle><AlertDescription><pre class="command-error">{{ selectedCommand.error_msg }}</pre></AlertDescription></Alert></TabsContent></Tabs>
            <div class="detail-actions">
              <UiButton size="sm" :disabled="detailLoading" @click="refreshCommandDetail(selectedCommand.command_id)"><Spinner v-if="detailLoading" data-icon="inline-start" /><RefreshCw v-else data-icon="inline-start" />刷新结果</UiButton>
              <UiButton variant="outline" size="sm" @click="copyCommandDetailOutput"><Copy data-icon="inline-start" />复制输出</UiButton>
            </div>
          </div>
        </DialogScrollContent></UiDialog>

        <UiDialog v-model:open="templateDialogVisible"><DialogScrollContent class="wide-dialog"><DialogHeader><DialogTitle>命令模板</DialogTitle><DialogDescription>仅可使用后端白名单允许的动作模板。</DialogDescription></DialogHeader>
          <div class="template-container">
            <Tabs v-model="activeTemplateCategory"><TabsList><TabsTrigger value="system">系统信息</TabsTrigger><TabsTrigger value="file">文件操作</TabsTrigger><TabsTrigger value="network">网络工具</TabsTrigger></TabsList>
              <TabsContent v-for="category in templateCategories" :key="category.value" :value="category.value"><ShadcnTable><TableHeader><TableRow><TableHead>模板名称</TableHead><TableHead>描述</TableHead><TableHead>操作</TableHead></TableRow></TableHeader><TableBody><TableRow v-for="item in category.items" :key="item.id"><TableCell>{{ item.name }}</TableCell><TableCell>{{ item.description }}</TableCell><TableCell><UiButton size="xs" variant="ghost" :disabled="!item.supported" @click="useTemplate(item)">使用</UiButton></TableCell></TableRow></TableBody></ShadcnTable></TabsContent>
            </Tabs>
          </div>
        </DialogScrollContent></UiDialog>
  </div>
</template>

<script>
import { ChevronLeft, ChevronRight, CircleAlert, Copy, History, LayoutTemplate, Play, RefreshCw, SquareTerminal } from '@lucide/vue';
import { toast } from 'vue-sonner';
import { agentApi } from '@/api/index';
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button as UiButton } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox as UiCheckbox } from '@/components/ui/checkbox';
import { Dialog as UiDialog, DialogDescription, DialogHeader, DialogScrollContent, DialogTitle } from '@/components/ui/dialog';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field';
import { Input as UiInput } from '@/components/ui/input';
import { Select as UiSelect, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { Switch as UiSwitch } from '@/components/ui/switch';
import { Table as ShadcnTable, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea as UiTextarea } from '@/components/ui/textarea';

export default {
  name: 'AgentCommand',
  components: {
    Alert, AlertAction, AlertDescription, AlertTitle, Badge, Card, CardAction, CardContent,
    CardDescription, CardFooter, CardHeader, CardTitle, ChevronLeft, ChevronRight, CircleAlert,
    Copy, DialogDescription, DialogHeader, DialogScrollContent, DialogTitle, Empty, EmptyDescription,
    EmptyHeader, EmptyTitle, Field, FieldDescription,
    FieldGroup, FieldLabel, FieldLegend, FieldSet, History, LayoutTemplate, Play, RefreshCw,
    SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue, ShadcnTable, Skeleton, Spinner,
    SquareTerminal, TableBody, TableCell, TableHead, TableHeader, TableRow, Tabs, TabsContent,
    TabsList, TabsTrigger, UiButton, UiCheckbox, UiDialog, UiInput, UiSelect, UiSwitch,
    UiTextarea
  },
  data() {
    return {
      commandLoading: false,
      historyLoading: false,
      agentListLoading: false,
      agentLoadError: '',
      historyError: '',
      dialogVisible: false,
      showKey: false,
      currentPage: 1,
      pageSize: 10,
      total: 0,
      agentList: [],
      commandHistory: [],
      selectedCommand: null,
      commandForm: {
        agent_id: '',
        type: 'shell',
        content: '',
        action: '',
        timeout: 30
      },
      commandRules: {
        agent_id: [{ required: true, message: '请选择Agent', trigger: 'change' }],
        type: [{ required: true, message: '请选择命令类型', trigger: 'change' }],
        content: [{ required: true, message: '请输入命令内容', trigger: 'blur' }],
        timeout: [{ required: true, message: '请设置超时时间', trigger: 'change' }]
      },
      historyFilter: {
        agent_id: '',
        status: '',
        search: '',
        date_range: ['', '']
      },
      commandStatuses: [
        { value: 'pending', label: '待执行' }, { value: 'running', label: '执行中' },
        { value: 'completed', label: '已完成' }, { value: 'failed', label: '失败' },
        { value: 'timeout', label: '超时' }, { value: 'canceled', label: '已取消' }
      ],
      pickerOptions: {
        shortcuts: [{
          text: '最近一周',
          onClick(picker) {
            const end = new Date();
            const start = new Date();
            start.setTime(start.getTime() - 3600 * 1000 * 24 * 7);
            picker.$emit('pick', [start, end]);
          }
        }, {
          text: '最近一个月',
          onClick(picker) {
            const end = new Date();
            const start = new Date();
            start.setTime(start.getTime() - 3600 * 1000 * 24 * 30);
            picker.$emit('pick', [start, end]);
          }
        }, {
          text: '最近三个月',
          onClick(picker) {
            const end = new Date();
            const start = new Date();
            start.setTime(start.getTime() - 3600 * 1000 * 24 * 90);
            picker.$emit('pick', [start, end]);
          }
        }]
      },
      batchMode: false,
      templateDialogVisible: false,
      activeTemplateCategory: 'system',
      systemTemplates: [],
      fileTemplates: [],
      networkTemplates: [],
      detailLoading: false
    };
  },
  computed: {
    totalPages() {
      return Math.max(1, Math.ceil(this.total / this.pageSize));
    },
    templateCategories() {
      return [
        { value: 'system', items: this.systemTemplates },
        { value: 'file', items: this.fileTemplates },
        { value: 'network', items: this.networkTemplates }
      ];
    }
  },
  created() {
    this.fetchAgentList();
    this.initCommandTemplates();
    this.fetchTemplates();
    this.processQueryParams();
    this.fetchCommandHistory();
  },
  methods: {
    // 处理查询参数
    processQueryParams() {
      const { id } = this.$route.query;
      if (id) {
        this.commandForm.agent_id = id;
      }
    },
    // Agent列表相关方法
    async fetchAgentList() {
      this.agentListLoading = true;
      this.agentLoadError = '';
      try {
        const response = await agentApi.getAgentList();
        if (response && response.code === 200) {
          const agentData = response.data || {};
          if (typeof agentData === 'object' && !Array.isArray(agentData)) {
            this.agentList = Object.values(agentData).map(agent => ({
                id: agent.agent_uuid,  // 使用agent_uuid作为id
                hostname: agent.hostname || agent.name || '未知主机',  // 尝试多个可能的名称字段
                ip: agent.ip_addresses ? agent.ip_addresses[0] : agent.ip || '',  // 尝试多种IP字段
                os: agent.os || agent.system || '',  // 操作系统信息
                status: agent.connected ? 'online' : 'offline'  // 连接状态
              }));
          } else if (Array.isArray(agentData)) {
            // 数组格式，直接映射
            this.agentList = agentData.map(agent => ({
              id: agent.agent_uuid || agent.id,
              hostname: agent.hostname || agent.name || '未知主机',
              ip: agent.ip_addresses ? agent.ip_addresses[0] : agent.ip || '',
              os: agent.os || agent.system || '',
              status: agent.connected === true || agent.status === 'online' ? 'online' : 'offline'
            }));
          }
          
        } else {
          console.error('Agent列表响应格式错误:', response);
          this.agentLoadError = '响应格式错误';
          toast.error('获取 Agent 列表响应格式错误');
        }
      } catch (error) {
        console.error('获取Agent列表失败:', error);
        this.agentLoadError = error.message || '未知错误';
        toast.error('获取 Agent 列表失败：' + error.message);
      } finally {
        this.agentListLoading = false;
      }
    },
    handleAgentSelectVisibleChange(visible) {
      if (visible) {
        this.fetchAgentList();
      }
    },
    // 初始化命令模板
    initCommandTemplates() {
      // 初始化内置的命令模板
      this.systemTemplates = [
        { id: 1, name: '系统信息', description: '获取基础系统信息', type: 'shell', content: 'system.refresh', action: 'system.refresh', supported: true },
        { id: 2, name: '磁盘空间', description: '查看磁盘空间使用情况', type: 'shell', content: 'disk.inspect', action: 'disk.inspect', supported: true },
        { id: 3, name: '内存信息', description: '当前生产白名单未开放', type: 'shell', content: 'free -m', supported: false },
        { id: 4, name: 'CPU信息', description: '当前生产白名单未开放', type: 'shell', content: 'cat /proc/cpuinfo', supported: false },
        { id: 5, name: '进程列表', description: '当前生产白名单未开放', type: 'shell', content: 'ps aux --sort=-%cpu | head -10', supported: false }
      ];
      
      this.fileTemplates = [
        { id: 6, name: '列出目录', description: '当前生产白名单未开放', type: 'shell', content: 'ls -la /path/to/directory', supported: false },
        { id: 7, name: '查找文件', description: '当前生产白名单未开放', type: 'shell', content: 'find / -name "filename" -type f', supported: false },
        { id: 8, name: '最近修改', description: '当前生产白名单未开放', type: 'shell', content: 'find / -type f -mtime -1 | grep -v "/proc/" | grep -v "/sys/" | head -20', supported: false }
      ];
      
      this.networkTemplates = [
        { id: 9, name: '网络连接', description: '当前生产白名单未开放', type: 'shell', content: 'netstat -tuln', supported: false },
        { id: 10, name: 'Ping测试', description: '当前生产白名单未开放', type: 'shell', content: 'ping -c 4 127.0.0.1', supported: false },
        { id: 11, name: 'IP配置', description: '当前生产白名单未开放', type: 'shell', content: 'ip addr show', supported: false },
        { id: 12, name: '路由表', description: '当前生产白名单未开放', type: 'shell', content: 'ip route', supported: false }
      ];
    },
    useTemplate(template) {
      if (!template.supported) {
        toast.warning('此模板未包含在后端返回的生产动作白名单中');
        return;
      }
      this.commandForm.type = template.type || 'shell';
      this.commandForm.content = template.content;
      this.commandForm.action = template.action;
      this.templateDialogVisible = false;
    },
    // 命令执行相关方法
    async executeCommand() {
      try {
        const agentSelected = this.batchMode
          ? Array.isArray(this.commandForm.agent_id) && this.commandForm.agent_id.length > 0
          : Boolean(this.commandForm.agent_id);
        if (!agentSelected || !this.commandForm.type || !this.commandForm.content.trim() || !this.commandForm.timeout) {
          toast.warning(!agentSelected ? '请选择 Agent' : '请完整填写命令类型、内容和超时时间');
          return;
        }
        this.commandLoading = true;
        
        if (this.batchMode && Array.isArray(this.commandForm.agent_id) && this.commandForm.agent_id.length > 0) {
          // 批量执行命令
          const results = [];
          let successCount = 0;
          let failCount = 0;
          
          for (const agentId of this.commandForm.agent_id) {
            try {
              const commandData = {
                agent_id: agentId,
                type: this.commandForm.type,
                content: this.commandForm.content,
                action: this.resolveCommandAction(),
                timeout: this.commandForm.timeout
              };
              
              const response = await agentApi.executeCommand(commandData);
              if (response && response.code === 200) {
                successCount++;
                results.push({
                  agentId,
                  commandId: response.data.command_id,
                  success: true
                });
              } else {
                failCount++;
                results.push({
                  agentId,
                  success: false,
                  error: response.msg || '命令执行失败'
                });
              }
            } catch (error) {
              failCount++;
              results.push({
                agentId,
                success: false,
                error: error.message || '命令执行出错'
              });
            }
          }
          
          if (successCount > 0) {
            toast.success(`成功发送命令至 ${successCount} 个 Agent`);
          }
          if (failCount > 0) {
            toast.warning(`${failCount} 个 Agent 命令发送失败`);
          }
          
          // 更新命令历史
          setTimeout(() => {
            this.fetchCommandHistory();
          }, 1000);
          
          // 重置表单
          this.resetCommand();
        } else {
          // 单个Agent执行命令
          const commandData = {
            agent_id: this.batchMode ? this.commandForm.agent_id[0] : this.commandForm.agent_id,
            type: this.commandForm.type,
            content: this.commandForm.content,
            action: this.resolveCommandAction(),
            timeout: this.commandForm.timeout
          };
          
          const response = await agentApi.executeCommand(commandData);
          if (response && response.code === 200) {
            toast.success('命令已发送');
            
            // 获取命令ID
            const commandId = response.data.command_id;
            if (commandId) {
              // 立即获取并显示命令详情
              this.pollCommandResult(commandId);
            }
            
            // 更新命令历史
            setTimeout(() => {
              this.fetchCommandHistory();
            }, 1000);
            
            // 重置表单
            this.resetCommand();
          } else {
            toast.error(response.msg || '命令执行失败');
          }
        }
      } catch (error) {
        toast.error('命令执行失败：' + (error.message || '未知错误'));
      } finally {
        this.commandLoading = false;
      }
    },
    
    // 轮询命令结果
    async pollCommandResult(commandId, attempts = 0) {
      if (attempts > 20) { // 最多尝试20次，约1分钟
        toast.warning('命令执行时间较长，请在历史记录中查看结果');
        return;
      }
      
      try {
        const response = await agentApi.getCommandResult(commandId);
        
        if (response && response.code === 200) {
          const result = response.data;
          
          // 如果命令已完成或出错，显示详情
          if (result.status === 'completed' || result.status === 'failed' || result.status === 'timeout' || result.status === 'canceled') {
            this.selectedCommand = result;
            this.dialogVisible = true;
            
            // 根据结果显示不同的消息
            if (result.success) {
              toast.success('命令执行成功');
            } else {
              toast.warning('命令执行失败: ' + (result.error_msg || '未知错误'));
            }
            
            return;
          }
          
          // 如果命令仍在执行，继续轮询
          setTimeout(() => {
            this.pollCommandResult(commandId, attempts + 1);
          }, 3000); // 每3秒查询一次
        } else {
          // 查询失败，但仍继续尝试
          setTimeout(() => {
            this.pollCommandResult(commandId, attempts + 1);
          }, 3000);
        }
      } catch (error) {
        console.error('获取命令结果失败:', error);
        // 出错后仍继续尝试
        setTimeout(() => {
          this.pollCommandResult(commandId, attempts + 1);
        }, 3000);
      }
    },
    resetCommand() {
      this.commandForm = { agent_id: this.batchMode ? [] : '', type: 'shell', content: '', action: '', timeout: 30 };
    },
    resolveCommandAction() {
      if (this.commandForm.action) return this.commandForm.action;
      const content = String(this.commandForm.content || '').trim();
      if (content === 'system.refresh' || content === 'uname -a && cat /etc/os-release') return 'system.refresh';
      if (content === 'disk.inspect' || content === 'df -h' || content === 'df -Pk') return 'disk.inspect';
      return '';
    },

    // 命令历史相关方法
    async fetchCommandHistory() {
      this.historyLoading = true;
      this.historyError = '';
      try {
        const params = this.commandHistoryParams();
        const agentId = this.historyFilter.agent_id === 'all' ? '' : (this.historyFilter.agent_id || '');
        const response = agentId
          ? await agentApi.getCommandHistoryByAgentId(agentId, params)
          : await agentApi.getCommandHistory(params);
        let items = response.data?.items || [];
        if (this.historyFilter.status === 'timeout') {
          items = items.filter(item => String(item.error_msg || '').includes('超时'));
        }
        this.commandHistory = items;
        this.total = this.historyFilter.status === 'timeout' ? items.length : (response.data?.total || 0);
      } catch (error) {
        this.historyError = error.message || '未知错误';
        toast.error('获取命令历史失败：' + this.historyError);
        this.commandHistory = [];
        this.total = 0;
      } finally {
        this.historyLoading = false;
      }
    },
    handleSizeChange(val) {
      this.pageSize = val;
      this.currentPage = 1;
      this.fetchCommandHistory();
    },
    handleCurrentChange(val) {
      this.currentPage = val;
      this.fetchCommandHistory();
    },
    getStatusVariant(status) {
      const statusMap = {
        pending: 'secondary', running: 'secondary', completed: 'default',
        failed: 'destructive', timeout: 'destructive', canceled: 'outline'
      };
      return statusMap[status] || 'outline';
    },
    commandHistoryParams() {
      const params = {
        page: this.currentPage,
        page_size: this.pageSize,
        status: this.historyFilter.status === 'all' ? '' : this.historyFilter.status,
        search: this.historyFilter.search
      };
      const range = this.historyFilter.date_range || [];
      if (range[0]) params.startDate = this.formatFilterDate(range[0]);
      if (range[1]) params.endDate = this.formatFilterDate(range[1]);
      return params;
    },
    formatFilterDate(value) {
      const date = new Date(value);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    },
    viewCommandDetail(command) {
      this.selectedCommand = command;
      this.dialogVisible = true;
    },
    formatTime(timestamp) {
      if (!timestamp) return 'N/A';
      
      // 处理不同格式的时间戳
      let ts = timestamp;
      
      // 如果是秒级时间戳（10位数字），转换为毫秒级
      if (typeof ts === 'number' && ts.toString().length === 10) {
        ts = ts * 1000;
      }
      // 如果是字符串形式的时间戳，尝试转换为数值
      else if (typeof ts === 'string' && !isNaN(Number(ts))) {
        ts = Number(ts);
        if (ts.toString().length === 10) {
          ts = ts * 1000;
        }
      }
      
      try {
        const date = new Date(ts);
        // 检查日期是否有效
        if (isNaN(date.getTime())) {
          return 'N/A (无效时间戳)';
        }
        return date.toLocaleString();
      } catch (e) {
        console.error('时间格式化错误:', e);
        return 'N/A (格式错误)';
      }
    },
    onAgentFilterChange() {
      this.currentPage = 1;
      this.fetchCommandHistory();
    },
    onStatusFilterChange() {
      this.currentPage = 1;
      this.fetchCommandHistory();
    },
    onSearchChange() {
      this.currentPage = 1;
      this.fetchCommandHistory();
    },
    onDateRangeChange() {
      this.currentPage = 1;
      this.fetchCommandHistory();
    },
    refreshHistory() {
      this.fetchCommandHistory();
    },
    onBatchModeChange() {
      this.commandForm.agent_id = this.batchMode ? [] : '';
      this.fetchAgentList();
    },
    isBatchAgentSelected(agentId) {
      return Array.isArray(this.commandForm.agent_id) && this.commandForm.agent_id.includes(agentId);
    },
    toggleBatchAgent(agentId, checked) {
      if (!Array.isArray(this.commandForm.agent_id)) this.commandForm.agent_id = [];
      if (checked && !this.commandForm.agent_id.includes(agentId)) this.commandForm.agent_id.push(agentId);
      if (!checked) this.commandForm.agent_id = this.commandForm.agent_id.filter(id => id !== agentId);
    },
    showCommandTemplates() {
      this.templateDialogVisible = true;
    },
    async fetchTemplates() {
      try {
        const response = await agentApi.getActions();
        const allowed = new Set((response.data || []).map(item => item.id));
        this.systemTemplates = this.systemTemplates.map(item => ({
          ...item,
          supported: item.action ? allowed.has(item.action) : false
        }));
      } catch (error) {
        toast.error('获取允许动作失败：' + error.message);
      }
    },
    async refreshCommandDetail(commandId) {
      this.detailLoading = true;
      try {
        const response = await agentApi.getCommandResult(commandId);
        if (response && response.code === 200) {
          this.selectedCommand = response.data;
          this.dialogVisible = true;
          toast.success('命令结果刷新成功');
        } else {
          toast.error(response.msg || '刷新命令结果失败');
        }
      } catch (error) {
        toast.error('刷新命令结果失败：' + (error.message || '未知错误'));
      } finally {
        this.detailLoading = false;
      }
    },
    copyCommandDetailOutput() {
      if (this.selectedCommand && this.selectedCommand.output) {
        const textArea = document.createElement('textarea');
        textArea.value = this.selectedCommand.output;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        toast.success('命令输出已复制到剪贴板');
      } else {
        toast.warning('没有可复制的命令输出');
      }
    },
    getAllHistory() {
      this.historyFilter = { agent_id: 'all', status: 'all', search: '', date_range: ['', ''] };
      this.currentPage = 1;
      this.fetchCommandHistory();
    }
  }
};
</script>

<style lang="scss" scoped>
.history-filter {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
}

.agent-checkboxes {
  max-height: 180px;
  overflow-y: auto;
}

.pagination-container {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
  color: var(--muted-foreground);
  font-size: 12px;
}

.page-size {
  width: 110px;
}

.wide-dialog {
  max-width: min(900px, calc(100vw - 32px));
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-bottom: 12px;
}

.detail-grid > div,
.command-content {
  padding: 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--muted);
}

.detail-grid dt {
  color: var(--muted-foreground);
  font-size: 12px;
}

.detail-grid dd {
  margin: 3px 0 0;
  word-break: break-all;
}

.command-content,
.command-output,
.command-error {
  font-family: monospace;
  white-space: pre-wrap;
}

.command-output,
.command-error {
  max-height: 300px;
  padding: 10px;
  overflow-y: auto;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  background: var(--muted);
  color: var(--foreground);
}

.command-error {
  margin: 0;
  border: 0;
  background: transparent;
  color: inherit;
}

.detail-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
}

.template-container {
  max-height: 500px;
  overflow-y: auto;
}

@media (max-width: 768px) {
  .history-filter {
    grid-template-columns: 1fr;
  }

  .detail-grid {
    grid-template-columns: 1fr;
  }
}
</style>
