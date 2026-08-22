<template>
  <div class="flex min-w-0 flex-col gap-6">
    <header class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div class="min-w-0"><h1 class="text-2xl font-semibold tracking-normal">{{ $t('agents.command.title') }}</h1><p class="mt-1 text-sm text-muted-foreground">{{ $t('agents.command.subtitle') }}</p></div>
    </header>

    <Alert v-if="agentLoadError" variant="destructive"><CircleAlert /><AlertTitle>{{ $t('agents.command.feedback.agentLoadFailedTitle') }}</AlertTitle><AlertDescription>{{ agentLoadError }}</AlertDescription><AlertAction><UiButton size="sm" variant="outline" @click="fetchAgentList">{{ $t('agents.command.actions.retry') }}</UiButton></AlertAction></Alert>
    <Alert v-if="actionLoadError" variant="destructive"><CircleAlert /><AlertTitle>{{ $t('agents.command.feedback.actionLoadFailedTitle') }}</AlertTitle><AlertDescription>{{ actionLoadError }}</AlertDescription><AlertAction><UiButton size="sm" variant="outline" @click="fetchActions">{{ $t('agents.command.actions.retry') }}</UiButton></AlertAction></Alert>
    <Alert><CircleAlert /><AlertTitle>{{ $t('agents.command.guard.title') }}</AlertTitle><AlertDescription>{{ $t('agents.command.guard.description') }}</AlertDescription></Alert>

    <Card>
      <CardHeader>
        <CardTitle class="flex items-center gap-2"><SquareTerminal />{{ $t('agents.command.execute.title') }}</CardTitle>
        <CardDescription>{{ $t('agents.command.execute.description') }}</CardDescription>
        <CardAction><Field orientation="horizontal"><UiSwitch id="batch-mode" v-model="batchMode" @update:model-value="onBatchModeChange" /><FieldLabel for="batch-mode">{{ $t('agents.command.execute.batchMode') }}</FieldLabel></Field></CardAction>
      </CardHeader>
      <CardContent>
          <FieldGroup>
            <Field v-if="!batchMode"><FieldLabel for="command-agent">{{ $t('agents.command.execute.agentId') }}</FieldLabel><UiSelect v-model="commandForm.agent_id" @update:open="handleAgentSelectVisibleChange"><SelectTrigger id="command-agent" class="w-full"><SelectValue :placeholder="$t('agents.command.execute.selectAgent')" /></SelectTrigger><SelectContent><SelectGroup>
              <SelectItem v-for="agent in agentList" :key="agent.id" :value="agent.id" :disabled="agent.status !== 'online'">{{ agent.displayName || $t('agents.command.values.unknownHost') }} ({{ agent.id || $t('agents.command.values.unknown') }})<template v-if="agent.status !== 'online'"> · {{ $t('agents.command.values.offline') }}</template></SelectItem>
            </SelectGroup></SelectContent></UiSelect></Field>
            <FieldSet v-else><FieldLegend variant="label">{{ $t('agents.command.execute.agentId') }}</FieldLegend><FieldDescription>{{ $t('agents.command.execute.selectOnlineAgents') }}</FieldDescription><FieldGroup class="agent-checkboxes">
              <Field v-for="agent in agentList" :key="agent.id" orientation="horizontal"><UiCheckbox :id="`command-agent-${agent.id}`" :disabled="agent.status !== 'online'" :model-value="isBatchAgentSelected(agent.id)" @update:model-value="toggleBatchAgent(agent.id, $event)" /><FieldLabel :for="`command-agent-${agent.id}`" class="font-normal">{{ agent.displayName || $t('agents.command.values.unknownHost') }} · {{ agent.id || $t('agents.command.values.unknown') }}<template v-if="agent.status !== 'online'"> · {{ $t('agents.command.values.offline') }}</template></FieldLabel></Field>
            </FieldGroup></FieldSet>
            <Field :data-invalid="Boolean(actionLoadError)"><FieldLabel for="agent-command-action">{{ $t('agents.command.execute.controlledAction') }}</FieldLabel><UiSelect v-model="commandForm.action" :disabled="actionLoading || allowedActions.length === 0"><SelectTrigger id="agent-command-action" class="w-full" :aria-invalid="Boolean(actionLoadError)"><SelectValue :placeholder="$t(actionLoading ? 'agents.command.execute.loadingActions' : 'agents.command.execute.selectAction')" /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="action in allowedActions" :key="action.id" :value="action.id">{{ actionName(action) }}</SelectItem></SelectGroup></SelectContent></UiSelect><FieldDescription>{{ selectedActionDescription }}</FieldDescription></Field>
            <Field><FieldLabel for="agent-command-timeout">{{ $t('agents.command.execute.timeout') }}</FieldLabel><UiInput id="agent-command-timeout" v-model.number="commandForm.timeout" type="number" min="5" max="300" step="5" /></Field>
          </FieldGroup>
      </CardContent>
      <CardFooter class="flex flex-wrap justify-end gap-2"><UiButton variant="outline" @click="resetCommand">{{ $t('agents.command.actions.reset') }}</UiButton><UiButton :disabled="commandLoading || actionLoading || !commandForm.action" @click="executeCommand"><Spinner v-if="commandLoading" data-icon="inline-start" /><Play v-else data-icon="inline-start" />{{ $t('agents.command.actions.execute') }}</UiButton></CardFooter>
    </Card>

    <Card>
      <CardHeader><CardTitle class="flex items-center gap-2"><History />{{ $t('agents.command.history.title') }}</CardTitle><CardDescription>{{ $t('agents.command.history.description') }}</CardDescription><CardAction class="flex flex-wrap gap-2"><UiButton size="sm" variant="outline" :disabled="historyLoading" @click="refreshHistory"><Spinner v-if="historyLoading" data-icon="inline-start" /><RefreshCw v-else data-icon="inline-start" />{{ $t('agents.command.actions.refresh') }}</UiButton><UiButton size="sm" variant="ghost" @click="getAllHistory">{{ $t('agents.command.actions.resetFilters') }}</UiButton></CardAction></CardHeader>
      <CardContent class="flex flex-col gap-4">
          <FieldGroup class="history-filter">
            <Field><FieldLabel for="history-agent">{{ $t('agents.command.history.filters.agent') }}</FieldLabel><UiSelect v-model="historyFilter.agent_id" @update:model-value="onAgentFilterChange"><SelectTrigger id="history-agent"><SelectValue :placeholder="$t('agents.command.history.filters.selectAgent')" /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="all">{{ $t('agents.command.history.filters.allAgents') }}</SelectItem><SelectItem v-for="agent in agentList" :key="agent.id" :value="agent.id">{{ agent.displayName || $t('agents.command.values.unknownHost') }} ({{ agent.id }})</SelectItem></SelectGroup></SelectContent></UiSelect></Field>
            <Field><FieldLabel for="history-status">{{ $t('agents.command.history.filters.status') }}</FieldLabel><UiSelect v-model="historyFilter.status" @update:model-value="onStatusFilterChange"><SelectTrigger id="history-status"><SelectValue :placeholder="$t('agents.command.history.filters.commandStatus')" /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="all">{{ $t('agents.command.history.filters.allStatuses') }}</SelectItem><SelectItem v-for="status in commandStatuses" :key="status.value" :value="status.value">{{ status.label }}</SelectItem></SelectGroup></SelectContent></UiSelect></Field>
            <Field><FieldLabel for="history-search">{{ $t('agents.command.history.filters.keyword') }}</FieldLabel><UiInput id="history-search" v-model="historyFilter.search" :placeholder="$t('agents.command.history.filters.searchPlaceholder')" @input="onSearchChange" /></Field>
            <Field><FieldLabel for="history-start">{{ $t('agents.command.history.filters.startDate') }}</FieldLabel><UiInput id="history-start" v-model="historyFilter.date_range[0]" type="date" @change="onDateRangeChange" /></Field>
            <Field><FieldLabel for="history-end">{{ $t('agents.command.history.filters.endDate') }}</FieldLabel><UiInput id="history-end" v-model="historyFilter.date_range[1]" type="date" @change="onDateRangeChange" /></Field>
          </FieldGroup>

          <Alert v-if="historyError" variant="destructive"><CircleAlert /><AlertTitle>{{ $t('agents.command.feedback.historyLoadFailedTitle') }}</AlertTitle><AlertDescription>{{ historyError }}</AlertDescription></Alert>
          <div v-if="historyLoading" class="flex flex-col gap-2"><Skeleton v-for="index in 4" :key="index" class="h-10 w-full" /></div>
          <Empty v-else-if="commandHistory.length === 0"><EmptyHeader><EmptyTitle>{{ $t('agents.command.history.emptyTitle') }}</EmptyTitle><EmptyDescription>{{ $t('agents.command.history.emptyDescription') }}</EmptyDescription></EmptyHeader></Empty>
          <ShadcnTable v-else><TableHeader><TableRow><TableHead>{{ $t('agents.command.history.columns.commandId') }}</TableHead><TableHead>{{ $t('agents.command.history.columns.agentId') }}</TableHead><TableHead>{{ $t('agents.command.history.columns.type') }}</TableHead><TableHead>{{ $t('agents.command.history.columns.content') }}</TableHead><TableHead>{{ $t('agents.command.history.columns.status') }}</TableHead><TableHead>{{ $t('agents.command.history.columns.result') }}</TableHead><TableHead>{{ $t('agents.command.history.columns.executedAt') }}</TableHead><TableHead class="text-right">{{ $t('agents.command.history.columns.actions') }}</TableHead></TableRow></TableHeader><TableBody>
            <TableRow v-for="command in commandHistory" :key="command.command_id"><TableCell>{{ command.command_id }}</TableCell><TableCell class="max-w-56 truncate">{{ command.agent_id }}</TableCell><TableCell><Badge variant="outline">{{ command.type }}</Badge></TableCell><TableCell class="max-w-56 truncate">{{ command.content }}</TableCell><TableCell><Badge :variant="getStatusVariant(command.status)">{{ statusLabel(command.status) }}</Badge></TableCell><TableCell><Badge v-if="isCommandTerminal(command.status)" :variant="command.success ? 'default' : (command.status === 'canceled' ? 'outline' : 'destructive')">{{ commandResultLabel(command) }}</Badge><span v-else>-</span></TableCell><TableCell>{{ formatTime(command.start_time) }}</TableCell><TableCell class="text-right"><UiButton size="xs" variant="ghost" @click="viewCommandDetail(command)">{{ $t('agents.command.actions.viewDetails') }}</UiButton></TableCell></TableRow>
          </TableBody></ShadcnTable>
      </CardContent>
      <CardFooter v-if="total > 0" class="pagination-container"><span>{{ $t('agents.command.history.total', { count: total }) }}</span><UiSelect :model-value="String(pageSize)" @update:model-value="handleSizeChange(Number($event))"><SelectTrigger class="page-size" :aria-label="$t('agents.command.history.pageSizeAria')"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="size in [10, 20, 50, 100]" :key="size" :value="String(size)">{{ $t('agents.command.history.perPage', { count: size }) }}</SelectItem></SelectGroup></SelectContent></UiSelect><UiButton size="icon-sm" variant="outline" :disabled="currentPage <= 1" :aria-label="$t('agents.command.history.previousPage')" @click="handleCurrentChange(currentPage - 1)"><ChevronLeft /></UiButton><span>{{ currentPage }} / {{ totalPages }}</span><UiButton size="icon-sm" variant="outline" :disabled="currentPage >= totalPages" :aria-label="$t('agents.command.history.nextPage')" @click="handleCurrentChange(currentPage + 1)"><ChevronRight /></UiButton></CardFooter>
    </Card>

        <UiDialog v-model:open="dialogVisible"><DialogScrollContent class="wide-dialog"><DialogHeader><DialogTitle>{{ $t('agents.command.details.title') }}</DialogTitle><DialogDescription>{{ $t('agents.command.details.description') }}</DialogDescription></DialogHeader>
          <div v-if="selectedCommand" class="command-detail">
            <dl class="detail-grid"><div><dt>{{ $t('agents.command.details.fields.commandId') }}</dt><dd>{{ selectedCommand.command_id }}</dd></div><div><dt>{{ $t('agents.command.details.fields.agentId') }}</dt><dd>{{ selectedCommand.agent_id }}</dd></div><div><dt>{{ $t('agents.command.details.fields.type') }}</dt><dd>{{ selectedCommand.type }}</dd></div><div><dt>{{ $t('agents.command.details.fields.status') }}</dt><dd><Badge :variant="getStatusVariant(selectedCommand.status)">{{ statusLabel(selectedCommand.status) }}</Badge></dd></div><div><dt>{{ $t('agents.command.details.fields.exitCode') }}</dt><dd>{{ isCommandTerminal(selectedCommand.status) ? (selectedCommand.exit_code ?? '-') : '-' }}</dd></div><div><dt>{{ $t('agents.command.details.fields.result') }}</dt><dd>{{ commandResultLabel(selectedCommand) }}</dd></div><div><dt>{{ $t('agents.command.details.fields.startedAt') }}</dt><dd>{{ formatTime(selectedCommand.start_time) }}</dd></div><div><dt>{{ $t('agents.command.details.fields.endedAt') }}</dt><dd>{{ formatTime(selectedCommand.end_time) }}</dd></div><div><dt>{{ $t('agents.command.details.fields.duration') }}</dt><dd>{{ formatDuration(selectedCommand.duration_ms) }}</dd></div></dl>
            <pre class="command-content">{{ selectedCommand.content }}</pre>
            <Tabs default-value="output"><TabsList><TabsTrigger value="output">{{ $t('agents.command.details.output') }}</TabsTrigger><TabsTrigger v-if="selectedCommand.error_msg" value="error">{{ $t('agents.command.details.error') }}</TabsTrigger></TabsList><TabsContent value="output"><pre v-if="selectedCommand.output" class="command-output">{{ selectedCommand.output }}</pre><Empty v-else><EmptyHeader><EmptyTitle>{{ $t('agents.command.details.noOutput') }}</EmptyTitle></EmptyHeader></Empty></TabsContent><TabsContent v-if="selectedCommand.error_msg" value="error"><Alert variant="destructive"><CircleAlert /><AlertTitle>{{ $t('agents.command.details.executionError') }}</AlertTitle><AlertDescription><pre class="command-error">{{ selectedCommand.error_msg }}</pre></AlertDescription></Alert></TabsContent></Tabs>
            <div class="detail-actions">
              <UiButton size="sm" :disabled="detailLoading" @click="refreshCommandDetail(selectedCommand.command_id)"><Spinner v-if="detailLoading" data-icon="inline-start" /><RefreshCw v-else data-icon="inline-start" />{{ $t('agents.command.actions.refreshResult') }}</UiButton>
              <UiButton variant="outline" size="sm" @click="copyCommandDetailOutput"><Copy data-icon="inline-start" />{{ $t('agents.command.actions.copyOutput') }}</UiButton>
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
import {
  agentCommandActionDescription,
  agentCommandActionName,
  agentCommandFailureText,
  agentCommandStatusLabel,
  createAgentCommandFailure,
  formatAgentCommandDuration,
  formatAgentCommandTime
} from '@/i18n/agentMessages';

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
      agentLoadFailure: null,
      actionLoadFailure: null,
      historyFailure: null,
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
      batchMode: false,
      allowedActions: [],
      detailLoading: false
    };
  },
  computed: {
    agentLoadError() {
      return agentCommandFailureText(this.agentLoadFailure, this.$t);
    },
    actionLoadError() {
      return agentCommandFailureText(this.actionLoadFailure, this.$t);
    },
    historyError() {
      return agentCommandFailureText(this.historyFailure, this.$t);
    },
    commandStatuses() {
      return ['pending', 'running', 'completed', 'failed', 'canceled'].map(value => ({
        value,
        label: agentCommandStatusLabel(value, this.$t)
      }));
    },
    totalPages() {
      return Math.max(1, Math.ceil(this.total / this.pageSize));
    },
    selectedAction() {
      return this.allowedActions.find(action => action.id === this.commandForm.action) || null;
    },
    selectedActionDescription() {
      if (this.selectedAction) return agentCommandActionDescription(this.selectedAction, this.$t);
      return this.actionLoadError || this.$t('agents.command.execute.selectActionDescription');
    }
  },
  created() {
    this.fetchAgentList();
    this.fetchActions();
    this.processQueryParams();
    this.fetchCommandHistory();
  },
  methods: {
    localizedFailure(key, error) {
      return agentCommandFailureText(createAgentCommandFailure(key, error), this.$t);
    },
    activeLocale() {
      const localeState = this.$i18n?.locale;
      return typeof localeState === 'string' ? localeState : (localeState?.value || 'zh-CN');
    },
    actionName(action) {
      return agentCommandActionName(action, this.$t);
    },
    statusLabel(status) {
      return agentCommandStatusLabel(status, this.$t);
    },
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
      this.agentLoadFailure = null;
      try {
        const response = await agentApi.getAgentList();
        if (response && response.code === 200) {
          const agentData = response.data || {};
          if (typeof agentData === 'object' && !Array.isArray(agentData)) {
            this.agentList = Object.values(agentData).map(agent => ({
                id: agent.agent_uuid,  // 使用agent_uuid作为id
                displayName: agent.display_name || agent.hostname || agent.name || '',
                hostname: agent.hostname || '',
                ip: agent.ip_addresses ? agent.ip_addresses[0] : agent.ip || '',  // 尝试多种IP字段
                os: agent.os || agent.system || '',  // 操作系统信息
                status: agent.connected ? 'online' : 'offline'  // 连接状态
              }));
          } else if (Array.isArray(agentData)) {
            // 数组格式，直接映射
            this.agentList = agentData.map(agent => ({
              id: agent.agent_uuid || agent.id,
              displayName: agent.display_name || agent.hostname || agent.name || '',
              hostname: agent.hostname || '',
              ip: agent.ip_addresses ? agent.ip_addresses[0] : agent.ip || '',
              os: agent.os || agent.system || '',
              status: agent.connected === true || agent.status === 'online' ? 'online' : 'offline'
            }));
          }
          
        } else {
          console.error('Agent列表响应格式错误:', response);
          this.agentLoadFailure = createAgentCommandFailure(
            'agents.command.feedback.agentInvalidResponse',
            response?.msg || response?.message || ''
          );
          toast.error(this.agentLoadError);
        }
      } catch (error) {
        console.error('获取Agent列表失败:', error);
        this.agentLoadFailure = createAgentCommandFailure('agents.command.feedback.agentLoadFailed', error);
        toast.error(this.agentLoadError);
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
      this.actionLoadFailure = null;
      try {
        const response = await agentApi.getActions();
        this.allowedActions = Array.isArray(response.data) ? response.data : [];
        if (!this.allowedActions.some(action => action.id === this.commandForm.action)) {
          this.commandForm.action = '';
        }
      } catch (error) {
        this.allowedActions = [];
        this.commandForm.action = '';
        this.actionLoadFailure = createAgentCommandFailure('agents.command.feedback.actionLoadFailed', error);
        toast.error(this.actionLoadError);
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
          toast.warning(this.$t(
            !agentSelected
              ? 'agents.command.feedback.selectOnlineAgent'
              : 'agents.command.feedback.selectActionAndTimeout'
          ));
          return;
        }
        const selectedAgentIds = this.batchMode ? this.commandForm.agent_id : [this.commandForm.agent_id];
        if (selectedAgentIds.some(id => !this.agentList.some(agent => agent.id === id && agent.status === 'online'))) {
          toast.warning(this.$t('agents.command.feedback.selectedAgentOffline'));
          return;
        }
        try {
          normalizeAgentCommandTimeout(this.commandForm.timeout);
        } catch {
          toast.warning(this.$t('agents.command.feedback.timeoutInvalid'));
          return;
        }
        if (!this.allowedActions.some(action => action.id === this.commandForm.action)) {
          toast.error(this.$t('agents.command.feedback.actionUnavailable'));
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
                  error: response.msg || this.$t('agents.command.feedback.executionFailed')
                });
              }
            } catch (error) {
              failCount++;
              results.push({
                agentId,
                success: false,
                error: error.message || this.$t('agents.command.feedback.executionFailed')
              });
            }
          }
          
          if (successCount > 0) {
            toast.success(this.$t('agents.command.feedback.batchSent', { count: successCount }));
          }
          if (failCount > 0) {
            toast.warning(this.$t('agents.command.feedback.batchFailed', { count: failCount }));
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
            toast.success(this.$t('agents.command.feedback.commandSent'));
            
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
            toast.error(this.localizedFailure('agents.command.feedback.executionFailed', response?.msg || response?.message));
          }
        }
      } catch (error) {
        toast.error(this.localizedFailure('agents.command.feedback.executionFailed', error));
      } finally {
        this.commandLoading = false;
      }
    },
    
    // 轮询命令结果
    async pollCommandResult(commandId, attempts = 0) {
      if (attempts > 20) { // 最多尝试20次，约1分钟
        await this.fetchCommandHistory();
        toast.warning(this.$t('agents.command.feedback.executionLong'));
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
              toast.success(this.$t('agents.command.feedback.executionSucceeded'));
            } else {
              toast.warning(this.localizedFailure('agents.command.feedback.executionFailed', result.error_msg));
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
      this.historyFailure = null;
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
        this.historyFailure = createAgentCommandFailure('agents.command.feedback.historyLoadFailed', error);
        toast.error(this.historyError);
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
      if (command.status === 'canceled') return this.$t('agents.command.results.canceled');
      return this.$t(command.success ? 'agents.command.results.success' : 'agents.command.results.failed');
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
      return formatAgentCommandTime(timestamp, this.activeLocale(), this.$t);
    },
    formatDuration(durationMs) {
      return formatAgentCommandDuration(durationMs, this.activeLocale(), this.$t);
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
          toast.success(this.$t('agents.command.feedback.resultRefreshed'));
        } else {
          toast.error(this.localizedFailure('agents.command.feedback.resultRefreshFailed', response?.msg || response?.message));
        }
      } catch (error) {
        toast.error(this.localizedFailure('agents.command.feedback.resultRefreshFailed', error));
      } finally {
        this.detailLoading = false;
      }
    },
    async copyCommandDetailOutput() {
      if (this.selectedCommand && this.selectedCommand.output) {
        try {
          await this.copyText(this.selectedCommand.output);
          toast.success(this.$t('agents.command.feedback.outputCopied'));
        } catch (error) {
          const message = error?.code === 'CLIPBOARD_DENIED'
            ? this.$t('agents.command.feedback.clipboardDenied')
            : this.localizedFailure('agents.command.feedback.outputCopyFailed', error);
          toast.error(message);
        }
      } else {
        toast.warning(this.$t('agents.command.feedback.noOutputToCopy'));
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
      if (!copied) {
        const error = new Error('clipboard write was denied');
        error.code = 'CLIPBOARD_DENIED';
        throw error;
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
