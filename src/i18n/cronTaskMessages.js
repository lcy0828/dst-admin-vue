import {
  normalizeSystemAutomationGroup,
  SYSTEM_AUTOMATION_GROUP_IDS
} from '../lib/systemDataIdentifiers.mjs'
import { formatSystemDateTime } from '../lib/dateTime.mjs'

const DEFAULT_CRON_TASK_LOCALE = 'zh-CN'

export const cronTaskMessages = Object.freeze({
  'zh-CN': {
    common: {
      actions: {
        addTask: '添加任务', logs: '执行日志', search: '搜索', reset: '重置', reload: '重新加载',
        run: '立即执行', enable: '启用任务', disable: '禁用任务', edit: '编辑任务', more: '更多操作',
        viewLogs: '查看日志', viewStats: '查看统计', delete: '删除任务', close: '关闭', confirm: '确定',
        cancel: '取消', refresh: '刷新', back: '返回', backToList: '返回列表', backToTasks: '返回任务列表',
        save: '保存', refreshData: '刷新数据', refreshResult: '刷新结果'
      },
      values: {
        all: '全部', unknown: '未知', unknownTask: '未知任务', none: '无', noGroup: '无分组',
        noDependencies: '无依赖', unlimited: '无限', notScheduled: '未计划', notExecuted: '未执行',
        enabled: '启用', disabled: '禁用', success: '成功', failed: '失败', new: 'NEW'
      },
      taskTypes: {
        function: '受控函数', shell: 'Shell 命令', tmux_command: '内建命令', tmux_raw_command: 'TMUX 原始命令'
      },
      statuses: {
        queued: '等待执行', running: '执行中', success: '成功', succeeded: '成功', failed: '失败',
        canceled: '已取消', skipped: '已跳过'
      },
      triggers: {
        schedule: '定时触发', manual: '手动触发', event: '事件触发', dependency: '依赖触发', api: 'API 触发', unknown: '未知触发'
      },
      units: {
        milliseconds: '{value} 毫秒', seconds: '{value} 秒', minutesSeconds: '{minutes} 分 {seconds} 秒',
        approximateSeconds: '约 {value} 秒', secondsAxis: '执行时长（秒）'
      },
      groups: {
        ungrouped: '未分组', playerManagement: '玩家管理'
      },
      feedback: {
        errorWithDetail: '{message}：{detail}', operationFailed: '操作失败'
      }
    },
    actions: {
      roomStart: { name: '启动分片', description: '启动选中的分片；未选择时启动全部分片' },
      roomStop: { name: '停止分片', description: '停止选中的分片；未选择时停止全部分片' },
      roomRestart: { name: '重启分片', description: '重启选中的分片；未选择时重启全部分片' },
      backupCreate: { name: '创建快照', description: '创建一致性房间快照' },
      backupPrune: { name: '清理快照', description: '按保留数量清理旧快照' },
      commandExecute: { name: '执行内建命令', description: '执行低或中风险参数化命令' },
      notificationSend: { name: '发送游戏通知', description: '向房间内当前运行中的所有分片发送游戏内消息' },
      playerRefresh: { name: '刷新玩家', description: '采样分片玩家状态' },
      structuredLogRefresh: { name: '刷新结构化日志', description: '刷新分片结构化日志快照' },
      worldStateRefresh: { name: '刷新世界状态', description: '采样分片世界状态' }
    },
    list: {
      title: '定时任务管理', subtitle: '配置并监控服务器自动化任务。',
      cardTitle: '任务列表', cardDescription: '按类型、状态和关键词筛选当前房间任务。',
      filters: {
        type: '任务类型', selectType: '选择类型', status: '状态', selectStatus: '选择状态',
        keyword: '关键词', keywordPlaceholder: '搜索任务名称或描述'
      },
      loadFailedTitle: '任务列表加载失败', loadFailedDescription: '无法读取当前房间的任务数据，请检查连接后重试。',
      emptyTitle: '暂无定时任务', emptyDescription: '当前筛选条件下没有任务。',
      columns: {
        id: 'ID', name: '任务名称', cron: 'Cron 表达式', type: '类型', target: '目标', dependencies: '依赖任务',
        timeoutRetry: '超时/重试', lastRun: '上次执行', status: '状态', actions: '操作'
      },
      pagination: { perPage: '每页', perPageAria: '每页显示条数', total: '共 {count} 条' },
      actionAria: {
        run: '立即执行任务 {name}', enable: '启用任务 {name}', disable: '禁用任务 {name}',
        edit: '编辑任务 {name}', more: '打开任务 {name} 的更多操作'
      },
      target: { server: '服务器：{value}', command: '命令：{value}', content: '内容：{value}', parameters: '参数：{value}', separator: '，' },
      result: {
        title: '执行结果', description: '任务本次手动执行的返回信息', status: '执行状态：',
        time: '执行时间：', duration: '执行耗时：', message: '执行消息', output: '输出结果：',
        asyncTitle: '任务已开始异步执行', asyncDescription: '任务正在后台执行，请查看任务日志获取执行结果。'
      },
      stats: {
        title: '任务统计', description: '任务历史执行表现和耗时趋势', successRate: '成功率',
        historyResults: '历史执行结果', averageDuration: '平均耗时', completedRuns: '已完成执行',
        totalRuns: '总执行次数', allHistory: '全部历史记录', latestRun: '最近执行', lastSchedule: '最后一次调度',
        successCount: '成功次数：', failureCount: '失败次数：', latestStatus: '最近状态：'
      },
      charts: {
        executionTitle: '任务执行成功/失败统计（近 30 天）', durationTitle: '任务执行时长统计（近 30 天）', durationSeries: '执行时长'
      },
      confirm: {
        deleteMessage: '确定要删除此任务吗？删除后不可恢复。', deleteTitle: '确认删除',
        toggleMessage: '确定要{action}此任务吗？', toggleTitle: '确认{action}',
        enableMessage: '确定要启用此任务吗？', enableTitle: '确认启用',
        disableMessage: '确定要禁用此任务吗？', disableTitle: '确认禁用',
        runMessage: '确定要立即执行此任务吗？', runTitle: '确认执行',
        asyncMessage: '任务已开始异步执行，是否查看任务日志？', asyncTitle: '任务执行中',
        viewLogs: '查看日志', later: '稍后再看'
      },
      feedback: {
        taskListInvalid: '获取任务列表失败：无法识别的响应格式', groupListInvalid: '获取任务组列表失败：无法识别的响应格式',
        taskListFailed: '获取任务列表失败', groupListFailed: '获取任务组列表失败', deleted: '删除成功',
        deleteFailed: '删除任务失败', deleteCanceled: '已取消删除', toggleSucceeded: '{action}成功',
        toggleFailed: '{action}任务失败', toggleCanceled: '已取消{action}', runStarted: '任务已开始运行',
        enabled: '任务已启用', disabled: '任务已禁用', enableFailed: '启用任务失败', disableFailed: '禁用任务失败',
        enableCanceled: '已取消启用', disableCanceled: '已取消禁用',
        runFailed: '执行任务失败', runCanceled: '已取消执行', statsFailed: '获取任务统计失败'
      }
    },
    form: {
      addTitle: '添加任务', editTitle: '编辑任务', subtitle: '配置调度、执行目标和失败重试策略。',
      cardTitle: '任务配置', cardDescription: '填写必填信息后保存，调度规则将立即生效。',
      tabs: { basic: '基本信息', advanced: '高级选项' },
      fields: {
        name: '任务名称', namePlaceholder: '请输入任务名称', description: '任务描述', descriptionPlaceholder: '请输入任务描述',
        group: '所属任务组', selectGroup: '请选择任务组', cron: 'Cron 表达式', cronPlaceholder: '例如：0 0 * * * *',
        cronDescription: '格式：秒 分 时 日 月 星期 [年]。示例：每 5 分钟执行一次为 0 */5 * * * *',
        taskType: '任务类型', function: '选择函数', selectFunction: '请选择函数', tmux: 'TMUX 命令',
        server: '选择服务器', selectServer: '请选择服务器', command: '选择命令', selectCommand: '请选择命令',
        unavailableForSchedule: '（不可用于定时任务）', commandContent: '命令内容', commandParameters: '命令参数',
        select: '请选择', parameterValue: '参数值', example: '示例：{value}', functionParameters: '函数参数',
        timeout: '超时设置（秒）', timeoutDescription: '后端允许 5–3600 秒，默认 300 秒。',
        retries: '重试次数', retriesDescription: '任务失败后自动重试的次数，0 表示不重试。',
        retryInterval: '重试间隔（秒）', dependencies: '依赖任务', dependenciesDescription: '当前任务会在所选依赖任务全部成功后执行，请避免循环依赖。',
        enabled: '启用任务', enabledDescription: '禁用后调度器不会自动执行此任务。'
      },
      validation: {
        nameRequired: '请输入任务名称', nameLength: '长度应在 2 到 50 个字符之间',
        descriptionLength: '描述不能超过 200 个字符', cronRequired: '请输入 Cron 表达式',
        targetRequired: '请选择执行目标', tmuxTargetRequired: '请选择服务器和 TMUX 命令',
        commandParametersRequired: '请填写全部必填命令参数', timeoutRange: '超时必须在 5–3600 秒之间',
        incomplete: '请完善表单信息'
      },
      feedback: {
        functionsInvalid: '获取函数列表失败：响应格式不符合预期', functionsFailed: '获取函数列表失败',
        groupsFailed: '获取任务组列表失败', tasksFailed: '获取可用任务列表失败',
        detailInvalid: '获取任务详情失败：无效的响应格式', detailFailed: '获取任务详情失败',
        sessionsFailed: '获取 TMUX 会话列表失败', commandsFailed: '获取 TMUX 命令列表失败',
        added: '添加成功', updated: '更新成功', addFailed: '添加任务失败', updateFailed: '更新任务失败'
      }
    },
    execution: {
      title: '任务执行结果', subtitle: '执行完成前每 5 秒自动刷新。', cardTitle: '执行状态',
      cardDescription: '任务运行结果与完整输出。', basicInfo: '基本信息',
      fields: { logId: '日志 ID', taskId: '任务 ID', taskName: '任务名称', status: '执行状态', start: '开始时间', end: '结束时间', duration: '执行耗时', trigger: '触发方式' },
      output: '执行输出', noOutput: '无输出', error: '错误信息', notFoundTitle: '未找到日志详情',
      notFoundDescription: '日志可能已被清理或链接无效。',
      statusTitles: { success: '任务执行成功', failed: '任务{status}', running: '任务执行中', queued: '任务等待执行' },
      descriptions: { success: '任务已成功执行，耗时 {duration}', failed: '任务未成功完成，请查看错误信息', pending: '任务已进入执行队列，页面会自动刷新状态。' },
      feedback: { missingId: '缺少日志 ID 参数', invalidResponse: '获取日志详情失败：响应格式不符合预期', loadFailed: '获取日志详情失败' }
    },
    charts: {
      title: '任务统计图表', subtitle: '分析执行次数、成功率和耗时趋势。', rangeTitle: '统计范围',
      rangeDescription: '选择日期、任务组和具体任务。', fields: { range: '时间范围', group: '任务组', selectGroup: '选择任务组', task: '任务', selectTask: '选择任务' },
      ranges: { days7: '最近 7 天', days30: '最近 30 天', days90: '最近 90 天', days180: '最近 180 天' },
      loadFailedTitle: '统计数据加载失败', metrics: {
        totalTasks: '总任务数', currentRange: '当前统计范围', totalExecutions: '总执行次数', cumulativeRuns: '累计调度记录',
        successRate: '成功率', successShare: '成功执行占比', averageDuration: '平均执行时长', allCompleted: '全部已完成任务'
      },
      cards: {
        overview: '执行概览', overviewDescription: '成功与失败次数分布', duration: '耗时趋势', durationDescription: '统计范围内的执行耗时变化',
        group: '任务组执行统计', groupDescription: '组内任务执行情况对比', task: '任务执行统计', taskDescription: '所选任务的成功与失败情况',
        taskDuration: '任务耗时统计', taskDurationDescription: '所选任务的执行耗时变化'
      },
      graph: {
        overviewTitle: '任务执行成功/失败统计', averageDurationTitle: '任务平均执行时长统计',
        groupTitle: '任务组内各任务执行情况', taskTitle: '任务执行成功/失败情况',
        taskDurationTitle: '任务执行时长统计', success: '成功', failed: '失败', executions: '执行次数',
        averageDuration: '平均执行时长', duration: '执行时长'
      },
      feedback: {
        groupsFailed: '获取任务组列表失败', tasksFailed: '获取任务列表失败', overviewFailed: '获取概览数据失败',
        groupChartFailed: '获取任务组图表失败', taskChartFailed: '获取任务执行图表失败', durationChartFailed: '获取任务执行时长图表失败'
      }
    }
  },
  'en-US': {
    common: {
      actions: {
        addTask: 'Add task', logs: 'Run logs', search: 'Search', reset: 'Reset', reload: 'Reload',
        run: 'Run now', enable: 'Enable task', disable: 'Disable task', edit: 'Edit task', more: 'More actions',
        viewLogs: 'View logs', viewStats: 'View statistics', delete: 'Delete task', close: 'Close', confirm: 'Confirm',
        cancel: 'Cancel', refresh: 'Refresh', back: 'Back', backToList: 'Back to list', backToTasks: 'Back to task list',
        save: 'Save', refreshData: 'Refresh data', refreshResult: 'Refresh result'
      },
      values: {
        all: 'All', unknown: 'Unknown', unknownTask: 'Unknown task', none: 'None', noGroup: 'No group',
        noDependencies: 'No dependencies', unlimited: 'Unlimited', notScheduled: 'Not scheduled', notExecuted: 'Not run',
        enabled: 'Enabled', disabled: 'Disabled', success: 'Success', failed: 'Failed', new: 'NEW'
      },
      taskTypes: {
        function: 'Controlled function', shell: 'Shell command', tmux_command: 'Built-in command', tmux_raw_command: 'Raw TMUX command'
      },
      statuses: {
        queued: 'Queued', running: 'Running', success: 'Success', succeeded: 'Success', failed: 'Failed',
        canceled: 'Canceled', skipped: 'Skipped'
      },
      triggers: {
        schedule: 'Scheduled', manual: 'Manual', event: 'Event', dependency: 'Dependency', api: 'API', unknown: 'Unknown trigger'
      },
      units: {
        milliseconds: '{value} ms', seconds: '{value} s', minutesSeconds: '{minutes}m {seconds}s',
        approximateSeconds: 'About {value} s', secondsAxis: 'Duration (seconds)'
      },
      groups: {
        ungrouped: 'Ungrouped', playerManagement: 'Player management'
      },
      feedback: {
        errorWithDetail: '{message}: {detail}', operationFailed: 'Operation failed'
      }
    },
    actions: {
      roomStart: { name: 'Start shards', description: 'Start selected shards, or every shard when none are selected' },
      roomStop: { name: 'Stop shards', description: 'Stop selected shards, or every shard when none are selected' },
      roomRestart: { name: 'Restart shards', description: 'Restart selected shards, or every shard when none are selected' },
      backupCreate: { name: 'Create snapshot', description: 'Create a consistent room snapshot' },
      backupPrune: { name: 'Prune snapshots', description: 'Remove old snapshots according to the retention count' },
      commandExecute: { name: 'Run built-in command', description: 'Run a parameterized low- or medium-risk command' },
      notificationSend: { name: 'Send game notification', description: 'Send an in-game message to every running Shard in the room' },
      playerRefresh: { name: 'Refresh players', description: 'Sample player state from the shards' },
      structuredLogRefresh: { name: 'Refresh structured logs', description: 'Refresh the structured log snapshot for each shard' },
      worldStateRefresh: { name: 'Refresh world state', description: 'Sample world state from the shards' }
    },
    list: {
      title: 'Scheduled tasks', subtitle: 'Configure and monitor server automation tasks.',
      cardTitle: 'Task list', cardDescription: 'Filter tasks in the current room by type, status, and keyword.',
      filters: {
        type: 'Task type', selectType: 'Select a type', status: 'Status', selectStatus: 'Select a status',
        keyword: 'Keyword', keywordPlaceholder: 'Search task names or descriptions'
      },
      loadFailedTitle: 'Failed to load tasks', loadFailedDescription: 'The tasks for the current room could not be loaded. Check the connection and try again.',
      emptyTitle: 'No scheduled tasks', emptyDescription: 'No tasks match the current filters.',
      columns: {
        id: 'ID', name: 'Task name', cron: 'Cron expression', type: 'Type', target: 'Target', dependencies: 'Dependencies',
        timeoutRetry: 'Timeout / retries', lastRun: 'Last run', status: 'Status', actions: 'Actions'
      },
      pagination: { perPage: 'Per page', perPageAria: 'Rows per page', total: '{count} total' },
      actionAria: {
        run: 'Run task {name}', enable: 'Enable task {name}', disable: 'Disable task {name}',
        edit: 'Edit task {name}', more: 'Open more actions for task {name}'
      },
      target: { server: 'Server: {value}', command: 'Command: {value}', content: 'Content: {value}', parameters: 'Parameters: {value}', separator: ', ' },
      result: {
        title: 'Run result', description: 'Response from this manual task run', status: 'Status:',
        time: 'Executed at:', duration: 'Duration:', message: 'Run message', output: 'Output:',
        asyncTitle: 'Task started asynchronously', asyncDescription: 'The task is running in the background. Open task logs to inspect its result.'
      },
      stats: {
        title: 'Task statistics', description: 'Historical task results and duration trends', successRate: 'Success rate',
        historyResults: 'Historical run results', averageDuration: 'Average duration', completedRuns: 'Completed runs',
        totalRuns: 'Total runs', allHistory: 'All historical runs', latestRun: 'Latest run', lastSchedule: 'Most recent schedule',
        successCount: 'Successful runs:', failureCount: 'Failed runs:', latestStatus: 'Latest status:'
      },
      charts: {
        executionTitle: 'Task successes and failures (last 30 days)', durationTitle: 'Task duration (last 30 days)', durationSeries: 'Duration'
      },
      confirm: {
        deleteMessage: 'Delete this task? This action cannot be undone.', deleteTitle: 'Delete task',
        toggleMessage: '{action} this task?', toggleTitle: 'Confirm {action}',
        enableMessage: 'Enable this task?', enableTitle: 'Enable task',
        disableMessage: 'Disable this task?', disableTitle: 'Disable task',
        runMessage: 'Run this task now?', runTitle: 'Run task',
        asyncMessage: 'The task started asynchronously. Open its task logs?', asyncTitle: 'Task running',
        viewLogs: 'View logs', later: 'Later'
      },
      feedback: {
        taskListInvalid: 'Unable to load tasks: unrecognized response format', groupListInvalid: 'Unable to load task groups: unrecognized response format',
        taskListFailed: 'Unable to load tasks', groupListFailed: 'Unable to load task groups', deleted: 'Task deleted',
        deleteFailed: 'Failed to delete task', deleteCanceled: 'Task deletion canceled', toggleSucceeded: 'Task {action} succeeded',
        toggleFailed: 'Failed to {action} task', toggleCanceled: 'Task {action} canceled', runStarted: 'Task started',
        enabled: 'Task enabled', disabled: 'Task disabled', enableFailed: 'Failed to enable task', disableFailed: 'Failed to disable task',
        enableCanceled: 'Task enable canceled', disableCanceled: 'Task disable canceled',
        runFailed: 'Failed to run task', runCanceled: 'Task run canceled', statsFailed: 'Unable to load task statistics'
      }
    },
    form: {
      addTitle: 'Add task', editTitle: 'Edit task', subtitle: 'Configure the schedule, execution target, and retry policy.',
      cardTitle: 'Task configuration', cardDescription: 'Save the required information to apply the schedule immediately.',
      tabs: { basic: 'Basic information', advanced: 'Advanced options' },
      fields: {
        name: 'Task name', namePlaceholder: 'Enter a task name', description: 'Task description', descriptionPlaceholder: 'Enter a task description',
        group: 'Task group', selectGroup: 'Select a task group', cron: 'Cron expression', cronPlaceholder: 'Example: 0 0 * * * *',
        cronDescription: 'Format: second minute hour day month weekday [year]. Example: every 5 minutes is 0 */5 * * * *',
        taskType: 'Task type', function: 'Select function', selectFunction: 'Select a function', tmux: 'TMUX command',
        server: 'Select server', selectServer: 'Select a server', command: 'Select command', selectCommand: 'Select a command',
        unavailableForSchedule: ' (unavailable for scheduled tasks)', commandContent: 'Command content', commandParameters: 'Command parameters',
        select: 'Select', parameterValue: 'Parameter value', example: 'Example: {value}', functionParameters: 'Function parameters',
        timeout: 'Timeout (seconds)', timeoutDescription: 'The backend accepts 5–3600 seconds. The default is 300 seconds.',
        retries: 'Retries', retriesDescription: 'Automatic retries after failure. Set to 0 to disable retries.',
        retryInterval: 'Retry interval (seconds)', dependencies: 'Dependencies', dependenciesDescription: 'This task runs after every selected dependency succeeds. Avoid circular dependencies.',
        enabled: 'Enable task', enabledDescription: 'Disabled tasks are not run automatically by the scheduler.'
      },
      validation: {
        nameRequired: 'Enter a task name', nameLength: 'Use 2 to 50 characters',
        descriptionLength: 'The description cannot exceed 200 characters', cronRequired: 'Enter a Cron expression',
        targetRequired: 'Select an execution target', tmuxTargetRequired: 'Select a server and TMUX command',
        commandParametersRequired: 'Complete every required command parameter', timeoutRange: 'The timeout must be between 5 and 3600 seconds',
        incomplete: 'Complete the form before saving'
      },
      feedback: {
        functionsInvalid: 'Unable to load functions: unexpected response format', functionsFailed: 'Unable to load functions',
        groupsFailed: 'Unable to load task groups', tasksFailed: 'Unable to load available tasks',
        detailInvalid: 'Unable to load task details: invalid response format', detailFailed: 'Unable to load task details',
        sessionsFailed: 'Unable to load TMUX sessions', commandsFailed: 'Unable to load TMUX commands',
        added: 'Task added', updated: 'Task updated', addFailed: 'Failed to add task', updateFailed: 'Failed to update task'
      }
    },
    execution: {
      title: 'Task run result', subtitle: 'Refreshes every 5 seconds until the run completes.', cardTitle: 'Run status',
      cardDescription: 'Task result and complete output.', basicInfo: 'Basic information',
      fields: { logId: 'Log ID', taskId: 'Task ID', taskName: 'Task name', status: 'Run status', start: 'Started at', end: 'Ended at', duration: 'Duration', trigger: 'Trigger' },
      output: 'Run output', noOutput: 'No output', error: 'Error details', notFoundTitle: 'Run log not found',
      notFoundDescription: 'The log may have been removed or the link is invalid.',
      statusTitles: { success: 'Task completed successfully', failed: 'Task {status}', running: 'Task running', queued: 'Task queued' },
      descriptions: { success: 'The task completed successfully in {duration}', failed: 'The task did not complete successfully. Inspect the error details.', pending: 'The task is queued. This page will refresh automatically.' },
      feedback: { missingId: 'Missing log ID', invalidResponse: 'Unable to load run details: unexpected response format', loadFailed: 'Unable to load run details' }
    },
    charts: {
      title: 'Task statistics', subtitle: 'Analyze execution volume, success rate, and duration trends.', rangeTitle: 'Statistics scope',
      rangeDescription: 'Select a date range, task group, and task.', fields: { range: 'Date range', group: 'Task group', selectGroup: 'Select a task group', task: 'Task', selectTask: 'Select a task' },
      ranges: { days7: 'Last 7 days', days30: 'Last 30 days', days90: 'Last 90 days', days180: 'Last 180 days' },
      loadFailedTitle: 'Failed to load statistics', metrics: {
        totalTasks: 'Total tasks', currentRange: 'Current range', totalExecutions: 'Total runs', cumulativeRuns: 'Scheduled run records',
        successRate: 'Success rate', successShare: 'Successful run share', averageDuration: 'Average duration', allCompleted: 'All completed runs'
      },
      cards: {
        overview: 'Run overview', overviewDescription: 'Successful and failed run distribution', duration: 'Duration trend', durationDescription: 'Run duration within the selected range',
        group: 'Task group statistics', groupDescription: 'Compare runs for tasks in this group', task: 'Task run statistics', taskDescription: 'Successes and failures for the selected task',
        taskDuration: 'Task duration statistics', taskDurationDescription: 'Run duration for the selected task'
      },
      graph: {
        overviewTitle: 'Task successes and failures', averageDurationTitle: 'Average task duration',
        groupTitle: 'Runs by task in this group', taskTitle: 'Task successes and failures',
        taskDurationTitle: 'Task duration', success: 'Success', failed: 'Failed', executions: 'Runs',
        averageDuration: 'Average duration', duration: 'Duration'
      },
      feedback: {
        groupsFailed: 'Unable to load task groups', tasksFailed: 'Unable to load tasks', overviewFailed: 'Unable to load overview data',
        groupChartFailed: 'Unable to load task group chart', taskChartFailed: 'Unable to load task run chart', durationChartFailed: 'Unable to load task duration chart'
      }
    }
  }
})

