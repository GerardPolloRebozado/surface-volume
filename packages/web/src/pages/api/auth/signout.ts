import type { APIRoute } from 'astro'
import { BACKEND_URL } from '../../../lib/api-client'
import { forwardCookies } from '../../../lib/auth'

export const GET: APIRoute = async ({ cookies, request }) => {
  const token = cookies.get('access_token')?.value
  let response: Response
  try {
    response = await fetch(`${BACKEND_URL}/auth/sign-out`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
    })
  } catch {
    cookies.delete('access_token', { path: '/' })
    cookies.delete('refresh_token', { path: '/' })
    return new Response(JSON.stringify({ success: true }), { status: 200 })
  }

  const headers = forwardCookies(response)
  if (!response.ok) {
    cookies.delete('access_token', { path: '/' })
    cookies.delete('refresh_token', { path: '/' })
  }
  headers.set('content-type', 'application/json')
  return new Response(JSON.stringify({ success: true }), { status: 200, headers })
}
