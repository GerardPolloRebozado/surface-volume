import type { Condition } from './workflow.types';

export function getAtPath(
  path: string,
  values: Record<string, unknown>,
): unknown {
  return path.split('.').reduce<unknown>((value, key) => {
    if (value && typeof value === 'object') {
      return (value as Record<string, unknown>)[key];
    }
    return undefined;
  }, values);
}

export interface ConditionCheck {
  left: string;
  op: Condition['op'];
  right?: string;
  actual: unknown;
  ok: boolean;
}

export interface ConditionEval {
  matched: boolean;
  details: ConditionCheck[][];
}

function compare(condition: Condition, actual: unknown): boolean {
  const right = condition.right;

  switch (condition.op) {
    case 'exists':
      return actual !== undefined && actual !== null;
    case 'not_exists':
      return actual === undefined || actual === null;
    case 'eq':
      return String(actual) === String(right);
    case 'neq':
      return String(actual) !== String(right);
    case 'gt':
      return Number(actual) > Number(right);
    case 'lt':
      return Number(actual) < Number(right);
    case 'contains':
      return Array.isArray(actual)
        ? actual.some((item) => String(item) === String(right))
        : String(actual ?? '').includes(String(right ?? ''));
    case 'regex':
      return new RegExp(String(right ?? '')).test(String(actual ?? ''));
  }
}

export function evaluateConditions(
  groups: Condition[][],
  values: Record<string, unknown>,
): ConditionEval {
  const details = groups.map((group) =>
    group.map((condition) => {
      const actual = getAtPath(condition.left, values);
      return {
        left: condition.left,
        op: condition.op,
        right: condition.right,
        actual,
        ok: compare(condition, actual),
      };
    }),
  );

  return {
    matched: details.some((group) => group.every((check) => check.ok)),
    details,
  };
}
