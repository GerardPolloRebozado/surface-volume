export { BACKEND_URL } from './api-client'

export const ACCESS_COOKIE = 'access_token'
export const REFRESH_COOKIE = 'refresh_token'

export function forwardCookies(response: Response): Headers {
  const headers = new Headers()
  for (const cookie of response.headers.getSetCookie()) {
    headers.append('set-cookie', cookie)
  }
  return headers
}
