import type { ActionDefinition } from './actions.types';
import type { RunContext } from './context.types';
import { actionErrorResult, type ActionResult } from './execution-result';

export async function runWithAction(
  action: ActionDefinition,
  inputs: Record<string, unknown>,
  context: RunContext,
): Promise<ActionResult> {
  try {
    const outputs = await action.run({ ...context, inputs });
    return { status: 'succeeded', outputs };
  } catch (error) {
    return actionErrorResult(error);
  }
}
