# nestjs-mastra-mcp-gateway

A production-style **Model Context Protocol** gateway built with **NestJS** and **Mastra**. This repository is intentionally structured as a gateway shell that currently exposes a Wikipedia MCP surface, but can be extended with new MCP interfaces in the same runtime.

It demonstrates what a real MCP gateway looks like beyond hello-world:
- pluggable authentication
- request-scoped context propagation via AsyncLocalStorage
- Zod-validated configuration
- response caching in Redis
- graceful shutdown
- tools implemented as first-class Mastra `createTool()` definitions

## Gateway quick start

```sh
docker compose up
```

Open the [MCP Inspector](https://github.com/modelcontextprotocol/inspector) or any MCP client and point it at:

```
http://localhost:3000/mcp/wikipedia
```

The running gateway exposes these Wikipedia tools:
- `search_wikipedia`
- `get_page_summary`
- `get_page_sections`
- `get_related_pages`
- `on_this_day`

No accounts or API keys required in the default mode.

## What makes this a gateway

This repo is more than a Wikipedia sample. It is a gateway framework with reusable pieces:

- `src/mcp/wikipedia-mcp.controller.ts` — HTTP entrypoint for MCP Streamable HTTP at `/mcp/wikipedia`
- `src/mcp/wikipedia-mcp.provider.ts` — registers the MCP server and the tool surface
- `src/mcp/tools/` — tool definitions, one per file, with Zod input schemas
- `src/auth/` — pluggable auth that can be swapped by env config
- `src/mcp/request-context.ts` — AsyncLocalStorage that threads the `Principal` through tool execution
- `src/wikipedia/wikipedia.client.ts` — upstream API client with Redis cache

That means new MCP surfaces can be added without changing the gateway’s core architecture.

## Run without Docker

```sh
cp .env.example .env
npm install
docker run -d -p 6379:6379 redis:7-alpine
npm run start:dev
```

## Verify the gateway

### Health checks

```sh
curl -i http://localhost:3000/health/liveness
curl -i http://localhost:3000/health/readiness
```

### Probe the MCP surface

```sh
MCP_URL='http://localhost:3000/mcp/wikipedia' npx tsx scripts/mcp-probe.ts
```

### Call a tool

```sh
MCP_URL='http://localhost:3000/mcp/wikipedia' \
TOOL=search_wikipedia \
TOOL_ARGS='{"query":"NestJS","limit":3}' \
npx tsx scripts/mcp-probe.ts
```

## Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│  HTTP request → /mcp/wikipedia                                     │
│                                                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐    │
│  │ ApiKeyGuard  │→ │ UserJwtGuard │→ │ WikipediaMcpController │    │
│  │ (optional)   │  │ AuthProvider │  │  (sets ALS context)    │    │
│  └──────────────┘  └──────────────┘  └───────────┬────────────┘    │
│                                                  ▼                 │
│                                          ┌─────────────────┐       │
│                                          │ Mastra MCPServer│       │
│                                          │   .startHTTP()  │       │
│                                          └────────┬────────┘       │
│                                                   ▼                │
│                              ┌────────────────────────────────┐    │
│                              │ Tool handler (createTool)      │    │
│                              │ ─ getPrincipalOrThrow() (ALS)  │    │
│                              │ ─ WikipediaClient → REST/Action│    │
│                              │ ─ RedisService cache           │    │
│                              └────────────────────────────────┘    │
└────────────────────────────────────────────────────────────────────┘
```

## Key files

- `src/main.ts` — boot, CORS, shutdown hooks
- `src/auth/auth.module.ts` — pluggable AuthProvider factory
- `src/auth/providers/oidc-jwt.provider.ts` — generic OIDC JWT verifier
- `src/auth/user-jwt.guard.ts` — Bearer token guard
- `src/mcp/wikipedia-mcp.controller.ts` — MCP HTTP endpoint
- `src/mcp/wikipedia-mcp.provider.ts` — MCP surface registration
- `src/mcp/request-context.ts` — AsyncLocalStorage for request-scoped principal
- `src/mcp/tools/` — Mastra tool definitions
- `src/wikipedia/wikipedia.client.ts` — upstream API client with Redis caching
- `src/config/env.schema.ts` — Zod-validated environment config

## Highlights

- **Gateway-first design.** The repo is written as a gateway shell that can host multiple MCP surfaces, with Wikipedia as the initial example.
- **Pluggable authentication.** `AuthProvider` is an interface. The project ships with `NoopAuthProvider` and `OidcJwtAuthProvider`, and additional providers can be plugged in with minimal change.
- **Request-scoped context.** `runWithRequestContext()` threads the current `Principal` through MCP tool execution, so tools can authorize without extra schema fields.
- **Zod config validation.** Environment values are parsed and validated at boot, with clear failures for missing or malformed config.
- **Redis caching.** Wikipedia API responses are cached for 24h; cache failures are logged and silently ignored.
- **Graceful shutdown.** NestJS shutdown hooks and Redis cleanup are wired for safe process exit.
- **Tool-centric implementation.** Each MCP tool is a discrete `createTool()` definition with its own input schema and handler.

## Tools

Surface mounted at `POST /mcp/wikipedia` (Streamable HTTP).

| Tool | Input | Description |
|---|---|---|
| `search_wikipedia` | `{ query, limit? }` | Full-text search; returns title, snippet, page metadata. |
| `get_page_summary` | `{ title }` | Lead extract, thumbnail, and canonical URL for a page. |
| `get_page_sections` | `{ title }` | Table of contents with nesting levels. |
| `get_related_pages` | `{ title, limit? }` | Similar articles via `morelike:` search. |
| `on_this_day` | `{ month, day, type? }` | Historical events, births, deaths, holidays. |

## Enabling auth

Default mode is `AUTH_MODE=none`, which allows anonymous access and still provides a `Principal`.

To require OIDC JWT auth:

```sh
AUTH_MODE=jwt
JWT_ISSUER=https://your-tenant.auth0.com/
JWT_AUDIENCE=https://api.example.com
JWT_JWKS_URI=https://your-tenant.auth0.com/.well-known/jwks.json
```

To require a shared gateway key too, set:

```sh
MCP_API_KEY=your-key
```

If `MCP_API_KEY` is present, every request must send `x-api-key: <value>`.

## Extending the gateway

### Add a new MCP surface

1. Create `src/mcp/<name>-mcp.controller.ts` with `@All('/mcp/<name>')`.
2. Create `src/mcp/<name>-mcp.provider.ts` and register tools in `onModuleInit()`.
3. Add new tool definitions in `src/mcp/tools/`.
4. Register the new controller/provider in `src/mcp/mcp.module.ts`.

### Add a new auth provider

1. Implement [`AuthProvider`](src/auth/auth-provider.interface.ts).
2. Register it in [src/auth/auth.module.ts](src/auth/auth.module.ts).

### Add tenant-scoped authorization

Use [src/authorization/assert-tenant-access.ts](src/authorization/assert-tenant-access.ts) inside tool handlers.

## Tech stack

| | |
|---|---|
| Framework | [NestJS](https://nestjs.com) |
| MCP runtime | [Mastra](https://mastra.ai) |
| Config/schema | [Zod](https://zod.dev) |
| JWT | [jose](https://github.com/panva/jose) |
| Cache | [redis](https://github.com/redis/node-redis) |
| HTTP | [axios](https://axios-http.com) |
| Build/test | TypeScript, ts-jest, ESLint, Prettier |

## Scripts

| Command | What it does |
|---|---|
| `npm run start:dev` | Watch-mode development server. |
| `npm run build` | Compile TypeScript to `dist/`. |
| `npm run lint` | Run ESLint over `src/`. |
| `npm test` | Run Jest unit tests. |
| `npm run type-check` | Run TypeScript type-checking. |
| `docker compose up` | Build and run the gateway with Redis. |

## License

MIT — see [LICENSE](LICENSE).
