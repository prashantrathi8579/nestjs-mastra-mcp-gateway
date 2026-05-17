import { ForbiddenException } from '@nestjs/common';

import type { Principal } from '@src/auth/principal';

/**
 * Asserts that the calling Principal is allowed to act on `requestedTenantId`.
 *
 * Pattern: tokens minted by your IdP carry a `tenant_id` claim. The token is
 * pre-scoped to a single tenant at mint time, so authorization is a direct
 * string compare — no ownership lookup, no DB hit on the hot path.
 *
 * Anonymous principals (AUTH_MODE=none) are rejected because tenant scoping
 * implies an authenticated caller. Bypass this helper entirely if the tool
 * is intended to be public.
 *
 * Wikipedia tools in this repo are public, so they don't call this helper —
 * it's kept as a reference for projects that need tenant isolation. Apply it
 * inside a tool handler before performing tenant-scoped work.
 */
export function assertTenantAccess(principal: Principal | undefined, requestedTenantId: string): void {
  if (!principal) {
    throw new ForbiddenException('No principal on request');
  }
  if (!principal.tenantId) {
    throw new ForbiddenException('Principal is not bound to a tenant');
  }
  if (principal.tenantId !== requestedTenantId) {
    throw new ForbiddenException(
      `Principal is scoped to tenant ${principal.tenantId}; cannot access ${requestedTenantId}`
    );
  }
}
