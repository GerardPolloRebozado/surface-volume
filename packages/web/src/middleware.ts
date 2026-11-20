import { defineMiddleware } from 'astro:middleware'
import { ACCESS_COOKIE, BACKEND_URL } from './lib/auth'
import type { AuthUser } from './lib/session'

export const onRequest = defineMiddleware(async (context, next) => {
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
    const response = await fetch(`${BACKEND_URL}/auth/me`, {
      headers: { authorization: `Bearer ${token}` },
    })
    if (!response.ok) throw new Error('unauthorized')
    context.locals.user = (await response.json()) as AuthUser
  } catch {
    context.cookies.delete(ACCESS_COOKIE, { path: '/' })
    context.cookies.delete('refresh_token', { path: '/' })
    return context.redirect('/signin')
  }

  return next()
})
