import { Topbar } from '@/components/Topbar'
import { Icon } from '@/components/Icon'
import { Page } from '@/components/Page'
import { Pill } from '@/components/Pill'
import { Stat } from '@/components/Stat'
import type { RunDetail as RunDetailType, StepStatus } from '@/data/contract'
import { runTime, runDuration, duration } from '@/lib/format'

function tone(status: string): 'ok' | 'bad' | 'pending' {
  if (status === 'succeeded') return 'ok'
  if (status === 'failed' || status === 'cancelled') return 'bad'
  return 'pending'
}

function stepTone(status: StepStatus): 'ok' | 'bad' | 'pending' | 'neutral' {
  if (status === 'succeeded') return 'ok'
  if (status === 'failed') return 'bad'
  if (status === 'pending' || status === 'running' || status === 'waiting') return 'pending'
  return 'neutral'
}

function json(value: unknown): string {
  if (value === null || value === undefined) return '—'
  return JSON.stringify(value, null, 2)
}

export function RunDetailRoute({ run }: { run: RunDetailType | null }) {
  if (!run) {
    return (
      <div className="flex h-full flex-col">
        <Topbar title="Run detail" subtitle="Not found" />
        <Page>
          <div className="card p-6">
            <p className="text-[13px] font-semibold">This run could not be loaded.</p>
            <a href="/runs" className="btn btn-quiet btn-sm mt-4">Back to runs</a>
          </div>
        </Page>
      </div>
    )
  }

  const failed = run.steps.filter((step) => step.status === 'failed')
  const succeeded = run.steps.filter((step) => step.status === 'succeeded')

  return (
    <div className="flex h-full flex-col">
      <Topbar title="Run detail" subtitle={`Mode: ${run.mode} · ${runTime(run)}`}>
        <a href="/runs" className="btn btn-quiet btn-sm">
          <Icon name="arrow-left" size={14} />
          Back
        </a>
        <Pill tone={tone(run.status)}>{run.status}</Pill>
      </Topbar>

      <div className="scroll flex-1 overflow-auto">
        <Page>
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <Stat label="Steps succeeded" value={String(succeeded.length)} />
            <Stat label="Steps failed" value={String(failed.length)} />
            <Stat label="Duration" value={duration(runDuration(run))} />
          </div>

          {run.errorMessage ? (
            <div className="err mb-4 rounded-xl border border-line bg-card p-3">
              <div className="text-[12px] font-semibold">Run failed</div>
              <div className="mt-1 text-[12px]">{run.errorMessage}</div>
              {run.errorNodeId ? <div className="mt-1 font-mono text-[11px] text-mute">Node: {run.errorNodeId}</div> : null}
            </div>
          ) : null}

          <div className="card overflow-hidden">
            <div className="border-b border-line px-4 py-3 text-[13px] font-semibold">Steps</div>
            <div className="divide-line">
              {run.steps.map((step) => (
                <div key={step.id} className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Pill tone={stepTone(step.status)}>{step.status}</Pill>
                    <span className="font-mono text-[12px] font-medium">{step.nodeId}</span>
                    <span className="text-[11px] text-mute">{step.nodeType}</span>
                    <span className="text-[11px] text-faint">attempt {step.attempts}</span>
                    {step.branchTaken ? <span className="pill !py-0 !px-1.5 !text-[9.5px]">branch: {step.branchTaken}</span> : null}
                    {step.errorKind ? <span className="pill pill-bad !py-0 !px-1.5 !text-[9.5px]">{step.errorKind}</span> : null}
                    <span className="ml-auto font-mono text-[10.5px] text-faint">{step.id.slice(0, 8)}</span>
                  </div>
                  {step.errorMessage ? <div className="err mt-1 text-[11.5px]">{step.errorMessage}</div> : null}
                  <div className="mt-2 grid gap-2 lg:grid-cols-2">
                    <div>
                      <div className="text-[10.5px] font-semibold uppercase tracking-[.07em] text-faint">Inputs</div>
                      <pre className="code mt-1 max-h-40 overflow-auto">{json(step.inputs)}</pre>
                    </div>
                    <div>
                      <div className="text-[10.5px] font-semibold uppercase tracking-[.07em] text-faint">Outputs</div>
                      <pre className="code mt-1 max-h-40 overflow-auto">{json(step.outputs)}</pre>
                    </div>
                  </div>
                </div>
              ))}
              {run.steps.length === 0 ? <div className="px-4 py-6 text-center text-[12px] text-mute">No steps recorded.</div> : null}
            </div>
          </div>
        </Page>
      </div>
    </div>
  )
}
