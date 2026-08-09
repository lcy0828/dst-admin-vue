import {
  normalizeSystemAutomationGroup,
  SYSTEM_AUTOMATION_GROUP_IDS
} from '../lib/systemDataIdentifiers.mjs'

const GROUP_TYPE_KEYS = Object.freeze({
  system: 'system',
  '系统': 'system',
  world: 'world',
  '世界': 'world',
  custom: 'custom',
  '自定义': 'custom'
})

const TASK_TYPE_KEYS = Object.freeze({
  function: 'controlledFunction',
  shell: 'shell',
  tmux_command: 'builtinCommand',
  tmux_raw_command: 'rawCommand'
})

const SYSTEM_GROUP_MESSAGE_KEYS = Object.freeze({
  [SYSTEM_AUTOMATION_GROUP_IDS.UNGROUPED]: 'ungrouped',
  [SYSTEM_AUTOMATION_GROUP_IDS.PLAYER_MANAGEMENT]: 'playerManagement'
})

export const CRON_GROUP_TYPE_IDS = Object.freeze(['system', 'world', 'custom'])

export const cronGroupMessages = {
  'zh-CN': {
    cronGroups: {
      values: {
        unknown: '未知',
        unknownType: '未知类型',
        unknownStatus: '未知状态',
        noDescription: '无描述',
        enabled: '启用',
        disabled: '禁用'
      },
      actions: {
        addGroup: '添加任务组',
        addTask: '添加任务',
        refresh: '刷新',
        backToTasks: '返回任务列表',
        backToList: '返回列表',
        editGroup: '编辑任务组',
        edit: '编辑',
        details: '查看详情',
        statistics: '统计数据',
        delete: '删除',
        execute: '执行',
        close: '关闭',
        moreCharts: '查看更多图表',
        cancel: '取消',
        confirm: '确定',
        save: '保存'
      },
      types: {
        system: '系统',
        world: '世界',
        custom: '自定义'
      },
      typeDescriptions: {
        system: '系统维护相关任务',
        world: '游戏世界相关任务',
        custom: '用户自定义任务'
      },
      taskTypes: {
        controlledFunction: '受控函数',
        shell: 'Shell 命令',
        builtinCommand: '内建命令',
        rawCommand: '原始命令'
      },
      systemGroups: {
        ungrouped: {
          name: '未分组',
          description: '用于存放尚未归类的自动化任务。'
        },
        playerManagement: {
          name: '玩家管理',
          description: '用于执行定时玩家信息刷新。'
        }
      },
      list: {
        title: '任务组管理',
        subtitle: '按用途组织任务并统一控制启用状态。',
        cardTitle: '任务组列表',
        cardDescription: '查看任务数量、类型和当前启用状态。',
        emptyTitle: '暂无任务组',
        emptyDescription: '创建任务组以分类管理自动化任务。',
        columns: {
          id: 'ID',
          name: '组名称',
          description: '描述',
          type: '类型',
          taskCount: '任务数量',
          status: '状态',
          actions: '操作'
        },
        taskCount: '{count} 个任务',
        aria: {
          enable: '启用任务组 {name}',
          disable: '禁用任务组 {name}',
          edit: '编辑任务组 {name}',
          details: '查看任务组 {name}',
          statistics: '查看任务组 {name} 的统计数据',
          delete: '删除任务组 {name}'
        }
      },
      statistics: {
        title: '任务组统计',
        description: '近 30 天任务执行情况',
        totalTasks: '总任务数',
        totalTasksDescription: '组内全部任务',
        enabledTasks: '启用任务数',
        enabledTasksDescription: '当前参与调度',
        successRate: '成功率',
        successRateDescription: '近 30 天执行结果',
        averageDuration: '平均耗时',
        averageDurationDescription: '近 30 天已完成执行',
        seconds: '{value} 秒',
        empty: '暂无统计数据',
        chartTitle: '任务组执行情况统计（近 30 天）',
        success: '成功',
        failed: '失败'
      },
      detail: {
        fallbackTitle: '任务组详情',
        subtitle: '查看任务组配置和组内任务。',
        cardTitle: '任务组信息',
        cardDescription: '当前任务组配置及其包含的任务。',
        fields: {
          id: '组 ID',
          name: '组名称',
          description: '描述',
          type: '类型',
          status: '状态',
          taskCount: '任务数量'
        },
        taskList: '任务列表',
        emptyTasks: '该任务组下暂无任务',
        columns: {
          id: 'ID',
          name: '任务名称',
          schedule: 'Cron 表达式',
          type: '类型',
          target: '目标',
          status: '状态',
          actions: '操作'
        },
        editTaskTitle: '编辑',
        deleteTaskTitle: '删除',
        editTaskAria: '编辑任务 {name}',
        deleteTaskAria: '删除任务 {name}',
        notFound: '未找到任务组',
        notFoundDescription: '任务组可能已被删除。'
      },
      form: {
        addTitle: '添加任务组',
        editTitle: '编辑任务组',
        subtitle: '组织并统一控制一组关联的自动化任务。',
        cardTitle: '任务组配置',
        cardDescription: '设置名称、用途与启用状态。',
        name: '组名称',
        namePlaceholder: '请输入任务组名称',
        description: '组描述',
        descriptionPlaceholder: '请输入任务组描述',
        type: '组类型',
        enabled: '启用任务组',
        enabledDescription: '禁用任务组会同时禁用组内所有任务。',
        validation: {
          nameRequired: '请输入任务组名称',
          nameLength: '长度应在 2 到 50 个字符之间',
          descriptionLength: '描述不能超过 200 个字符'
        }
      },
      confirmation: {
        deleteGroup: '确定要删除此任务组吗？删除后不可恢复。',
        deleteGroupTitle: '确认删除',
        enableGroup: '确定要启用此任务组吗？启用后组内所有任务将被启用。',
        disableGroup: '确定要禁用此任务组吗？禁用后组内所有任务将被禁用。',
        enableGroupTitle: '确认启用',
        disableGroupTitle: '确认禁用',
        deleteTask: '确定要删除此任务吗？删除后不可恢复。',
        deleteTaskTitle: '确认删除',
        runTask: '确定要立即执行此任务吗？',
        runTaskTitle: '确认执行'
      },
      feedback: {
        groupNotEmpty: '该任务组下还有任务，无法删除',
        groupDeleted: '删除成功',
        deleteCanceled: '已取消删除',
        groupEnabled: '启用成功',
        groupDisabled: '禁用成功',
        enableCanceled: '已取消启用',
        disableCanceled: '已取消禁用',
        taskDeleted: '删除成功',
        taskQueued: '任务已进入执行队列，请在执行日志中查看结果',
        executionCanceled: '已取消执行',
        completeForm: '请完善表单信息',
        groupUpdated: '更新成功',
        groupAdded: '添加成功'
      },
      errors: {
        withDetail: '{message}：{detail}',
        invalidResponse: '后端返回了无法识别的响应格式',
        list: '获取任务组列表失败',
        deleteGroup: '删除任务组失败',
        enableGroup: '启用任务组失败',
        disableGroup: '禁用任务组失败',
        statistics: '获取任务组统计失败',
        chart: '获取任务组图表失败',
        detail: '获取任务组详情失败',
        tasks: '获取任务组下的任务失败',
        deleteTask: '删除任务失败',
        runTask: '执行任务失败',
        updateGroup: '更新任务组失败',
        addGroup: '添加任务组失败'
      }
    }
  },
  'en-US': {
    cronGroups: {
      values: {
        unknown: 'Unknown',
        unknownType: 'Unknown type',
        unknownStatus: 'Unknown status',
        noDescription: 'No description',
        enabled: 'Enabled',
        disabled: 'Disabled'
      },
      actions: {
        addGroup: 'Add Task Group',
        addTask: 'Add Task',
        refresh: 'Refresh',
        backToTasks: 'Back to Tasks',
        backToList: 'Back to List',
        editGroup: 'Edit Task Group',
        edit: 'Edit',
        details: 'View Details',
        statistics: 'Statistics',
        delete: 'Delete',
        execute: 'Run',
        close: 'Close',
        moreCharts: 'View More Charts',
        cancel: 'Cancel',
        confirm: 'Confirm',
        save: 'Save'
      },
      types: {
        system: 'System',
        world: 'World',
        custom: 'Custom'
      },
      typeDescriptions: {
        system: 'System maintenance tasks',
        world: 'Game world tasks',
        custom: 'User-defined tasks'
      },
      taskTypes: {
        controlledFunction: 'Controlled Function',
        shell: 'Shell Command',
        builtinCommand: 'Built-in Command',
        rawCommand: 'Raw Command'
      },
      systemGroups: {
        ungrouped: {
          name: 'Ungrouped',
          description: 'Holds automation tasks that have not been assigned to a group.'
        },
        playerManagement: {
          name: 'Player Management',
          description: 'Runs scheduled player information refreshes.'
        }
      },
      list: {
        title: 'Task Groups',
        subtitle: 'Organize tasks by purpose and control their enabled state together.',
        cardTitle: 'Task Group List',
        cardDescription: 'Review task counts, types, and the current enabled state.',
        emptyTitle: 'No task groups',
        emptyDescription: 'Create a task group to organize automation tasks.',
        columns: {
          id: 'ID',
          name: 'Group Name',
          description: 'Description',
          type: 'Type',
          taskCount: 'Tasks',
          status: 'Status',
          actions: 'Actions'
        },
        taskCount: '{count} tasks',
        aria: {
          enable: 'Enable task group {name}',
          disable: 'Disable task group {name}',
          edit: 'Edit task group {name}',
          details: 'View task group {name}',
          statistics: 'View statistics for task group {name}',
          delete: 'Delete task group {name}'
        }
      },
      statistics: {
        title: 'Task Group Statistics',
        description: 'Task execution over the last 30 days',
        totalTasks: 'Total Tasks',
        totalTasksDescription: 'All tasks in the group',
        enabledTasks: 'Enabled Tasks',
        enabledTasksDescription: 'Currently included in scheduling',
        successRate: 'Success Rate',
        successRateDescription: 'Execution results over the last 30 days',
        averageDuration: 'Average Duration',
        averageDurationDescription: 'Completed runs over the last 30 days',
        seconds: '{value} sec',
        empty: 'No statistics available',
        chartTitle: 'Task Group Executions (Last 30 Days)',
        success: 'Succeeded',
        failed: 'Failed'
      },
      detail: {
        fallbackTitle: 'Task Group Details',
        subtitle: 'Review the task group configuration and its tasks.',
        cardTitle: 'Task Group Information',
        cardDescription: 'Current task group settings and included tasks.',
        fields: {
          id: 'Group ID',
          name: 'Group Name',
          description: 'Description',
          type: 'Type',
          status: 'Status',
          taskCount: 'Tasks'
        },
        taskList: 'Task List',
        emptyTasks: 'No tasks in this group',
        columns: {
          id: 'ID',
          name: 'Task Name',
          schedule: 'Cron Expression',
          type: 'Type',
          target: 'Target',
          status: 'Status',
          actions: 'Actions'
        },
        editTaskTitle: 'Edit',
        deleteTaskTitle: 'Delete',
        editTaskAria: 'Edit task {name}',
        deleteTaskAria: 'Delete task {name}',
        notFound: 'Task group not found',
        notFoundDescription: 'The task group may have been deleted.'
      },
      form: {
        addTitle: 'Add Task Group',
        editTitle: 'Edit Task Group',
        subtitle: 'Organize and control a related set of automation tasks.',
        cardTitle: 'Task Group Configuration',
        cardDescription: 'Set the name, purpose, and enabled state.',
        name: 'Group Name',
        namePlaceholder: 'Enter a task group name',
        description: 'Group Description',
        descriptionPlaceholder: 'Enter a task group description',
        type: 'Group Type',
        enabled: 'Enable Task Group',
        enabledDescription: 'Disabling a task group also disables every task in it.',
        validation: {
          nameRequired: 'Enter a task group name',
          nameLength: 'The name must contain 2 to 50 characters',
          descriptionLength: 'The description cannot exceed 200 characters'
        }
      },
      confirmation: {
        deleteGroup: 'Delete this task group? This action cannot be undone.',
        deleteGroupTitle: 'Confirm Deletion',
        enableGroup: 'Enable this task group? Every task in the group will also be enabled.',
        disableGroup: 'Disable this task group? Every task in the group will also be disabled.',
        enableGroupTitle: 'Confirm Enable',
        disableGroupTitle: 'Confirm Disable',
        deleteTask: 'Delete this task? This action cannot be undone.',
        deleteTaskTitle: 'Confirm Deletion',
        runTask: 'Run this task now?',
        runTaskTitle: 'Confirm Run'
      },
      feedback: {
        groupNotEmpty: 'This task group still contains tasks and cannot be deleted',
        groupDeleted: 'Task group deleted',
        deleteCanceled: 'Deletion canceled',
        groupEnabled: 'Task group enabled',
        groupDisabled: 'Task group disabled',
        enableCanceled: 'Enable canceled',
        disableCanceled: 'Disable canceled',
        taskDeleted: 'Task deleted',
        taskQueued: 'The task has been queued. Check the execution logs for its result.',
        executionCanceled: 'Execution canceled',
        completeForm: 'Complete the form before saving',
        groupUpdated: 'Task group updated',
        groupAdded: 'Task group added'
      },
      errors: {
        withDetail: '{message}: {detail}',
        invalidResponse: 'The backend returned an unrecognized response format',
        list: 'Could not load task groups',
        deleteGroup: 'Could not delete the task group',
        enableGroup: 'Could not enable the task group',
        disableGroup: 'Could not disable the task group',
        statistics: 'Could not load task group statistics',
        chart: 'Could not load the task group chart',
        detail: 'Could not load task group details',
        tasks: 'Could not load tasks in the group',
        deleteTask: 'Could not delete the task',
        runTask: 'Could not run the task',
        updateGroup: 'Could not update the task group',
        addGroup: 'Could not add the task group'
      }
    }
  }
}

