import { Topbar } from '@/components/Topbar'
import { Icon } from '@/components/Icon'
import { ListRow } from '@/components/ListRow'
import { Page } from '@/components/Page'
import { Pill } from '@/components/Pill'
import { ServiceMark } from '@/components/ServiceMark'
import { SERVICES } from '@/data/mock'

export function ServicesRoute() {
  const connected = SERVICES.filter((s) => s.state === 'connected').length

  return (
    <div className="flex h-full flex-col">
      <Topbar title="Services" subtitle="Connections and permissions" />

      <div className="scroll flex-1 overflow-auto">
        <Page>
          <div className="card overflow-hidden p-0">
            <div className="flex items-center justify-between px-4 py-3">
              <h2 className="text-[14px] font-semibold">Your connections</h2>
              <span className="text-[11.5px] text-mute">
                {connected} of {SERVICES.length} connected
              </span>
            </div>
            <div className="h-px bg-line" />
            {SERVICES.map((connection, index) => (
              <div key={connection.id}>
                {index > 0 ? <div className="h-px bg-line" /> : null}
                <ListRow
                  leading={<ServiceMark id={connection.id} size={28} />}
                  content={
                    <>
                      <div className="text-[13px] font-medium">{connection.name}</div>
                      <div className="truncate text-[11.5px] text-mute">{connection.account ?? 'Not connected'}</div>
                    </>
                  }
                  trailing={
                    <>
                      <Pill tone={connection.state === 'connected' ? 'ok' : 'warn'}>
                        {connection.state === 'connected' ? 'Connected' : 'Expired'}
                      </Pill>
                      <button type="button" className="btn btn-sm">
                        {connection.state === 'connected' ? 'Manage' : 'Reconnect'}
                      </button>
                    </>
                  }
                />
              </div>
            ))}
          </div>

          <div className="card flex items-start gap-3 p-4">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
              <Icon name="bolt" size={16} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-semibold">Connect another service</div>
              <div className="mt-0.5 text-[12px] text-mute">
                HoloNet Mail, the Death Star Plans Vault, Rebel Comms, the Jedi
                Archives, Imperial Schedule and the Droid Forge are linked for the
                prototype. More services arrive in the future.
              </div>
            </div>
            <button type="button" className="btn btn-sm btn-accent shrink-0">
              Browse services
            </button>
          </div>
        </Page>
      </div>
    </div>
  )
}
