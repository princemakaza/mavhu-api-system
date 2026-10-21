import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { ScopeInput } from './cbz.service';

/** The caller's token and optional ?bankId=, which CbzService turns into a bank and a role. */
export const Scope = createParamDecorator((_: unknown, ctx: ExecutionContext): ScopeInput => {
  const request = ctx.switchToHttp().getRequest<Request>();
  const bankId = request.query.bankId;
  return { authorization: request.headers.authorization, bankId: typeof bankId === 'string' ? bankId : undefined };
});