const TASK_TYPE_KEYS = Object.freeze({
  function: 'function', shell: 'shell', tmux_command: 'tmux_command', tmux_raw_command: 'tmux_raw_command'
})

const STATUS_KEYS = Object.freeze({
  queued: 'queued', pending: 'queued', running: 'running', success: 'success', succeeded: 'succeeded',
  completed: 'succeeded', failed: 'failed', canceled: 'canceled', skipped: 'skipped'
})

const TRIGGER_KEYS = Object.freeze({
  0: 'schedule', 1: 'manual', 2: 'event', 3: 'dependency', 4: 'api',
  schedule: 'schedule', scheduled: 'schedule', manual: 'manual', event: 'event', dependency: 'dependency', api: 'api'
})

const ACTION_KEYS = Object.freeze({
  'room.start': 'roomStart', 'room.stop': 'roomStop', 'room.restart': 'roomRestart',
  'backup.create': 'backupCreate', 'backup.prune': 'backupPrune', 'command.execute': 'commandExecute',
  'notification.send': 'notificationSend',
  'player.refresh': 'playerRefresh', 'log.structured.refresh': 'structuredLogRefresh', 'world.state.refresh': 'worldStateRefresh'
})

function messageAt(locale, key) {
  return String(key || '').split('.').reduce((value, segment) => value?.[segment], cronTaskMessages[locale])
}

