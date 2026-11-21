import accountJson from '@contract/fixtures/account.json'
import catalogueJson from '@contract/fixtures/catalogue.json'
import connectionsJson from '@contract/fixtures/connections.json'
import runsJson from '@contract/fixtures/runs.json'
import statsJson from '@contract/fixtures/stats.json'
import workflowsJson from '@contract/fixtures/workflows.json'

import type {
  Account,
  AppCatalogueEntry,
  ConnectionResource,
  DashboardStats,
  WorkflowListItem,
  WorkflowRun,
} from '@contract/types'

export type {
  Account,
  ActionNode,
  AppCatalogueEntry,
  BranchNode,
  Condition,
  ConnectionResource,
  ConnectionStatus,
  DashboardStats,
  DelayNode,
  ErrorKind,
  FilterNode,
  Link,
  LoopNode,
  RunMode,
  RunStatus,
  TriggerNode,
  WorkflowListItem,
  WorkflowNode,
  WorkflowResource,
  WorkflowRun,
} from '@contract/types'

function fixture<T>(value: unknown): T {
  return value as T
}

export const WORKFLOWS = fixture<WorkflowListItem[]>(workflowsJson)
export const RUNS = fixture<WorkflowRun[]>(runsJson)
export const CONNECTIONS = fixture<ConnectionResource[]>(connectionsJson)
export const CATALOGUE = fixture<AppCatalogueEntry[]>(catalogueJson)
export const ACCOUNT = fixture<Account>(accountJson)
export const STATS = fixture<DashboardStats>(statsJson)
