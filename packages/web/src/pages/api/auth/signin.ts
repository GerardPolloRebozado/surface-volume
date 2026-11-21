import type { APIRoute } from 'astro'
import { BACKEND_URL } from '../../../lib/api-client'
import { forwardCookies } from '../../../lib/auth'

export const POST: APIRoute = async ({ request }) => {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return new Response(JSON.stringify({ message: 'Invalid JSON' }), { status: 400 })
  }

  let response: Response
  try {
    response = await fetch(`${BACKEND_URL}/auth/sign-in`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {
    return new Response(JSON.stringify({ message: 'Backend unavailable' }), { status: 502 })
  }

  const headers = forwardCookies(response)
  headers.set('content-type', 'application/json')
  return new Response(await response.text(), { status: response.status, headers })
}
