import type { WorkflowRun } from '@/data/contract'

const LOCALE = 'en-GB'

export function relativeTime(iso: string, now: Date = new Date()): string {
  const minutes = Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / 60_000))
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} h ago`
  const days = Math.floor(hours / 24)
  return days === 1 ? 'yesterday' : `${days} days ago`
}

export function runTime(run: WorkflowRun): string {
  return relativeTime(run.finishedAt ?? run.queuedAt)
}

export function runDuration(run: WorkflowRun): number | null {
  if (!run.startedAt || !run.finishedAt) return null
  return new Date(run.finishedAt).getTime() - new Date(run.startedAt).getTime()
}

export function duration(ms: number): string {
  if (ms < 1000) return `${ms} ms`
  return `${(ms / 1000).toFixed(1)} s`
}

export function longDate(date: Date): string {
  return new Intl.DateTimeFormat(LOCALE, { weekday: 'long', day: 'numeric', month: 'long' }).format(date)
}

export function number(value: number, digits = 0): string {
  return new Intl.NumberFormat(LOCALE, { maximumFractionDigits: digits }).format(value)
}