export function normalizeCronTaskLocale(locale) {
  return Object.hasOwn(cronTaskMessages, locale) ? locale : DEFAULT_CRON_TASK_LOCALE
}

export function cronTaskText(key, locale = DEFAULT_CRON_TASK_LOCALE, parameters = {}) {
  const normalized = normalizeCronTaskLocale(locale)
  const value = messageAt(normalized, key)
  if (typeof value !== 'string') return key
  return Object.entries(parameters).reduce(
    (message, [name, replacement]) => message.replaceAll(`{${name}}`, String(replacement)),
    value
  )
}

export function cronTaskTypeLabel(type, locale) {
  const key = TASK_TYPE_KEYS[type]
  return key ? cronTaskText(`common.taskTypes.${key}`, locale) : type || cronTaskText('common.values.unknown', locale)
}

export function cronTaskStatusLabel(status, locale) {
  const key = STATUS_KEYS[status]
  return key ? cronTaskText(`common.statuses.${key}`, locale) : status || cronTaskText('common.values.unknown', locale)
}

export function cronTaskTriggerLabel(trigger, locale) {
  const key = TRIGGER_KEYS[trigger]
  return key ? cronTaskText(`common.triggers.${key}`, locale) : trigger || cronTaskText('common.triggers.unknown', locale)
}

