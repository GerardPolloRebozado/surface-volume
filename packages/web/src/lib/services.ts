import type { AppCatalogueEntry, ConnectionResource } from '@/data/contract'

async function request<T>(path: string, token: string, backend: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${backend}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  })
  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(detail || `Request failed (${response.status})`)
  }
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

export function fetchApps(token: string, backend: string): Promise<AppCatalogueEntry[]> {
  return request('/apps', token, backend)
}

export function fetchConnections(token: string, backend: string): Promise<ConnectionResource[]> {
  return request('/connections', token, backend)
}

export function connectApp(
  token: string,
  backend: string,
  appId: string,
  credentials: Record<string, string>,
): Promise<ConnectionResource> {
  return request('/connections', token, backend, {
    method: 'POST',
    body: JSON.stringify({ appId, credentials }),
  })
}

export function testConnection(token: string, backend: string, id: string): Promise<{ ok: boolean; message?: string }> {
  return request(`/connections/${id}/test`, token, backend, { method: 'POST' })
}

export function disconnect(token: string, backend: string, id: string): Promise<void> {
  return request(`/connections/${id}`, token, backend, { method: 'DELETE' })
}
