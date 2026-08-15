export const BACKEND_CAPABILITIES = Object.freeze({
  backups: Object.freeze({
    restoreToOriginalRoom: true,
    restoreToNewRoom: false
  }),
  distributedManagement: Object.freeze({
    runtimeOverview: true,
    resumableRuntimeEvents: true,
    placementMigration: true,
    networkProfiles: true,
    cpuAllocation: true,
    consistentBackupSets: true,
    placementAwareDiagnostics: true,
    experimentalKubernetesProvider: true
  })
})

export function legacyPayload(response, fallback) {
  if (response && typeof response === 'object' && Object.hasOwn(response, 'data')) {
    return response.data ?? fallback
  }
  return response ?? fallback
}

export function roomNamesFromResponse(response) {
  const rooms = legacyPayload(response, [])
  if (!Array.isArray(rooms)) return []

  return [...new Set(rooms
    .map(room => room?.savename || room?.name)
    .filter(Boolean))]
}

export function buildBackupCatalog(response) {
  const groups = legacyPayload(response, {})
  if (!groups || typeof groups !== 'object' || Array.isArray(groups)) {
    return { archives: [], backups: [] }
  }

  const archives = Object.keys(groups)
  const backups = archives.flatMap(archive => {
    const entries = Array.isArray(groups[archive]) ? groups[archive] : []
    return entries.map(backup => ({
      ...backup,
      archive_name: backup.archive_name || archive
    }))
  })

  return { archives, backups }
}
