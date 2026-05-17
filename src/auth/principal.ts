/**
 * The identity on whose behalf an MCP request is being made.
 *
 * Generic by design — claims map cleanly to standard OIDC JWT fields:
 *   subject  ← `sub`
 *   tenantId ← `tenant_id` / `org_id` / custom
 *   scopes   ← `scope` (space-delimited) or `scp` (array)
 *
 * Adapt by writing a custom AuthProvider that produces a Principal of this
 * shape from your token format.
 */
export interface Principal {
  subject: string;
  tenantId?: string;
  scopes: string[];
}

declare module 'express-serve-static-core' {
  interface Request {
    principal?: Principal;
  }
}
