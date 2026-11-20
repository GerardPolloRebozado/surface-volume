import { useState } from 'react'

import { Topbar } from '@/components/Topbar'
import { Icon } from '@/components/Icon'
import { Page } from '@/components/Page'

export function SigninRoute() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)

    try {
      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ email, password }),
      })
      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        setError(body.message ?? `Sign in failed (${response.status})`)
        return
      }
      window.location.href = '/workflows'
    } catch {
      setError('Cannot reach the server. Is the backend running?')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <Topbar title="Sign in" subtitle="Workspace access" />

      <div className="scroll flex-1 overflow-auto">
        <Page maxWidth={420}>
          <form className="card p-6" onSubmit={submit}>
            <div className="text-[15px] font-semibold">Welcome back</div>
            <div className="mt-1 text-[12.5px] text-mute">
              Sign in with your Surface Volume account.
            </div>

            <label className="mt-4 block text-[12px] font-medium text-mute" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input mt-1.5 w-full"
              placeholder="you@company.com"
            />

            <label className="mt-3 block text-[12px] font-medium text-mute" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input mt-1.5 w-full"
            />

            {error ? <div className="mt-3 text-[12px] text-bad">{error}</div> : null}

            <button type="submit" className="btn btn-accent mt-4 w-full" disabled={busy}>
              <Icon name="logout" size={15} />
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
            <div className="mt-4 text-center text-[12px] text-mute">
              No account yet?{' '}
              <a href="/register" className="text-accent hover:underline">Create one</a>
            </div>
          </form>
        </Page>
      </div>
    </div>
  )
}
