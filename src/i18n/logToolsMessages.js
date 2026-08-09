import { worldStatusVariant } from '../lib/worldRuntimeStatus.mjs'

const PARSER_STATUS_KEYS = Object.freeze({
  running: 'running',
  stopped: 'stopped',
  starting: 'starting',
  stopping: 'stopping',
  failed: 'failed'
})

const SERVER_TYPE_KEYS = Object.freeze({
  Forest: 'forest',
  forest: 'forest',
  Caves: 'caves',
  Cave: 'caves',
  caves: 'caves',
  cave: 'caves',
  Custom: 'custom',
  custom: 'custom'
})

const REGEX_ERROR_KEYS = new Set(['tailRequired', 'patternInvalid', 'tailInvalid'])

export function logParserStatusMeta(status, translate) {
  const key = PARSER_STATUS_KEYS[status]
  return {
    label: key ? translate(`logTools.parser.statuses.${key}`) : status || translate('logTools.values.unknownStatus'),
    variant: worldStatusVariant(status)
  }
}

export function logParserServerTypeLabel(type, translate) {
  const key = SERVER_TYPE_KEYS[type]
  return key ? translate(`logTools.parser.serverTypes.${key}`) : type || translate('logTools.values.unknownWorldType')
}

export function logParserLoadFailure(failure, translate) {
  if (!failure) return ''
  const detail = String(failure.detail || '').trim()
  if (failure.kind === 'invalidResponse') {
    return detail
      ? translate('logTools.parser.feedback.invalidResponseWithDetail', { error: detail })
      : translate('logTools.parser.feedback.invalidResponse')
  }
  return translate('logTools.parser.feedback.loadFailed', {
    error: detail || translate('logTools.values.unknownError')
  })
}

export function regexTesterErrorLabel(error, translate) {
  if (!error) return ''
  const detail = String(error.detail || '').trim()
  if (!REGEX_ERROR_KEYS.has(error.key)) return detail || error.key || translate('logTools.values.unknownError')
  if (detail) return translate(`logTools.regex.errors.${error.key}WithDetail`, { error: detail })
  return translate(`logTools.regex.errors.${error.key}`)
}

