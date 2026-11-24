export function stepJobId(stepId: string, attempt: number): string {
  return `step:${stepId}:${attempt}`;
}

export function pollJobId(triggerId: string, dueAt: Date): string {
  return `poll:${triggerId}:${dueAt.getTime()}`;
}
