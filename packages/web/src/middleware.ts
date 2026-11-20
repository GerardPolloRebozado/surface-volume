import { defineMiddleware } from 'astro:middleware'
import { ACCESS_COOKIE } from './lib/auth'

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url
  const publicPaths = ['/', '/signin']
  const isPublic =
    publicPaths.includes(pathname) ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/_astro') ||
    pathname.startsWith('/favicon')

  if (isPublic || context.cookies.get(ACCESS_COOKIE)?.value) {
    return next()
  }
  return context.redirect('/signin')
})
