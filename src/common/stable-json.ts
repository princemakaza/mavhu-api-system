/** JSON with object keys sorted at every level, so the same value always hashes the same (Postgres jsonb reorders keys). */
export function stableStringify(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value: unknown): unknown {
  if (value === null || typeof value !== 'object') return value;
  if (value instanceof Date) return value.toISOString();
  if (Buffer.isBuffer(value)) return `[${value.length} bytes]`;
  if (Array.isArray(value)) return value.map(sortKeys);
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(value as Record<string, unknown>).sort()) {
    const v = (value as Record<string, unknown>)[key];
    if (v !== undefined) out[key] = sortKeys(v);
  }
  return out;
}

/** A plain, JSON-safe copy of an entity for before/after audit values, minus secrets. */
export function snapshotOf(entity: object | null | undefined): Record<string, unknown> | null {
  if (!entity) return null;
  const copy = JSON.parse(stableStringify(entity)) as Record<string, unknown>;
  delete copy.passwordHash;
  delete copy.password;
  delete copy.content;
  return copy;
}