export function cronTaskActionName(actionId, locale, fallback = '') {
  const key = ACTION_KEYS[actionId]
  return key ? cronTaskText(`actions.${key}.name`, locale) : fallback || actionId || ''
}

export function cronTaskActionDescription(actionId, locale, fallback = '') {
  const key = ACTION_KEYS[actionId]
  return key ? cronTaskText(`actions.${key}.description`, locale) : fallback || ''
}

export function cronTaskGroupLabel(groupName, locale) {
  const normalized = normalizeSystemAutomationGroup(groupName)
  if (normalized === SYSTEM_AUTOMATION_GROUP_IDS.UNGROUPED) return cronTaskText('common.groups.ungrouped', locale)
  if (normalized === SYSTEM_AUTOMATION_GROUP_IDS.PLAYER_MANAGEMENT) return cronTaskText('common.groups.playerManagement', locale)
  return groupName || cronTaskText('common.values.unknown', locale)
}

export function createCronTaskFailure(key, error) {
  const detail = typeof error === 'string' ? error : error?.message
  return { key, detail: String(detail || '').trim() }
}

export function cronTaskFailureText(failure, locale) {
  if (!failure) return ''
  const message = cronTaskText(failure.key, locale)
  return failure.detail
    ? cronTaskText('common.feedback.errorWithDetail', locale, { message, detail: failure.detail })
    : message
}

