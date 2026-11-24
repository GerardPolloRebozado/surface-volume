import type { ErrorKind, RunStatus } from '@/data/contract'

export interface RunListItem {
  id: string
  workflowId: string
  status: RunStatus
  mode: string
  queuedAt: string
  startedAt: string | null
  finishedAt: string | null
  errorKind: ErrorKind | null
  errorMessage: string | null
  workflow: { name: string }
}

export async function fetchRuns(token: string, backend: string): Promise<RunListItem[]> {
  try {
    const response = await fetch(`${backend}/runs`, {
      headers: { authorization: `Bearer ${token}` },
    })
    if (!response.ok) return []
    return (await response.json()) as RunListItem[]
  } catch {
    return []
  }
}
