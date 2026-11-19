import { Link, useParams } from 'react-router'

import { Icon } from '@/components/Icon'
import { Topbar } from '@/components/Topbar'
import { workflow } from '@/data/mock'

export function BuilderRoute() {
  const { workflowId } = useParams()
  const item = workflowId ? workflow(workflowId) : undefined
  const flow = item?.workflow

  return (
    <div className="flex h-full flex-col">
      <Topbar
        title={flow ? flow.name : workflowId === 'new' ? 'New workflow' : 'Workflow'}
        subtitle={
          flow
            ? flow.status === 'draft'
              ? 'Draft · not saved yet'
              : `Version ${flow.version} · ${flow.nodes.length + 1} steps`
            : 'Choose a trigger to begin'
        }
      >
        <button type="button" className="btn btn-quiet" disabled>
          <Icon name="eye" size={15} />
          Preview
        </button>
        <button type="button" className="btn btn-accent" disabled>
          Save
        </button>
      </Topbar>

      <div className="flex min-h-0 flex-1">
        <div className="canvas-bg relative min-w-0 flex-1">
          <div className="absolute inset-0 grid place-items-center p-6">
            <div className="card max-w-[420px] p-6 text-center">
              <span
                className="mb-3 inline-grid h-11 w-11 place-items-center rounded-2xl"
                style={{ background: 'var(--fill)', color: 'var(--mute)' }}
              >
                <Icon name="branch" size={20} />
              </span>
              <h2 className="text-[15px] font-semibold">The canvas goes here</h2>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-mute">
                This route already carries the workflow id, so the editor lands in place without
                touching the navigation.
              </p>
              <div className="mt-4 flex justify-center gap-2">
                <Link to="/" className="btn btn-sm">
                  Back to workflows
                </Link>
              </div>
            </div>
          </div>
        </div>

        <aside
          className="hidden w-[286px] shrink-0 border-l border-line bg-card p-4 lg:block"
          aria-label="Inspector"
        >
          <h3 className="text-[13px] font-semibold">Inspector</h3>
          <p className="mt-1 text-[12px] leading-relaxed text-mute">
            Selecting a step will show its inputs and the references it can use.
          </p>
        </aside>
      </div>
    </div>
  )
}
