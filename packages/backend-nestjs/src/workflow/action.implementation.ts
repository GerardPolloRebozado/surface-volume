import type { ActionDefinition } from './actions.types';
import type { InputField, OutputField } from './fields.types';
import type { RunContext } from './context.types';

/**
 * The interface every action implements.
 *
 * `ActionDefinition` is what the engine stores. Its inputs and outputs are
 * untyped records, because the engine runs Gmail and Spotify through the same
 * code. This interface is what we write: the inputs and outputs of one action
 * are named. `asActionDefinition` erases those names so the engine can hold it.
 */
export interface ActionImplementation<
  TInputs extends Record<string, unknown>,
  TOutputs extends Record<string, unknown>,
> {
  /** Stable id used by a workflow node, for example `send_email`. Unique inside one service. */
  key: string;
  name: string;
  description: string;
  /** Fields the user fills in, or maps from an earlier node. */
  inputFields: InputField[];
  /** Values `run` returns. Later nodes can reference these. */
  outputFields: OutputField[];
  /** Example outputs, shown in the builder before the action has ever run. */
  sample: TOutputs;
  /** Performs the action and returns exactly the declared outputs. */
  run: (ctx: RunContext<TInputs>) => Promise<TOutputs>;
}

/** Drops the input and output names so the result matches {@link ActionDefinition}. */
export function asActionDefinition<
  TInputs extends Record<string, unknown>,
  TOutputs extends Record<string, unknown>,
>(action: ActionImplementation<TInputs, TOutputs>): ActionDefinition {
  return {
    key: action.key,
    name: action.name,
    description: action.description,
    inputFields: action.inputFields,
    outputFields: action.outputFields,
    sample: action.sample,
    run: (ctx) => action.run(ctx as RunContext<TInputs>),
  };
}
