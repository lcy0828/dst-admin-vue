const RUN_STATUS_KEYS = Object.freeze({
  0: 'failed',
  1: 'success',
  success: 'success',
  succeeded: 'success',
  failed: 'failed',
  canceled: 'canceled',
  skipped: 'skipped',
  queued: 'queued',
  pending: 'queued',
  running: 'running'
})

const TRIGGER_KEYS = Object.freeze({
  0: 'scheduled',
  1: 'manual',
  2: 'event',
  3: 'dependency',
  4: 'api',
  scheduled: 'scheduled',
  manual: 'manual',
  event: 'event',
  dependency: 'dependency',
  api: 'api'
})

const TASK_TYPE_KEYS = Object.freeze({
  function: 'function',
  tmux_command: 'command'
})

export const cronLogMessages = {
  'zh-CN': {
    cronLogs: {
      common: {
        actions: { refresh: '刷新', back: '返回', retry: '重试' },
        values: { unknown: '未知', unknownTask: '未知任务', notAvailable: '--', noOutput: '无输出' },
        statuses: {
          success: '成功', failed: '失败', canceled: '已取消', skipped: '已跳过',
          queued: '排队中', running: '执行中'
        },
        triggers: { scheduled: '定时触发', manual: '手动触发', event: '事件触发', dependency: '依赖触发', api: 'API 触发' },
        taskTypes: { function: '受控函数', command: '内建命令' },
        executors: { system: '系统' },
        units: { milliseconds: '{value} 毫秒', seconds: '{value} 秒' },
        errorWithDetail: '{message}：{detail}'
      },
      list: {
        title: '任务执行日志',
        subtitle: '查询任务运行结果并清理历史记录。',
        actions: { clear: '清理旧日志', backToTasks: '返回任务列表', search: '搜索', reset: '重置', view: '查看详情' },
        cardTitle: '日志记录',
        cardDescription: '按任务、状态和日期范围查询历史执行结果。',
        filters: {
          task: '任务', selectTask: '选择任务', all: '全部', status: '状态', executionStatus: '执行状态',
          startDate: '开始日期', endDate: '结束日期'
        },
        loadFailed: '日志加载失败',
        empty: '暂无日志记录',
        emptyDescription: '当前筛选条件下没有执行日志。',
        columns: { id: 'ID', task: '任务名称', startedAt: '开始时间', duration: '执行耗时', status: '状态', trigger: '触发方式', actions: '操作' },
        pagination: { perPage: '每页', pageSizeAria: '每页显示条数', total: '共 {count} 条' },
        detail: {
          title: '日志详情', description: '本次任务执行的完整信息',
          fields: { logId: '日志 ID', taskId: '任务 ID', task: '任务名称', status: '执行状态', trigger: '触发方式', startedAt: '开始时间', endedAt: '结束时间', duration: '执行耗时', executor: '执行者', retries: '重试次数' },
          output: '执行输出：', error: '错误信息', missing: '未找到日志详情'
        },
        clear: {
          title: '清理日志', description: '按保留时间和任务范围删除历史日志', keep: '保留时间',
          keepDays: '保留最近 {days} 天', task: '任务筛选', selectTask: '选择要清理的任务', allTasks: '全部任务',
          status: '状态筛选', selectStatus: '选择状态', confirmButton: '确认清理'
        },
        feedback: {
          invalidResponse: '获取日志列表失败：响应格式不符合预期',
          loadFailed: '获取日志列表失败',
          clearConfirm: '确定要清理 {days} 天之前的日志吗？此操作不可恢复。',
          clearTitle: '确认清理', cleared: '成功清理了 {count} 条日志', clearFailed: '清理日志失败', clearCanceled: '已取消清理'
        }
      },
      detailPage: {
        title: '日志详情', subtitle: '查看任务运行参数、输出及执行信息。',
        cardTitle: '执行详情', cardDescription: '任务参数、时间、输出和错误信息。',
        sections: { basic: '基本信息', params: '执行参数', output: '执行输出' },
        fields: { logId: '日志 ID', taskId: '任务 ID', task: '任务名称', type: '任务类型', status: '执行状态', trigger: '触发方式', startedAt: '开始时间', endedAt: '结束时间', duration: '执行耗时', executor: '执行者', retries: '重试次数', ip: 'IP 地址' },
        emptyParams: '无参数', emptyOutput: '无输出', error: '错误信息', missing: '未找到日志详情', missingDescription: '日志可能已被清理或链接无效。',
        feedback: { missingId: '缺少日志 ID 参数', invalidResponse: '获取日志详情失败：响应格式不符合预期', loadFailed: '获取日志详情失败' }
      },
      transfer: {
        title: '任务配置迁移', subtitle: '在当前房间导入、导出和管理自动化任务配置。',
        export: { title: '导出任务配置', description: '将当前房间的任务配置保存为 JSON 文件', descriptionField: '导出描述', descriptionPlaceholder: '为本次导出添加描述信息', filename: '文件名', filenamePlaceholder: '导出文件名（不含扩展名）', formatHint: '文件将以 .json 格式保存', contentHint: '导出内容包含当前房间的全部任务、任务组和依赖关系。', action: '导出配置' },
        import: { title: '导入任务配置', description: '从 JSON 文件合并或覆盖当前配置', file: '选择文件', fileHint: '只能选择 .json 文件', mode: '导入模式', merge: '合并', mergeDescription: '仅添加不存在的任务和任务组', override: '覆盖', overrideDescription: '按照文件内容更新现有配置', warningTitle: '覆盖模式', warningDescription: '现有任务配置可能被覆盖，请确认文件来源可靠。', action: '导入配置' },
        history: { title: '本次浏览器导出记录', description: '刷新页面后记录可能被清空', loading: '正在读取导出记录', empty: '暂无导出记录', emptyDescription: '完成一次导出后，文件会显示在这里。', columns: { filename: '文件名', description: '描述', size: '大小', createdAt: '创建时间', actions: '操作' }, download: '下载', delete: '删除' },
        feedback: { fileListFailed: '获取导出文件列表失败', filenameRequired: '请输入文件名', exported: '导出成功', exportFailed: '导出任务配置失败', jsonOnly: '只能选择 JSON 文件', fileRequired: '请选择要导入的文件', imported: '导入成功', importFailed: '导入任务配置失败', downloadFailed: '下载文件失败', deleteConfirm: '确定要移除这条浏览器导出记录吗？已下载到磁盘的文件不会被删除。', deleteTitle: '确认移除', deleted: '删除成功', deleteFailed: '删除文件失败', deleteCanceled: '已取消删除' }
      }
    }
  },
  'en-US': {
    cronLogs: {
      common: {
        actions: { refresh: 'Refresh', back: 'Back', retry: 'Retry' },
        values: { unknown: 'Unknown', unknownTask: 'Unknown task', notAvailable: '--', noOutput: 'No output' },
        statuses: {
          success: 'Succeeded', failed: 'Failed', canceled: 'Canceled', skipped: 'Skipped',
          queued: 'Queued', running: 'Running'
        },
        triggers: { scheduled: 'Scheduled', manual: 'Manual', event: 'Event', dependency: 'Dependency', api: 'API' },
        taskTypes: { function: 'Controlled function', command: 'Built-in command' },
        executors: { system: 'System' },
        units: { milliseconds: '{value} ms', seconds: '{value} s' },
        errorWithDetail: '{message}: {detail}'
      },
      list: {
        title: 'Task run logs',
        subtitle: 'Query task results and clear historical runs.',
        actions: { clear: 'Clear old logs', backToTasks: 'Back to tasks', search: 'Search', reset: 'Reset', view: 'View details' },
        cardTitle: 'Log records',
        cardDescription: 'Filter historical runs by task, status, and date range.',
        filters: {
          task: 'Task', selectTask: 'Select a task', all: 'All', status: 'Status', executionStatus: 'Run status',
          startDate: 'Start date', endDate: 'End date'
        },
        loadFailed: 'Could not load logs',
        empty: 'No log records',
        emptyDescription: 'No task runs match the current filters.',
        columns: { id: 'ID', task: 'Task name', startedAt: 'Started', duration: 'Duration', status: 'Status', trigger: 'Trigger', actions: 'Actions' },
        pagination: { perPage: 'Per page', pageSizeAria: 'Rows per page', total: '{count} total' },
        detail: {
          title: 'Log details', description: 'Complete information for this task run',
          fields: { logId: 'Log ID', taskId: 'Task ID', task: 'Task name', status: 'Run status', trigger: 'Trigger', startedAt: 'Started', endedAt: 'Ended', duration: 'Duration', executor: 'Executor', retries: 'Retries' },
          output: 'Run output:', error: 'Error', missing: 'Log details not found'
        },
        clear: {
          title: 'Clear logs', description: 'Delete historical runs by retention period and task scope', keep: 'Retention',
          keepDays: 'Keep the last {days} days', task: 'Task filter', selectTask: 'Select a task to clear', allTasks: 'All tasks',
          status: 'Status filter', selectStatus: 'Select a status', confirmButton: 'Clear logs'
        },
        feedback: {
          invalidResponse: 'Could not load logs: unrecognized response format',
          loadFailed: 'Could not load logs',
          clearConfirm: 'Clear logs older than {days} days? This cannot be undone.',
          clearTitle: 'Confirm log cleanup', cleared: 'Cleared {count} log records', clearFailed: 'Could not clear logs', clearCanceled: 'Log cleanup canceled'
        }
      },
      detailPage: {
        title: 'Log details', subtitle: 'Inspect task parameters, output, and run information.',
        cardTitle: 'Run details', cardDescription: 'Task parameters, timing, output, and errors.',
        sections: { basic: 'Basic information', params: 'Run parameters', output: 'Run output' },
        fields: { logId: 'Log ID', taskId: 'Task ID', task: 'Task name', type: 'Task type', status: 'Run status', trigger: 'Trigger', startedAt: 'Started', endedAt: 'Ended', duration: 'Duration', executor: 'Executor', retries: 'Retries', ip: 'IP address' },
        emptyParams: 'No parameters', emptyOutput: 'No output', error: 'Error', missing: 'Log details not found', missingDescription: 'The log may have been cleared or the link is invalid.',
        feedback: { missingId: 'The log ID is missing', invalidResponse: 'Could not load log details: unrecognized response format', loadFailed: 'Could not load log details' }
      },
      transfer: {
        title: 'Task configuration transfer', subtitle: 'Import, export, and manage automation configuration for the current room.',
        export: { title: 'Export task configuration', description: 'Save this room\'s automation configuration as a JSON file', descriptionField: 'Export description', descriptionPlaceholder: 'Describe this export', filename: 'Filename', filenamePlaceholder: 'Filename without an extension', formatHint: 'The file is saved as JSON', contentHint: 'The export contains every task, group, and dependency in the current room.', action: 'Export configuration' },
        import: { title: 'Import task configuration', description: 'Merge or replace the current configuration from a JSON file', file: 'Select file', fileHint: 'Only .json files are accepted', mode: 'Import mode', merge: 'Merge', mergeDescription: 'Add only tasks and groups that do not exist', override: 'Replace', overrideDescription: 'Update existing configuration from the file', warningTitle: 'Replace mode', warningDescription: 'Existing task configuration may be overwritten. Verify the source file.', action: 'Import configuration' },
        history: { title: 'Exports in this browser session', description: 'Records may be cleared when the page is refreshed', loading: 'Loading export records', empty: 'No export records', emptyDescription: 'Exported files appear here after an export completes.', columns: { filename: 'Filename', description: 'Description', size: 'Size', createdAt: 'Created', actions: 'Actions' }, download: 'Download', delete: 'Delete' },
        feedback: { fileListFailed: 'Could not load export records', filenameRequired: 'Enter a filename', exported: 'Configuration exported', exportFailed: 'Could not export task configuration', jsonOnly: 'Select a JSON file', fileRequired: 'Select a file to import', imported: 'Configuration imported', importFailed: 'Could not import task configuration', downloadFailed: 'Could not download the file', deleteConfirm: 'Remove this browser export record? Files already downloaded to disk will not be deleted.', deleteTitle: 'Remove export record', deleted: 'Export record removed', deleteFailed: 'Could not remove the export record', deleteCanceled: 'Deletion canceled' }
      }
    }
  }
}

