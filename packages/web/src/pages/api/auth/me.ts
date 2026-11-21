import type { APIRoute } from 'astro'
import { BACKEND_URL } from '../../../lib/auth'

export const GET: APIRoute = async ({ cookies }) => {
  const token = cookies.get('access_token')?.value
  if (!token) return new Response(JSON.stringify({ message: 'Not signed in' }), { status: 401 })

  let response: Response
  try {
    response = await fetch(`${BACKEND_URL}/auth/me`, {
      headers: { authorization: `Bearer ${token}` },
    })
  } catch {
    return new Response(JSON.stringify({ message: 'Backend unavailable' }), { status: 502 })
  }
  return new Response(await response.text(), {
    status: response.status,
    headers: { 'content-type': 'application/json' },
  })
}
