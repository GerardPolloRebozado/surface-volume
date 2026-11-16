import type { RunContext } from './context.types';

/** Declarative description of a single form/parameter field. */
export interface InputField {
  key: string;
  label: string;
  type:
    | 'string'
    | 'text'
    | 'number'
    | 'boolean'
    | 'select'
    | 'datetime'
    | 'json'
    | 'file';
  required?: boolean;
  helpText?: string;
  default?: unknown;
  list?: boolean;
  choices?: { value: string; label: string }[];
  dynamicChoices?: (
    ctx: RunContext,
  ) => Promise<{ value: string; label: string }[]>;
  altersDynamicFields?: boolean;
}

/** Describes a value a node publishes for later nodes to reference. */
export interface OutputField {
  key: string;
  label: string;
  type: InputField['type'];
}
