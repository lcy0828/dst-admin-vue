export function artworkPackStatus(status, { loading = false, error = '', pending = false } = {}) {
  if (pending || status?.busy) return { key: 'processing', variant: 'secondary' }
  if (error) return { key: 'checkFailed', variant: 'destructive' }
  if (status?.error === 'invalid_installed_pack') return { key: 'needsRepair', variant: 'destructive' }
  if (status?.installed) return { key: 'installed', variant: 'secondary' }
  if (status?.available) return { key: 'notInstalled', variant: 'outline' }
  return { key: loading ? 'checking' : 'unknown', variant: 'outline' }
}
