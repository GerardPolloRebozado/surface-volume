import type { CSSProperties } from 'react'

import { Icon, type IconName } from '@/components/Icon'
import { service } from '@/data/mock'
import type { ServiceId } from '@/data/types'

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

export function ServiceMark({ id, size = 20 }: { id: ServiceId; size?: number }) {
  const { color } = service(id)
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
