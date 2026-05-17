# nestjs-mastra-mcp-gateway

A learning project demonstrating how to build an **MCP (Model Context Protocol) gateway** using **NestJS** and **Mastra**. 

Currently exposes a Wikipedia MCP surface as an example. The architecture is designed to be extended with new MCP interfaces (Jira, Slack, your own APIs) in the same runtime. MIT licensed — fork it, learn from it, adapt it for your needs.

**What this teaches:**
- How to structure an MCP gateway with pluggable auth
- Request-scoped context propagation via AsyncLocalStorage
- Zod-validated configuration (fail fast on boot)
- Redis caching for external APIs
- Clean error handling and graceful shutdown
- Tool definitions as first-class Mastra `createTool()` functions

## Quick start

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

## What you're looking at

This is **not a live service** — it's a learning project. Run it locally, explore it, fork it, adapt it.

The goal is to show:
- How to architect an MCP gateway (not just a single tool)
- How to handle auth properly (even though Wikipedia doesn't need it)
- How to add new MCP surfaces without breaking existing ones
- How to structure code for readability and extension

## What makes this a gateway

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

- **Gateway-first design.** The repo is structured as a reusable gateway shell. Wikipedia is the first surface; add more without changing core code.
- **Pluggable auth.** Swap auth providers with an env var — no code changes. Ships with `NoopAuthProvider` and `OidcJwtAuthProvider`. Add your own by implementing the interface.
- **Request-scoped context.** `runWithRequestContext()` threads the current `Principal` through tool execution so tools can check permissions without schema pollution.
- **Zod config validation.** All env vars are parsed and validated at boot. Fails fast with clear error messages.
- **Redis caching.** API responses are cached for 24h. Cache misses are logged and ignored — the live call always runs.
- **Clean tool definitions.** Each MCP tool is a discrete `createTool()` with its own input schema. One file per tool. Easy to find, easy to test.
- **Learning patterns.** Request lifecycle, error handling, shutdown hooks — patterns you'd use in a real system.

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

## Why you'd fork this

- You want to understand MCP gateways without building from scratch
- You're thinking about exposing internal APIs (Jira, Slack, etc.) via MCP
- You want a reference for handling auth + caching + tool dispatch properly
- You want to add multiple surfaces to one gateway

## Extending the gateway

### Add a new MCP surface

1. Create `src/mcp/<name>-mcp.controller.ts` with `@All('/mcp/<name>')`.
2. Create `src/mcp/<name>-mcp.provider.ts` and register tools in `onModuleInit()`.
3. Add new tool definitions in `src/mcp/tools/`.
4. Register the new controller/provider in `src/mcp/mcp.module.ts`.

That's it. You now have `/mcp/wikipedia` and `/mcp/<name>` running in the same gateway.

### Add a new auth provider

1. Implement [`AuthProvider`](src/auth/auth-provider.interface.ts).
2. Register it in [src/auth/auth.module.ts](src/auth/auth.module.ts).

### Add tenant-scoped authorization

Use [src/authorization/assert-tenant-access.ts](src/authorization/assert-tenant-access.ts) inside tool handlers when you need per-tenant isolation.

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

## What this is NOT

- **Not a live service.** No production deployment. Run it locally.
- **Not fully battle-tested.** It's a learning project. Use the patterns, adapt the code.
- **Not a framework.** It's a reference implementation. Fork it and make it yours.

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

MIT — see [LICENSE](LICENSE). Created for learning purposes. Use, modify, and extend as you need.
