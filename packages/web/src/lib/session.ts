export interface AuthUser {
  id: string
  email: string
  username: string
  role: string
  status: string
  createdAt: string
}

export function initials(user?: AuthUser): string {
  const source = user?.username || user?.email?.split('@')[0] || '?'
  return source
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export function greeting(user?: AuthUser): string {
  const name = user?.username || user?.email?.split('@')[0] || 'there'
  return `Good morning, ${name}`
}

export function pairingCode(userId: string): string {
  let hash = 0
  for (const char of userId) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const parts = [0, 1, 2].map((i) => {
    const value = (hash >>> (i * 6)) % alphabet.length
    return alphabet[value]
  })
  const tail = (hash % 26) + 65
  return `${parts.join('')}-${String.fromCharCode(tail)}${(hash % 10)}`
}
