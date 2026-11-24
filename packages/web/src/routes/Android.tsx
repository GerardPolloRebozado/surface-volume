import { Topbar } from '@/components/Topbar'
import { Icon } from '@/components/Icon'
import { Page } from '@/components/Page'

export function AndroidRoute() {
  return (
    <div className="flex h-full flex-col">
      <Topbar title="Android client" subtitle="Same workspace, smaller screen" />

      <div className="scroll flex-1 overflow-auto">
        <Page maxWidth={720}>
          <div className="card px-6 py-10 text-center">
            <span className="grid mx-auto h-10 w-10 place-items-center rounded-xl bg-fill text-mute">
              <Icon name="phone" size={18} />
            </span>
            <div className="mt-3 text-[13px] font-semibold">Device pairing is not available yet</div>
            <div className="mt-1 text-[12px] text-mute">
              The Android app signs in against the same API. Pairing will appear here once it is implemented.
            </div>
          </div>
        </Page>
      </div>
    </div>
  )
}
