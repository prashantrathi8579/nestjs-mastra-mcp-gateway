/**
 * AuthModule — request authentication primitives.
 *
 * Exposes two NestJS guards used by the MCP controllers:
 *   - ApiKeyGuard  : optional service-level gate (only enforced when
 *                    MCP_API_KEY is set)
 *   - UserJwtGuard : delegates to the active AuthProvider for token →
 *                    Principal mapping
 *
 * The AuthProvider is selected at boot from AUTH_MODE:
 *   - AUTH_MODE=none → NoopAuthProvider (anonymous Principal, no checks)
 *   - AUTH_MODE=jwt  → OidcJwtAuthProvider (RFC-7519 JWT against an OIDC JWKS)
 *
 * To plug in a different identity story, write a class implementing the
 * `AuthProvider` interface and swap the factory below.
 */

import { Module } from '@nestjs/common';

import { AppConfigService } from '@src/config/config.service';

import { ApiKeyGuard } from './api-key.guard';
import { AUTH_PROVIDER, type AuthProvider } from './auth-provider.interface';
import { NoopAuthProvider } from './providers/noop-auth.provider';
import { OidcJwtAuthProvider } from './providers/oidc-jwt.provider';
import { UserJwtGuard } from './user-jwt.guard';

@Module({
  providers: [
    NoopAuthProvider,
    OidcJwtAuthProvider,
    {
      provide: AUTH_PROVIDER,
      useFactory: (
        config: AppConfigService,
        noop: NoopAuthProvider,
        oidc: OidcJwtAuthProvider
      ): AuthProvider => (config.get('AUTH_MODE') === 'jwt' ? oidc : noop),
      inject: [AppConfigService, NoopAuthProvider, OidcJwtAuthProvider],
    },
    ApiKeyGuard,
    UserJwtGuard,
  ],
  exports: [AUTH_PROVIDER, ApiKeyGuard, UserJwtGuard],
})
export class AuthModule {}
