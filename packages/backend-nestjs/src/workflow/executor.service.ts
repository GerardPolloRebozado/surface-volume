import { Injectable } from '@nestjs/common';
import { findAction } from '../apps';
import { runWithAction } from './action-runner';
import type { RunContext } from './context.types';
import type { ActionResult } from './execution-result';
import type { ActionNode } from './workflow.types';
import { withSpan } from '../telemetry/tracing';

@Injectable()
export class ExecutorService {
  async runAction(
    node: ActionNode,
    inputs: Record<string, unknown>,
    context: RunContext,
  ): Promise<ActionResult> {
    return withSpan(
      'ExecutorService.runAction',
      { 'action.app': node.appId, 'action.key': node.actionKey, 'node.id': node.id },
      () => this.runActionInner(node, inputs, context),
    );
  }

  private async runActionInner(
    node: ActionNode,
    inputs: Record<string, unknown>,
    context: RunContext,
  ): Promise<ActionResult> {
    const action = findAction(node.appId, node.actionKey);

    if (!action) {
      return {
        status: 'failed',
        outputs: {},
        errorKind: 'fatal',
        errorMessage: `Unknown action ${node.appId}.${node.actionKey}`,
      };
    }

    if (action.plan) {
      const plan = await action.plan({ ...context, inputs });
      return { status: 'planned', outputs: {}, plan };
    }

    return runWithAction(action, inputs, context);
  }
}
