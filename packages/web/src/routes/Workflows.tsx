import { useMemo, useState } from 'react'
import { Link } from 'react-router'

import { Topbar } from '@/components/Topbar'
import { Icon, type IconName } from '@/components/Icon'
import { ServiceMark } from '@/components/ServiceMark'
import { BarChart, Sparkline } from '@/components/charts'
import type { WorkflowListItem, WorkflowRun } from '@/data/contract'
import {
  ACCOUNT,
  ACTIVITY,
  NOW,
  SERVICES,
  STATS,
  WORKFLOWS,
  expiredService,
  service,
  statusOf,
} from '@/data/mock'
import type { WorkflowStatus } from '@/data/types'
import { duration, longDate, number, runDuration, runTime } from '@/lib/format'

type Filter = 'all' | 'on' | 'off' | 'attention'

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'on', label: 'On' },
  { value: 'off', label: 'Paused' },
  { value: 'attention', label: 'Attention' },
]

function matchesFilter(status: WorkflowStatus, filter: Filter): boolean {
  switch (filter) {
    case 'all':
      return true
    case 'on':
      return status === 'on'
    case 'off':
      return status === 'off'
    case 'attention':
      return status === 'attention' || status === 'draft'
  }
}

function isEnabled(item: WorkflowListItem): boolean {
  const status = statusOf(item)
  return status !== 'off' && status !== 'draft'
}

type RunTone = 'ok' | 'bad' | 'pending'

function runOutcome(status: WorkflowRun['status']): { label: string; tone: RunTone } {
  switch (status) {
    case 'succeeded':
      return { label: 'Succeeded', tone: 'ok' }
    case 'failed':
      return { label: 'Failed', tone: 'bad' }
    case 'cancelled':
      return { label: 'Cancelled', tone: 'bad' }
    case 'waiting':
      return { label: 'Waiting', tone: 'pending' }
    case 'running':
      return { label: 'Running', tone: 'pending' }
    case 'queued':
      return { label: 'Queued', tone: 'pending' }
  }
}

const TONE_CLASS: Record<RunTone, string> = {
  ok: 'text-ok',
  bad: 'text-bad',
  pending: 'text-mute',
}

const TONE_ICON: Record<RunTone, IconName> = {
  ok: 'check',
  bad: 'x',
  pending: 'clock',
}

function StatusPill({ item }: { item: WorkflowListItem }) {
  const status = statusOf(item)

  if (status === 'attention') {
    const expired = expiredService(item)
    const reason =
      item.workflow.statusReason ?? (expired ? `${service(expired).name} expired` : null)
    return (
      <span className="pill pill-warn">
        <Icon name="alert" size={12} />
        {reason ?? 'Needs attention'}
      </span>
    )
  }

  if (status === 'draft') {
    return (
      <span className="pill">
        <Icon name="info" size={12} />
        Draft
      </span>
    )
  }

  if (status === 'off') return <span className="pill">Paused</span>

  return null
}

