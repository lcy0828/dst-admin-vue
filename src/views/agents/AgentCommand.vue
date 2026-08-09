<template>
  <div class="flex min-w-0 flex-col gap-6">
    <header class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div class="min-w-0"><h1 class="text-2xl font-semibold tracking-normal">Agent 命令管理</h1><p class="mt-1 text-sm text-muted-foreground">向已连接节点发送白名单动作并检查执行结果。</p></div>
    </header>

    <Alert v-if="agentLoadError" variant="destructive"><CircleAlert /><AlertTitle>Agent 列表加载失败</AlertTitle><AlertDescription>{{ agentLoadError }}</AlertDescription><AlertAction><UiButton size="sm" variant="outline" @click="fetchAgentList">重试</UiButton></AlertAction></Alert>
    <Alert v-if="actionLoadError" variant="destructive"><CircleAlert /><AlertTitle>受控动作加载失败</AlertTitle><AlertDescription>{{ actionLoadError }}</AlertDescription><AlertAction><UiButton size="sm" variant="outline" @click="fetchActions">重试</UiButton></AlertAction></Alert>
    <Alert><CircleAlert /><AlertTitle>仅执行受控动作</AlertTitle><AlertDescription>生产后端不提供任意 Shell 或 PowerShell 执行能力。可用动作由当前后端实时返回。</AlertDescription></Alert>

    <Card>
      <CardHeader>
        <CardTitle class="flex items-center gap-2"><SquareTerminal />命令执行</CardTitle>
        <CardDescription>选择一个或多个在线 Agent，并执行后端允许的动作。</CardDescription>
        <CardAction><Field orientation="horizontal"><UiSwitch id="batch-mode" v-model="batchMode" @update:model-value="onBatchModeChange" /><FieldLabel for="batch-mode">批量执行</FieldLabel></Field></CardAction>
      </CardHeader>
      <CardContent>
          <FieldGroup>
            <Field v-if="!batchMode"><FieldLabel for="command-agent">Agent ID</FieldLabel><UiSelect v-model="commandForm.agent_id" @update:open="handleAgentSelectVisibleChange"><SelectTrigger id="command-agent" class="w-full"><SelectValue placeholder="请选择 Agent" /></SelectTrigger><SelectContent><SelectGroup>
              <SelectItem v-for="agent in agentList" :key="agent.id" :value="agent.id" :disabled="agent.status !== 'online'">{{ agent.hostname || '未知' }} ({{ agent.id || '未知' }}){{ agent.status !== 'online' ? ' · 离线' : '' }}</SelectItem>
            </SelectGroup></SelectContent></UiSelect></Field>
            <FieldSet v-else><FieldLegend variant="label">Agent ID</FieldLegend><FieldDescription>选择一个或多个在线 Agent。</FieldDescription><FieldGroup class="agent-checkboxes">
              <Field v-for="agent in agentList" :key="agent.id" orientation="horizontal"><UiCheckbox :id="`command-agent-${agent.id}`" :disabled="agent.status !== 'online'" :model-value="isBatchAgentSelected(agent.id)" @update:model-value="toggleBatchAgent(agent.id, $event)" /><FieldLabel :for="`command-agent-${agent.id}`" class="font-normal">{{ agent.hostname || '未知' }} · {{ agent.id }}{{ agent.status !== 'online' ? ' · 离线' : '' }}</FieldLabel></Field>
            </FieldGroup></FieldSet>
            <Field :data-invalid="Boolean(actionLoadError)"><FieldLabel for="agent-command-action">受控动作</FieldLabel><UiSelect v-model="commandForm.action" :disabled="actionLoading || allowedActions.length === 0"><SelectTrigger id="agent-command-action" class="w-full" :aria-invalid="Boolean(actionLoadError)"><SelectValue :placeholder="actionLoading ? '正在读取可用动作' : '请选择受控动作'" /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="action in allowedActions" :key="action.id" :value="action.id">{{ action.name }}</SelectItem></SelectGroup></SelectContent></UiSelect><FieldDescription>{{ selectedAction?.description || actionLoadError || '请选择后端允许的领域动作。' }}</FieldDescription></Field>
            <Field><FieldLabel for="agent-command-timeout">超时时间（秒）</FieldLabel><UiInput id="agent-command-timeout" v-model.number="commandForm.timeout" type="number" min="5" max="300" step="5" /></Field>
          </FieldGroup>
      </CardContent>
      <CardFooter class="flex flex-wrap justify-end gap-2"><UiButton variant="outline" @click="resetCommand">重置</UiButton><UiButton :disabled="commandLoading || actionLoading || !commandForm.action" @click="executeCommand"><Spinner v-if="commandLoading" data-icon="inline-start" /><Play v-else data-icon="inline-start" />执行动作</UiButton></CardFooter>
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
            <TableRow v-for="command in commandHistory" :key="command.command_id"><TableCell>{{ command.command_id }}</TableCell><TableCell class="max-w-56 truncate">{{ command.agent_id }}</TableCell><TableCell><Badge variant="outline">{{ command.type }}</Badge></TableCell><TableCell class="max-w-56 truncate">{{ command.content }}</TableCell><TableCell><Badge :variant="getStatusVariant(command.status)">{{ command.status }}</Badge></TableCell><TableCell><Badge v-if="isCommandTerminal(command.status)" :variant="command.success ? 'default' : (command.status === 'canceled' ? 'outline' : 'destructive')">{{ command.success ? '成功' : (command.status === 'canceled' ? '已取消' : '失败') }}</Badge><span v-else>-</span></TableCell><TableCell>{{ formatTime(command.start_time) }}</TableCell><TableCell class="text-right"><UiButton size="xs" variant="ghost" @click="viewCommandDetail(command)">查看详情</UiButton></TableCell></TableRow>
          </TableBody></ShadcnTable>
      </CardContent>
      <CardFooter v-if="total > 0" class="pagination-container"><span>共 {{ total }} 条</span><UiSelect :model-value="String(pageSize)" @update:model-value="handleSizeChange(Number($event))"><SelectTrigger class="page-size" aria-label="每页显示条数"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="size in [10, 20, 50, 100]" :key="size" :value="String(size)">{{ size }} 条/页</SelectItem></SelectGroup></SelectContent></UiSelect><UiButton size="icon-sm" variant="outline" :disabled="currentPage <= 1" aria-label="上一页" @click="handleCurrentChange(currentPage - 1)"><ChevronLeft /></UiButton><span>{{ currentPage }} / {{ totalPages }}</span><UiButton size="icon-sm" variant="outline" :disabled="currentPage >= totalPages" aria-label="下一页" @click="handleCurrentChange(currentPage + 1)"><ChevronRight /></UiButton></CardFooter>
    </Card>

        <UiDialog v-model:open="dialogVisible"><DialogScrollContent class="wide-dialog"><DialogHeader><DialogTitle>命令详情</DialogTitle><DialogDescription>查看命令参数、状态和节点返回内容。</DialogDescription></DialogHeader>
          <div v-if="selectedCommand" class="command-detail">
            <dl class="detail-grid"><div><dt>命令 ID</dt><dd>{{ selectedCommand.command_id }}</dd></div><div><dt>Agent ID</dt><dd>{{ selectedCommand.agent_id }}</dd></div><div><dt>命令类型</dt><dd>{{ selectedCommand.type }}</dd></div><div><dt>状态</dt><dd><Badge :variant="getStatusVariant(selectedCommand.status)">{{ selectedCommand.status }}</Badge></dd></div><div><dt>退出码</dt><dd>{{ isCommandTerminal(selectedCommand.status) ? (selectedCommand.exit_code ?? '-') : '-' }}</dd></div><div><dt>结果</dt><dd>{{ commandResultLabel(selectedCommand) }}</dd></div><div><dt>开始时间</dt><dd>{{ formatTime(selectedCommand.start_time) }}</dd></div><div><dt>结束时间</dt><dd>{{ formatTime(selectedCommand.end_time) }}</dd></div></dl>
            <pre class="command-content">{{ selectedCommand.content }}</pre>
            <Tabs default-value="output"><TabsList><TabsTrigger value="output">输出</TabsTrigger><TabsTrigger v-if="selectedCommand.error_msg" value="error">错误</TabsTrigger></TabsList><TabsContent value="output"><pre v-if="selectedCommand.output" class="command-output">{{ selectedCommand.output }}</pre><Empty v-else><EmptyHeader><EmptyTitle>无输出内容</EmptyTitle></EmptyHeader></Empty></TabsContent><TabsContent v-if="selectedCommand.error_msg" value="error"><Alert variant="destructive"><CircleAlert /><AlertTitle>命令执行错误</AlertTitle><AlertDescription><pre class="command-error">{{ selectedCommand.error_msg }}</pre></AlertDescription></Alert></TabsContent></Tabs>
            <div class="detail-actions">
              <UiButton size="sm" :disabled="detailLoading" @click="refreshCommandDetail(selectedCommand.command_id)"><Spinner v-if="detailLoading" data-icon="inline-start" /><RefreshCw v-else data-icon="inline-start" />刷新结果</UiButton>
              <UiButton variant="outline" size="sm" @click="copyCommandDetailOutput"><Copy data-icon="inline-start" />复制输出</UiButton>
            </div>
          </div>
        </DialogScrollContent></UiDialog>

  </div>
