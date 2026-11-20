import { Topbar } from '@/components/Topbar'
import { Icon } from '@/components/Icon'
import { Page } from '@/components/Page'

export function AndroidRoute() {
  return (
    <div className="flex h-full flex-col">
      <Topbar title="Android client" subtitle="Same workspace, smaller screen" />

      <div className="scroll flex-1 overflow-auto">
        <Page maxWidth={720}>
          <div className="card flex items-start gap-4 p-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-accent-soft text-accent">
              <Icon name="phone" size={22} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[14px] font-semibold">The Compose app talks to the same API</div>
              <div className="mt-1 text-[12.5px] leading-relaxed text-mute">
                Install the Android build, sign in with the same account, and the workflows,
                runs and services you see here appear on the phone. The pairing code below
                links this browser session to a device.
              </div>
            </div>
          </div>

          <div className="card p-4">
            <div className="text-[12px] font-medium text-mute">Pairing code</div>
            <div className="mt-1 font-mono text-[22px] font-semibold tracking-widest">A7F-9K2-QP4</div>
            <div className="mt-2 text-[11.5px] text-mute">
              Expires in 10 minutes. Enter it on the phone under Settings → Pair device.
            </div>
          </div>
        </Page>
      </div>
    </div>
  )
}
