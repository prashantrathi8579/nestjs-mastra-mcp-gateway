import { CanActivate, ExecutionContext, Injectable, Logger, UnauthorizedException } from '@nestjs/common';

import { timingSafeEqual } from 'node:crypto';

import type { Request } from 'express';

import { AppConfigService } from '@src/config/config.service';

const API_KEY_HEADER = 'x-api-key';

/**
 * Service-level gatekeeper. When `MCP_API_KEY` is configured, every request
 * must present a matching `x-api-key` header. When unset, the guard is a
 * no-op — useful for the public demo where there's no value in gating
 * traffic at the service level.
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyGuard.name);

  constructor(private readonly config: AppConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const expected = this.config.get('MCP_API_KEY');
    if (!expected) {
      return true;
    }

    const req = context.switchToHttp().getRequest<Request>();
    const presented = req.headers[API_KEY_HEADER];

    if (typeof presented !== 'string' || presented.length === 0) {
      this.logger.warn(`${req.method} ${req.originalUrl} — missing x-api-key`);
      throw new UnauthorizedException('Missing API key');
    }

    if (!safeEqual(presented, expected)) {
      this.logger.warn(`${req.method} ${req.originalUrl} — invalid x-api-key`);
      throw new UnauthorizedException('Invalid API key');
    }

    return true;
  }
}

function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}