</template>

<script>
import { ChevronLeft, ChevronRight, CircleAlert, Copy, History, Play, RefreshCw, SquareTerminal } from '@lucide/vue';
import { toast } from 'vue-sonner';
import { agentApi } from '@/api/index';
import { isLegacyCommandTerminal, normalizeAgentCommandTimeout } from '@/api/agentApiSupport.mjs';
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

export default {
  name: 'AgentCommand',
  components: {
    Alert, AlertAction, AlertDescription, AlertTitle, Badge, Card, CardAction, CardContent,
    CardDescription, CardFooter, CardHeader, CardTitle, ChevronLeft, ChevronRight, CircleAlert,
    Copy, DialogDescription, DialogHeader, DialogScrollContent, DialogTitle, Empty, EmptyDescription,
    EmptyHeader, EmptyTitle, Field, FieldDescription,
    FieldGroup, FieldLabel, FieldLegend, FieldSet, History, Play, RefreshCw,
    SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue, ShadcnTable, Skeleton, Spinner,
    SquareTerminal, TableBody, TableCell, TableHead, TableHeader, TableRow, Tabs, TabsContent,
    TabsList, TabsTrigger, UiButton, UiCheckbox, UiDialog, UiInput, UiSelect, UiSwitch
  },
  data() {
    return {
      commandLoading: false,
      historyLoading: false,
      agentListLoading: false,
      actionLoading: false,
      agentLoadError: '',
      actionLoadError: '',
      historyError: '',
      dialogVisible: false,
      currentPage: 1,
      pageSize: 10,
      total: 0,
      agentList: [],
      commandHistory: [],
      selectedCommand: null,
      commandForm: {
        agent_id: '',
        action: '',
        timeout: 30
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
        { value: 'canceled', label: '已取消' }
      ],
      batchMode: false,
      allowedActions: [],
      detailLoading: false
    };
  },
  computed: {
    totalPages() {
      return Math.max(1, Math.ceil(this.total / this.pageSize));
    },
    selectedAction() {
      return this.allowedActions.find(action => action.id === this.commandForm.action) || null;
    }
  },
  created() {
    this.fetchAgentList();
    this.fetchActions();
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
    async fetchActions() {
      this.actionLoading = true;
      this.actionLoadError = '';
      try {
        const response = await agentApi.getActions();
        this.allowedActions = Array.isArray(response.data) ? response.data : [];
        if (!this.allowedActions.some(action => action.id === this.commandForm.action)) {
          this.commandForm.action = '';
        }
      } catch (error) {
        this.allowedActions = [];
        this.commandForm.action = '';
        this.actionLoadError = error.message || '读取受控动作失败';
        toast.error('获取允许动作失败：' + this.actionLoadError);
      } finally {
        this.actionLoading = false;
      }
    },
    // 命令执行相关方法
    async executeCommand() {
      try {
        const agentSelected = this.batchMode
          ? Array.isArray(this.commandForm.agent_id) && this.commandForm.agent_id.length > 0
          : Boolean(this.commandForm.agent_id);
        if (!agentSelected || !this.commandForm.action || !this.commandForm.timeout) {
          toast.warning(!agentSelected ? '请选择在线 Agent' : '请选择受控动作并填写超时时间');
          return;
        }
        const selectedAgentIds = this.batchMode ? this.commandForm.agent_id : [this.commandForm.agent_id];
        if (selectedAgentIds.some(id => !this.agentList.some(agent => agent.id === id && agent.status === 'online'))) {
          toast.warning('所选 Agent 已离线或不在当前列表中，请刷新后重试');
          return;
        }
        normalizeAgentCommandTimeout(this.commandForm.timeout);
        if (!this.allowedActions.some(action => action.id === this.commandForm.action)) {
          toast.error('所选动作已不在后端白名单中，请刷新页面后重试');
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
                type: 'action',
                content: this.commandForm.action,
                action: this.commandForm.action,
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
          
          await this.fetchCommandHistory();
          
          // 重置表单
          this.resetCommand();
        } else {
          // 单个Agent执行命令
          const commandData = {
            agent_id: this.batchMode ? this.commandForm.agent_id[0] : this.commandForm.agent_id,
            type: 'action',
            content: this.commandForm.action,
            action: this.commandForm.action,
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
            
            await this.fetchCommandHistory();
            
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
        await this.fetchCommandHistory();
        toast.warning('命令执行时间较长，请在历史记录中查看结果');
        return;
      }
      
      try {
        const response = await agentApi.getCommandResult(commandId);
        
        if (response && response.code === 200) {
          const result = response.data;
          
          // 如果命令已完成或出错，显示详情
          if (this.isCommandTerminal(result.status)) {
            this.selectedCommand = result;
            this.dialogVisible = true;
            
            // 根据结果显示不同的消息
            if (result.success) {
              toast.success('命令执行成功');
            } else {
              toast.warning('命令执行失败: ' + (result.error_msg || '未知错误'));
            }
            
            await this.fetchCommandHistory();
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
      this.commandForm = { agent_id: this.batchMode ? [] : '', action: '', timeout: 30 };
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
        const items = response.data?.items || [];
        this.commandHistory = items;
        this.total = response.data?.total || 0;
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
        failed: 'destructive', canceled: 'outline'
      };
      return statusMap[status] || 'outline';
    },
    isCommandTerminal(status) {
      return isLegacyCommandTerminal(status);
    },
    commandResultLabel(command) {
      if (!this.isCommandTerminal(command.status)) return '-';
      if (command.status === 'canceled') return '已取消';
      return command.success ? '成功' : '失败';
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
    async copyCommandDetailOutput() {
      if (this.selectedCommand && this.selectedCommand.output) {
        try {
          await this.copyText(this.selectedCommand.output);
          toast.success('命令输出已复制到剪贴板');
        } catch (error) {
          toast.error(error.message || '复制命令输出失败');
        }
      } else {
        toast.warning('没有可复制的命令输出');
      }
    },
    async copyText(value) {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
        return;
      }
      const textArea = document.createElement('textarea');
      textArea.value = value;
      textArea.setAttribute('readonly', '');
      textArea.style.position = 'absolute';
      textArea.style.left = '-9999px';
      document.body.appendChild(textArea);
      textArea.select();
      const copied = document.execCommand('copy');
      document.body.removeChild(textArea);
      if (!copied) throw new Error('浏览器未允许写入剪贴板');
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
