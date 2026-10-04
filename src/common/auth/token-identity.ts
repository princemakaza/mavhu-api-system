import { JwtService } from '@nestjs/jwt';

/**
 * The API issues two kinds of JWT, both signed with the same secret:
 *  - platform users (POST /auth/login): { sub: number, email, roles: string[] }
 *  - bank portal members (POST /cbz/auth/login): { sub: string, email, role: string }
 */
export type TokenIdentity =
  | { kind: 'platform'; userId: number; email: string; roles: string[] }
  | { kind: 'member'; memberId: string; email: string; role: string };

export const MAVHU_ADMIN_ROLE = 'MAVHU_ADMIN';

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
    return { kind: 'platform', userId: Number(payload.sub), email: String(payload.email), roles: payload.roles.map(String) };
  }
  if (typeof payload.role === 'string') {
    return { kind: 'member', memberId: String(payload.sub), email: String(payload.email), role: payload.role };
  }
  return null;
}
