import { Link } from 'react-router'

import { Icon, type IconName } from '@/components/Icon'
import { Topbar } from '@/components/Topbar'

export function PlaceholderRoute({
  title,
  subtitle,
  icon,
  body,
}: {
  title: string
  subtitle?: string
  icon: IconName
  body: string
}) {
  return (
    <div className="flex h-full flex-col">
      <Topbar title={title} subtitle={subtitle} />
      <div className="scroll flex-1 overflow-auto">
        <div className="mx-auto max-w-[720px] px-6 py-12">
          <div className="card p-8 text-center">
            <span
              className="mb-4 inline-grid h-12 w-12 place-items-center rounded-2xl"
              style={{ background: 'var(--fill)', color: 'var(--mute)' }}
            >
              <Icon name={icon} size={22} />
            </span>
            <h2 className="text-[17px] font-semibold">{title} is next</h2>
            <p className="mx-auto mt-2 max-w-[46ch] text-[13px] leading-relaxed text-mute">{body}</p>
            <div className="mt-5 flex justify-center gap-2">
              <Link to="/" className="btn">
                Back to workflows
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
