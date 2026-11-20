import { useMemo, useState } from 'react'

import { Topbar } from '@/components/Topbar'
import { Icon } from '@/components/Icon'
import { Page } from '@/components/Page'
import { Pill } from '@/components/Pill'
import { ServiceMark } from '@/components/ServiceMark'
import { Stat } from '@/components/Stat'
import { ACTIVITY, STATS } from '@/data/mock'
import type { WorkflowRun } from '@/data/contract'
import { duration, number, runDuration, runTime } from '@/lib/format'

type Filter = 'all' | 'failed'

function runTone(status: WorkflowRun['status']): { label: string; tone: 'ok' | 'bad' | 'pending'; icon: 'check' | 'x' | 'clock' } {
  switch (status) {
    case 'succeeded':
      return { label: 'Succeeded', tone: 'ok', icon: 'check' }
    case 'failed':
    case 'cancelled':
      return { label: status === 'failed' ? 'Failed' : 'Cancelled', tone: 'bad', icon: 'x' }
    default:
      return { label: status === 'running' ? 'Running' : status === 'waiting' ? 'Waiting' : 'Queued', tone: 'pending', icon: 'clock' }
  }
}

export function RunsRoute() {
  const [filter, setFilter] = useState<Filter>('all')

  const visible = useMemo(
    () => (filter === 'failed' ? ACTIVITY.filter((a) => a.run.status === 'failed' || a.run.status === 'cancelled') : ACTIVITY),
    [filter],
  )

  const avgMs = useMemo(() => {
    const finished = ACTIVITY.map((a) => runDuration(a.run)).filter((v): v is number => v !== null)
    return finished.length ? finished.reduce((a, b) => a + b, 0) / finished.length : 0
  }, [])

  const failedCount = ACTIVITY.filter((a) => a.run.status === 'failed' || a.run.status === 'cancelled').length

  return (
    <div className="flex h-full flex-col">
      <Topbar title="Runs" subtitle="What happened, step by step" />

      <div className="scroll flex-1 overflow-auto">
        <Page>
          <div className="card p-4">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Stat value={number(STATS.weekRuns)} label="runs this week" />
              <Stat value={`${STATS.successRate}%`} label="success rate" />
              <Stat value={String(failedCount)} label="failed" tone="bad" />
              <Stat value={duration(avgMs)} label="average run" />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <h2 className="text-[14px] font-semibold">Recent runs</h2>
            <div className="flex gap-1">
              {(['all', 'failed'] as Filter[]).map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`btn btn-sm ${filter === value ? 'btn-accent' : ''}`}
                  onClick={() => setFilter(value)}
                >
                  {value === 'all' ? 'All' : 'Failed'}
                </button>
              ))}
            </div>
          </div>

          <div className="card overflow-hidden p-0">
            {visible.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <div className="text-[13px] font-semibold">No failed runs</div>
                <div className="mt-1 text-[12px] text-mute">Every run in the last seven days succeeded.</div>
              </div>
            ) : (
              visible.map((entry, index) => {
                const outcome = runTone(entry.run.status)
                const took = runDuration(entry.run)
                return (
                  <div key={entry.run.id}>
                    {index > 0 ? <div className="h-px bg-line" /> : null}
                    <div className="flex items-center gap-3 px-4 py-3">
                      <ServiceMark id={entry.appId} size={24} />
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-medium">{entry.workflowName}</div>
                        <div className="text-[11.5px] text-mute">
                          {runTime(entry.run)}
                          {took === null ? '' : ` · ${duration(took)}`}
                        </div>
                      </div>
                      <Pill tone={outcome.tone === 'ok' ? 'ok' : outcome.tone === 'bad' ? 'bad' : 'neutral'}>
                        <Icon name={outcome.icon} size={12} />
                        {outcome.label}
                      </Pill>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </Page>
      </div>
    </div>
  )
}
