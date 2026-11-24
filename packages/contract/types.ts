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

export interface CatalogueField {
  key: string
  label: string
  type: 'string' | 'text' | 'number' | 'boolean' | 'select' | 'datetime' | 'json' | 'file'
  required?: boolean
  secret?: boolean
  helpText?: string
  default?: unknown
  choices?: { value: string; label: string }[]
  list?: boolean
}

export interface CatalogueAuth {
  type: 'none' | 'api_key' | 'basic' | 'oauth2' | 'custom'
  fields: CatalogueField[]
}

export interface AppCatalogueEntry {
  id: string
  name: string
  auth: CatalogueAuth
  triggers: Record<string, string>
  actions: Record<string, string>
  triggerFields: Record<string, CatalogueField[]>
  actionFields: Record<string, CatalogueField[]>
  triggerOutputs: Record<string, CatalogueField[]>
  actionOutputs: Record<string, CatalogueField[]>
}

export type StepStatus =
  | 'pending'
  | 'running'
  | 'succeeded'
  | 'failed'
  | 'skipped'
  | 'not_reached'
  | 'waiting'

export interface RunStep {
  id: string
  runId: string
  nodeId: string
  nodeType: string
  seq: number
  iteration: number
  status: StepStatus
  inputs: Record<string, unknown> | null
  outputs: Record<string, unknown> | null
  branchTaken: string | null
  errorKind: ErrorKind | null
  errorMessage: string | null
  attempts: number
  startedAt: string | null
  finishedAt: string | null
}

export interface RunDetail extends WorkflowRun {
  steps: RunStep[]
}

export interface PlanCall {
  id: string
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  url: string
  headers?: Record<string, string>
  body?: unknown
  outputs?: Record<string, string>
  forEach?: string
  as?: string
}

export interface ActionPlan {
  calls: PlanCall[]
}