export const logToolsMessages = {
  'zh-CN': {
    logTools: {
      values: {
        unknownError: '未知错误',
        unknownStatus: '未知状态',
        unknownWorldType: '未知世界类型'
      },
      parser: {
        title: '运行中世界日志',
        subtitle: '查看当前运行中的世界，并进入对应的实时日志。',
        actions: {
          refresh: '刷新',
          retry: '重试',
          viewLogs: '查看日志',
          restartWorld: '重启世界'
        },
        loadFailedTitle: '世界状态加载失败',
        loading: '正在读取世界状态...',
        emptyTitle: '暂无运行中的世界',
        emptyDescription: '启动房间世界后，可在这里查看对应的实时日志。',
        runtimeControl: '运行控制',
        controlAvailable: '可用',
        controlUnavailable: '当前运行环境不可用',
        statuses: {
          running: '运行中',
          stopped: '已停止',
          starting: '启动中',
          stopping: '停止中',
          failed: '启动失败'
        },
        serverTypes: {
          forest: '森林世界',
          caves: '洞穴世界',
          custom: '自定义世界'
        },
        feedback: {
          refreshed: '运行中世界已刷新',
          invalidResponse: '后端没有返回有效的世界列表',
          invalidResponseWithDetail: '后端没有返回有效的世界列表：{error}',
          loadFailed: '获取运行中世界失败：{error}',
          restartTimeout: '重启任务仍在执行，请稍后刷新状态',
          restartJobFailed: '世界重启失败',
          restartConfirm: '确定要重启“{world}”吗？在线玩家会暂时断开连接。',
          restartTitle: '重启世界',
          confirmRestart: '确认重启',
          cancel: '取消',
          confirmFailed: '无法确认重启操作：{error}',
          restartSucceeded: '{world} 已重新启动',
          restartFailed: '重新启动失败：{error}'
        }
      },
      regex: {
        title: '匹配设置',
        description: '日志样本、表达式与匹配结果。',
        fields: {
          testContent: '测试内容',
          testContentPlaceholder: '输入要测试的日志内容',
          pattern: '正则表达式',
          patternPlaceholder: '输入正则表达式',
          useRegex: '使用正则表达式',
          matchMode: '匹配模式',
          matchModePlaceholder: '选择匹配模式',
          tailPattern: '尾行匹配模式',
          tailPatternPlaceholder: '输入尾行匹配模式'
        },
        actions: {
          test: '测试',
          reset: '重置',
          apply: '应用到规则'
        },
        modes: {
          single: '单行匹配',
          multiLine: '多行匹配',
          headTail: '首尾行匹配'
        },
        results: {
          title: '测试结果',
          count: '{count} 项',
          waitingTitle: '等待测试',
          waitingDescription: '当前尚无测试结果。',
          invalidTitle: '正则表达式无效',
          successTitle: '匹配成功',
          successDescription: '找到 {count} 个匹配项',
          emptyTitle: '未找到匹配项',
          emptyDescription: '当前日志内容与表达式没有产生匹配。',
          matchesTitle: '匹配结果',
          matchIndex: '匹配 #{index}',
          highlightedTitle: '高亮显示'
        },
        errors: {
          tailRequired: '首尾行匹配模式需要提供尾行匹配模式',
          tailRequiredWithDetail: '首尾行匹配模式需要提供尾行匹配模式：{error}',
          patternInvalid: '正则表达式错误',
          patternInvalidWithDetail: '正则表达式错误：{error}',
          tailInvalid: '尾行正则表达式错误',
          tailInvalidWithDetail: '尾行正则表达式错误：{error}'
        }
      }
    }
  },
  'en-US': {
    logTools: {
      values: {
        unknownError: 'Unknown error',
        unknownStatus: 'Unknown status',
        unknownWorldType: 'Unknown world type'
      },
      parser: {
        title: 'Running world logs',
        subtitle: 'Open the live logs for worlds that are currently running.',
        actions: {
          refresh: 'Refresh',
          retry: 'Retry',
          viewLogs: 'View logs',
          restartWorld: 'Restart world'
        },
        loadFailedTitle: 'Could not load world status',
        loading: 'Reading world status...',
        emptyTitle: 'No worlds are running',
        emptyDescription: 'Start a world to inspect its live logs here.',
        runtimeControl: 'Runtime control',
        controlAvailable: 'Available',
        controlUnavailable: 'Unavailable in the current runtime environment',
        statuses: {
          running: 'Running',
          stopped: 'Stopped',
          starting: 'Starting',
          stopping: 'Stopping',
          failed: 'Start failed'
        },
        serverTypes: {
          forest: 'Forest world',
          caves: 'Caves world',
          custom: 'Custom world'
        },
        feedback: {
          refreshed: 'Running worlds refreshed',
          invalidResponse: 'The backend did not return a valid world list',
          invalidResponseWithDetail: 'The backend did not return a valid world list: {error}',
          loadFailed: 'Could not load running worlds: {error}',
          restartTimeout: 'The restart job is still running. Refresh the status later.',
          restartJobFailed: 'The world restart failed',
          restartConfirm: 'Restart “{world}”? Online players will be disconnected temporarily.',
          restartTitle: 'Restart world',
          confirmRestart: 'Restart',
          cancel: 'Cancel',
          confirmFailed: 'Could not confirm the restart: {error}',
          restartSucceeded: '{world} restarted',
          restartFailed: 'Restart failed: {error}'
        }
      },
      regex: {
        title: 'Match settings',
        description: 'Test log samples against an expression and inspect the matches.',
        fields: {
          testContent: 'Test content',
          testContentPlaceholder: 'Enter the log content to test',
          pattern: 'Regular expression',
          patternPlaceholder: 'Enter a regular expression',
          useRegex: 'Use regular expressions',
          matchMode: 'Match mode',
          matchModePlaceholder: 'Select a match mode',
          tailPattern: 'Tail-line pattern',
          tailPatternPlaceholder: 'Enter the tail-line pattern'
        },
        actions: {
          test: 'Test',
          reset: 'Reset',
          apply: 'Apply to rule'
        },
        modes: {
          single: 'Single-line match',
          multiLine: 'Multi-line match',
          headTail: 'Head-to-tail match'
        },
        results: {
          title: 'Test results',
          count: '{count} items',
          waitingTitle: 'Waiting for a test',
          waitingDescription: 'No test results are available yet.',
          invalidTitle: 'Invalid regular expression',
          successTitle: 'Match found',
          successDescription: '{count} matches found',
          emptyTitle: 'No matches found',
          emptyDescription: 'The log content did not match the expression.',
          matchesTitle: 'Matches',
          matchIndex: 'Match #{index}',
          highlightedTitle: 'Highlighted content'
        },
        errors: {
          tailRequired: 'A tail-line pattern is required in head-to-tail mode',
          tailRequiredWithDetail: 'A tail-line pattern is required in head-to-tail mode: {error}',
          patternInvalid: 'Regular expression error',
          patternInvalidWithDetail: 'Regular expression error: {error}',
          tailInvalid: 'Tail-line regular expression error',
          tailInvalidWithDetail: 'Tail-line regular expression error: {error}'
        }
      }
    }
  }
}
