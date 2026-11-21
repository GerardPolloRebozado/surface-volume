import { useEffect, useState } from 'react'

import { Topbar } from '@/components/Topbar'
import { Icon } from '@/components/Icon'
import { ListRow } from '@/components/ListRow'
import { Page } from '@/components/Page'
import { Pill } from '@/components/Pill'
import { initials, type AuthUser } from '@/lib/session'
import { readTheme, writeTheme, type ThemeMode } from '@/lib/theme'

export function SettingsRoute({ user }: { user: AuthUser }) {
  const [mode, setMode] = useState<ThemeMode>(readTheme)

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
              {initials(user)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-semibold">{user.username}</div>
              <div className="text-[12px] text-mute">{user.email}</div>
              <div className="mt-1 flex gap-1.5">
                <Pill tone="accent">{user.role}</Pill>
                <Pill>{user.status}</Pill>
              </div>
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
            <div className="mt-0.5 text-[11.5px] text-mute">You can sign back in with your account.</div>
            <a href="/api/auth/signout" className="btn btn-danger mt-3 inline-block">Sign out</a>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-faint">
            <Icon name="info" size={13} />
            <span>Demo data</span>
          </div>
        </Page>
      </div>
    </div>
  )
}
