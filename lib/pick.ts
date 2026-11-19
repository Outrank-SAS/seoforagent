type Loose = Record<string, unknown>;

const get = (source: unknown, path: string): unknown => {
  let current: unknown = source;
  for (const part of path.split('.')) {
    if (!current || typeof current !== 'object') return undefined;
    current = (current as Loose)[part];
  }
  return current;
};

export const pick = (source: unknown, paths: string[]): unknown => {
  for (const path of paths) {
    const value = get(source, path);
    if (value !== undefined && value !== null) return value;
  }
  return undefined;
};

export const pickString = (source: unknown, paths: string[], fallback = ''): string => {
  const value = pick(source, paths);
  return typeof value === 'string' ? value : typeof value === 'number' ? String(value) : fallback;
};

export const pickNumber = (source: unknown, paths: string[]): number | undefined => {
  const value = pick(source, paths);
  const parsed = typeof value === 'string' ? Number(value) : value;
  return typeof parsed === 'number' && Number.isFinite(parsed) ? parsed : undefined;
};

export const pickBool = (source: unknown, paths: string[]): boolean | undefined => {
  const value = pick(source, paths);
  return typeof value === 'boolean' ? value : undefined;
};

export const pickArray = (source: unknown, paths: string[]): Loose[] => {
  const value = pick(source, paths);
  return Array.isArray(value) ? (value.filter((item) => item && typeof item === 'object') as Loose[]) : [];
};

export const pickUsd = (source: unknown, names: string[]): number | undefined => {
  for (const name of names) {
    const usd = pickNumber(source, [`${name}_usd`, name]);
    if (usd !== undefined) return usd;
    const micro = pickNumber(source, [`${name}_microusd`]);
    if (micro !== undefined) return micro / 1_000_000;
    const cents = pickNumber(source, [`${name}_cents`]);
    if (cents !== undefined) return cents / 100;
  }
  return undefined;
};
