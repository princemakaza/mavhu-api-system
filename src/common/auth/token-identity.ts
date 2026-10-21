import { JwtService } from '@nestjs/jwt';

/**
 * The API issues two kinds of JWT, both signed with the same secret:
 *  - platform users (POST /auth/login): { sub: number, email, roles: string[], orgType, customerId }
 *  - bank portal members (POST /cbz/auth/login): { sub: string, email, role: string }
 */
export type TokenIdentity =
  | { kind: 'platform'; userId: number; email: string; roles: string[]; orgType: string | null; customerId: number | null }
  | { kind: 'member'; memberId: string; email: string; role: string };

export const MAVHU_ADMIN_ROLE = 'MAVHU_ADMIN';
/** A MAvHU auditor: read-only across banks, but only when employed by the platform organisation. */
export const PLATFORM_AUDITOR_ROLE = 'AUDITOR';
/** Agribusiness roles that use the Agri MRV portal. */
export const AGRI_ROLES = ['ESG_READER', 'ESG_CONTRIBUTOR', 'ESG_APPROVER'];

/** Returns null for a missing, malformed, expired or wrongly-signed token. */
export function readTokenIdentity(jwt: JwtService, authorization: string | undefined): TokenIdentity | null {
  const [scheme, token] = (authorization ?? '').split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null;

  let payload: Record<string, unknown>;
  try {
    payload = jwt.verify<Record<string, unknown>>(token);
  } catch {
    return null;
  }

  if (Array.isArray(payload.roles)) {
    return {
      kind: 'platform',
      userId: Number(payload.sub),
      email: String(payload.email),
      roles: payload.roles.map(String),
      orgType: typeof payload.orgType === 'string' ? payload.orgType : null,
      customerId: typeof payload.customerId === 'number' ? payload.customerId : null,
    };
  }
  if (typeof payload.role === 'string') {
    return { kind: 'member', memberId: String(payload.sub), email: String(payload.email), role: payload.role };
  }
  return null;
}
