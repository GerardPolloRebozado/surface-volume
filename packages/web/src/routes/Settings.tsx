import { useEffect, useState } from 'react'

import { Topbar } from '@/components/Topbar'
import { Icon } from '@/components/Icon'
import { ListRow } from '@/components/ListRow'
import { Page } from '@/components/Page'
import { Pill } from '@/components/Pill'
import { ACCOUNT } from '@/data/mock'
import { readTheme, writeTheme, type ThemeMode } from '@/lib/theme'

export function SettingsRoute() {
  const [mode, setMode] = useState<ThemeMode>(readTheme)
  const [signedIn, setSignedIn] = useState(true)

  useEffect(() => {
    writeTheme(mode)
  }, [mode])

  return (
    <div className="flex h-full flex-col">
      <Topbar title="Settings" subtitle="Workspace and account" />

      <div className="scroll flex-1 overflow-auto">
        <Page maxWidth={720}>
          <div className="card flex items-center gap-4 p-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-accent-soft text-[15px] font-semibold text-accent">
              {ACCOUNT.initials}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-semibold">{ACCOUNT.name}</div>
              <div className="text-[12px] text-mute">{ACCOUNT.email}</div>
              <Pill tone="accent" className="mt-1">
                Prototype account
              </Pill>
            </div>
          </div>

          <div className="card p-0">
            <ListRow
              leading={<Icon name="sliders" size={16} className="text-mute" />}
              content={
                <>
                  <div className="text-[13px] font-medium">Dark mode</div>
                  <div className="text-[11.5px] text-mute">Follows your system setting until you toggle it here.</div>
                </>
              }
              trailing={
                <button
                  type="button"
                  role="switch"
                  aria-checked={mode === 'dark'}
                  className="sw"
                  onClick={() => setMode(mode === 'dark' ? 'light' : 'dark')}
                />
              }
            />
            <div className="h-px bg-line" />
            <ListRow
              leading={<Icon name="shield" size={16} className="text-mute" />}
              content={
                <>
                  <div className="text-[13px] font-medium">Sessions</div>
                  <div className="text-[11.5px] text-mute">Signed in on this device. Sessions expire after 30 days.</div>
                </>
              }
            />
          </div>

          <div className="card p-4">
            <div className="text-[13px] font-semibold">Sign out</div>
            <div className="mt-0.5 text-[11.5px] text-mute">You can sign back in with any email in the prototype.</div>
            <button
              type="button"
              className="btn btn-danger mt-3"
              onClick={() => setSignedIn(false)}
              disabled={!signedIn}
            >
              Sign out
            </button>
            {!signedIn ? <div className="mt-2 text-[11.5px] text-mute">Signed out.</div> : null}
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-faint">
            <Icon name="info" size={13} />
            <span>Mock data</span>
          </div>
        </Page>
      </div>
    </div>
  )
}
