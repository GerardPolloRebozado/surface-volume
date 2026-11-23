export interface PlanCall {
  id: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url: string;
  headers?: Record<string, string>;
  body?: unknown;
  outputs?: Record<string, string>;
}

export interface ActionPlan {
  calls: PlanCall[];
}

export function planFromInputs(inputs: Record<string, unknown>): ActionPlan {
  const raw = inputs.calls;
  if (!Array.isArray(raw)) throw new Error('The HTTP action needs a calls array');

  const calls = raw.map((item, index) => {
    const call = item as Record<string, unknown>;
    if (typeof call.url !== 'string' || typeof call.method !== 'string') {
      throw new Error(`Call ${index} needs a method and a url`);
    }
    return {
      id: typeof call.id === 'string' ? call.id : `call_${index + 1}`,
      method: call.method.toUpperCase() as PlanCall['method'],
      url: call.url,
      headers: (call.headers ?? {}) as Record<string, string>,
      body: call.body,
      outputs: (call.outputs ?? {}) as Record<string, string>,
    };
  });

  return { calls };
}
