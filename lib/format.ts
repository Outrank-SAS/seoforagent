export const MAX_ARRAY_ITEMS = 25;
export const MAX_STRING_CHARS = 4000;

export interface TrimmedJson {
  value: unknown;
  trimmed: { path: string; total: number; shown: number }[];
}

const walk = (value: unknown, path: string, trimmed: TrimmedJson['trimmed']): unknown => {
  if (Array.isArray(value)) {
    const shown = value.slice(0, MAX_ARRAY_ITEMS).map((item, index) => walk(item, `${path}[${index}]`, trimmed));
    if (value.length > MAX_ARRAY_ITEMS) trimmed.push({ path: path || '(root)', total: value.length, shown: MAX_ARRAY_ITEMS });
    return shown;
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      out[key] = walk(child, path ? `${path}.${key}` : key, trimmed);
    }
    return out;
  }
  if (typeof value === 'string' && value.length > MAX_STRING_CHARS) {
    return `${value.slice(0, MAX_STRING_CHARS)}... (${value.length - MAX_STRING_CHARS} more characters)`;
  }
  return value;
};

export const trimJson = (value: unknown): TrimmedJson => {
  const trimmed: TrimmedJson['trimmed'] = [];
  return { value: walk(value, '', trimmed), trimmed };
};

export const envelopeText = (envelope: Record<string, unknown>): string => {
  const { value, trimmed } = trimJson(envelope);
  const text = JSON.stringify(value, null, 2);
  if (trimmed.length === 0) return text;
  const resultId = typeof envelope.result_id === 'string' ? envelope.result_id : null;
  const lists = trimmed.map((item) => `${item.path} (${item.shown} of ${item.total})`).join(', ');
  const pointer = resultId
    ? `Call results_get with result_id "${resultId}" and offset/limit to read every row, free.`
    : 'Ask for a smaller limit to see every row.';
  return `${text}\n\nNote: long lists were trimmed in this text: ${lists}. ${pointer}`;
};

export const formatUsd = (value: number | null | undefined, digits?: number): string => {
  if (value === null || value === undefined || !Number.isFinite(value)) return '$0.00';
  const fraction = digits ?? (Math.abs(value) > 0 && Math.abs(value) < 0.1 ? 3 : 2);
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: fraction, maximumFractionDigits: fraction })}`;
};