function localeCode(locale) {
  const value = typeof locale === 'string' ? locale : locale?.value
  return value === 'en-US' ? 'en-US' : 'zh-CN'
}

function readMessage(locale, key) {
  return key.split('.').reduce((value, part) => value?.[part], cronGroupMessages[localeCode(locale)])
}

export function cronGroupText(locale, key, parameters = {}) {
  let message = readMessage(locale, key)
  if (typeof message !== 'string') return key
  for (const [name, replacement] of Object.entries(parameters)) {
    message = message.replaceAll(`{${name}}`, String(replacement))
  }
  return message
}

export function cronGroupTypeLabel(value, translate) {
  if (value === undefined || value === null || value === '') return translate('cronGroups.values.unknownType')
  const key = GROUP_TYPE_KEYS[String(value).trim()]
  return key ? translate(`cronGroups.types.${key}`) : value
}

export function cronGroupTypeDescription(value, translate) {
  const key = GROUP_TYPE_KEYS[String(value || '').trim()]
  return key ? translate(`cronGroups.typeDescriptions.${key}`) : value
}

export function cronTaskTypeLabel(value, translate) {
  if (value === undefined || value === null || value === '') return translate('cronGroups.values.unknownType')
  const key = TASK_TYPE_KEYS[String(value).trim()]
  return key ? translate(`cronGroups.taskTypes.${key}`) : value
}

