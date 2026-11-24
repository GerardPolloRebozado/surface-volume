export class DefinitionError extends Error {}

import { findAction, findApp, findTrigger } from '../apps';
import type { PlannerWindow } from './planner';
import type { WorkflowNode } from './workflow.types';

export interface ValidatedDefinition extends PlannerWindow {
  trigger: { id: string; appId: string; triggerKey: string; credentialId?: string; inputs: Record<string, unknown> };
}

const NODE_TYPES = new Set(['action', 'filter', 'delay', 'branch', 'loop']);

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new DefinitionError('definition must be an object');
  }
  return value as Record<string, unknown>;
}

export function validateDefinition(value: unknown): ValidatedDefinition {
  const definition = object(value);
  const trigger = object(definition.trigger);
  if (
    typeof trigger.id !== 'string' ||
    typeof trigger.appId !== 'string' ||
    typeof trigger.triggerKey !== 'string' ||
    !trigger.id
  ) {
    throw new DefinitionError('definition.trigger needs id, appId and triggerKey');
  }

  if (!Array.isArray(definition.nodes) || !Array.isArray(definition.links)) {
    throw new DefinitionError('definition.nodes and definition.links must be arrays');
  }

  const nodes: WorkflowNode[] = [];
  const ids = new Set<string>([trigger.id]);
  for (const raw of definition.nodes) {
    const node = object(raw);
    if (typeof node.id !== 'string' || !node.id || ids.has(node.id)) {
      throw new DefinitionError('Every node needs a unique id');
    }
    if (typeof node.type !== 'string' || !NODE_TYPES.has(node.type)) {
      throw new DefinitionError(`Unknown node type ${node.type}`);
    }
    if (node.type === 'action') {
      if (typeof node.appId !== 'string' || typeof node.actionKey !== 'string') {
        throw new DefinitionError(`Action ${node.id} needs appId and actionKey`);
      }
    }
    ids.add(node.id);
    nodes.push(node as unknown as WorkflowNode);
  }

  for (const raw of definition.links) {
    const link = object(raw);
    if (
      typeof link.from !== 'string' ||
      typeof link.to !== 'string' ||
      !ids.has(link.from) ||
      !ids.has(link.to)
    ) {
      throw new DefinitionError('Every link must point at a trigger or a node');
    }
  }

  return {
    trigger: {
      id: trigger.id,
      appId: trigger.appId,
      triggerKey: trigger.triggerKey,
      credentialId: typeof trigger.credentialId === 'string' ? trigger.credentialId : undefined,
      inputs: object(trigger.inputs ?? {}),
    },
    nodes,
    links: definition.links as ValidatedDefinition['links'],
  };
}

export function assertRunnable(definition: ValidatedDefinition): void {
  if (!findTrigger(definition.trigger.appId, definition.trigger.triggerKey)) {
    throw new DefinitionError('The workflow trigger is not installed');
  }

  for (const node of definition.nodes) {
    if (node.type !== 'action') continue;
    if (!findAction(node.appId, node.actionKey)) {
      throw new DefinitionError(`Action ${node.appId}.${node.actionKey} is not installed`);
    }
    const app = findApp(node.appId);
    if (app && app.auth.type !== 'none' && !node.credentialId) {
      throw new DefinitionError(`Action ${node.id} needs a connection`);
    }
  }

  const reachable = new Set<string>([definition.trigger.id]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const link of definition.links) {
      if (reachable.has(link.from) && !reachable.has(link.to)) {
        reachable.add(link.to);
        changed = true;
      }
    }
  }
  for (const node of definition.nodes) {
    if (!reachable.has(node.id)) {
      throw new DefinitionError(`Node ${node.id} is not connected to the trigger`);
    }
  }
}
