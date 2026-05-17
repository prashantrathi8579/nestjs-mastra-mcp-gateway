# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run start:dev` — watch-mode dev server (NestJS `--watch`). Requires Redis at `REDIS_URL` (default `redis://localhost:6379`).
- `npm run build` / `npm run build:prod` — `nest build` to `dist/`.
- `npm test` — Jest unit tests. `rootDir` is `src/`, pattern `*.spec.ts`. Run a single test with `npm test -- path/to/file.spec.ts` or `-t "name"`.
- `npm run type-check` — `tsc --noEmit` against `tsconfig.spec.json` (broader includes than the build config).
- `npm run lint` — ESLint over `src/` only. CI-style strict via the `--quiet` flag.
- `docker compose up` — full stack (app + Redis). For local-only Redis: `docker run -d -p 6379:6379 redis:7-alpine`.
- Probe a running gateway end-to-end: `MCP_URL='http://localhost:3000/mcp/wikipedia' TOOL=search_wikipedia TOOL_ARGS='{"query":"...","limit":3}' npx tsx scripts/mcp-probe.ts`.

TypeScript path alias `@src/*` → `src/*` is configured in [tsconfig.json](tsconfig.json) **and** in the Jest `moduleNameMapper` in [package.json](package.json) — use it consistently in both production code and specs.

## Architecture

This is an HTTP-fronted **MCP (Model Context Protocol) gateway**: NestJS owns the HTTP/auth/DI layer, and Mastra's `MCPServer` owns the JSON-RPC transport and tool dispatch. The Wikipedia tool surface is the example implementation; the surrounding scaffolding is the reusable part.

### Request flow

```
HTTP → ApiKeyGuard → UserJwtGuard → WikipediaMcpController.@All()
                                          │
                                          ▼ runWithRequestContext({ principal })
                                  MCPServer.startHTTP({ req, res, serverless: true })
                                          │
                                          ▼ (Mastra dispatches by JSON-RPC method)
                                  tool.execute(input)
                                          │
                                          ▼ getPrincipalOrThrow()  ← ALS, not arg
                                  WikipediaClient → REST/Action API
                                          │
                                          ▼ Redis cache (silent fallthrough on error)
```

The controller is `@All()` on `/mcp/wikipedia` — POST/GET/DELETE are all valid in the MCP Streamable HTTP transport (call / SSE / session-terminate), and Mastra inspects the request to decide. **Do not split this into per-method handlers.**

### Three patterns to preserve when extending

1. **AsyncLocalStorage threads the `Principal`**, not Mastra tool args. The controller wraps `startHTTP` in `runWithRequestContext({ principal }, …)` ([src/mcp/request-context.ts](src/mcp/request-context.ts)); tool handlers call `getPrincipalOrThrow()` only when they need identity. This keeps tool `inputSchema`s focused on tool inputs — never add an `auth` field to a Zod schema.

2. **`AuthProvider` is selected at boot via a factory in [src/auth/auth.module.ts](src/auth/auth.module.ts)** keyed off `AUTH_MODE` (`none` → `NoopAuthProvider`, `jwt` → `OidcJwtAuthProvider`). To add a new identity story (session cookie, mTLS header, custom token), implement [`AuthProvider`](src/auth/auth-provider.interface.ts) (`verify(token) → Promise<Principal>`) and add a branch to the factory — don't change the guards.

3. **Each MCP surface = a triple**: an `MCPServer` provider (singleton, registers tools in `onModuleInit`), a controller at `/mcp/<surface>`, and a tools directory. To add a second surface (e.g. `/mcp/jira`), copy [src/mcp/wikipedia-mcp.provider.ts](src/mcp/wikipedia-mcp.provider.ts) + [src/mcp/wikipedia-mcp.controller.ts](src/mcp/wikipedia-mcp.controller.ts) and register both in [src/mcp/mcp.module.ts](src/mcp/mcp.module.ts).

### Config & validation

- Env is parsed by Zod in [src/config/env.schema.ts](src/config/env.schema.ts) via NestJS's `ConfigModule.forRoot({ validate })`. The schema uses `superRefine` for conditional requirements (`JWT_*` only required when `AUTH_MODE=jwt`). Boot fails fast on invalid env.
- Access env only through `AppConfigService.get('KEY')` ([src/config/config.service.ts](src/config/config.service.ts)) — it carries the `Env` type from the Zod schema.
- Tool inputs are validated by Zod schemas inside each `createTool({ inputSchema })` definition.

### Caching contract

[`WikipediaClient.cached()`](src/wikipedia/wikipedia.client.ts) is the only cache touchpoint. Two invariants:
- Cache failures are **logged and swallowed** — the live fetch always runs and the response always flows through. Don't add throws on Redis errors.
- 404s from Wikipedia's REST API are translated to `NotFoundException` so MCP errors surface as HTTP-shaped, not axios-shaped.

### Authorization

Authentication produces a `Principal`. **Authorization is the tool's job** — [src/authorization/assert-tenant-access.ts](src/authorization/assert-tenant-access.ts) shows the pattern: tenant pre-binding via JWT claim + direct string compare inside the tool handler, no DB lookup. Wikipedia tools are public so they skip it. New tools that touch tenant-scoped data should call this helper inside `execute` after `getPrincipalOrThrow()`.

### Graceful shutdown

`app.enableShutdownHooks()` in [src/main.ts](src/main.ts) drives `OnApplicationShutdown` on `RedisService`. New stateful providers should implement `OnApplicationShutdown` rather than registering signal handlers.
