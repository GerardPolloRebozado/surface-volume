# Multi-stage Dockerfile for Astro Web (SSR mode)
FROM node:24-alpine AS builder

WORKDIR /app

# Install pnpm 12
RUN npm install -g pnpm@12

# Copy root workspace and lockfile
COPY pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY packages/web/package.json ./packages/web/
COPY packages/contract ./packages/contract
COPY packages/api-client-ts ./packages/api-client-ts
COPY packages/backend-nestjs/src ./packages/backend-nestjs/src

WORKDIR /app/packages/web

RUN pnpm install --frozen-lockfile=false

COPY packages/web ./

RUN pnpm run build

# --- Runner stage ---
FROM node:24-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4321

RUN npm install -g pnpm@12

COPY pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY packages/web/package.json ./packages/web/

WORKDIR /app/packages/web

RUN pnpm install --prod --frozen-lockfile=false

COPY --from=builder /app/packages/web/dist ./dist

EXPOSE 4321

CMD ["node", "dist/server/entry.mjs"]