export function formatCronTaskDate(value, locale) {
  if (!value || value === '0001-01-01T00:00:00Z') return cronTaskText('common.values.notScheduled', locale)
  return formatSystemDateTime(value, {
    locale: normalizeCronTaskLocale(locale),
    fallback: String(value),
    year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: false
  })
}

export function formatCronTaskMilliseconds(value, locale) {
  const duration = Number(value)
  if (!Number.isFinite(duration) || duration < 0) return '-'
  if (duration < 1000) {
    return cronTaskText('common.units.milliseconds', locale, { value: Math.round(duration).toLocaleString(normalizeCronTaskLocale(locale)) })
  }
  const seconds = duration / 1000
  if (seconds < 60) {
    return cronTaskText('common.units.seconds', locale, { value: seconds.toLocaleString(normalizeCronTaskLocale(locale), { maximumFractionDigits: 2 }) })
  }
  return cronTaskText('common.units.minutesSeconds', locale, {
    minutes: Math.floor(seconds / 60).toLocaleString(normalizeCronTaskLocale(locale)),
    seconds: Math.round(seconds % 60).toLocaleString(normalizeCronTaskLocale(locale))
  })
}

export function formatCronTaskFlexibleDuration(value, locale) {
  if (value === undefined || value === null) return '-'
  const duration = Number(value)
  if (!Number.isFinite(duration)) return String(value)
  if (duration > 1000 || duration < 0.01) return formatCronTaskMilliseconds(duration, locale)
  return cronTaskText('common.units.seconds', locale, {
    value: duration.toLocaleString(normalizeCronTaskLocale(locale), { maximumFractionDigits: 2 })
  })
}