export function cronGroupStatusMeta(value, translate) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : value
  if (value === true || normalized === 1 || normalized === '1' || normalized === 'enabled' || normalized === '启用') {
    return { label: translate('cronGroups.values.enabled'), variant: 'default' }
  }
  if (value === false || normalized === 0 || normalized === '0' || normalized === 'disabled' || normalized === '禁用') {
    return { label: translate('cronGroups.values.disabled'), variant: 'secondary' }
  }
  return {
    label: value === undefined || value === null || value === ''
      ? translate('cronGroups.values.unknownStatus')
      : String(value),
    variant: 'outline'
  }
}

function systemGroupKey(group) {
  const value = typeof group === 'object' ? group?.name : group
  const type = typeof group === 'object' ? GROUP_TYPE_KEYS[String(group?.type || '').trim()] : 'system'
  if (type !== 'system') return ''
  return SYSTEM_GROUP_MESSAGE_KEYS[normalizeSystemAutomationGroup(value)] || ''
}

export function cronGroupNameLabel(group, translate) {
  const value = typeof group === 'object' ? group?.name : group
  const key = systemGroupKey(group)
  return key ? translate(`cronGroups.systemGroups.${key}.name`) : value || translate('cronGroups.values.unknown')
}

export function cronGroupDescriptionLabel(group, translate) {
  const value = typeof group === 'object' ? group?.description : ''
  const key = systemGroupKey(group)
  if (key) return translate(`cronGroups.systemGroups.${key}.description`)
  return value || translate('cronGroups.values.noDescription')
}

