import type { AppCatalogueEntry, ConnectionResource } from '@/data/contract'
import { PUBLIC_BACKEND_URL } from './api-client'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${PUBLIC_BACKEND_URL}${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
    credentials: 'include',
  })
  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(detail || `Request failed (${response.status})`)
  }
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

/** Used during SSR only. */
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

export function fetchApps(
  token: string,
  backend: string,
): Promise<AppCatalogueEntry[]> {
  return serverRequest('/apps', token, backend)
}

export function fetchConnections(
  token: string,
  backend: string,
): Promise<ConnectionResource[]> {
  return serverRequest('/connections', token, backend)
}

export function connectApp(
  appId: string,
  credentials: Record<string, string>,
): Promise<ConnectionResource> {
  return request('/connections', {
    method: 'POST',
    body: JSON.stringify({ appId, credentials }),
  })
}

export function testConnection(
  id: string,
): Promise<{ ok: boolean; message?: string }> {
  return request(`/connections/${id}/test`, { method: 'POST' })
}

export function disconnect(id: string): Promise<void> {
  return request(`/connections/${id}`, { method: 'DELETE' })
}
