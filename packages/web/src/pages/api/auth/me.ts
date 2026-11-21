import type { APIRoute } from 'astro'
import { api as apiClient } from '../../../lib/api-client'

export const GET: APIRoute = async ({ cookies, request }) => {
  const token = cookies.get('access_token')?.value
  if (!token) return new Response(JSON.stringify({ message: 'Not signed in' }), { status: 401 })

  try {
    const response = await apiClient.auth.authControllerGetMe({
      headers: {
        authorization: `Bearer ${token}`,
      },
    })
    return new Response(JSON.stringify(response.data), {
      status: response.status,
      headers: { 'content-type': 'application/json' },
    })
  } catch {
    return new Response(JSON.stringify({ message: 'Backend unavailable' }), { status: 502 })
  }
}
