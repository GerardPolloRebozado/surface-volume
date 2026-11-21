import { useState } from 'react'

import { Icon } from '@/components/Icon'
import { Page } from '@/components/Page'

export function RegisterRoute() {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)

    if (password.length < 12) {
      setError('Password must be at least 12 characters.')
      setBusy(false)
      return
    }

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ username, email, password }),
      })

      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        setError(body.message ?? `Registration failed (${response.status})`)
        return
      }

      const signIn = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ email, password }),
      })
      if (!signIn.ok) {
        setError('Account created, but sign in failed. Please sign in manually.')
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
    <div className="min-h-screen bg-win px-4 py-12 text-ink">
      <div className="mb-8 text-center text-[20px] font-black tracking-tighter">
        area<span className="text-accent">.</span>
      </div>
      <Page maxWidth={420}>
        <form className="card p-6" onSubmit={submit}>
          <div className="text-[15px] font-semibold">Create your account</div>
          <div className="mt-1 text-[12.5px] text-mute">
            Start automating in less than a minute.
          </div>

          <label className="mt-4 block text-[12px] font-medium text-mute" htmlFor="username">
            Username
          </label>
          <input
            id="username"
            type="text"
            autoComplete="username"
            required
            maxLength={64}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="input mt-1.5 w-full"
          />

          <label className="mt-3 block text-[12px] font-medium text-mute" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input mt-1.5 w-full"
          />

          <label className="mt-3 block text-[12px] font-medium text-mute" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={12}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input mt-1.5 w-full"
          />
          <div className="mt-1 text-[11px] text-faint">At least 12 characters.</div>

          {error ? <div className="mt-3 text-[12px] text-bad">{error}</div> : null}

          <button type="submit" className="btn btn-accent mt-4 w-full" disabled={busy}>
            <Icon name="plus" size={15} />
            {busy ? 'Creating…' : 'Create account'}
          </button>

          <div className="mt-4 text-center text-[12px] text-mute">
            Already have an account?{' '}
            <a href="/signin" className="text-accent hover:underline">Sign in</a>
          </div>
        </form>
      </Page>
    </div>
  )
}
