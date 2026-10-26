export function installationMaintenanceWorlds(preview) {
  return (preview?.plan?.installations || []).flatMap(installation =>
    (installation.shards || []).map(world => ({ ...world, targetName: installation.targetName })))
}

export function installationMaintenanceReady(preview, selected) {
  if (!preview?.ready || !selected || (preview.blockers || []).length) return false
  const identity = preview.installation
  if (identity?.targetId !== selected.targetId || identity?.installationId !== selected.installationId) return false
  if (preview.mode === 'install') return identity.canInstall === true && identity.usageState === 'idle'
  if (preview.mode !== 'release') return false
  const plan = preview.plan
  return plan?.ready === true && plan.policy?.validate === true && /^[a-f0-9]{64}$/.test(plan.planHash || '') &&
    (plan.selectedInstallations || []).length === 1 &&
    plan.selectedInstallations[0].targetId === selected.targetId && plan.selectedInstallations[0].installationId === selected.installationId &&
    installationMaintenanceWorlds(preview).length > 0
}

export function installationMaintenanceRequest(preview, selected) {
  if (!installationMaintenanceReady(preview, selected)) return null
  if (preview.mode === 'install') return { targetId: selected.targetId, installationId: selected.installationId }
  return {
    installations: preview.plan.selectedInstallations.map(value => ({ ...value })),
    policy: { ...preview.plan.policy },
    planHash: preview.plan.planHash,
    confirmation: preview.plan.planHash,
  }
}
