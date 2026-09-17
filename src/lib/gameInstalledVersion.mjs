/* global BigInt */

export function gameInstalledVersionStatus(installation, official) {
  if (installation?.error || installation?.online === false) return { key: 'checkFailed', variant: 'destructive' }
  if (!installation?.installed) return { key: 'notInstalled', variant: 'outline' }
  if (installation.branch === 'updatebeta') return { key: 'testBranch', variant: 'outline' }
  if (installation.branch && installation.branch !== 'public') return { key: 'otherBranch', variant: 'outline' }
  const current = String(installation.gameVersion || '')
  const latest = String(official?.version || '')
  if (installation.branch !== 'public' || official?.stale || official?.check_error || !/^\d+$/.test(current) || !/^\d+$/.test(latest)) {
    return { key: 'unknown', variant: 'outline' }
  }
  if (BigInt(current) === BigInt(latest)) return { key: 'upToDate', variant: 'secondary' }
  if (BigInt(current) < BigInt(latest)) return { key: 'ready', variant: 'default' }
  return { key: 'unknown', variant: 'outline' }
}
