import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router'

import { BrandMark } from '@/components/BrandMark'
import { Icon, type IconName } from '@/components/Icon'
import { ServiceMark } from '@/components/ServiceMark'
import { MobileNavContext } from '@/components/nav-context'
import { ACCOUNT, SERVICES } from '@/data/mock'
import { useThemeModeState, type ThemeMode } from '@/lib/theme'

type NavItem = { to: string; label: string; icon: IconName; end?: boolean }

const NAV_PRIMARY: NavItem[] = [
  { to: '/', label: 'Workflows', icon: 'grid', end: true },
  { to: '/runs', label: 'Runs', icon: 'activity' },
  { to: '/services', label: 'Services', icon: 'bolt' },
]

const NAV_SECOND: NavItem[] = [
  { to: '/android', label: 'Android client', icon: 'phone' },
  { to: '/settings', label: 'Settings', icon: 'sliders' },
]

const THEME_OPTIONS: { value: ThemeMode; label: string; icon: IconName }[] = [
  { value: 'light', label: 'Light', icon: 'sun' },
  { value: 'dark', label: 'Dark', icon: 'moon' },
  { value: 'system', label: 'System', icon: 'sliders' },
]

function NavItemLink({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      aria-label={item.label}
      className={({ isActive }) =>
        [
          'flex items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[13.5px]',
          isActive ? 'bg-fill font-semibold text-ink' : 'text-mute hover:bg-fill hover:text-ink',
        ].join(' ')
      }
    >
      {({ isActive }) => (
        <>
          <Icon name={item.icon} size={17} className="shrink-0" />
          {collapsed ? null : <span className="truncate">{item.label}</span>}
          {isActive && !collapsed ? (
            <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
          ) : null}
        </>
      )}
    </NavLink>
  )
}

function ThemeSegmented({
  value,
  onChange,
}: {
  value: ThemeMode
  onChange: (mode: ThemeMode) => void
}) {
  return (
    <div className="seg w-full" role="group" aria-label="Appearance">
      {THEME_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          className="flex-1 justify-center"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
        >
          <Icon name={option.icon} size={13} />
          {option.label}
        </button>
      ))}
    </div>
  )
}

