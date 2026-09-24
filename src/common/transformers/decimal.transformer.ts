import { ValueTransformer } from 'typeorm';

/**
 * Postgres NUMERIC/DECIMAL columns come back from pg as strings (to avoid
 * silent precision loss). Every decimal column in this schema fits safely
 * in a JS number, so transform to/from number for a clean JSON API.
 */
export class DecimalTransformer implements ValueTransformer {
  to(value?: number | null): number | null | undefined {
    return value;
  }

  from(value?: string | null): number | null | undefined {
    if (value === null || value === undefined) {
      return value;
    }
    return parseFloat(value);
  }
}
