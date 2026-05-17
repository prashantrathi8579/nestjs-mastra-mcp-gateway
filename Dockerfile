ARG NODE_VERSION=22-alpine

# ─────────────────────────────────────────────────────────────────────────────
# Stage 1 — builder: install deps, compile TS to JS.
# ─────────────────────────────────────────────────────────────────────────────
FROM node:$NODE_VERSION AS builder

WORKDIR /build

COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund --progress=false --loglevel=error

COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src
RUN npm run build:prod

RUN npm prune --omit=dev

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2 — runtime: only dist + prod deps.
# ─────────────────────────────────────────────────────────────────────────────
FROM node:$NODE_VERSION AS runtime

ENV NODE_ENV=production
ENV PORT=3000

WORKDIR /app

RUN apk add --no-cache dumb-init

COPY --from=builder --chown=node:node /build/node_modules ./node_modules
COPY --from=builder --chown=node:node /build/dist ./dist
COPY --from=builder --chown=node:node /build/package.json ./package.json
COPY --chown=node:node docker-entrypoint.sh ./
RUN chmod +x ./docker-entrypoint.sh

USER node

EXPOSE 3000

ENTRYPOINT ["dumb-init", "--"]
CMD ["./docker-entrypoint.sh"]
