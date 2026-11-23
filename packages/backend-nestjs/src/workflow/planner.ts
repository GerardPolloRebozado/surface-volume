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
}

export function planContinuations(
  window: PlannerWindow,
  nodeId: string,
  iteration = 0,
): Continuation[] {
  return window.links
    .filter((link) => link.from === nodeId)
    .map((link) => ({ nodeId: link.to, iteration }));
}

export function findNode(
  window: PlannerWindow,
  nodeId: string,
): WorkflowNode | undefined {
  return window.nodes.find((node) => node.id === nodeId);
}
