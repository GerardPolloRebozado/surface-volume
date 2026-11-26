import type { APIRoute } from 'astro'
import { api as apiClient } from '../../../lib/api-client'
import { forwardAxiosCookies } from '../../../lib/auth'

export const POST: APIRoute = async ({ request }) => {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return new Response(JSON.stringify({ message: 'Invalid JSON' }), { status: 400 })
  }

  try {
    const signUpDto = body as { username: string; email: string; password: string }
    const response = await apiClient.auth.authControllerSignUp({
      username: signUpDto.username.trim(),
      email: signUpDto.email.trim(),
      password: signUpDto.password,
    })

    const headers = forwardAxiosCookies(response as any)
    headers.set('content-type', 'application/json')
    return new Response(JSON.stringify(response.data), {
      status: response.status,
      headers,
    })
  } catch (error: any) {
    const status = error?.response?.status ?? 502
    const backendMessage = error?.response?.data?.message
    const message = Array.isArray(backendMessage)
      ? backendMessage.join(', ')
      : backendMessage ?? 'Backend unavailable'
    return new Response(JSON.stringify({ message }), {
      status,
      headers: { 'content-type': 'application/json' },
    })
  }
}
