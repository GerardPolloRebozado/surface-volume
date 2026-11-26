import type { RunDetail, WorkflowListItem, WorkflowResource } from '@/data/contract'
import { PUBLIC_BACKEND_URL } from './api-client'

async function request<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${PUBLIC_BACKEND_URL}${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
    // The HttpOnly cookie is sent by the browser; JS never handles a token.
    credentials: 'include',
  })
  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(detail || `Request failed (${response.status})`)
  }
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

/** Used during SSR only, where the cookie is read from the Astro request. */
async function serverRequest<T>(
  path: string,
  token: string,
  backend: string,
): Promise<T> {
  const response = await fetch(`${backend}${path}`, {
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
    },
  })
  if (!response.ok) throw new Error(`Request failed (${response.status})`)
  return (await response.json()) as T
}

export function fetchWorkflows(
  token: string,
  backend: string,
): Promise<WorkflowListItem[]> {
  return serverRequest('/workflows', token, backend)
}

export function fetchWorkflow(
  token: string,
  backend: string,
  id: string,
): Promise<WorkflowResource> {
  return serverRequest(`/workflows/${id}`, token, backend)
}

export function createWorkflow(name: string): Promise<WorkflowResource> {
  return request('/workflows', {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
}

export function saveWorkflow(
  id: string,
  body: { name: string; description?: string; definition: unknown },
): Promise<WorkflowResource> {
  return request(`/workflows/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

export function enableWorkflow(id: string): Promise<WorkflowResource> {
  return request(`/workflows/${id}/enable`, { method: 'POST' })
}

export function disableWorkflow(id: string): Promise<WorkflowResource> {
  return request(`/workflows/${id}/disable`, { method: 'POST' })
}

export function runWorkflow(id: string): Promise<{ runId: string }> {
  return request(`/workflows/${id}/run`, { method: 'POST' })
}

export function deleteWorkflow(id: string): Promise<void> {
  return request(`/workflows/${id}`, { method: 'DELETE' })
}

export function fetchRun(
  token: string,
  backend: string,
  id: string,
): Promise<RunDetail> {
  return serverRequest(`/runs/${id}`, token, backend)
}

/** Browser polling; auth comes from the cookie. */
export function fetchRunById(id: string): Promise<RunDetail> {
  return request(`/runs/${id}`)
}
