import { globalJobTransfer } from './globalJobs.mjs'

export const isRoomModUpdate = job => job?.kind === 'mod.update.activate'
const modProgressKinds = new Set(['mod.update.activate', 'mod.installation.download', 'mod.installation.update', 'mod.installation.update-all', 'mod.room.add', 'mod.install', 'mod.download', 'mod.update'])
export const isModProgressJob = job => modProgressKinds.has(job?.kind)
const worldProgressKinds = new Set(['room.start', 'room.restart', 'rooms.start', 'rooms.restart'])
export const isWorldProgressJob = job => worldProgressKinds.has(job?.kind)
export const isTaskProgressJob = job => isModProgressJob(job) || isWorldProgressJob(job)
export const isActiveJob = job => ['queued', 'running'].includes(job?.status)

export function modDownloadGroups(job = {}, metadata = {}) {
  const detail = job.progressDetail || {}
  const source = detail.items?.length ? detail.items : detail.workshopId ? [{
    workshopId: detail.workshopId, targetId: detail.targetId, installationId: detail.installationId,
    status: isActiveJob(job) ? 'downloading' : job.status === 'succeeded' ? 'succeeded' : 'unknown',
    ...job.transfer
  }] : []
  const groups = new Map()
  for (const item of source) {
    const id = String(item.workshopId || '')
    if (!id) continue
    const meta = metadata[id] || {}
    const group = groups.get(id) || { id, name: meta.name || `Workshop ${id}`, image: meta.previewUrl || meta.image || '', downloads: [] }
    let status = item.status || 'unknown'
    if (!isActiveJob(job) && status === 'queued') status = 'notStarted'
    if (!isActiveJob(job) && status === 'downloading') status = 'unconfirmed'
    const percent = status === 'succeeded' ? 100 : Number(item.totalBytes) > 0
      ? Math.min(100, Math.floor(Math.max(0, Number(item.currentBytes) || 0) / Number(item.totalBytes) * 100)) : null
    group.downloads.push({ ...item, key: [item.targetId, item.installationId, id].join('/'), status, percent })
    groups.set(id, group)
  }
  return [...groups.values()].map(group => ({ ...group, status: group.downloads.every(item => item.status === 'succeeded') ? 'succeeded'
    : ['failed', 'downloading', 'unconfirmed', 'queued', 'notStarted', 'unknown'].find(status => group.downloads.some(item => item.status === status)) || 'unknown' }))
}

export function readableTaskText(value, targetLabels = {}) {
  let text = String(value || '')
  for (const [id, label] of Object.entries(targetLabels)) {
    if (id && label && id !== label) text = text.split(`${id}/native`).join(label).split(`${id}/default`).join(label).split(id).join(label)
  }
  return text.replace(/agent:[\w.-]+(?:\/[\w.-]+)?/g, '').replace(/(?:^|·)\s*[:：]?\s*(?=·|$)/g, '').trim()
}

export function modDownloadSummary(job, groups = modDownloadGroups(job)) {
  const counts = Object.fromEntries(['succeeded', 'failed', 'downloading', 'queued', 'notStarted', 'unconfirmed', 'unknown'].map(status => [status, 0]))
  for (const group of groups) counts[group.status]++
  const recorded = Boolean(job.progressDetail?.items?.length)
  const total = recorded ? groups.length : Math.max(groups.length, Number(job.progressDetail?.totalItems) || 0)
  // Count completed Mods, not bytes of the currently downloading Mod. A Mod
  // only counts once all of its target machines report success.
  return { counts, total, recorded, percent: recorded && total ? counts.succeeded / total * 100 : null }
}

export function modDownloadIssue(message = '') {
  if (/no space left|disk full/i.test(message)) return 'diskFull'
  if (/permission denied|access denied/i.test(message)) return 'permission'
  if (/timed?\s*out|timeout|deadline exceeded|超时/i.test(message)) return 'timeout'
  if (/I\/O Operation Failed|input\/output error/i.test(message)) return 'io'
  return 'unknown'
}

