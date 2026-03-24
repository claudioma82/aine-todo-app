# Stage 1: build
FROM node:lts AS builder
WORKDIR /app

# Copy package files for the monorepo root and backend
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY backend/package.json ./backend/
COPY tsconfig.base.json ./

RUN corepack enable && pnpm install --filter backend --frozen-lockfile

COPY backend ./backend

RUN pnpm --filter backend build

# Stage 2: runtime
# node:sqlite is built into Node.js — no native addons or build tools needed
FROM node:lts-slim AS runtime
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY backend/package.json ./backend/

RUN corepack enable \
    && pnpm install --filter backend --frozen-lockfile --prod

COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/src/db/migrations ./backend/dist/db/migrations

ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "backend/dist/server.js"]
