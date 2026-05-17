import { Injectable, Logger, OnModuleInit, UnauthorizedException } from '@nestjs/common';

import { createRemoteJWKSet, jwtVerify, type JWTPayload, type JWTVerifyGetKey } from 'jose';

import { AppConfigService } from '@src/config/config.service';

import type { AuthProvider } from '../auth-provider.interface';
import type { Principal } from '../principal';

/**
 * OIDC-compliant JWT verifier. Works against any IdP that publishes a JWKS
 * over HTTPS (Auth0, Keycloak, Cognito, Okta, custom OIDC).
 *
 * - JWKS is fetched lazily by jose's `createRemoteJWKSet` and cached, with
 *   automatic refresh on unknown `kid`.
 * - Issuer and audience are validated by `jose.jwtVerify` from the configured
 *   JWT_ISSUER / JWT_AUDIENCE env vars.
 * - Principal is built from standard claims: `sub` for subject, `tenant_id`
 *   or `org_id` for tenant, `scope` (space-delimited string) or `scp` (array)
 *   for scopes. Extend `mapClaims` to read other custom claims.
 */
@Injectable()
export class OidcJwtAuthProvider implements AuthProvider, OnModuleInit {
  private readonly logger = new Logger(OidcJwtAuthProvider.name);
  private jwks!: JWTVerifyGetKey;
  private issuer!: string;
  private audience!: string;

  constructor(private readonly config: AppConfigService) {}

  onModuleInit(): void {
    if (this.config.get('AUTH_MODE') !== 'jwt') {
      return;
    }

    this.issuer = this.config.get('JWT_ISSUER') as string;
    this.audience = this.config.get('JWT_AUDIENCE') as string;
    const jwksUri = this.config.get('JWT_JWKS_URI') as string;

    this.jwks = createRemoteJWKSet(new URL(jwksUri));
    this.logger.log(`OIDC JWT verifier ready (iss=${this.issuer}, aud=${this.audience}, jwks=${jwksUri})`);
  }

  async verify(token: string | undefined): Promise<Principal> {
    if (!token) {
      throw new UnauthorizedException('Missing Bearer token');
    }
    try {
      const { payload } = await jwtVerify(token, this.jwks, {
        issuer: this.issuer,
        audience: this.audience,
      });
      return mapClaims(payload);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'token verification failed';
      this.logger.warn(`JWT verification failed: ${message}`);
      throw new UnauthorizedException('Invalid token');
    }
  }
}

function mapClaims(claims: JWTPayload): Principal {
  if (typeof claims.sub !== 'string' || claims.sub.length === 0) {
    throw new UnauthorizedException('Missing sub claim');
  }

  const tenantId =
    typeof claims['tenant_id'] === 'string'
      ? (claims['tenant_id'] as string)
      : typeof claims['org_id'] === 'string'
        ? (claims['org_id'] as string)
        : undefined;

  const scopes = parseScopes(claims['scope'] ?? claims['scp']);

  return { subject: claims.sub, tenantId, scopes };
}

function parseScopes(value: unknown): string[] {
  if (typeof value === 'string') {
    return value.split(/\s+/).filter(Boolean);
  }
  if (Array.isArray(value)) {
    return value.filter((s): s is string => typeof s === 'string');
  }
  return [];
}
