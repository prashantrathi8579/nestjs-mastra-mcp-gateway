import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';

import type { Request } from 'express';

import { AppConfigService } from '@src/config/config.service';

import { AUTH_PROVIDER, type AuthProvider } from './auth-provider.interface';

/**
 * Verifies the Bearer JWT (when AUTH_MODE=jwt) and attaches a Principal to
 * the request. When AUTH_MODE=none, attaches an anonymous Principal without
 * inspecting the request.
 *
 * Downstream tool handlers read `req.principal` (or the AsyncLocalStorage
 * version exposed via `getPrincipalOrThrow()` in mcp/request-context).
 */
@Injectable()
export class UserJwtGuard implements CanActivate {
  private readonly logger = new Logger(UserJwtGuard.name);

  constructor(
    @Inject(AUTH_PROVIDER) private readonly authProvider: AuthProvider,
    private readonly config: AppConfigService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();

    if (this.config.get('AUTH_MODE') === 'none') {
      req.principal = await this.authProvider.verify(undefined);
      return true;
    }

    const header = req.headers.authorization;
    const token =
      typeof header === 'string' && header.startsWith('Bearer ')
        ? header.slice('Bearer '.length).trim()
        : undefined;

    try {
      req.principal = await this.authProvider.verify(token);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'token verification failed';
      this.logger.warn(`${req.method} ${req.originalUrl} — ${message}`);
      throw err instanceof UnauthorizedException ? err : new UnauthorizedException('Invalid token');
    }
  }
}
