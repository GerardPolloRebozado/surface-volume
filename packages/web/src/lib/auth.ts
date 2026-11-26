export { BACKEND_URL, PUBLIC_BACKEND_URL } from './api-client'

export const ACCESS_COOKIE = 'access_token'
export const REFRESH_COOKIE = 'refresh_token'

export function forwardCookies(response: Response): Headers {
  const headers = new Headers()
  for (const cookie of response.headers.getSetCookie()) {
    headers.append('set-cookie', cookie)
  }
  return headers
}

/**
 * Extract set-cookie headers from an axios response (used in Astro API routes
 * with the generated TypeScript client).
 */
export function forwardAxiosCookies(response: { headers?: Record<string, string | string[]> }): Headers {
  const headers = new Headers()
  const cookies = response.headers?.['set-cookie']
  if (cookies) {
    const cookieList = Array.isArray(cookies) ? cookies : [cookies]
    for (const cookie of cookieList) {
      headers.append('set-cookie', cookie)
    }
  }
  return headers
}
