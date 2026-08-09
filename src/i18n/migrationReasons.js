const REASON_KEYS = Object.freeze({
  '可以导入': 'ready',
  '该旧版规则已经迁移': 'alreadyMigrated',
  '目标规则 ID 已存在且内容不同': 'idConflict',
  '已有等效规则，无需重复导入': 'equivalent',
  '相同匹配条件已用于其他日志类型': 'matcherConflict',
  '旧规则属于过宽兜底或包含已知错误，导入后会吞掉细分类': 'unsafeCatchAll',
  '旧规则参数不受新版支持': 'unsupported'
})

export function migrationReasonLabel(reason, translate) {
  const value = String(reason || '').trim()
  const key = REASON_KEYS[value]
  if (key) return translate(`rules.migrationReasons.${key}`)
  const fixedLines = /^新版暂不支持 fixed_lines（旧规则配置为 (\d+) 行）$/.exec(value)
  return fixedLines
    ? translate('rules.migrationReasons.fixedLines', { count: Number(fixedLines[1]) })
    : value
}
