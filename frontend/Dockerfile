# Stage 1: build
FROM node:lts AS builder
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY frontend/package.json ./frontend/
COPY tsconfig.base.json ./

RUN corepack enable && pnpm install --filter frontend --frozen-lockfile

COPY frontend ./frontend

RUN pnpm --filter frontend build

# Stage 2: serve
FROM nginx:alpine AS runtime

COPY --from=builder /app/frontend/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
