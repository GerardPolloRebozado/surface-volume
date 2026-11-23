import { Injectable } from '@nestjs/common';
import { findAction } from '../apps';
import { runWithAction } from './action-runner';
import type { RunContext } from './context.types';
import type { ActionResult } from './execution-result';
import type { ActionNode } from './workflow.types';

@Injectable()
export class ExecutorService {
  async runAction(
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

    return runWithAction(action, inputs, context);
  }
}
