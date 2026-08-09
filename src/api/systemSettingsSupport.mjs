export const TERMINAL_SYSTEM_JOB_STATES = new Set([
  'succeeded',
  'failed',
  'canceled'
])

export function editableSystemSettingValues(fields = [], values = {}) {
  const editable = new Set(fields.filter(field => field?.editable === true).map(field => field.id))
  return Object.fromEntries(Object.entries(values).filter(([id]) => editable.has(id)))
}
