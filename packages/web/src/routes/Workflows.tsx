import { useState } from 'react'

import { Topbar } from '@/components/Topbar'
import { Icon } from '@/components/Icon'
import { ListRow } from '@/components/ListRow'
import { Page } from '@/components/Page'
import { Pill } from '@/components/Pill'
import { ServiceMark } from '@/components/ServiceMark'
import type { WorkflowListItem } from '@/data/contract'
import { relativeTime } from '@/lib/format'
import {
  createWorkflow,
  deleteWorkflow,
  disableWorkflow,
  enableWorkflow,
  runWorkflow,
} from '@/lib/workflows'

export function WorkflowsRoute({
  workflows,
}: {
  workflows: WorkflowListItem[]
}) {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function act(action: () => Promise<unknown>, reload = true) {
    setBusy(true)
    setError('')
    try {
      await action()
      if (reload) window.location.reload()
    } catch (err) {
      setError((err as Error).message)
      setBusy(false)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <Topbar title="Workflows" subtitle="Your automations" />

      <div className="scroll flex-1 overflow-auto">
        <Page>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="text-[12px] text-mute">
              {workflows.length} workflow{workflows.length === 1 ? '' : 's'}
            </div>
            <button
              type="button"
              className="btn btn-accent btn-sm"
              disabled={busy}
              onClick={() =>
                act(async () => {
                  const created = await createWorkflow('Untitled workflow')
                  window.location.href = `/builder/${created.id}`
                }, false)
              }
            >
              New workflow
            </button>
          </div>

          {error ? <div className="err mb-4">{error}</div> : null}

          {workflows.length > 0 ? (
            <div className="card p-0">
              {workflows.map((item, index) => {
                const workflow = item.workflow
                const tone = workflow.status === 'on' ? 'ok' : workflow.status === 'error' ? 'bad' : 'neutral'
                return (
                  <div key={workflow.id} className={index > 0 ? 'border-t border-line' : ''}>
                    <ListRow
                      leading={<Icon name="bolt" size={17} className="text-mute" />}
                      content={
                        <>
                          <a className="text-[13px] font-medium hover:underline" href={`/builder/${workflow.id}`}>
                            {workflow.name}
                          </a>
                          <div className="text-[11.5px] text-mute">
                            {item.services.length > 0 ? item.services.join(' · ') : 'No services used'}
                            {workflow.statusReason ? ` · ${workflow.statusReason}` : ''}
                          </div>
                          <div className="text-[11px] text-faint">
                            {workflow.lastRunAt
                              ? `Last run ${relativeTime(workflow.lastRunAt)}`
                              : 'Never run'}
                          </div>
                        </>
                      }
                      trailing={
                        <>
                          <Pill tone={tone}>{workflow.status}</Pill>
                          <button
                            type="button"
                            className="btn btn-quiet btn-sm"
                            disabled={busy}
                            onClick={() => act(() => runWorkflow(workflow.id))}
                          >
                            Run now
                          </button>
                          <button
                            type="button"
                            className="btn btn-quiet btn-sm"
                            disabled={busy}
                            onClick={() =>
                              act(() =>
                                workflow.status === 'on'
                                  ? disableWorkflow(workflow.id)
                                  : enableWorkflow(workflow.id),
                              )
                            }
                          >
                            {workflow.status === 'on' ? 'Pause' : 'Enable'}
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm btn-danger"
                            disabled={busy}
                            onClick={() => act(() => deleteWorkflow(workflow.id))}
                          >
                            Delete
                          </button>
                        </>
                      }
                    />
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="card px-6 py-10 text-center">
              <span className="grid mx-auto h-10 w-10 place-items-center rounded-xl bg-fill text-mute">
                <Icon name="grid" size={18} />
              </span>
              <div className="mt-3 text-[13px] font-semibold">No workflows yet</div>
              <div className="mt-1 text-[12px] text-mute">Create one to start automating.</div>
            </div>
          )}

          <div className="mt-5 text-[11px] font-semibold uppercase tracking-[.09em] text-faint">
            Connected services
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {Array.from(new Set(workflows.flatMap((item) => item.services))).map((name) => (
              <span key={name} className="flex items-center gap-2 rounded-lg border border-line bg-card px-2.5 py-1.5 text-[12px]">
                <ServiceMark id={name.toLowerCase()} size={16} />
                {name}
              </span>
            ))}
            {workflows.every((item) => item.services.length === 0) ? (
              <span className="text-[12px] text-mute">Connect a service from the Services page.</span>
            ) : null}
          </div>
        </Page>
      </div>
    </div>
  )
}
