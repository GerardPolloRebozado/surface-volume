import type { ReactNode } from 'react'

const TONE_CLASS = {
  ok: 'bg-ok-soft text-ok',
  bad: 'bg-bad-soft text-bad',
  warn: 'bg-warn-soft text-warn',
  accent: 'bg-accent-soft text-accent',
  neutral: 'bg-fill text-mute',
} as const

export function Pill({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode
  tone?: keyof typeof TONE_CLASS
  className?: string
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${TONE_CLASS[tone]} ${className ?? ''}`}
    >
      {children}
    </span>
  )
}
