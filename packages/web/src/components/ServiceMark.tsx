import type { CSSProperties } from 'react'

import { Icon, type IconName } from '@/components/Icon'

const SERVICE_ICON: Record<string, IconName> = {
  gmail: 'mail',
  drive: 'folder',
  slack: 'hash',
  notion: 'page',
  calendar: 'calendar',
  github: 'github',
  linear: 'layers',
  stripe: 'card',
  webhook: 'code',
  discord: 'chat',
}

const SERVICE_COLOR: Record<string, string> = {
  gmail: '#b3261e',
  drive: '#17764a',
  slack: '#6a3d9a',
  notion: '#3a3a40',
  calendar: '#1b6fc4',
  github: '#43434a',
  linear: '#6150a8',
  stripe: '#4a3f8f',
  webhook: '#8a5a00',
  discord: '#4756a8',
}

export function ServiceMark({ id, size = 20 }: { id: string; size?: number }) {
  const color = SERVICE_COLOR[id] ?? '#5a5a63'
  return (
    <span
      className="svc"
      style={{ width: size, height: size, '--svc': color } as CSSProperties}
      aria-hidden="true"
    >
      <Icon name={SERVICE_ICON[id] ?? 'bolt'} size={Math.round(size * 0.53)} />
    </span>
  )
}
