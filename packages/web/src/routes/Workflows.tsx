import { Topbar } from '@/components/Topbar'
import { Icon } from '@/components/Icon'
import { Page } from '@/components/Page'

export function WorkflowsRoute() {
  return (
    <div className="flex h-full flex-col">
      <Topbar title="Workflows" subtitle="Your automations" />

      <div className="scroll flex-1 overflow-auto">
        <Page>
          <div className="card px-6 py-10 text-center">
            <span className="grid mx-auto h-10 w-10 place-items-center rounded-xl bg-fill text-mute">
              <Icon name="grid" size={18} />
            </span>
            <div className="mt-3 text-[13px] font-semibold">No workflows yet</div>
            <div className="mt-1 text-[12px] text-mute">
              Workflows will appear here once the workflows API is wired up.
            </div>
          </div>
        </Page>
      </div>
    </div>
  )
}
