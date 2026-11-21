import type { ReactNode } from 'react'

export function ListRow({
  leading,
  content,
  trailing,
}: {
  leading?: ReactNode
  content: ReactNode
  trailing?: ReactNode
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      {leading ? <div className="shrink-0">{leading}</div> : null}
      <div className="min-w-0 flex-1">{content}</div>
      {trailing ? <div className="flex shrink-0 items-center gap-2">{trailing}</div> : null}
    </div>
  )
}