function WorkflowRow({
  item,
  openMenu,
  onOpenMenu,
  onToggle,
  onDuplicate,
  onDelete,
}: {
  item: WorkflowListItem
  openMenu: boolean
  onOpenMenu: (id: string | null) => void
  onToggle: (id: string) => void
  onDuplicate: (id: string) => void
  onDelete: (id: string) => void
}) {
  const flow = item.workflow
  const trigger = flow.trigger.appId
  const steps = 1 + flow.nodes.length
  const lastRun = item.lastRun
  const outcome = lastRun ? runOutcome(lastRun.status) : null
  const took = lastRun ? runDuration(lastRun) : null
  const enabled = isEnabled(item)

  return (
    <div className={`relative first:rounded-t-[12px] last:rounded-b-[12px] ${openMenu ? 'z-20' : ''}`}>
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex shrink-0 items-center gap-1" aria-hidden="true">
          {item.services.slice(0, 3).map((id) => (
            <ServiceMark key={id} id={id} size={20} />
          ))}
          {item.services.length > 3 ? (
            <span className="num text-[10px] text-faint">+{item.services.length - 3}</span>
          ) : null}
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-0.5 flex flex-wrap items-center gap-2">
            <Link
              to={`/builder/${flow.id}`}
              className="truncate text-[14px] font-semibold underline-offset-2 hover:underline"
            >
              {flow.name}
            </Link>
            <StatusPill item={item} />
          </div>
          <div className="text-[11.5px] leading-relaxed text-mute">
            Triggered by {service(trigger).name}
            <span className="text-faint"> · </span>
            {steps === 1 ? '1 step' : `${steps} steps`}
            {flow.description ? (
              <>
                <span className="text-faint"> · </span>
                <span className="inline-block max-w-[200px] truncate align-bottom">
                  {flow.description}
                </span>
              </>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 border-t border-line bg-fill px-4 py-3">
        <div className="hidden w-[92px] shrink-0 text-right lg:block">
          {lastRun && outcome ? (
            <>
              <div className="text-[11px] font-medium">{runTime(lastRun)}</div>
              <div className="text-[10px] text-mute">
                {outcome.label}
                {took === null ? null : ` · ${duration(took)}`}
              </div>
            </>
          ) : (
            <div className="text-[11px] text-mute">Never run</div>
          )}
        </div>

        <div className="hidden shrink-0 items-center gap-2 sm:flex">
          <span
            className={`inline-flex items-center gap-1.5 text-[11px] ${
              outcome ? TONE_CLASS[outcome.tone] : 'text-faint'
            }`}
          >
            <Sparkline values={item.runsLast7Days} />
          </span>
          <button
            type="button"
            role="switch"
            className="sw ml-1"
            aria-checked={enabled}
            aria-label={`Enable ${flow.name}`}
            onClick={() => onToggle(flow.id)}
          />
        </div>

        <div className="ml-auto shrink-0">
          <button
            type="button"
            className="btn btn-ghost btn-icon btn-sm"
            aria-label="More actions"
            aria-expanded={openMenu}
            onClick={() => onOpenMenu(openMenu ? null : flow.id)}
          >
            <Icon name="more" size={16} />
          </button>

          {openMenu ? (
            <div
              role="menu"
              className="card rise absolute right-0 top-full z-30 mt-2 w-[190px] p-1.5"
            >
              <Link
                to={`/builder/${flow.id}`}
                role="menuitem"
                className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-[12.5px] hover:bg-fill"
              >
                <Icon name="sliders" size={14} />
                Edit workflow
              </Link>
              <Link
                to={`/runs?workflow=${flow.id}`}
                role="menuitem"
                className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-[12.5px] hover:bg-fill"
              >
                <Icon name="activity" size={14} />
                Run history
              </Link>
              <button
                type="button"
                role="menuitem"
                onClick={() => onToggle(flow.id)}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-[12.5px] hover:bg-fill sm:hidden"
              >
                <Icon name="play" size={13} />
                {enabled ? 'Turn off' : 'Turn on'}
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => onDuplicate(flow.id)}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-[12.5px] hover:bg-fill"
              >
                <Icon name="copy" size={14} />
                Duplicate
              </button>
              <div className="my-1 border-t border-line" />
              <button
                type="button"
                role="menuitem"
                onClick={() => onDelete(flow.id)}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-[12.5px] text-bad hover:bg-fill"
              >
                <Icon name="trash" size={14} />
                Delete
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export function WorkflowsRoute() {
  const [items, setItems] = useState<WorkflowListItem[]>(WORKFLOWS)
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const [menu, setMenu] = useState<string | null>(null)

  const withStatus = useMemo(
    () => items.map((item) => ({ item, status: statusOf(item) })),
    [items],
  )

  const counts = useMemo(
    () => ({
      all: withStatus.length,
      on: withStatus.filter((entry) => entry.status === 'on').length,
      off: withStatus.filter((entry) => entry.status === 'off').length,
      attention: withStatus.filter(
        (entry) => entry.status === 'attention' || entry.status === 'draft',
      ).length,
    }),
    [withStatus],
  )

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return withStatus
      .filter((entry) => matchesFilter(entry.status, filter))
      .filter((entry) => {
        if (!needle) return true
        const haystack = [
          entry.item.workflow.name,
          entry.item.workflow.description ?? '',
          ...entry.item.services.map((id) => service(id).name),
        ]
          .join(' ')
          .toLowerCase()
        return haystack.includes(needle)
      })
      .map((entry) => entry.item)
  }, [withStatus, filter, query])

  const attention = items.find((item) => statusOf(item) === 'attention')
  const attentionService = attention ? expiredService(attention) : null

  function toggle(id: string) {
    setItems((previous) =>
      previous.map((item) => {
        if (item.workflow.id !== id) return item
        const next: WorkflowListItem['workflow']['status'] = isEnabled(item) ? 'off' : 'on'
        return { ...item, workflow: { ...item.workflow, status: next } }
      }),
    )
  }

  function duplicate(id: string) {
    setItems((previous) => {
      const source = previous.find((item) => item.workflow.id === id)
      if (!source) return previous

      const now = NOW.toISOString()
      const copy: WorkflowListItem = {
        ...source,
        workflow: {
          ...source.workflow,
          id: `${source.workflow.id}-copy-${Date.now()}`,
          name: `${source.workflow.name} · copy`,
          status: 'draft',
          statusReason: null,
          version: 1,
          createdAt: now,
          updatedAt: now,
          lastRunAt: null,
        },
        lastRun: null,
        runsLast7Days: source.runsLast7Days.map(() => 0),
      }
      return [copy, ...previous]
    })
    setMenu(null)
  }

  function remove(id: string) {
    setItems((previous) => previous.filter((item) => item.workflow.id !== id))
    setMenu(null)
  }

  const activity = ACTIVITY
  const connected = SERVICES.filter((item) => item.state === 'connected').length

  return (
    <div className="flex h-full flex-col">
      <Topbar title="Workflows">
        <label className="relative hidden sm:block">
          <span className="sr-only">Search workflows</span>
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-mute">
            <Icon name="search" size={15} />
          </span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="input w-[210px] pl-8 text-[13px]"
            placeholder="Search workflows"
            aria-label="Search workflows"
            type="search"
          />
        </label>
        <Link to="/builder/new" className="btn btn-accent">
          <Icon name="plus" size={15} />
          <span>New workflow</span>
        </Link>
      </Topbar>

      <div className="scroll flex-1 overflow-auto">
        <div className="mx-auto max-w-[1100px] px-4 py-7 sm:px-6 lg:px-8">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-[26px] font-semibold leading-tight tracking-tight">
                Good morning, {ACCOUNT.name.split(' ')[0]}
              </h2>
              <p className="mt-1 text-[13.5px] text-mute">
                {items.length} workflows · {STATS.weekRuns} runs this week · {STATS.failed} failed
              </p>
            </div>
            <div className="hidden items-center gap-1.5 pt-1.5 text-[12px] text-mute md:flex">
              <Icon name="calendar" size={14} />
              <span>{longDate(NOW)}</span>
            </div>
          </div>

          {attention ? (
            <div
              className="mt-5 flex items-start gap-3 rounded-xl p-3.5"
              style={{ background: 'var(--warn-soft)' }}
              role="alert"
            >
              <span className="mt-0.5 shrink-0 tone-warn">
                <Icon name="alert" size={17} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-semibold">
                  {attentionService
                    ? `${service(attentionService).name} needs reconnecting`
                    : (attention.workflow.statusReason ?? 'Needs attention')}
                </div>
                <div className="mt-0.5 text-[12.5px] text-mute">
                  {attentionService
                    ? `${attention.workflow.name} will pause until the connection is renewed.`
                    : `${attention.workflow.name} is stopped until this is fixed.`}
                </div>
                <div className="mt-2.5 flex gap-2">
                  {attentionService ? (
                    <Link to={`/services?service=${attentionService}`} className="btn btn-sm">
                      Reconnect {service(attentionService).name}
                    </Link>
                  ) : null}
                  <Link to={`/runs?workflow=${attention.workflow.id}`} className="btn btn-sm btn-ghost">
                    See failed runs
                  </Link>
                </div>
              </div>
            </div>
          ) : null}

          <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <section className="card flex flex-col p-5 lg:col-span-2" aria-labelledby="perf-title">
              <div className="flex items-start justify-between">
                <div>
                  <h3 id="perf-title" className="text-[13px] font-semibold">
                    Success rate
                  </h3>
                  <p className="mt-0.5 text-[11.5px] text-mute">Per day, last two weeks</p>
                </div>
                <Link to="/runs" className="inline-flex items-center gap-1 text-[12px] text-mute hover:text-ink">
                  View all
                  <Icon name="arrow-right" size={13} />
                </Link>
              </div>
              <div className="mt-2.5 flex items-end gap-3">
                <div className="num text-[38px] font-semibold leading-none tracking-tight">
                  {number(STATS.successRate, 1)}
                  <span className="text-[22px] text-mute">%</span>
                </div>
                <div className="flex items-center gap-1 pb-1.5 text-[11.5px] font-medium text-ok">
                  <Icon name="arrow-right" size={12} />
                  <span>
                    {STATS.delta >= 0 ? '+' : ''}
                    {number(STATS.delta, 1)} pts
                  </span>
                </div>
              </div>
              <div className="mt-auto pt-5">
                <BarChart values={STATS.perDay} />
                <div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-[12px]">
                  <div className="flex items-center gap-5">
                    <span className="text-mute">
                      <span className="num font-semibold text-ink">{number(STATS.weekRuns)}</span> runs
                    </span>
                    <span className="text-mute">
                      <span className="num font-semibold text-bad">{number(STATS.failed)}</span> failed
                    </span>
                  </div>
                  <span className="text-[11px] text-faint">{STATS.runsToday} runs today</span>
                </div>
              </div>
            </section>

            <section className="card flex flex-col p-5" aria-labelledby="activity-title">
              <div className="flex items-start justify-between">
                <h3 id="activity-title" className="text-[13px] font-semibold">
                  Activity
                </h3>
                <Link to="/runs" className="text-[12px] text-mute hover:text-ink">
                  View all
                </Link>
              </div>
              <div className="-mx-1 mt-2">
                {activity.map(({ run, workflowName, appId }) => {
                  const outcome = runOutcome(run.status)
                  return (
                    <Link
                      key={run.id}
                      to={`/runs?run=${run.id}`}
                      className="flex items-center gap-2.5 rounded-lg px-1 py-[7px] hover:bg-fill"
                    >
                      <ServiceMark id={appId} size={22} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[12px] font-medium">{workflowName}</div>
                        <div className="text-[10.5px] text-mute">{runTime(run)}</div>
                      </div>
                      <Icon
                        name={TONE_ICON[outcome.tone]}
                        size={14}
                        className={TONE_CLASS[outcome.tone]}
                      />
                    </Link>
                  )
                })}
              </div>
            </section>
          </div>

          <section className="card mt-4" aria-labelledby="wf-title">
            <div className="flex flex-wrap items-center gap-3 px-4 pb-3 pt-4 sm:px-5">
              <h2 id="wf-title" className="text-[14px] font-semibold">
                Your workflows
              </h2>
              <span className="pill">{counts.all}</span>

              <div className="ml-auto flex items-center gap-2">
                <div className="seg hidden sm:inline-flex" role="tablist" aria-label="Filter workflows">
                  {FILTERS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      role="tab"
                      aria-selected={filter === option.value}
                      onClick={() => setFilter(option.value)}
                      className="gap-1.5"
                    >
                      {option.label}
                      <span className="num text-[11px] text-faint">{counts[option.value]}</span>
                    </button>
                  ))}
                </div>
                <label className="relative sm:hidden">
                  <span className="sr-only">Search workflows</span>
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    className="input w-[150px] text-[13px]"
                    placeholder="Search"
                    type="search"
                  />
                </label>
              </div>
            </div>

            <div className="border-t border-line" role="tabpanel">
              {visible.length === 0 ? (
                <div className="px-6 py-14 text-center">
                  <span
                    className="mb-3 inline-grid h-12 w-12 place-items-center rounded-2xl"
                    style={{ background: 'var(--fill)', color: 'var(--mute)' }}
                  >
                    <Icon name="search" size={22} />
                  </span>
                  <h3 className="text-[15px] font-semibold">
                    {query ? `Nothing matches “${query}”` : 'No workflows here yet'}
                  </h3>
                  <p className="mx-auto mt-1 max-w-[42ch] text-[13px] leading-relaxed text-mute">
                    {query
                      ? 'Try a shorter search, or clear the filters.'
                      : 'Workflows you pause or draft will show up here.'}
                  </p>
                  <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                    <button
                      type="button"
                      className="btn"
                      onClick={() => {
                        setQuery('')
                        setFilter('all')
                      }}
                    >
                      Clear filters
                    </button>
                    <Link to="/builder/new" className="btn btn-accent">
                      New workflow
                    </Link>
                  </div>
                </div>
              ) : (
                visible.map((item) => (
                  <WorkflowRow
                    key={item.workflow.id}
                    item={item}
                    openMenu={menu === item.workflow.id}
                    onOpenMenu={setMenu}
                    onToggle={toggle}
                    onDuplicate={duplicate}
                    onDelete={remove}
                  />
                ))
              )}
            </div>
          </section>

          <p className="mt-8 px-1 text-[11px] text-faint">
            {connected} services connected · Connected to {ACCOUNT.server}
          </p>
        </div>
      </div>
    </div>
  )
}
