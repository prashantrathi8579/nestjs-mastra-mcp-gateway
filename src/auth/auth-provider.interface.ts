import type { Principal } from './principal';

/**
 * Strategy interface for verifying an incoming bearer token and producing a
 * Principal. Swap implementations to support different identity providers.
 *
 * Built-in implementations:
 *   - NoopAuthProvider — bypass auth (AUTH_MODE=none, default for demos)
 *   - OidcJwtAuthProvider — RFC-7519 JWT against any OIDC JWKS (AUTH_MODE=jwt)
 *
 * Add your own by implementing this interface and registering it in
 * `AuthModule` instead of the default factory.
 */
export interface AuthProvider {
  verify(token: string | undefined): Promise<Principal>;
}

export const AUTH_PROVIDER = Symbol('AUTH_PROVIDER');
