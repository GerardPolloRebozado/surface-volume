import {
  CATALOGUE,
  CONNECTIONS,
  RUNS,
  STATS as API_STATS,
  WORKFLOWS,
} from '@/data/contract'
import type { WorkflowListItem } from '@/data/contract'
import type { Service, ServiceId, ServiceState, WorkflowStatus } from '@/data/types'

export const NOW = new Date('2026-11-16T09:18:00+01:00')

const SERVICE_COLORS: Record<string, string> = {
  gmail: '#b3261e',
  drive: '#17764a',
  slack: '#6a3d9a',
  notion: '#3a3a40',
  calendar: '#1b6fc4',
  github: '#43434a',
  linear: '#6150a8',
  stripe: '#4a3f8f',
  webhook: '#8a5a00',
  discord: '#4756a8',
}

const NEUTRAL = '#5a5a63'

function connectionState(appId: string): ServiceState {
  const connection = CONNECTIONS.find((candidate) => candidate.appId === appId)
  if (!connection) return 'none'
  return connection.status === 'active' ? 'connected' : 'expired'
}

export const SERVICES: Service[] = CATALOGUE.map((entry) => ({
  id: entry.id,
  name: entry.name,
  color: SERVICE_COLORS[entry.id] ?? NEUTRAL,
  state: connectionState(entry.id),
  account: CONNECTIONS.find((candidate) => candidate.appId === entry.id)?.account ?? null,
}))

const BY_ID = new Map(SERVICES.map((item) => [item.id, item]))

export function service(id: ServiceId): Service {
  return (
    BY_ID.get(id) ?? {
      id,
      name: id,
      color: NEUTRAL,
      state: 'none',
      account: null,
    }
  )
}

const EXTRA_WORKFLOWS: WorkflowListItem[] = []

export function allWorkflows(): WorkflowListItem[] {
  return [...WORKFLOWS, ...EXTRA_WORKFLOWS]
}

export function addWorkflow(item: WorkflowListItem): void {
  EXTRA_WORKFLOWS.unshift(item)
}

export function workflow(id: string): WorkflowListItem | undefined {
  return allWorkflows().find((item) => item.workflow.id === id)
}

export function statusOf(item: WorkflowListItem): WorkflowStatus {
  switch (item.workflow.status) {
    case 'on':
      return 'on'
    case 'off':
      return 'off'
    case 'draft':
      return 'draft'
    case 'error':
      return 'attention'
  }
}

export function expiredService(item: WorkflowListItem): ServiceId | null {
  if (item.workflow.status !== 'error') return null
  return item.services.find((id) => service(id).state !== 'connected') ?? null
}

export const ACTIVITY = RUNS.map((run) => {
  const item = WORKFLOWS.find((candidate) => candidate.workflow.id === run.workflowId)
  return {
    run,
    workflowName: item?.workflow.name ?? 'Workflow',
    appId: item?.workflow.trigger.appId ?? 'webhook',
  }
})

export const STATS = {
  ...API_STATS,
  perDay: API_STATS.runsPerDay,
}

export { WORKFLOWS }
