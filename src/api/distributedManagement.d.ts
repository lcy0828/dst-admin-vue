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
  cpuAllocations: Array<{ id: string; environmentId: string; targetId: string; roomId: string; worldId: string; policy: 'none' | 'shared' | 'exclusive'; logicalCpuIds: number[]; allowSmtSiblingRisk: boolean; warnings: string[] }>
  preflight: { ready: boolean; warnings: string[]; conflicts: Array<{ code: string; message: string; roomId?: string; worldId?: string }> }
  observedAt: string
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
