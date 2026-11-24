import type { APIRoute } from 'astro'
import { api as apiClient } from '../../../lib/api-client'
import { forwardAxiosCookies } from '../../../lib/auth'

export const GET: APIRoute = async ({ cookies, request }) => {
  const token = cookies.get('access_token')?.value
  try {
    const response = await apiClient.auth.authControllerSignOut({
      headers: {
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
    })

    const headers = forwardAxiosCookies(response as any)
    headers.set('content-type', 'application/json')

    if (response.status < 200 || response.status >= 300) {
      cookies.delete('access_token', { path: '/' })
      cookies.delete('refresh_token', { path: '/' })
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers })
  } catch {
    cookies.delete('access_token', { path: '/' })
    cookies.delete('refresh_token', { path: '/' })
    return new Response(JSON.stringify({ success: true }), { status: 200 })
  }
}