function SidebarBody({ collapsed }: { collapsed: boolean }) {
  const connected = SERVICES.filter((service) => service.state !== 'none').slice(0, 5)

  return (
    <>
      <div className="flex items-center gap-2 px-2.5 pb-1 text-[10.5px] font-semibold uppercase tracking-[.09em] text-faint">
        {collapsed ? <span className="mx-auto">·</span> : 'Automation'}
      </div>
      <nav aria-label="Automation" className="flex flex-col gap-0.5">
        {NAV_PRIMARY.map((item) => (
          <NavItemLink key={item.to} item={item} collapsed={collapsed} />
        ))}
      </nav>

      {collapsed ? null : (
        <div className="mt-4 px-2.5 pb-1 text-[10.5px] font-semibold uppercase tracking-[.09em] text-faint">
          Workspace
        </div>
      )}
      <nav aria-label="Workspace" className="flex flex-col gap-0.5">
        {NAV_SECOND.map((item) => (
          <NavItemLink key={item.to} item={item} collapsed={collapsed} />
        ))}
      </nav>

      {collapsed ? null : (
        <div className="mt-5">
          <div className="mb-1.5 flex items-center justify-between px-2">
            <span className="text-[10.5px] font-semibold uppercase tracking-[.09em] text-faint">
              Connected services
            </span>
            <Link to="/services" className="text-[11px] text-mute hover:text-ink">
              Manage
            </Link>
          </div>
          <div className="space-y-0.5">
            {connected.map((service) => (
              <Link
                key={service.id}
                to={`/services?service=${service.id}`}
                className="flex items-center gap-2 rounded-lg px-2 py-[5px] hover:bg-fill"
              >
                <ServiceMark id={service.id} size={21} />
                <span
                  className={`truncate text-[12.5px] ${service.state === 'connected' ? 'text-mute' : 'text-ink'}`}
                >
                  {service.name}
                </span>
                {service.state === 'expired' ? (
                  <span className="ml-auto text-warn" title="Connection expired">
                    <Icon name="alert" size={13} />
                    <span className="sr-only">Connection expired</span>
                  </span>
                ) : null}
              </Link>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

function AccountBox({ collapsed }: { collapsed: boolean }) {
  const [open, setOpen] = useState(false)
  const [theme, setTheme] = useThemeModeState()
  const container = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div className="relative mt-auto pt-3" ref={container}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="flex w-full items-center gap-2.5 rounded-xl p-2 text-left hover:bg-fill"
      >
        <span
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[12px] font-semibold"
          style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
        >
          {ACCOUNT.initials}
        </span>
        {collapsed ? null : (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12.5px] font-semibold">{ACCOUNT.name}</span>
              <span className="block truncate text-[11px] text-mute">{ACCOUNT.email}</span>
            </span>
            <Icon name="chevron-up" size={14} className="text-mute" />
          </>
        )}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Account menu"
          className="card rise absolute bottom-full left-0 z-50 mb-1.5 w-[244px] p-2 shadow-pop"
        >
          <div className="px-2 pb-2 pt-1 text-[10.5px] font-semibold uppercase tracking-[.08em] text-faint">
            Theme
          </div>
          <div className="mb-2">
            <ThemeSegmented value={theme} onChange={setTheme} />
          </div>
          <div className="mt-1 border-t border-line pt-1">
            <Link
              to="/signin"
              className="flex items-center gap-2 rounded-lg px-2 py-2 text-[12.5px] text-mute hover:bg-fill hover:text-ink"
            >
              <Icon name="logout" size={15} />
              Sign out
            </Link>
          </div>
          <p className="flex items-center gap-1.5 px-2 pb-1 pt-2 text-[10.5px] text-faint">
            <Icon name="shield" size={12} />
            Connected to {ACCOUNT.server}
          </p>
        </div>
      ) : null}
    </div>
  )
}

export function AppShell() {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('area.sideCollapsed') === '1')
  const [navOpen, setNavOpen] = useState(false)

  function toggleCollapsed() {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem('area.sideCollapsed', next ? '1' : '0')
  }

  return (
    <div className="h-screen">
      <a href="#main" className="skip">
        Skip to main content
      </a>

      <div className="flex h-full">
        <aside
          className={`hidden shrink-0 flex-col gap-0.5 overflow-hidden p-3 transition-[width] duration-200 ease-out lg:flex ${
            collapsed ? 'w-16' : 'w-[248px]'
          }`}
          style={{ background: 'var(--side)', borderRight: '1px solid var(--line)' }}
        >
          <div className="flex items-center justify-between gap-1 px-1 pb-3 pt-2">
            <Link to="/" className="inline-flex min-w-0 items-center gap-2.5 rounded-lg">
              <BrandMark size={25} />
              {collapsed ? null : (
                <span className="truncate text-[19px] font-semibold leading-none tracking-tight">
                  area<span className="text-accent">.</span>
                </span>
              )}
            </Link>
            <button
              type="button"
              onClick={toggleCollapsed}
              className="btn btn-ghost btn-icon btn-sm shrink-0"
              aria-expanded={!collapsed}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <Icon name={collapsed ? 'chevron-right' : 'chevron-left'} size={15} />
            </button>
          </div>

          <SidebarBody collapsed={collapsed} />
          <AccountBox collapsed={collapsed} />
        </aside>

        <main id="main" tabIndex={-1} className="flex h-screen min-w-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 overflow-hidden">
            <MobileNavContext.Provider value={() => setNavOpen(true)}>
              <Outlet />
            </MobileNavContext.Provider>
          </div>
        </main>
      </div>

      {navOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-[rgba(18,16,22,.38)]"
            onClick={() => setNavOpen(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-label="Navigation"
            className="absolute inset-y-0 left-0 flex w-[268px] flex-col gap-0.5 p-3"
            style={{ background: 'var(--side)', borderRight: '1px solid var(--line)' }}
          >
            <div className="flex items-center justify-between gap-1 px-1 pb-3 pt-2">
              <Link to="/" className="inline-flex items-center gap-2.5">
                <BrandMark size={25} />
                <span className="text-[19px] font-semibold leading-none tracking-tight">
                  area<span className="text-accent">.</span>
                </span>
              </Link>
              <button
                type="button"
                onClick={() => setNavOpen(false)}
                className="btn btn-ghost btn-icon btn-sm"
                aria-label="Close navigation"
              >
                <Icon name="x" size={16} />
              </button>
            </div>
            <div onClick={() => setNavOpen(false)}>
              <SidebarBody collapsed={false} />
            </div>
            <AccountBox collapsed={false} />
          </div>
        </div>
      ) : null}
    </div>
  )
}
