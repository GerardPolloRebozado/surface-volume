import type { ReactNode } from 'react'

import { Icon } from '@/components/Icon'

export function Topbar({
  title,
  subtitle,
  children,
  onOpenNav,
}: {
  title: string
  subtitle?: string
  children?: ReactNode
  onOpenNav?: () => void
}) {
  return (
    <header className="flex h-[56px] shrink-0 items-center gap-3 border-b border-line bg-card px-4 sm:px-6">
      {onOpenNav ? (
        <button
          type="button"
          onClick={onOpenNav}
          className="btn btn-ghost btn-icon btn-sm -ml-1 lg:hidden"
          aria-label="Open navigation"
        >
          <Icon name="list" size={17} />
        </button>
      ) : null}

      <div className="min-w-0 flex-1">
        <h1 className="truncate text-[16px] font-semibold">{title}</h1>
        {subtitle ? <p className="truncate text-[12px] text-mute">{subtitle}</p> : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">{children}</div>
    </header>
  )
}