const worldStages = new Set(['queued', 'stopping', 'stopped', 'starting', 'initializing', 'loading_mods', 'generating_world', 'loading_world', 'connecting', 'ready', 'failed', 'canceled', 'unconfirmed'])
export function worldRestartProgress(job = {}) {
  const active = isActiveJob(job)
  const worlds = (job.progressDetail?.worlds || []).filter(world => world.worldId).map(world => {
    let stage = worldStages.has(world.stage) ? world.stage : 'unconfirmed'
    if (!active && ['queued', 'stopped'].includes(stage)) stage = 'notStarted'
    else if (!active && !['ready', 'failed', 'canceled', 'unconfirmed'].includes(stage)) stage = 'unconfirmed'
    return { ...world, stage, name: world.name || world.worldId,
      percent: stage === 'ready' ? 100 : Math.min(99, Math.max(0, Math.floor(Number(world.percent) || 0))),
      active: active && !['ready', 'failed', 'canceled', 'unconfirmed'].includes(stage) }
  }).sort((a, b) => Number(Boolean(b.isMaster)) - Number(Boolean(a.isMaster)))
  const ready = worlds.filter(world => world.stage === 'ready').length
  return { worlds, total: worlds.length, ready,
    percent: worlds.length ? Math.floor(worlds.reduce((sum, world) => sum + world.percent, 0) / worlds.length) : null,
    pending: worlds.some(world => ['unconfirmed', 'notStarted', 'canceled'].includes(world.stage)),
    failed: worlds.some(world => world.stage === 'failed') }
}

// These ranges are the existing modupdates service's workflow milestones,
// not estimates of elapsed time. Only bytes provide a download percentage.
export function taskProgress(job = {}) {
  const progress = Number(job.progress) || 0
  const terminal = !isActiveJob(job)
  const failed = job.status === 'failed'
  const canceled = job.status === 'canceled'
  const lifecycle = isWorldProgressJob(job)
  const start = lifecycle && job.kind.endsWith('.start')
  const restart = !job.kind || isRoomModUpdate(job) || lifecycle && !start
  const detail = job.progressDetail || {}
  const worldProgress = worldRestartProgress(job)
  const downloading = detail.stage === 'mod.cache' || (!detail.stage && progress >= 10 && progress < 65)
  const phase = job.status === 'queued' ? 'queued' : lifecycle ? start ? 'starting' : 'restarting' : !restart
    ? downloading ? 'downloading' : progress >= 65 ? 'applying' : 'checking'
    : worldProgress.total || detail.stage === 'world.restart' ? 'restarting'
      : terminal && downloading ? 'downloading'
      : progress >= 80 ? 'restarting'
      : progress >= 65 ? 'waiting'
        : progress >= 10 ? 'downloading' : 'checking'
  const transfer = !terminal && phase === 'downloading' ? globalJobTransfer(job) : null
  const percent = transfer?.totalBytes > 0
    ? Math.min(100, Math.floor(transfer.currentBytes / transfer.totalBytes * 100)) : null
  const stages = lifecycle ? [start ? 'starting' : 'restarting'] : restart ? ['checking', 'downloading', 'restarting'] : ['checking', 'downloading', 'applying']
  const totalItems = Math.max(0, Math.floor(Number(detail.totalItems) || 0))
  return {
    restart,
    lifecycle,
    stages,
    item: { workshopId: String(detail.workshopId || ''), current: Math.min(totalItems, Math.max(0, Math.floor(Number(detail.currentItem) || 0))), total: totalItems },
    phase,
    status: failed || (terminal && worldProgress.failed) ? 'failed' : canceled ? 'canceled' : terminal ? worldProgress.pending ? 'unconfirmed' : 'succeeded' : phase,
    active: !terminal,
    transfer,
    percent: (lifecycle || phase === 'restarting') && worldProgress.total ? worldProgress.percent : terminal ? (job.status === 'succeeded' ? 100 : null) : percent,
    step: lifecycle ? 0 : ['restarting', 'applying'].includes(phase) ? 2 : ['downloading', 'waiting'].includes(phase) ? 1 : 0
  }
}

export function jobElapsedSeconds(job, now = Date.now()) {
  const start = Date.parse(job?.startedAt || job?.createdAt)
  const end = job?.finishedAt ? Date.parse(job.finishedAt) : now
  return Number.isFinite(start) && Number.isFinite(end) ? Math.max(0, Math.floor((end - start) / 1000)) : 0
}

export function retainCompletedProgressJob(items, job, limit = 5) {
  if (!isTaskProgressJob(job) || isActiveJob(job)) return items
  return [job, ...items.filter(item => item.id !== job.id)].slice(0, limit)
}
