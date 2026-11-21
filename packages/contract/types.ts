import type {
  Workflow,
  WorkflowNode,
  TriggerNode,
  Link,
  Condition,
  ActionNode,
  FilterNode,
  DelayNode,
  BranchNode,
  LoopNode,
} from '../backend-nestjs/src/workflow/workflow.types'

export type {
  Workflow,
  WorkflowNode,
  TriggerNode,
  Link,
  Condition,
  ActionNode,
  FilterNode,
  DelayNode,
  BranchNode,
  LoopNode,
}

export type WorkflowStatus = Workflow['status']

export interface WorkflowResource extends Workflow {
  description: string | null
  statusReason: string | null
  lastRunAt: string | null
}

export type RunStatus =
  | 'queued'
  | 'running'
  | 'waiting'
  | 'succeeded'
  | 'failed'
  | 'cancelled'

export type RunMode = 'live' | 'test' | 'manual' | 'retry'

export type ErrorKind = 'retryable' | 'fatal' | 'auth_expired' | 'rate_limited'

export interface WorkflowRun {
  id: string
  workflowId: string
  versionId: string
  mode: RunMode
  status: RunStatus
  queuedAt: string
  startedAt: string | null
  finishedAt: string | null
  errorNodeId: string | null
  errorKind: ErrorKind | null
  errorMessage: string | null
}

export type ConnectionStatus = 'active' | 'expired' | 'revoked' | 'error'

export interface ConnectionResource {
  id: string
  appId: string
  appName: string
  account: string | null
  status: ConnectionStatus
}

export interface WorkflowListItem {
  workflow: WorkflowResource
  services: string[]
  lastRun: WorkflowRun | null

  runsLast7Days: number[]
}

export interface DashboardStats {
  weekRuns: number
  failed: number
  successRate: number
  delta: number
  runsToday: number
  runsPerDay: number[]
}

export interface Account {
  id: string
  name: string
  email: string
  plan: string
}

export interface AppCatalogueEntry {
  id: string
  name: string
  triggers: Record<string, string>
  actions: Record<string, string>
}
