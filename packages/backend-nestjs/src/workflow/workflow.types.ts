/** User-supplied values for a node's declared input fields. */
export type InputMapping = Record<string, unknown>;

export interface Workflow {
  id: string;
  userId: string;
  name: string;
  status: 'draft' | 'on' | 'off' | 'error';
  version: number;
  trigger: TriggerNode;
  nodes: WorkflowNode[];
  links: Link[];
  createdAt: string;
  updatedAt: string;
}

/** A directed link between two nodes. `fromPath` selects a branch path. */
export interface Link {
  id: string;
  from: string;
  fromPath?: string;
  to: string;
}

export interface TriggerNode {
  id: string;
  appId: string;
  triggerKey: string;
  credentialId?: string;
  inputs: InputMapping;
  webhook?: { url: string; secret: string; subscriptionId?: string };
}

export type WorkflowNode =
  ActionNode | FilterNode | DelayNode | BranchNode | LoopNode;

export interface NodeBase {
  id: string;
  name?: string;
  onError?: { strategy: 'stop' | 'continue' | 'retry'; maxRetries?: number };
}

export interface ActionNode extends NodeBase {
  type: 'action';
  appId: string;
  actionKey: string;
  credentialId?: string;
  inputs: InputMapping;
}

export interface FilterNode extends NodeBase {
  type: 'filter';
  conditions: Condition[][];
}

export interface Condition {
  left: string;
  op:
    'eq' | 'neq' | 'gt' | 'lt' | 'contains' | 'exists' | 'not_exists' | 'regex';
  right?: string;
}

export interface DelayNode extends NodeBase {
  type: 'delay';
  forMs?: number;
  until?: string;
}

export interface BranchNode extends NodeBase {
  type: 'branch';
  paths: { name: string; conditions: Condition[][] }[];
}

export interface LoopNode extends NodeBase {
  type: 'loop';
  items: string;
}
