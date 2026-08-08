<template>
  <div class="app-container">
    <Card>
      <CardHeader><div class="task-header"><div><CardTitle>定时任务管理</CardTitle><CardDescription>配置并监控服务器自动化任务</CardDescription></div><div class="task-header-controls">
          <automation-room-select @ready="handleAutomationRoom" @change="handleAutomationRoom" />
          <div class="task-header-actions"><UiButton size="sm" @click="handleAddTask"><Plus data-icon="inline-start" />添加任务</UiButton><UiButton size="sm" variant="outline" @click="$router.push('/cron/logs')"><FileText data-icon="inline-start" />执行日志</UiButton></div></div></div></CardHeader>
      <CardContent>
        <FieldGroup class="filter-grid"><Field><FieldLabel for="task-type-filter">任务类型</FieldLabel><UiSelect v-model="listQuery.type"><SelectTrigger id="task-type-filter"><SelectValue placeholder="选择类型" /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="all">全部</SelectItem><SelectItem value="function">函数</SelectItem><SelectItem value="shell">Shell 命令</SelectItem><SelectItem value="tmux_command">TMUX 命令</SelectItem><SelectItem value="tmux_raw_command">TMUX 原始命令</SelectItem></SelectGroup></SelectContent></UiSelect></Field><Field><FieldLabel for="task-status-filter">状态</FieldLabel><UiSelect :model-value="String(listQuery.status)" @update:model-value="listQuery.status = $event"><SelectTrigger id="task-status-filter"><SelectValue placeholder="选择状态" /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="all">全部</SelectItem><SelectItem value="1">启用</SelectItem><SelectItem value="0">禁用</SelectItem></SelectGroup></SelectContent></UiSelect></Field><Field><FieldLabel for="task-keyword">关键词</FieldLabel><UiInput id="task-keyword" v-model="listQuery.keyword" placeholder="搜索任务名称或描述" @keyup.enter="fetchData" /></Field><div class="flex items-end gap-2"><UiButton :disabled="loading" @click="fetchData"><Spinner v-if="loading" data-icon="inline-start" /><Search v-else data-icon="inline-start" />搜索</UiButton><UiButton variant="outline" @click="resetQuery">重置</UiButton></div></FieldGroup>
        <Alert v-if="fetchError" variant="destructive" class="mb-4"><CircleAlert /><AlertTitle>任务列表加载失败</AlertTitle><AlertDescription>无法读取当前房间的任务数据，请检查连接后重试。</AlertDescription><AlertAction><UiButton size="sm" variant="outline" @click="retryFetch">重新加载</UiButton></AlertAction></Alert>
        <div v-if="loading && taskList.length === 0" class="flex flex-col gap-3"><Skeleton v-for="index in 6" :key="index" class="h-14 w-full" /></div>
        <Empty v-else-if="taskList.length === 0"><EmptyHeader><EmptyTitle>暂无定时任务</EmptyTitle><EmptyDescription>当前筛选条件下没有任务。</EmptyDescription></EmptyHeader><EmptyContent><UiButton @click="handleAddTask"><Plus data-icon="inline-start" />添加任务</UiButton></EmptyContent></Empty>
        <div v-else class="overflow-x-auto"><ShadcnTable><TableHeader><TableRow><TableHead>ID</TableHead><TableHead>任务名称</TableHead><TableHead>Cron 表达式</TableHead><TableHead>类型</TableHead><TableHead>目标</TableHead><TableHead>依赖任务</TableHead><TableHead>超时/重试</TableHead><TableHead>上次执行</TableHead><TableHead>状态</TableHead><TableHead class="text-right">操作</TableHead></TableRow></TableHeader><TableBody>
          <TableRow v-for="task in taskList" :key="task.id" :class="task.status === 0 ? 'opacity-60' : ''"><TableCell>{{ task.id }}</TableCell><TableCell><div class="min-w-40"><div class="flex items-center gap-2"><span class="font-medium">{{ task.name }}</span><Badge v-if="isNewTask(task)" variant="destructive">NEW</Badge></div><p v-if="task.description" class="mt-1 max-w-56 truncate text-xs text-muted-foreground">{{ task.description }}</p></div></TableCell><TableCell class="font-mono text-xs">{{ task.spec }}</TableCell><TableCell><Badge variant="outline">{{ getTaskTypeName(task.type) }}</Badge></TableCell><TableCell><TooltipProvider><Tooltip><TooltipTrigger as-child><span class="block max-w-48 truncate">{{ truncate(getFormattedTarget(task), 40) }}</span></TooltipTrigger><TooltipContent>{{ getFormattedTarget(task) }}</TooltipContent></Tooltip></TooltipProvider></TableCell><TableCell><span v-if="!task.dependencies || task.dependencies.length === 0" class="text-muted-foreground">无依赖</span><div v-else class="flex max-w-48 flex-wrap gap-1"><Badge v-for="dep in task.dependencies" :key="dep.id || dep" variant="secondary">{{ dep.name || dep.id || dep }}</Badge></div></TableCell><TableCell><div class="flex min-w-24 flex-col gap-1 text-xs"><span><Clock class="inline size-3" /> {{ task.timeout || '无限' }}</span><span><RefreshCw class="inline size-3" /> {{ task.retry_times || 0 }}</span></div></TableCell><TableCell><div class="min-w-36"><span v-if="task.last_run_time && task.last_run_time !== '0001-01-01T00:00:00Z'">{{ formatDateTime(task.last_run_time) }}</span><span v-else class="text-muted-foreground">未执行</span><Badge v-if="task.last_run_time && task.last_run_time !== '0001-01-01T00:00:00Z'" class="mt-1" :variant="task.last_status === 1 ? 'default' : 'destructive'">{{ task.last_status === 1 ? '成功' : '失败' }}</Badge></div></TableCell><TableCell><Badge :variant="task.status === 1 ? 'default' : 'secondary'">{{ task.status === 1 ? '启用' : '禁用' }}</Badge></TableCell><TableCell><div class="flex min-w-max justify-end gap-1"><UiButton size="icon-sm" variant="outline" title="立即执行" :aria-label="`立即执行任务 ${task.name}`" @click="handleRunNow(task)"><Play /></UiButton><UiButton size="icon-sm" variant="ghost" :title="task.status === 1 ? '禁用任务' : '启用任务'" :aria-label="task.status === 1 ? `禁用任务 ${task.name}` : `启用任务 ${task.name}`" @click="handleToggleStatus(task)"><CircleOff v-if="task.status === 1" /><CircleCheck v-else /></UiButton><UiButton size="icon-sm" variant="ghost" title="编辑任务" :aria-label="`编辑任务 ${task.name}`" @click="handleEdit(task)"><Pencil /></UiButton><DropdownMenu><DropdownMenuTrigger as-child><UiButton size="icon-sm" variant="ghost" title="更多操作" :aria-label="`打开任务 ${task.name} 的更多操作`"><Ellipsis /></UiButton></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuGroup><DropdownMenuItem @select="viewTaskLogs(task.id)"><FileText />查看日志</DropdownMenuItem><DropdownMenuItem @select="viewTaskStats(task.id)"><ChartNoAxesColumn />查看统计</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem variant="destructive" @select="handleDelete(task)"><Trash2 />删除任务</DropdownMenuItem></DropdownMenuGroup></DropdownMenuContent></DropdownMenu></div></TableCell></TableRow>
        </TableBody></ShadcnTable></div>
        <div v-if="total > 0" class="mt-4 flex flex-wrap items-center justify-between gap-3"><div class="flex items-center gap-2 text-sm text-muted-foreground"><span>每页</span><UiSelect :model-value="String(listQuery.limit)" @update:model-value="handleSizeChange(Number($event))"><SelectTrigger class="w-24" aria-label="每页显示条数"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="size in [10,20,50,100]" :key="size" :value="String(size)">{{ size }}</SelectItem></SelectGroup></SelectContent></UiSelect><span>共 {{ total }} 条</span></div><ShadcnPagination v-model:page="listQuery.page" :total="total" :items-per-page="listQuery.limit" show-edges @update:page="handleCurrentChange"><PaginationContent v-slot="{ items }"><PaginationPrevious /><template v-for="(item, index) in items" :key="index"><PaginationItem v-if="item.type === 'page'" :value="item.value" :is-active="item.value === listQuery.page">{{ item.value }}</PaginationItem><PaginationEllipsis v-else :index="index" /></template><PaginationNext /></PaginationContent></ShadcnPagination></div>
      </CardContent>
    </Card>

    <UiDialog v-model:open="dialogVisible"><DialogScrollContent class="max-w-3xl"><DialogHeader><DialogTitle>执行结果</DialogTitle><DialogDescription>任务本次手动执行的返回信息</DialogDescription></DialogHeader>
      <div v-if="taskResult" class="task-result">
        <div v-if="taskResult.success !== undefined">
          <p><strong>执行状态：</strong> <Badge :variant="taskResult.success ? 'default' : 'destructive'">{{ taskResult.success ? '成功' : '失败' }}</Badge></p>
          <p v-if="taskResult.timestamp"><strong>执行时间：</strong> {{ taskResult.timestamp }}</p>
          <p v-if="taskResult.duration != null"><strong>执行耗时：</strong> {{ formatDuration(taskResult.duration) }}</p>
        </div>

        <Alert v-if="taskResult.message"><Info /><AlertTitle>执行消息</AlertTitle><AlertDescription>{{ taskResult.message }}</AlertDescription></Alert>

        <div v-if="taskResult.output" class="result-output">
          <strong>输出结果：</strong>
          <pre>{{ taskResult.output }}</pre>
        </div>

        <Alert v-if="!taskResult.success && !taskResult.output && !taskResult.message" class="my-4"><Info /><AlertTitle>任务已开始异步执行</AlertTitle><AlertDescription>任务正在后台执行，请查看任务日志获取执行结果。</AlertDescription></Alert>
      </div>
      <Alert v-else><Info /><AlertTitle>任务已开始异步执行</AlertTitle><AlertDescription>任务正在后台执行，请查看任务日志获取执行结果。</AlertDescription></Alert>
      <DialogFooter><UiButton variant="outline" @click="dialogVisible = false">关闭</UiButton><UiButton @click="viewTaskLogs(currentTaskId)">查看任务日志</UiButton></DialogFooter></DialogScrollContent></UiDialog>

    <UiDialog v-model:open="statsDialogVisible"><DialogScrollContent class="max-w-4xl"><DialogHeader><DialogTitle>任务统计</DialogTitle><DialogDescription>任务历史执行表现和耗时趋势</DialogDescription></DialogHeader>
      <div v-if="statsLoading" class="flex flex-col gap-3"><Skeleton class="h-24 w-full" /><Skeleton class="h-72 w-full" /></div><div v-else class="task-stats">
        <div v-if="taskStats" class="stats-overview">
          <Card size="sm"><CardHeader><CardDescription>成功率</CardDescription><CardTitle>{{ taskStats.success_rate }}%</CardTitle></CardHeader></Card>
          <Card size="sm"><CardHeader><CardDescription>平均耗时</CardDescription><CardTitle>
              {{ taskStats.avg_duration }} {{ taskStats.duration_unit === 's' ? '秒' : '毫秒' }}
              <span v-if="taskStats.duration_unit === 'ms'" class="unit-note">(约 {{ (taskStats.avg_duration / 1000).toFixed(2) }} 秒)</span>
            </CardTitle></CardHeader></Card>
          <Card size="sm"><CardHeader><CardDescription>总执行次数</CardDescription><CardTitle>{{ taskStats.total_runs }}</CardTitle></CardHeader></Card>
          <Card size="sm"><CardHeader><CardDescription>最近执行</CardDescription><CardTitle>{{ taskStats.last_run || '无' }}</CardTitle></CardHeader></Card>
        </div>
        <div v-if="taskStats && (taskStats.success_count > 0 || taskStats.fail_count > 0)" class="stats-detail">
          <div class="grid gap-4 sm:grid-cols-2">
              <div class="detail-item">
                <span class="detail-label">成功次数:</span>
                <span class="detail-value success">{{ taskStats.success_count }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">失败次数:</span>
                <span class="detail-value fail">{{ taskStats.fail_count }}</span>
              </div>
          </div>
          <div v-if="taskStats.last_status !== undefined" class="mt-3">
              <div class="detail-item">
                <span class="detail-label">最近状态:</span>
                <Badge :variant="taskStats.last_status === 1 ? 'default' : 'destructive'">
                  {{ taskStats.last_status === 1 ? '成功' : '失败' }}
                </Badge>
              </div>
          </div>
        </div>
        <div class="stats-charts">
          <div id="executionChart" class="h-72 w-full"></div>
          <div id="durationChart" class="h-72 w-full"></div>
        </div>
      </div>
      <DialogFooter><UiButton variant="outline" @click="statsDialogVisible = false">关闭</UiButton></DialogFooter></DialogScrollContent></UiDialog>
  </div>
</template>

<script>
import { ChartNoAxesColumn, CircleAlert, CircleCheck, CircleOff, Clock, Ellipsis, FileText, Info, Pencil, Play, Plus, RefreshCw, Search, Trash2 } from '@lucide/vue';
import { toast } from 'vue-sonner';
import { cronTaskApi } from '@/api/index';
import * as echarts from 'echarts';
import AutomationRoomSelect from '@/components/AutomationRoomSelect.vue';
import { getSystemPreferences } from '@/utils/systemPreferences';
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button as UiButton } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog as UiDialog, DialogDescription, DialogFooter, DialogHeader, DialogScrollContent, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input as UiInput } from '@/components/ui/input';
import { Pagination as ShadcnPagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Select as UiSelect, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { Table as ShadcnTable, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { confirmAction } from '@/lib/feedback';

export default {
  name: 'TaskList',
  components: {
    Alert, AlertAction, AlertDescription, AlertTitle, AutomationRoomSelect, Badge, Card, CardContent,
    CardDescription, CardHeader, CardTitle, ChartNoAxesColumn, CircleAlert, CircleCheck, CircleOff, Clock,
    DialogDescription, DialogFooter, DialogHeader, DialogScrollContent, DialogTitle,
    DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator,
    DropdownMenuTrigger, Ellipsis, Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle,
    Field, FieldGroup, FieldLabel, FileText, Info, PaginationContent, PaginationEllipsis,
    PaginationItem, PaginationNext, PaginationPrevious, Pencil, Play, Plus, RefreshCw, Search,
    ShadcnPagination, ShadcnTable, Skeleton, Spinner, TableBody, TableCell, TableHead, TableHeader,
    SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue, TableRow, Tooltip,
    TooltipContent, TooltipProvider, TooltipTrigger, Trash2, UiButton, UiDialog, UiInput, UiSelect
  },
  data() {
    return {
      loading: false,
      statsLoading: false,
      taskList: [],
      groupList: [],
      tmuxCommands: [], // 存储TMUX命令列表
      total: 0,
      listQuery: {
        page: 1,
        limit: 20,
        group_id: '',
        type: '',
        status: '',
        keyword: ''
      },
      dialogVisible: false,
      taskResult: null,
      currentTaskId: null,
      statsDialogVisible: false,
      taskStats: null,
      executionChart: null,
      durationChart: null,
      fetchError: false
    };
  },
  methods: {
    chartColor(variable) {
      return getComputedStyle(document.documentElement).getPropertyValue(variable).trim() || getSystemPreferences().theme;
    },
    themedChartOption(option) {
      const foreground = this.chartColor('--foreground');
      const muted = this.chartColor('--muted-foreground');
      const border = this.chartColor('--border');
      const themeAxis = axis => ({
        ...axis,
        nameTextStyle: { color: muted, ...axis?.nameTextStyle },
        axisLabel: { color: muted, ...axis?.axisLabel },
        axisLine: { ...axis?.axisLine, lineStyle: { color: border, ...axis?.axisLine?.lineStyle } },
        splitLine: { ...axis?.splitLine, lineStyle: { color: border, ...axis?.splitLine?.lineStyle } }
      });
      return {
        ...option,
        backgroundColor: 'transparent',
        textStyle: { color: foreground, ...option.textStyle },
        title: { ...option.title, textStyle: { color: foreground, ...option.title?.textStyle } },
        legend: option.legend ? { ...option.legend, textStyle: { color: muted, ...option.legend.textStyle } } : option.legend,
        xAxis: themeAxis(option.xAxis),
        yAxis: themeAxis(option.yAxis)
      };
    },
    truncate(value, length) {
      if (!value) return '';
      if (value.length <= length) return value;
      return value.substring(0, length) + '...';
    },
    handleAutomationRoom() {
      this.taskList = [];
      this.groupList = [];
      this.total = 0;
      Promise.all([this.fetchGroups(), this.fetchTmuxCommands()])
        .finally(() => this.fetchData());
    },
    // 判断是否是新任务（创建时间在3天内且用户未查看过）
    isNewTask(task) {
      if (!task.created_at || !task.id) return false;

      // 从本地存储中获取已查看过的新任务ID
      const viewedNewTasks = JSON.parse(sessionStorage.getItem('viewedNewTasks') || '[]');

      // 如果用户已经查看过这个任务，则不显示新标签
      if (viewedNewTasks.includes(task.id)) {
        return false;
      }

      const createdDate = new Date(task.created_at);
      const now = new Date();
      const threeDaysAgo = new Date(now.getTime() - (3 * 24 * 60 * 60 * 1000));

      // 如果是新任务，将其ID添加到已查看列表中
      if (createdDate > threeDaysAgo) {
        // 将任务ID添加到已查看列表中，下次就不会显示新标签了
        // 注意：这里我们延迟添动作，确保用户能看到标签
        setTimeout(() => {
          const updatedViewedTasks = JSON.parse(sessionStorage.getItem('viewedNewTasks') || '[]');
          if (!updatedViewedTasks.includes(task.id)) {
            updatedViewedTasks.push(task.id);
            sessionStorage.setItem('viewedNewTasks', JSON.stringify(updatedViewedTasks));
          }
        }, 2000); // 2秒后添加到已查看列表

        return true;
      }

      return false;
    },

    // 获取任务类型名称
    getTaskTypeName(type) {
      const typeMap = {
        'function': '函数',
        'shell': 'Shell命令',
        'tmux_command': 'TMUX命令',
        'tmux_raw_command': 'TMUX原始命令'
      };
      return typeMap[type] || type;
    },

    // 格式化执行耗时
    formatDuration(duration) {
      if (duration === undefined || duration === null) return '-';

      // 判断是否为毫秒值
      const isMilliseconds = duration > 1000 || duration < 0.01;

      if (isMilliseconds) {
        // 如果是毫秒值
        if (duration >= 1000) {
          // 转换为秒
          return `${(duration / 1000).toFixed(2)} 秒`;
        } else {
          // 保持毫秒
          return `${Math.round(duration)} 毫秒`;
        }
      } else {
        // 已经是秒值
        return `${parseFloat(duration).toFixed(2)} 秒`;
      }
    },

    // 格式化日期时间
    formatDateTime(dateTimeStr) {
      if (!dateTimeStr || dateTimeStr === '0001-01-01T00:00:00Z') {
        return '未计划';
      }

      try {
        const date = new Date(dateTimeStr);
        return date.toLocaleString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        });
      } catch (e) {
        console.warn('日期格式化失败:', e);
        return dateTimeStr;
      }
    },

    // 获取TMUX命令列表
    fetchTmuxCommands() {
      return cronTaskApi.getTmuxCommands()
        .then(response => {
          if (response.data && response.data.code === 200) {
            this.tmuxCommands = response.data.data || [];
            console.log('获取TMUX命令列表成功:', this.tmuxCommands);
          } else {
            console.warn('获取TMUX命令列表失败:', response.data?.msg);
          }
        })
        .catch(error => {
          console.error('获取TMUX命令列表失败:', error);
          this.tmuxCommands = [];
        });
    },

    // 根据命令ID获取命令名称
    getCommandNameById(commandId) {
      const command = this.tmuxCommands.find(cmd => String(cmd.id) === String(commandId));
      return command ? command.name : commandId;
    },

    // 根据命令ID获取命令内容
    getCommandContentById(commandId) {
      const command = this.tmuxCommands.find(cmd => String(cmd.id) === String(commandId));
      return command ? (command.script || command.command || '') : '';
    },

    // 格式化显示目标
    getFormattedTarget(task) {
      if (task.type === 'tmux_command') {
        // 优先使用新的直接字段
        if (task.session_name && task.command_id) {
          const commandName = this.getCommandNameById(task.command_id);
          const commandContent = this.getCommandContentById(task.command_id);
          const params = task.command_params && task.command_params.length > 0
            ? ', 参数: ' + task.command_params.join(', ')
            : '';
          return `服务器: ${task.session_name}, 命令: ${commandName}, 内容: ${commandContent}${params}`;
        }
        // 其次使用tmux_task字段
        else if (task.tmux_task && task.tmux_task.session_name && task.tmux_task.command_id) {
          const commandName = this.getCommandNameById(task.tmux_task.command_id);
          const commandContent = this.getCommandContentById(task.tmux_task.command_id);
          const params = task.tmux_task.command_params && task.tmux_task.command_params.length > 0
            ? ', 参数: ' + task.tmux_task.command_params.join(', ')
            : '';
          return `服务器: ${task.tmux_task.session_name}, 命令: ${commandName}, 内容: ${commandContent}${params}`;
        }
        // 兼容旧的target字段
        else if (task.target) {
          try {
            const targetArray = JSON.parse(task.target);
            if (Array.isArray(targetArray) && targetArray.length >= 2) {
              const commandName = this.getCommandNameById(targetArray[1]);
              const commandContent = this.getCommandContentById(targetArray[1]);
              return `服务器: ${targetArray[0]}, 命令: ${commandName}, 内容: ${commandContent}${targetArray.length > 2 ? ', 参数: ' + targetArray.slice(2).join(', ') : ''}`;
            }
          } catch (e) {
            console.warn('解析目标失败:', e);
          }
        }
      } else if (task.type === 'tmux_raw_command') {
        // 优先使用新的直接字段
        if (task.session_name && task.raw_command) {
          return `服务器: ${task.session_name}, 命令: ${task.raw_command}`;
        }
        // 其次使用tmux_task字段
        else if (task.tmux_task && task.tmux_task.session_name && task.tmux_task.raw_command) {
          return `服务器: ${task.tmux_task.session_name}, 命令: ${task.tmux_task.raw_command}`;
        }
        // 兼容旧的target字段
        else if (task.target) {
          try {
            const targetArray = JSON.parse(task.target);
            if (Array.isArray(targetArray) && targetArray.length >= 2) {
              return `服务器: ${targetArray[0]}, 命令: ${targetArray[1]}`;
            }
          } catch (e) {
            console.warn('解析目标失败:', e);
          }
        }
      }
      return task.target;
    },

    fetchData() {
      this.loading = true;
      this.fetchError = false;
      const query = {
        ...this.listQuery,
        type: this.listQuery.type === 'all' ? '' : this.listQuery.type,
        status: this.listQuery.status === 'all' ? '' : this.listQuery.status
      };
      console.log('开始获取任务列表, 查询参数:', query);
      cronTaskApi.getTasks(query)
        .then(response => {
          console.log('获取任务列表响应:', response);

          // 处理各种可能的响应格式
          let tasksData = [];
          let success = false;

          // 直接处理原始响应
          if (response && response.code === 200) {
            // 处理直接返回的数据 {code: 200, data: ...}
            if (Array.isArray(response.data)) {
              // 如果数据是数组
              tasksData = response.data;
              success = true;
            } else if (response.data && typeof response.data === 'object') {
              // 如果数据是对象数组
              if (Array.isArray(response.data.items)) {
                tasksData = response.data.items;
                this.total = response.data.total || tasksData.length;
                success = true;
              } else {
                // 如果是单个对象，将其包装为数组
                tasksData = [response.data];
                this.total = 1;
                success = true;
              }
            }
          } else if (response && response.data) {
            // 处理嵌套响应
            // 处理标准格式 {data: {code: 200, data: [...], msg: "success"}}
            if (response.data.code === 200) {
              if (Array.isArray(response.data.data)) {
                tasksData = response.data.data;
                success = true;
              } else if (response.data.data && typeof response.data.data === 'object') {
                if (Array.isArray(response.data.data.items)) {
                  // 处理嵌套格式 {data: {code: 200, data: {items: [...], total: 10}}}
                  tasksData = response.data.data.items;
                  this.total = response.data.data.total || tasksData.length;
                  success = true;
                } else {
                  // 如果是单个对象，将其包装为数组
                  tasksData = [response.data.data];
                  this.total = 1;
                  success = true;
                }
              }
            }
            // 处理旧API格式 {data: {status: 200, data: [...]}}
            else if (response.data.status === 200) {
              if (Array.isArray(response.data.data)) {
                tasksData = response.data.data;
                success = true;
              } else if (response.data.data && typeof response.data.data === 'object') {
                if (Array.isArray(response.data.data.items)) {
                  tasksData = response.data.data.items;
                  this.total = response.data.data.total || tasksData.length;
                  success = true;
                } else {
                  // 如果是单个对象，将其包装为数组
                  tasksData = [response.data.data];
                  this.total = 1;
                  success = true;
                }
              }
            }
            // 直接返回数组的情况
            else if (Array.isArray(response.data)) {
              tasksData = response.data;
              success = true;
            }
          }

          if (success) {
            console.log('原始任务数据:', tasksData);

            // 遍历任务列表，处理数据
            tasksData.forEach(task => {
              // 处理dependencies
              try {
                if (typeof task.dependencies === 'string') {
                  if (task.dependencies) {
                    try {
                      const parsedDeps = JSON.parse(task.dependencies);
                      task.dependencies = Array.isArray(parsedDeps) ? parsedDeps : [];
                    } catch (e) {
                      console.warn(`解析任务 ${task.id} 的dependencies失败:`, e);
                      task.dependencies = [];
                    }
                  } else {
                    task.dependencies = [];
                  }
                } else if (!task.dependencies) {
                  task.dependencies = [];
                }
              } catch (e) {
                console.error('处理dependencies时发生错误:', e);
                task.dependencies = [];
              }

              // 给任务添加group_name属性
              task.group_name = task.group_id === 0 ? '未分组' :
                this.groupList.find(g => g.id === task.group_id)?.name || '未知';

              // 如果下次执行时间是无效值或不存在，设置为空
              if (!task.next_run_time || task.next_run_time === '0001-01-01T00:00:00Z') {
                task.next_run = '';
              } else {
                task.next_run = task.next_run_time;
              }
            });

            console.log('处理后的任务数据:', tasksData);
            this.taskList = tasksData;
            this.total = this.total || tasksData.length;
          } else {
            console.error('无法识别的响应格式:', response);
            toast.error('获取任务列表失败：无法识别的响应格式');
            this.taskList = [];
            this.total = 0;
            this.fetchError = true;
          }
        })
        .catch(error => {
          console.error('获取任务列表失败:', error);
          toast.error('获取任务列表失败：' + (error.message || '未知错误'));
          this.taskList = [];
          this.total = 0;
          this.fetchError = true;
        })
        .finally(() => {
          this.loading = false;
        });
    },
    fetchGroups() {
      console.log('开始获取任务组列表');
      cronTaskApi.getGroups()
        .then(response => {
          console.log('获取任务组列表响应:', response);

          // 处理各种可能的响应格式
          let groupsData = [];
          let success = false;

          if (response && response.data) {
            // 处理标准格式 {code: 200, data: [...], msg: "success"}
            if (response.data.code === 200 && Array.isArray(response.data.data)) {
              groupsData = response.data.data;
              success = true;
            }
            // 处理嵌套格式 {code: 200, data: {items: [...], total: 10}}
            else if (response.data.code === 200 && response.data.data && Array.isArray(response.data.data.items)) {
              groupsData = response.data.data.items;
              success = true;
            }
            // 处理旧API格式 {status: 200, data: [...]}
            else if (response.data.status === 200 && Array.isArray(response.data.data)) {
              groupsData = response.data.data;
              success = true;
            }
            // 直接返回数组的情况
            else if (Array.isArray(response.data)) {
              groupsData = response.data;
              success = true;
            }
          }

          if (success) {
            console.log('原始任务组数据:', groupsData);

            // 遍历任务组并处理数据
            groupsData.forEach(group => {
              // 确保task_count属性存在
              if (group.task_count === undefined && group.tasks !== undefined) {
                group.task_count = Array.isArray(group.tasks) ? group.tasks.length : 0;
              } else if (group.task_count === undefined) {
                group.task_count = 0;
              }
            });

            console.log('处理后的任务组数据:', groupsData);
            this.groupList = groupsData;
          } else {
            console.error('无法识别的响应格式:', response);
            toast.error(response.data?.msg || response.data?.message || '获取任务组列表失败：无法识别的响应格式');
            this.groupList = [];
          }
        })
        .catch(error => {
          console.error('获取任务组列表失败:', error);
          toast.error('获取任务组列表失败：' + (error.message || '未知错误'));
          this.groupList = [];
          this.fetchError = true;
        });
    },
    handleSizeChange(val) {
      this.listQuery.limit = val;
      this.fetchData();
    },
    handleCurrentChange(val) {
      this.listQuery.page = val;
      this.fetchData();
    },
    resetQuery() {
      this.listQuery = {
        page: 1,
        limit: 20,
        group_id: '',
        type: '',
        status: '',
        keyword: ''
      };
      this.fetchData();
    },
    handleAddTask() {
      this.$router.push('/cron/add');
    },
    handleEdit(row) {
      this.$router.push(`/cron/edit/${row.id}`);
    },
    handleDelete(row) {
      confirmAction('确定要删除此任务吗？删除后不可恢复。', '确认删除', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        cronTaskApi.deleteTask(row.id)
          .then(response => {
            console.log('删除任务响应:', response);
            // 处理多种可能的响应格式
            if (
              (response.code === 200) || // 直接返回 {code: 200, data: {...}}
              (response.data && response.data.code === 200) || // 嵌套格式 {data: {code: 200, ...}}
              (response.status === 200) || // 旧格式 {status: 200, ...}
              (response.data && response.data.status === 200) // 嵌套旧格式
            ) {
              toast.success('删除成功');
              this.fetchData();
            } else {
              const errorMsg =
                response.msg ||
                response.message ||
                (response.data && (response.data.msg || response.data.message)) ||
                '删除失败';
              toast.error(errorMsg);
            }
          })
          .catch(error => {
            console.error('删除任务失败:', error);
            toast.error('删除任务失败');
          });
      }).catch(() => {
        toast.info('已取消删除');
      });
    },
    handleToggleStatus(row) {
      const action = row.status === 1 ? '禁用' : '启用';
      const actionApi = row.status === 1 ? cronTaskApi.disableTask : cronTaskApi.enableTask;

      confirmAction(`确定要${action}此任务吗？`, `确认${action}`, {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        actionApi(row.id)
          .then(response => {
            console.log(`${action}任务响应:`, response);
            // 处理多种可能的响应格式
            if (
              (response.code === 200) || // 直接返回 {code: 200, data: {...}}
              (response.data && response.data.code === 200) || // 嵌套格式 {data: {code: 200, ...}}
              (response.status === 200) || // 旧格式 {status: 200, ...}
              (response.data && response.data.status === 200) // 嵌套旧格式
            ) {
              toast.success(`${action}成功`);
              this.fetchData();
            } else {
              const errorMsg =
                response.msg ||
                response.message ||
                (response.data && (response.data.msg || response.data.message)) ||
                `${action}失败`;
              toast.error(errorMsg);
            }
          })
          .catch(error => {
            console.error(`${action}任务失败:`, error);
            toast.error(`${action}任务失败`);
          });
      }).catch(() => {
        toast.info(`已取消${action}`);
      });
    },
    handleRunNow(row) {
      confirmAction('确定要立即执行此任务吗？', '确认执行', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'info'
      }).then(() => {
        this.loading = true;
        this.currentTaskId = row.id;
        cronTaskApi.runTask(row.id)
          .then(response => {
            console.log('立即执行任务响应:', response);
            // 处理多种可能的响应格式
            if (
              (response.code === 200) || // 直接返回 {code: 200, data: {...}}
              (response.data && response.data.code === 200) || // 嵌套格式 {data: {code: 200, ...}}
              (response.status === 200) || // 旧格式 {status: 200, ...}
              (response.data && response.data.status === 200) // 嵌套旧格式
            ) {
              // 获取成功消息
              const successMsg =
                response.msg ||
                (response.data && response.data.msg) ||
                '任务已开始运行';

              toast.success(successMsg);

              // 检查是否有日志ID
              let logId = null;

              // 尝试从不同格式的响应中获取日志ID
              if (response.data && response.data.log_id) {
                // 新格式: {code: 200, data: {log_id: 123}, msg: "success"}
                logId = response.data.log_id;
              } else if (response.data && response.data.data && response.data.data.log_id) {
                // 嵌套格式: {data: {code: 200, data: {log_id: 123}, msg: "success"}}
                logId = response.data.data.log_id;
              }

              if (logId) {
                // 如果有日志ID，跳转到任务执行结果页面
                this.$router.push({
                  path: `/cron/execution/${logId}`,
                  query: { from: 'tasks' }
                });
              } else {
                // 如果没有日志ID，使用旧的处理方式
                // 处理不同格式的响应数据
                if (response.data && response.data.data) {
                  // 如果有详细的执行结果数据，显示结果对话框
                  this.taskResult = response.data.data;
                  this.dialogVisible = true;
                } else if (response.data && typeof response.data !== 'object') {
                  // 如果 data 不是对象，可能是简单的文本结果
                  this.taskResult = { output: response.data };
                  this.dialogVisible = true;
                } else if (response.code === 200 && response.data === null) {
                  // 如果是异步任务，不显示结果对话框，只显示成功消息
                  // 已经在上面显示了成功消息，这里不需要额外操作

                  // 可选：将任务添加到待查看列表，并提示用户查看日志
                  confirmAction('任务已开始异步执行，是否查看任务日志？', '任务执行中', {
                    confirmButtonText: '查看日志',
                    cancelButtonText: '稍后再看',
                    type: 'success',
                    center: true
                  }).then(() => {
                    this.viewTaskLogs(row.id);
                  }).catch(() => {});
                } else {
                  // 其他情况，尝试显示结果
                  this.taskResult = response.data || { message: successMsg };
                  this.dialogVisible = true;
                }
              }
            } else {
              const errorMsg =
                response.msg ||
                response.message ||
                (response.data && (response.data.msg || response.data.message)) ||
                '任务执行失败';
              toast.error(errorMsg);
            }
          })
          .catch(error => {
            console.error('执行任务失败:', error);
            toast.error('执行任务失败');
          })
          .finally(() => {
            this.loading = false;
          });
      }).catch(() => {
        toast.info('已取消执行');
      });
    },
    viewTaskLogs(taskId) {
      this.$router.push({
        path: '/cron/logs',
        query: { task_id: taskId }
      });
    },
    viewTaskStats(taskId) {
      this.statsDialogVisible = true;
      this.statsLoading = true;
      this.currentTaskId = taskId;

      // 获取任务统计数据
      cronTaskApi.getTaskStats(taskId)
        .then(response => {
          console.log('获取任务统计数据响应:', response);

          // 处理多种可能的响应格式
          if (
            (response.code === 200) || // 直接返回 {code: 200, data: {...}}
            (response.data && response.data.code === 200) || // 嵌套格式 {data: {code: 200, ...}}
            (response.status === 200) || // 旧格式 {status: 200, ...}
            (response.data && response.data.status === 200) // 嵌套旧格式
          ) {
            // 处理不同格式的响应数据
            if (response.data && response.code === 200) {
              // 直接返回 {code: 200, data: {...}}
              this.taskStats = this.formatTaskStats(response.data);
            } else if (response.data && response.data.code === 200) {
              // 嵌套格式 {data: {code: 200, data: {...}}}
              this.taskStats = this.formatTaskStats(response.data.data);
            } else if (response.data) {
              // 其他格式
              this.taskStats = this.formatTaskStats(response.data);
            }

            console.log('处理后的任务统计数据:', this.taskStats);

            // 获取执行状态图表数据
            cronTaskApi.getTaskChart(taskId, { days: 30 })
              .then(chartResponse => {
                console.log('获取任务图表数据响应:', chartResponse);
                // 处理多种可能的响应格式
                if (
                  (chartResponse.code === 200) || // 直接返回 {code: 200, data: {...}}
                  (chartResponse.data && chartResponse.data.code === 200) // 嵌套格式 {data: {code: 200, ...}}
                ) {
                  let chartData;
                  if (chartResponse.code === 200) {
                    chartData = chartResponse.data;
                  } else {
                    chartData = chartResponse.data.data;
                  }

                  this.$nextTick(() => {
                    this.initExecutionChart(chartData);
                  });
                }
              });

            // 获取执行时长图表数据
            cronTaskApi.getTaskDurationChart(taskId, { days: 30 })
              .then(durationResponse => {
                console.log('获取任务时长图表数据响应:', durationResponse);
                // 处理多种可能的响应格式
                if (
                  (durationResponse.code === 200) || // 直接返回 {code: 200, data: {...}}
                  (durationResponse.data && durationResponse.data.code === 200) // 嵌套格式 {data: {code: 200, ...}}
                ) {
                  let chartData;
                  if (durationResponse.code === 200) {
                    chartData = durationResponse.data;
                  } else {
                    chartData = durationResponse.data.data;
                  }

                  this.$nextTick(() => {
                    this.initDurationChart(chartData);
                  });
                }
              });
          } else {
            const errorMsg =
              response.msg ||
              response.message ||
              (response.data && (response.data.msg || response.data.message)) ||
              '获取任务统计失败';
            toast.error(errorMsg);
          }
        })
        .catch(error => {
          console.error('获取任务统计失败:', error);
          toast.error('获取任务统计失败');
        })
        .finally(() => {
          this.statsLoading = false;
        });
    },

    // 格式化任务统计数据，使其符合模板期望的格式
    formatTaskStats(data) {
      if (!data) return {};

      // 计算成功率
      let successRate = 0;
      if (data.total_count && data.total_count > 0) {
        successRate = Math.round((data.success_count / data.total_count) * 100);
      }

      // 格式化最近执行时间
      let lastRun = data.last_run_time || data.last_run || '';
      if (lastRun && lastRun.includes('T')) {
        // 将ISO格式转换为更友好的格式
        try {
          const date = new Date(lastRun);
          lastRun = date.toLocaleString();
        } catch (e) {
          console.warn('日期格式化失败:', e);
        }
      }

      // 处理平均耗时，将毫秒转换为更易读的格式
      let formattedDuration = 0;
      let durationUnit = 'ms'; // 默认单位为毫秒

      if (data.avg_duration) {
        const durationMs = parseFloat(data.avg_duration);

        if (durationMs >= 1000) {
          // 如果超过1秒，转换为秒
          formattedDuration = (durationMs / 1000).toFixed(2);
          durationUnit = 's';
        } else {
          // 保持毫秒单位，但四舍五入为整数
          formattedDuration = Math.round(durationMs);
          durationUnit = 'ms';
        }
      }

      return {
        success_rate: successRate,
        avg_duration: formattedDuration,
        duration_unit: durationUnit,
        total_runs: data.total_count || data.total_runs || 0,
        last_run: lastRun,
        success_count: data.success_count || 0,
        fail_count: data.fail_count || 0,
        last_status: data.last_status
      };
    },
    initExecutionChart(data) {
      const chartDom = document.getElementById('executionChart');
      if (!chartDom) return;

      this.executionChart = echarts.init(chartDom);

      const option = {
        title: {
          text: '任务执行成功/失败统计（近30天）',
          left: 'center'
        },
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'shadow'
          }
        },
        legend: {
          data: ['成功', '失败'],
          bottom: 10
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '15%',
          top: '15%',
          containLabel: true
        },
        xAxis: {
          type: 'category',
          data: data.dates || []
        },
        yAxis: {
          type: 'value'
        },
        series: [
          {
            name: '成功',
            type: 'bar',
            stack: 'total',
            itemStyle: {
              color: this.chartColor('--primary')
            },
            data: data.success || []
          },
          {
            name: '失败',
            type: 'bar',
            stack: 'total',
            itemStyle: {
              color: this.chartColor('--destructive')
            },
            data: data.failed || []
          }
        ]
      };

      this.executionChart.setOption(this.themedChartOption(option));
    },
    initDurationChart(data) {
      const chartDom = document.getElementById('durationChart');
      if (!chartDom) return;

      this.durationChart = echarts.init(chartDom);

      const option = {
        title: {
          text: '任务执行时长统计（近30天）',
          left: 'center'
        },
        tooltip: {
          trigger: 'axis'
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '10%',
          top: '15%',
          containLabel: true
        },
        xAxis: {
          type: 'category',
          data: data.dates || []
        },
        yAxis: {
          type: 'value',
          name: '执行时长(秒)'
        },
        series: [
          {
            data: data.durations || [],
            type: 'line',
            name: '执行时长',
            smooth: true,
            areaStyle: {},
            itemStyle: {
              color: getSystemPreferences().theme
            }
          }
        ]
      };

      this.durationChart.setOption(this.themedChartOption(option));
    },
    retryFetch() {
      this.fetchError = false;
      this.fetchGroups();

      // 先获取任务组，然后获取任务列表
      setTimeout(() => {
        this.fetchData();
      }, 200);
    },

    // 处理下拉菜单命令
    handleCommand(command, row) {
      switch (command) {
        case 'viewLogs':
          this.viewTaskLogs(row.id);
          break;
        case 'viewStats':
          this.viewTaskStats(row.id);
          break;
        case 'delete':
          this.handleDelete(row);
          break;
        default:
          break;
      }
    }
  },
  beforeUnmount() {
    if (this.executionChart) {
      this.executionChart.dispose();
    }
    if (this.durationChart) {
      this.durationChart.dispose();
    }
  }
};
</script>

