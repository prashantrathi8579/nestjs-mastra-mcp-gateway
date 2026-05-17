import { AsyncLocalStorage } from 'node:async_hooks';

import { ForbiddenException } from '@nestjs/common';

import type { Principal } from '@src/auth/principal';

interface RequestContext {
  principal: Principal;
}

/**
 * Per-request async-local store. The MCP controller populates this before
 * invoking `MCPServer.startHTTP(...)`, and tool handlers read it via
 * `getPrincipalOrThrow()`.
 *
 * Using ALS (rather than threading context through Mastra tool args) keeps
 * tool definitions clean: tool handlers see their input schema, not an auth
 * object. It's the production pattern for request-scoped context in async
 * Node code.
 */
const als = new AsyncLocalStorage<RequestContext>();

export function runWithRequestContext<T>(ctx: RequestContext, fn: () => Promise<T>): Promise<T> {
  return als.run(ctx, fn);
}

export function getPrincipalOrThrow(): Principal {
  const ctx = als.getStore();
  if (!ctx?.principal) {
    throw new ForbiddenException('No principal on current request');
  }
  return ctx.principal;
}
