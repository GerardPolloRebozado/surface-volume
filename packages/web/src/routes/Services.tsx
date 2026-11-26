import { useState } from 'react'

import { Topbar } from '@/components/Topbar'
import { Icon } from '@/components/Icon'
import { ListRow } from '@/components/ListRow'
import { Page } from '@/components/Page'
import { Pill } from '@/components/Pill'
import { ServiceMark } from '@/components/ServiceMark'
import type { AppCatalogueEntry, ConnectionResource } from '@/data/contract'
import { connectApp, disconnect, testConnection } from '@/lib/services'

type Tone = 'ok' | 'bad' | 'warn'

function status(status: ConnectionResource['status']): { label: string; tone: Tone } {
  if (status === 'active') return { label: 'Connected', tone: 'ok' }
  if (status === 'revoked') return { label: 'Disconnected', tone: 'warn' }
  if (status === 'error' || status === 'expired') return { label: 'Needs reconnecting', tone: 'bad' }
  return { label: status, tone: 'warn' }
}

export function ServicesRoute({
  apps,
  connections,
}: {
  apps: AppCatalogueEntry[]
  connections: ConnectionResource[]
}) {
  const [open, setOpen] = useState<string | null>(null)
  const [values, setValues] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const connected = connections.filter((item) => item.status === 'active').length

  async function save(appId: string) {
    setBusy(true)
    setError('')
    try {
      await connectApp(appId, values)
      window.location.reload()
    } catch (err) {
      setError((err as Error).message)
      setBusy(false)
    }
  }

  async function check(id: string) {
    setBusy(true)
    setError('')
    try {
      const result = await testConnection(id)
      if (!result.ok) setError(result.message ?? 'The provider rejected the token')
      window.location.reload()
    } catch (err) {
      setError((err as Error).message)
      setBusy(false)
    }
  }

  async function remove(id: string) {
    setBusy(true)
    setError('')
    try {
      await disconnect(id)
      window.location.reload()
    } catch (err) {
      setError((err as Error).message)
      setBusy(false)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <Topbar title="Services" subtitle="Connections and permissions" />

      <div className="scroll flex-1 overflow-auto">
        <Page>
          {connections.length > 0 ? (
            <div className="card p-0">
              <div className="border-b border-line px-4 py-3 text-[13px] font-semibold">
                Your connections · {connected} of {connections.length} active
              </div>
              {connections.map((item, index) => {
                const current = status(item.status)
                return (
                  <div key={item.id} className={index > 0 ? 'border-t border-line' : ''}>
                    <ListRow
                      leading={<ServiceMark id={item.appId} size={28} />}
                      content={
                        <>
                          <div className="text-[13px] font-medium">{item.appName}</div>
                          <div className="text-[11.5px] text-mute">{item.account ?? 'No account label'}</div>
                        </>
                      }
                      trailing={
                        <>
                          <Pill tone={current.tone}>{current.label}</Pill>
                          <button
                            type="button"
                            className="btn btn-quiet btn-sm"
                            disabled={busy}
                            onClick={() => check(item.id)}
                          >
                            Test
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm btn-danger"
                            disabled={busy}
                            onClick={() => remove(item.id)}
                          >
                            Disconnect
                          </button>
                        </>
                      }
                    />
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="card px-6 py-10 text-center">
              <span className="grid mx-auto h-10 w-10 place-items-center rounded-xl bg-fill text-mute">
                <Icon name="bolt" size={18} />
              </span>
              <div className="mt-3 text-[13px] font-semibold">No connections yet</div>
              <div className="mt-1 text-[12px] text-mute">
                Connect a service below to use it in a workflow.
              </div>
            </div>
          )}

          <div className="mt-5 text-[11px] font-semibold uppercase tracking-[.09em] text-faint">
            Available services
          </div>
          <div className="mt-2 card p-0">
            {apps.map((app, index) => {
              const fields = app.auth.fields ?? []
              const isOpen = open === app.id
              return (
                <div key={app.id} className={index > 0 ? 'border-t border-line' : ''}>
                  <ListRow
                    leading={<ServiceMark id={app.id} size={28} />}
                    content={
                      <>
                        <div className="text-[13px] font-medium">{app.name}</div>
                        <div className="text-[11.5px] text-mute">
                          {Object.keys(app.triggers).length} triggers · {Object.keys(app.actions).length} actions
                        </div>
                      </>
                    }
                    trailing={
                      fields.length > 0 ? (
                        <button
                          type="button"
                          className="btn btn-sm btn-accent"
                          onClick={() => {
                            setOpen(isOpen ? null : app.id)
                            setValues({})
                            setError('')
                          }}
                        >
                          {isOpen ? 'Close' : 'Connect'}
                        </button>
                      ) : (
                        <Pill>OAuth only</Pill>
                      )
                    }
                  />
                  {isOpen ? (
                    <div className="border-t border-line px-4 py-4">
                      {fields.map((field) => (
                        <label key={field.key} className="mb-3 block">
                          <span className="label">{field.label}</span>
                          <input
                            className="input mt-1"
                            type={field.secret ? 'password' : 'text'}
                            value={values[field.key] ?? field.default ?? ''}
                            placeholder={field.key === 'instanceUrl' ? 'https://mastodon.social' : ''}
                            onChange={(event) =>
                              setValues((current) => ({ ...current, [field.key]: event.target.value }))
                            }
                          />
                          {field.helpText ? <span className="hint mt-1 block">{field.helpText}</span> : null}
                        </label>
                      ))}
                      {error ? <div className="err mb-3">{error}</div> : null}
                      <button
                        type="button"
                        className="btn btn-accent btn-sm"
                        disabled={busy}
                        onClick={() => save(app.id)}
                      >
                        {busy ? 'Connecting…' : `Connect ${app.name}`}
                      </button>
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        </Page>
      </div>
    </div>
  )
}