export function cronRunStatusLabel(status, translate) {
  const key = RUN_STATUS_KEYS[status]
  return key ? translate(`cronLogs.common.statuses.${key}`) : status || translate('cronLogs.common.values.unknown')
}

export function cronRunStatusVariant(status) {
  const key = RUN_STATUS_KEYS[status]
  if (key === 'success') return 'default'
  if (key === 'failed') return 'destructive'
  return key ? 'secondary' : 'outline'
}

export function cronTriggerLabel(trigger, translate, manualFallback) {
  const value = trigger === undefined && manualFallback !== undefined ? (manualFallback ? 1 : 0) : trigger
  const key = TRIGGER_KEYS[value]
  return key ? translate(`cronLogs.common.triggers.${key}`) : value ?? translate('cronLogs.common.values.unknown')
}

export function cronTaskTypeLabel(type, translate) {
  const key = TASK_TYPE_KEYS[type]
  return key ? translate(`cronLogs.common.taskTypes.${key}`) : type || translate('cronLogs.common.values.unknown')
}

export function cronExecutorLabel(executor, translate) {
  return executor === 'system' || executor === '系统'
    ? translate('cronLogs.common.executors.system')
    : executor || translate('cronLogs.common.values.unknown')
}

export function formatCronLogDate(value, locale = 'zh-CN') {
  const activeLocale = typeof locale === 'string' ? locale : locale?.value
  return formatSystemDateTime(value, {
    locale: activeLocale === 'en-US' ? 'en-US' : 'zh-CN',
    fallback: value ? String(value) : '--',
    year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: false
  })
}

export function formatCronLogDuration(value, locale, translate) {
  const duration = Number(value)
  if (!Number.isFinite(duration) || duration < 0) return translate('cronLogs.common.values.notAvailable')
  const activeLocale = typeof locale === 'string' ? locale : locale?.value || 'zh-CN'
  if (duration < 1000) return translate('cronLogs.common.units.milliseconds', { value: Math.round(duration).toLocaleString(activeLocale) })
  return translate('cronLogs.common.units.seconds', {
    value: (duration / 1000).toLocaleString(activeLocale, { maximumFractionDigits: 2 })
  })
}

export function createCronLogFailure(key, error) {
  return { key, detail: String(error?.message || error || '').trim() }
}

export function formatCronLogFailure(failure, translate) {
  if (!failure) return ''
  const message = translate(failure.key)
  return failure.detail
    ? translate('cronLogs.common.errorWithDetail', { message, detail: failure.detail })
    : message
}
import { formatSystemDateTime } from '../lib/dateTime.mjs'
