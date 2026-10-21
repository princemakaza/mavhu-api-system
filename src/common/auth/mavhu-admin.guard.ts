import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { MAVHU_ADMIN_ROLE, PLATFORM_AUDITOR_ROLE, readTokenIdentity } from './token-identity';

export interface AdminRequest extends Request {
  admin: { userId: number; email: string; readOnly: boolean };
}

/**
 * The admin console: MAVHU_ADMIN can do everything; a MAvHU auditor (AUDITOR employed by the
 * platform organisation) may only read (GET), for cross-bank assurance.
 */
@Injectable()
export class MavhuAdminGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AdminRequest>();
    const identity = readTokenIdentity(this.jwt, request.headers.authorization);
    if (!identity) throw new UnauthorizedException('Sign in as a MAvHU administrator');
    if (identity.kind !== 'platform') throw new ForbiddenException('Only MAvHU staff can use the admin console');
    if (identity.roles.includes(MAVHU_ADMIN_ROLE)) {
      request.admin = { userId: identity.userId, email: identity.email, readOnly: false };
      return true;
    }
    if (identity.roles.includes(PLATFORM_AUDITOR_ROLE) && identity.orgType === 'PLATFORM') {
      if (request.method !== 'GET') throw new ForbiddenException('MAvHU auditors have read-only access');
      request.admin = { userId: identity.userId, email: identity.email, readOnly: true };
      return true;
    }
    throw new ForbiddenException('Only MAvHU staff can use the admin console');
  }
}
