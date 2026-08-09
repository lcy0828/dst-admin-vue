const BUILT_IN_RULE_KEYS = Object.freeze({
  'builtin-error': 'error',
  'builtin-worldgen-warning': 'worldgenWarning',
  'builtin-warning': 'warning',
  'builtin-chat': 'chat',
  'builtin-startup': 'startup',
  'builtin-startup-detail': 'startupDetail',
  'builtin-server-config': 'serverConfig',
  'builtin-worldgen': 'worldgen',
  'builtin-worldgen-progress': 'worldgenProgress',
  'builtin-player': 'player',
  'builtin-world': 'world',
  'builtin-diagnostic': 'diagnostic',
  'builtin-system': 'system'
})

function builtInKey(rule, field) {
  const key = rule?.built_in || rule?.builtIn ? BUILT_IN_RULE_KEYS[rule.id] : ''
  return key ? `rules.builtIns.${key}.${field}` : ''
}

export function logRuleName(rule, translate) {
  const key = builtInKey(rule, 'name')
  return key ? translate(key) : String(rule?.name || '')
}

export function logRuleDescription(rule, translate) {
  const key = builtInKey(rule, 'description')
  return key ? translate(key) : String(rule?.description || '')
}