<style scoped>
.app-container {
  width: 100%;
}

.box-card {
  margin-bottom: 0;
  border-radius: 4px;
  box-shadow: none;
}

.task-header,
.task-header-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.task-header {
  justify-content: space-between;
}

.task-header-title {
  flex: 0 0 auto;
  font-weight: 600;
}

.task-header-controls {
  min-width: 0;
  justify-content: flex-end;
}

.filter-grid { display: grid; grid-template-columns: 1fr .75fr 1.4fr auto; margin-bottom: 20px; }

/* 表格样式 */
.task-table {
  margin-bottom: 0;
  border-radius: 4px;
  overflow: hidden;
}

/* 表格行样式 */
.task-table :deep(.disabled-row) {
  background-color: var(--muted);
  color: var(--muted-foreground);
}

.task-table :deep(.success-row) {
  background-color: var(--muted);
}

.task-table :deep(.warning-row) {
  background-color: var(--muted);
}

/* 任务名称单元格 */
.task-name-cell {
  display: flex;
  flex-direction: column;
}

.task-name {
  display: flex;
  align-items: center;
  margin-bottom: 4px;
}

.task-name-text {
  font-weight: bold;
  margin-right: 5px;
}

.task-tag {
  margin-left: 5px;
}

.task-description {
  font-size: 12px;
  color: var(--muted-foreground);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 300px;
}

