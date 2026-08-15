export type RuntimeFreshness = 'live' | 'stale' | 'unavailable'
export type RuntimeShardState = 'healthy' | 'degraded' | 'unavailable'
export type RuntimeProcessState = 'running' | 'stopped' | 'starting' | 'failed' | 'unknown'

export interface RuntimeProblem {
  code: string
  message: string
}

export interface RuntimeArtifact<T> {
  available: boolean
  freshness: RuntimeFreshness
  ageSeconds?: number
  observedAt?: string
  health?: T
  diagnostic?: T
  problem?: RuntimeProblem
}

export interface RuntimeOverviewShard {
  worldId: string
  worldName: string
  worldRole: 'master' | 'caves' | 'custom'
  state: RuntimeShardState
  placement: TopologyPlacement
  target?: TopologyTarget
  runtime: {
    state: RuntimeProcessState
    code?: string
    message?: string
    sessionExists: boolean
  }
  runtimeProblem?: RuntimeProblem
  health: RuntimeArtifact<RuntimeHealth>
  latestDiagnostic: RuntimeArtifact<RuntimeDiagnostic>
}

export interface RuntimeOverview {
  roomId: string
  topologyRevision: string
  remoteExecutionReady: boolean
  summary: Record<'total' | 'healthy' | 'degraded' | 'unavailable' | 'running' | 'stopped' | 'planned', number>
  shards: RuntimeOverviewShard[]
  targets: TopologyTarget[]
  issues: Array<{ code: string; severity: 'info' | 'warning' | 'error'; message: string; targetId?: string; worldId?: string }>
  observedAt: string
}

export interface TopologyPlacement {
  worldId: string
  worldName: string
  worldRole: 'master' | 'caves' | 'custom'
  desiredTargetId: string
  appliedTargetId: string
  state: string
  observedTargetIds: string[]
}

export interface TopologyTarget {
  id: string
  name: string
  kind: 'local' | 'agent'
  online: boolean
  configured: boolean
}

export interface RuntimeHealth {
  producerVersion: string
  producerInstanceId: string
  running: boolean
  ready: boolean
  writing: boolean
  lastError?: string
}

export interface RuntimeDiagnostic {
  requestId: string
  profile: 'summary' | 'prefab' | 'performance'
  ok: boolean
  code: string
  message: string
  result?: Record<string, unknown>
  completedAtUnix: number
}

export interface CPUInventory {
  logical_processors: number
  physical_cores: number
  physical_core_source: string
  physical_core_estimated: boolean
  topology_available: boolean
  smt_detected: boolean
  threads?: Array<{ logical_id: number; package_id: string; core_id: string }>
}

export interface RuntimeInfrastructure {
  providers: Array<{ id: string; targetId: string; kind: 'local' | 'agent'; displayName: string; os: string; arch: string; online: boolean; capabilities: string[]; observedAt?: string }>
  environments: Array<{ id: string; providerId: string; targetId: string; kind: 'native' | 'container'; driver: string; networkProfileId: string; cpu: CPUInventory; observedAt?: string }>
  networkProfiles: Array<{ id: string; environmentId: string; name: string; mode: 'host' | 'bridge'; scopeId: string; bindAddress: string; advertiseAddress: string }>
  portReservations: Array<{ id: string; environmentId: string; networkProfileId: string; scopeId: string; targetId: string; roomId?: string; worldId?: string; purpose: string; protocol: string; port: number; managed: boolean }>
  cpuAllocations: Array<{
    id: string
    environmentId: string
    targetId: string
    roomId: string
    worldId: string
    policy: 'none' | 'shared' | 'exclusive'
    logicalCpuIds: number[]
    allowSmtSiblingRisk: boolean
    warnings: string[]
    executionState: 'desired' | 'prepared' | 'applied' | 'released' | 'failed'
    executionError?: string
    observed?: {
      policy: 'none' | 'shared' | 'exclusive'
      logical_cpu_ids: number[]
      effective_cpu_ids: number[]
      state: 'unknown' | 'prepared' | 'applied' | 'released'
      runtime_kind: 'native' | 'container'
      instance_id?: string
      enforced: boolean
      instance_running: boolean
      observed_at: string
    }
  }>
  preflight: { ready: boolean; warnings: string[]; conflicts: Array<{ code: string; message: string; scopeId?: string; port?: number; targetId?: string; roomId?: string; worldId?: string }> }
  observedAt: string
}

