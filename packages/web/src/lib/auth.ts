export const BACKEND_URL = import.meta.env.BACKEND_URL ?? 'http://localhost:8080'

export const ACCESS_COOKIE = 'access_token'
export const REFRESH_COOKIE = 'refresh_token'

export function forwardCookies(response: Response): Headers {
  const headers = new Headers()
  for (const cookie of response.headers.getSetCookie()) {
    headers.append('set-cookie', cookie)
  }
  return headers
}