/* 目标单元格 */
.target-cell {
  display: flex;
  align-items: center;
}

.target-content {
  display: flex;
  align-items: center;
}

.target-icon {
  margin-right: 5px;
  font-size: 16px;
  color: var(--primary);
}

/* 依赖任务单元格 */
.dependencies-cell {
  display: flex;
  flex-direction: column;
}

.no-deps {
  color: var(--muted-foreground);
  font-size: 12px;
  font-style: italic;
}

.deps-list {
  display: flex;
  flex-wrap: wrap;
}

.dep-tag {
  margin-right: 5px;
  margin-bottom: 5px;
}

/* 超时/重试单元格 */
.timeout-retry-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.timeout-value, .retry-value {
  display: flex;
  align-items: center;
  margin: 2px 0;
}

.timeout-value i, .retry-value i {
  margin-right: 5px;
  color: var(--muted-foreground);
}

/* 下次执行单元格 */
.next-run-cell {
  display: flex;
  align-items: center;
}

.next-run-cell i {
  margin-right: 5px;
  color: var(--primary);
}

.next-run-time {
  color: var(--foreground);
}

.no-schedule {
  color: var(--muted-foreground);
  font-style: italic;
}

/* 上次执行单元格 */
.last-run-cell {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.last-run-time {
  display: flex;
  align-items: center;
}

.last-run-time i {
  margin-right: 5px;
  color: var(--primary);
}

.time-text {
  color: var(--foreground);
}

.no-run {
  color: var(--muted-foreground);
  font-style: italic;
}

.last-status {
  margin-top: 3px;
}

/* 统计对话框样式 */
.task-result {
  padding: 10px;
}
.task-result p {
  margin: 10px 0;
  line-height: 1.5;
}
.result-output {
  margin-top: 15px;
}
.result-output pre {
  background-color: var(--muted);
  padding: 10px;
  border-radius: 4px;
  max-height: 300px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-all;
  font-family: Consolas, Monaco, 'Andale Mono', monospace;
  font-size: 13px;
  color: var(--foreground);
}
.stats-overview {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  margin-bottom: 16px;
}
.unit-note {
  font-size: 12px;
  font-weight: normal;
  color: var(--muted-foreground);
  display: block;
  margin-top: 5px;
}
.stats-detail {
  margin: 20px 0;
  padding: 15px;
  background-color: var(--muted);
  border-radius: 4px;
}
.detail-item {
  margin-bottom: 10px;
  display: flex;
  align-items: center;
}
.detail-label {
  font-size: 14px;
  color: var(--muted-foreground);
  margin-right: 10px;
  min-width: 80px;
}
.detail-value {
  font-size: 16px;
  font-weight: bold;
}
.detail-value.success {
  color: var(--primary);
}
.detail-value.fail {
  color: var(--destructive);
}
.stats-charts {
  margin-top: 20px;
}

.pagination-container {
  margin-top: 14px;
}

@media (max-width: 768px) {
  .task-header,
  .task-header-controls {
    width: 100%;
    align-items: stretch;
    flex-direction: column;
  }

  .task-header-controls :deep(.automation-room-select) {
    width: 100%;
    margin: 0;
  }

  .task-header-actions {
    display: flex;
    width: 100%;
  }

  .task-header-actions > * {
    flex: 1 1 50%;
    width: auto;
    margin-left: 0 !important;
  }

  .filter-grid { grid-template-columns: 1fr; }

  .pagination-container {
    justify-content: center;
  }

  .stats-overview {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