export type KubernetesProviderStatus = 'disabled' | 'configuration_required' | 'available'

export interface KubernetesFeature {
  id: 'observe' | 'preflight' | 'typed_plan' | 'apply' | 'lifecycle' | 'console' | 'mods' | 'backup_restore'
  available: boolean
  code?: string
}

export interface KubernetesSafetyGate {
  id: 'lease_fencing_admission' | 'lease_aware_supervisor' | 'pod_uid_ownership' | 'pvc_uid_ownership' | 'network_policy' | 'secondary_master_dns' | 'published_udp' | 'exclusive_cpu'
  satisfied: boolean
}

export interface KubernetesStorageProfile {
  id: string
  storageClassName: string
  accessMode: 'ReadWriteOnce' | 'ReadWriteOncePod'
  reclaimPolicy: 'Retain'
  bindingMode: 'Immediate' | 'WaitForFirstConsumer'
  dynamicProvisioning: boolean
  minimumGiB: number
  maximumGiB: number
  snapshotCapable: boolean
}

export interface KubernetesComputeProfile {
  id: string
  nodeSelector?: Record<string, string>
}

export interface KubernetesProviderSummary {
  id: string
  namespace: string
  runtimeImage: string
  maximumObservationSeconds: number
  capabilities: Record<string, boolean>
  storageProfiles: KubernetesStorageProfile[]
  computeProfiles: KubernetesComputeProfile[]
}

export interface KubernetesRuntimeService {
  release: 'experimental'
  enabled: boolean
  configured: boolean
  status: KubernetesProviderStatus
  applyAllowed: false
  errorCode?: string
  errorMessage?: string
  provider?: KubernetesProviderSummary
  features: KubernetesFeature[]
  safetyGates: KubernetesSafetyGate[]
}

export interface KubernetesShardRef {
  providerId: string
  roomId: string
  worldId: string
}

export interface KubernetesResourceObservation {
  exists: boolean
  uid?: string
  resourceVersion?: string
  labels?: Record<string, string>
  annotations?: Record<string, string>
}

export interface KubernetesObservation {
  ref: KubernetesShardRef
  statefulSet: KubernetesResourceObservation
  pod: KubernetesResourceObservation & { phase?: string; deletionTimestamp?: string }
  pvc: KubernetesResourceObservation & { phase?: string; storageClassName?: string; accessModes?: string[]; reclaimPolicy?: string; capacityGiB?: number }
  service: KubernetesResourceObservation
  publishedService: KubernetesResourceObservation
  networkPolicy: KubernetesResourceObservation
  cpu: { computeProfileId: string; observedAt: string; stale: boolean; [key: string]: string | number | boolean }
  observedAt: string
  stale: boolean
}

export interface KubernetesPreflightReport {
  release: 'experimental'
  ready: boolean
  issues: Array<{ code: string; field?: string; message: string }>
  warnings: Array<{ code: string; field?: string; message: string }>
}

export interface KubernetesPreview {
  observation: KubernetesObservation
  preflight: KubernetesPreflightReport
  mutation?: Record<string, unknown>
  applyAllowed: false
}

export interface DistributedBackupPart {
  id: string
  setId: string
  roomId: string
  worldId: string
  worldName: string
  targetId: string
  installationId: string
  cluster: string
  shard: string
  status: 'pending' | 'staging' | 'verified' | 'failed'
  size: number
  contentSize: number
  fileCount: number
  sha256?: string
  failure?: string
}

export interface DistributedBackupSet {
  id: string
  roomId: string
  roomName: string
  name: string
  kind: 'manual' | 'protection'
  mode: 'cold-consistent'
  manifestVersion: number
  topologyRevision: string
  sharedSha256?: string
  status: 'creating' | 'verified' | 'partial' | 'failed' | 'corrupt'
  size: number
  contentSize: number
  fileCount: number
  originalRunningWorlds: string[]
  manifestSha256?: string
  failure?: string
  sourceJobId?: string
  verifiedAt?: string
  createdAt: string
  updatedAt: string
  parts: DistributedBackupPart[]
}
