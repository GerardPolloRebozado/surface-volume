import type { RunDetail, WorkflowListItem, WorkflowResource } from '@/data/contract'

async function request<T>(path: string, token: string, backend: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${backend}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
    },
  })
  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(detail || `Request failed (${response.status})`)
  }
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

export function fetchWorkflows(token: string, backend: string): Promise<WorkflowListItem[]> {
  return request('/workflows', token, backend)
}

export function fetchWorkflow(token: string, backend: string, id: string): Promise<WorkflowResource> {
  return request(`/workflows/${id}`, token, backend)
}

export function createWorkflow(token: string, backend: string, name: string): Promise<WorkflowResource> {
  return request('/workflows', token, backend, {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
}

export function saveWorkflow(
  token: string,
  backend: string,
  id: string,
  body: { name: string; description?: string; definition: unknown },
): Promise<WorkflowResource> {
  return request(`/workflows/${id}`, token, backend, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

export function enableWorkflow(token: string, backend: string, id: string): Promise<WorkflowResource> {
  return request(`/workflows/${id}/enable`, token, backend, { method: 'POST' })
}

export function disableWorkflow(token: string, backend: string, id: string): Promise<WorkflowResource> {
  return request(`/workflows/${id}/disable`, token, backend, { method: 'POST' })
}

export function runWorkflow(token: string, backend: string, id: string): Promise<{ runId: string }> {
  return request(`/workflows/${id}/run`, token, backend, { method: 'POST' })
}

export function deleteWorkflow(token: string, backend: string, id: string): Promise<void> {
  return request(`/workflows/${id}`, token, backend, { method: 'DELETE' })
}

export function fetchRun(token: string, backend: string, id: string): Promise<RunDetail> {
  return request(`/runs/${id}`, token, backend)
}
