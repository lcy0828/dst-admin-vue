export const notificationEvents = ['room.result', 'backup.result', 'game.result', 'mod.result', 'agent.status', 'security.login', 'software.available', 'agent.software.available', 'custom']

export const webhookPresets = {
  http: { format: 'json', template: JSON.stringify({ event_id: '{{id}}', event: '{{event}}', title: '{{title}}', message: '{{message}}', status: '{{status}}', room_id: '{{roomId}}', target_id: '{{targetId}}', job_id: '{{jobId}}', timestamp: '{{timestamp}}', release: { component: '{{component}}', currentVersion: '{{currentVersion}}', latestVersion: '{{latestVersion}}', releaseURL: '{{releaseURL}}', publishedAt: '{{publishedAt}}', detectedAt: '{{detectedAt}}', statusPath: '{{statusPath}}' } }, null, 2) },
  wecom: { format: 'json', template: JSON.stringify({ msgtype: 'text', text: { content: '{{title}}\n{{message}}' } }, null, 2) },
  dingtalk: { format: 'json', template: JSON.stringify({ msgtype: 'text', text: { content: '{{title}}\n{{message}}' } }, null, 2) },
  feishu: { format: 'json', template: JSON.stringify({ msg_type: 'text', content: { text: '{{title}}\n{{message}}' } }, null, 2) }
}

export function notificationInput(form) {
  const input = { revision: form.revision || '', name: form.name.trim(), type: form.type, enabled: form.enabled, events: [...form.events], failuresOnly: form.failuresOnly }
  if (!input.name || !input.events.length) throw new Error('fields')
  if (form.type === 'email') {
    input.recipients = [...new Set(form.recipients.split(/[\s,;，；]+/).filter(Boolean))]
    if (!input.recipients.length || input.recipients.length > 20 || input.recipients.some(value => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))) throw new Error('recipients')
    return input
  }
  if (form.url) {
    let url
    try { url = new URL(form.url.trim()) } catch { throw new Error('url') }
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.hash) throw new Error('url')
    input.url = url.href
  } else if (!form.urlConfigured) throw new Error('url')
  if (form.headers.trim()) {
    try { input.headers = JSON.parse(form.headers) } catch { throw new Error('headers') }
    if (!input.headers || Array.isArray(input.headers) || typeof input.headers !== 'object' || Object.values(input.headers).some(value => typeof value !== 'string')) throw new Error('headers')
  }
  if (form.format === 'json') {
    try { JSON.parse(form.template) } catch { throw new Error('template') }
  }
  return { ...input, method: form.method, format: form.format, template: form.template, responseMode: form.responseMode }
}

export function notificationForm(channel, email = '') {
  return {
    id: channel?.id || '', revision: channel?.revision || '', name: channel?.name || '', type: channel?.type || 'email', enabled: channel?.enabled ?? true,
    events: [...(channel?.events || ['backup.result', 'game.result', 'mod.result', 'agent.status', 'security.login'])], failuresOnly: channel?.failuresOnly ?? false,
    recipients: channel?.recipients?.join('\n') || email, url: '', headers: '', urlConfigured: Boolean(channel?.urlConfigured), headersConfigured: Boolean(channel?.headersConfigured),
    method: channel?.method || 'POST', format: channel?.format || 'json', template: channel?.template || webhookPresets.http.template, responseMode: channel?.responseMode || 'http'
  }
}

export function notificationHistoryPending(items) { return items.some(item => ['queued', 'sending'].includes(item.status)) }
