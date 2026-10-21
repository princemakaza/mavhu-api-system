import { BadRequestException, CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { AGRI_ROLES, MAVHU_ADMIN_ROLE, PLATFORM_AUDITOR_ROLE, readTokenIdentity } from '../../common/auth/token-identity';

export interface AgriActor {
  userId: number;
  email: string;
  customerId: number;
  roles: string[];
  canWrite: boolean;
  canApprove: boolean;
  /** MAvHU staff viewing a farm: read-only. */
  viewer: boolean;
}

export interface AgriRequest extends Request {
  agri: AgriActor;
}

/**
 * The Agri MRV portal: agribusiness users with ESG_READER / ESG_CONTRIBUTOR / ESG_APPROVER see
 * only their own farm. MAvHU staff may view any farm read-only with ?customerId=.
 */
@Injectable()
export class AgriGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AgriRequest>();
    const identity = readTokenIdentity(this.jwt, request.headers.authorization);
    if (!identity) throw new UnauthorizedException('Sign in to the Agri MRV portal');
    if (identity.kind !== 'platform') throw new ForbiddenException('Bank users sign in on the bank portal');

    const agriRoles = identity.roles.filter((r) => AGRI_ROLES.includes(r));
    if (agriRoles.length && identity.orgType === 'AGROBUSINESS' && identity.customerId) {
      request.agri = {
        userId: identity.userId,
        email: identity.email,
        customerId: identity.customerId,
        roles: agriRoles,
        canWrite: agriRoles.includes('ESG_CONTRIBUTOR') || agriRoles.includes('ESG_APPROVER'),
        canApprove: agriRoles.includes('ESG_APPROVER'),
        viewer: false,
      };
      return true;
    }

    const staff = identity.roles.includes(MAVHU_ADMIN_ROLE) || (identity.roles.includes(PLATFORM_AUDITOR_ROLE) && identity.orgType === 'PLATFORM');
    if (staff) {
      if (request.method !== 'GET') throw new ForbiddenException('MAvHU staff view farms read-only; the farm\'s own users enter data');
      const customerId = Number(request.query.customerId);
      if (!Number.isInteger(customerId)) throw new BadRequestException('MAvHU staff must choose a farm with ?customerId=');
      request.agri = { userId: identity.userId, email: identity.email, customerId, roles: identity.roles, canWrite: false, canApprove: false, viewer: true };
      return true;
    }

    if (identity.orgType === 'BANK') throw new ForbiddenException('Bank staff use the bank portal, not the Agri MRV portal');
    throw new ForbiddenException('The Agri MRV portal is for agribusiness ESG users');
  }
}
