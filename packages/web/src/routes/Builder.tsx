import { Topbar } from '@/components/Topbar'
import { Icon } from '@/components/Icon'
import { Page } from '@/components/Page'

export function BuilderRoute() {
  return (
    <div className="flex h-full flex-col">
      <Topbar title="Builder" subtitle="Workflow editor" />

      <div className="scroll flex-1 overflow-auto">
        <Page>
          <div className="card px-6 py-10 text-center">
            <span className="grid mx-auto h-10 w-10 place-items-center rounded-xl bg-fill text-mute">
              <Icon name="sliders" size={18} />
            </span>
            <div className="mt-3 text-[13px] font-semibold">Builder is not connected yet</div>
            <div className="mt-1 text-[12px] text-mute">
              Once workflows can be saved through the API, the editor will appear here.
            </div>
          </div>
        </Page>
      </div>
    </div>
  )
}