export function formatCronGroupNumber(value, locale) {
  if (value === undefined || value === null || value === '') return '--'
  const number = Number(value)
  if (!Number.isFinite(number)) return String(value)
  return new Intl.NumberFormat(localeCode(locale), { maximumFractionDigits: 2 }).format(number)
}

export function formatCronGroupPercent(value, locale) {
  if (value === undefined || value === null || value === '') return '--'
  const number = Number(value)
  if (!Number.isFinite(number)) return String(value)
  return new Intl.NumberFormat(localeCode(locale), {
    style: 'percent',
    maximumFractionDigits: 2
  }).format(number / 100)
}

export function formatCronGroupDuration(value, locale, translate) {
  return translate('cronGroups.statistics.seconds', { value: formatCronGroupNumber(value, locale) })
}

export function formatCronGroupDate(value, locale) {
  if (!value) return '--'
  const source = /^\d{4}-\d{2}-\d{2}$/.test(String(value)) ? `${value}T00:00:00` : value
  const date = new Date(source)
  if (Number.isNaN(date.getTime())) return String(value)
  return new Intl.DateTimeFormat(localeCode(locale), { month: 'short', day: 'numeric' }).format(date)
}

export function cronGroupErrorDetail(value) {
  const response = value?.response?.data || value?.data
  return String(
    response?.detail || response?.message || response?.msg ||
    value?.detail || value?.message || ''
  ).trim()
}

export function formatCronGroupError(translate, key, value) {
  const message = translate(key)
  const detail = cronGroupErrorDetail(value)
  return detail ? translate('cronGroups.errors.withDetail', { message, detail }) : message
}
