import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { MAVHU_ADMIN_ROLE, readTokenIdentity } from './token-identity';

export interface AdminRequest extends Request {
  admin: { userId: number; email: string };
}

/** Lets a request through only with a platform JWT that carries the MAVHU_ADMIN role. */
@Injectable()
export class MavhuAdminGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AdminRequest>();
    const identity = readTokenIdentity(this.jwt, request.headers.authorization);
    if (!identity) throw new UnauthorizedException('Sign in as a MAvHU administrator');
    if (identity.kind !== 'platform' || !identity.roles.includes(MAVHU_ADMIN_ROLE)) {
      throw new ForbiddenException('Only MAvHU administrators can use the admin console');
    }
    request.admin = { userId: identity.userId, email: identity.email };
    return true;
  }
}
