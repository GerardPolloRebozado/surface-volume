export type StepOutcome = 'succeeded' | 'failed' | null;

export function completionStatus(outcome: StepOutcome, remaining: number): StepOutcome {
  if (remaining > 0) return null;
  return outcome === 'failed' ? 'failed' : 'succeeded';
}
