const singleExpression = /^\{\{\s*([\w.-]+)\s*\}\}$/;
const embeddedExpression = /\{\{\s*([\w.-]+)\s*\}\}/g;

export function resolveInputs(
  inputs: Record<string, unknown>,
  outputsByNode: Record<string, Record<string, unknown>>,
): Record<string, unknown> {
  const lookup = (path: string): unknown => {
    const [nodeId, ...keys] = path.trim().split('.');
    let value: unknown = outputsByNode[nodeId];

    for (const key of keys) {
      if (value && typeof value === 'object') {
        value = (value as Record<string, unknown>)[key];
      } else {
        value = undefined;
      }
    }

    return value;
  };

  const resolve = (value: unknown): unknown => {
    if (typeof value === 'string') {
      const single = value.match(singleExpression);
      if (single) {
        const found = lookup(single[1]);
        return found === undefined ? '' : found;
      }

      return value.replace(embeddedExpression, (_match, path: string) => {
        const found = lookup(path);
        return found === undefined ? '' : String(found);
      });
    }

    if (Array.isArray(value)) return value.map(resolve);

    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value).map(([key, nested]) => [key, resolve(nested)]),
      );
    }

    return value;
  };

  return resolve(inputs) as Record<string, unknown>;
}
