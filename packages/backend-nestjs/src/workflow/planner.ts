import { evaluateConditions, getAtPath } from './conditions';
import type { Link, WorkflowNode } from './workflow.types';

export interface PlannerWindow {
  trigger: { id: string };
  nodes: WorkflowNode[];
  links: Link[];
}

export interface Continuation {
  nodeId: string;
  iteration: number;
  delayMs?: number;
  branchTaken?: string;
  conditionEval?: unknown;
  loopItem?: unknown;
}

export interface PlanContext {
  iteration: number;
  values: Record<string, unknown>;
}

export function findNode(
  window: PlannerWindow,
  nodeId: string,
): WorkflowNode | undefined {
  return window.nodes.find((node) => node.id === nodeId);
}

export function successors(window: PlannerWindow, nodeId: string, fromPath?: string): string[] {
  return window.links
    .filter(
      (link) =>
        link.from === nodeId &&
        (fromPath === undefined || link.fromPath === fromPath),
    )
    .map((link) => link.to);
}

export function subgraphExits(window: PlannerWindow, entries: string[]): string[] {
  const reachable = new Set<string>();
  const queue = [...entries];

  while (queue.length > 0) {
    const id = queue.shift()!;
    if (reachable.has(id)) continue;
    reachable.add(id);
    for (const target of successors(window, id)) queue.push(target);
  }

  const exits = new Set<string>();
  for (const link of window.links) {
    if (reachable.has(link.from) && !reachable.has(link.to)) exits.add(link.to);
  }

  return exits.size > 0
    ? [...exits]
    : [...reachable].filter((id) => successors(window, id).length === 0);
}

export function planContinuations(
  window: PlannerWindow,
  nodeId: string,
  context: PlanContext,
): Continuation[] {
  const node = findNode(window, nodeId);
  const toContinuations = (
    ids: string[],
    iteration = context.iteration,
    extra: Partial<Continuation> = {},
  ): Continuation[] =>
    ids.map((id) => ({ nodeId: id, iteration, ...extra }));

  if (!node) return toContinuations(successors(window, nodeId));

  switch (node.type) {
    case 'filter': {
      const evaluation = evaluateConditions(node.conditions, context.values);
      const targets = evaluation.matched
        ? successors(window, nodeId)
        : subgraphExits(window, successors(window, nodeId));
      return toContinuations(targets, 0, { conditionEval: evaluation.details });
    }

    case 'branch': {
      for (const path of node.paths) {
        const evaluation = evaluateConditions(path.conditions, context.values);
        if (evaluation.matched) {
          return toContinuations(successors(window, nodeId, path.name), context.iteration, {
            branchTaken: path.name,
            conditionEval: evaluation.details,
          });
        }
      }
      return [];
    }

    case 'delay': {
      const delayMs = node.until
        ? Math.max(0, Date.parse(node.until) - Date.now())
        : (node.forMs ?? 0);
      return toContinuations(successors(window, nodeId), context.iteration, { delayMs });
    }

    case 'loop': {
      const items = getAtPath(node.items, context.values);
      const list = Array.isArray(items) ? items : [];
      const body = successors(window, nodeId);

      if (context.iteration + 1 < list.length) {
        const nextIteration = context.iteration + 1;
        return toContinuations(body, nextIteration, {
          loopItem: list[nextIteration],
        });
      }

      return toContinuations(subgraphExits(window, body), 0);
    }

    default:
      return toContinuations(successors(window, nodeId));
  }
}
