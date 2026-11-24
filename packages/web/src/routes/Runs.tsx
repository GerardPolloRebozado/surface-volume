import { useMemo, useState } from 'react'

import { Topbar } from '@/components/Topbar'
import { Icon } from '@/components/Icon'
import { Page } from '@/components/Page'
import { Pill } from '@/components/Pill'
import { Stat } from '@/components/Stat'
import { duration, number, runDuration, runTime } from '@/lib/format'
import type { RunListItem } from '@/lib/runs'

type Filter = 'all' | 'failed'

function runTone(status: RunListItem['status']): { label: string; tone: 'ok' | 'bad' | 'pending'; icon: 'check' | 'x' | 'clock' } {
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

export function RunsRoute({ runs }: { runs: RunListItem[] }) {
  const [filter, setFilter] = useState<Filter>('all')

  const visible = useMemo(
    () => (filter === 'failed' ? runs.filter((run) => run.status === 'failed' || run.status === 'cancelled') : runs),
    [filter, runs],
  )

  const weekRuns = useMemo(() => {
    const limit = Date.now() - 7 * 24 * 60 * 60 * 1000
    return runs.filter((run) => Date.parse(run.queuedAt) >= limit).length
  }, [runs])

  const stats = useMemo(() => {
    const finished = runs.filter((run) => run.finishedAt !== null)
    const succeeded = finished.filter((run) => run.status === 'succeeded').length
    const times = finished
      .map((run) => runDuration(run))
      .filter((value): value is number => value !== null)
    return {
      rate: finished.length ? Math.round((succeeded / finished.length) * 100) : 0,
      failed: runs.filter((run) => run.status === 'failed' || run.status === 'cancelled').length,
      average: times.length ? times.reduce((a, b) => a + b, 0) / times.length : 0,
    }
  }, [runs])

  return (
    <div className="flex h-full flex-col">
      <Topbar title="Runs" subtitle="What happened, step by step" />

      <div className="scroll flex-1 overflow-auto">
        <Page>
          <div className="card p-4">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Stat value={number(weekRuns)} label="runs this week" />
              <Stat value={`${stats.rate}%`} label="success rate" />
              <Stat value={String(stats.failed)} label="failed" tone="bad" />
              <Stat value={duration(stats.average)} label="average run" />
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
                <div className="text-[13px] font-semibold">
                  {filter === 'failed' ? 'No failed runs' : 'No runs yet'}
                </div>
                <div className="mt-1 text-[12px] text-mute">
                  {filter === 'failed'
                    ? 'Every run in the last seven days succeeded.'
                    : 'Run a workflow to see it here.'}
                </div>
              </div>
            ) : (
              visible.map((run, index) => {
                const outcome = runTone(run.status)
                const took = runDuration(run)
                return (
                  <div key={run.id}>
                    {index > 0 ? <div className="h-px bg-line" /> : null}
                    <div className="flex items-center gap-3 px-4 py-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-soft">
                        <Icon name={outcome.icon} size={14} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <a href={`/runs/${run.id}`} className="text-[13px] font-medium hover:underline">
                          {run.workflow.name}
                        </a>
                        <div className="text-[11.5px] text-mute">
                          {runTime(run)}
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
