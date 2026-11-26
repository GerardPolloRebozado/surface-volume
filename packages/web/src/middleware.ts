import { defineMiddleware } from 'astro:middleware'
import { api as apiClient } from './lib/api-client'
import { ACCESS_COOKIE } from './lib/auth'
import { normalizedRoute, withWebRequestSpan } from './lib/telemetry'
import type { AuthUser } from './lib/session'

export const onRequest = defineMiddleware((context, next) =>
  withWebRequestSpan(
    normalizedRoute(context.request.method, context.url.pathname),
    async () => {
      const { pathname } = context.url
      const publicPaths = ['/', '/signin', '/register']
      const isPublic =
        publicPaths.includes(pathname) ||
        pathname.startsWith('/api/auth') ||
        pathname.startsWith('/_astro') ||
        pathname.startsWith('/favicon')

      if (pathname === '/' && context.cookies.get(ACCESS_COOKIE)?.value) {
        return context.redirect('/workflows')
      }

      if (isPublic) return next()

      const token = context.cookies.get(ACCESS_COOKIE)?.value
      if (!token) return context.redirect('/signin')

      try {
        const response = await apiClient.auth.authControllerGetMe({
          headers: { authorization: `Bearer ${token}` },
        })
        context.locals.user = response.data as AuthUser
      } catch {
        context.cookies.delete(ACCESS_COOKIE, { path: '/' })
        context.cookies.delete('refresh_token', { path: '/' })
        return context.redirect('/signin')
      }

      return next()
    },
  ),
)
