# Multi-stage Dockerfile for NestJS backend
FROM node:24-alpine AS builder

WORKDIR /app

# Install pnpm 12
RUN npm install -g pnpm@12

# Copy root workspace and lockfile so allowBuilds policy is recognized
COPY pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY packages/backend-nestjs/package.json ./packages/backend-nestjs/
COPY packages/backend-nestjs/prisma ./packages/backend-nestjs/prisma/
COPY packages/backend-nestjs/prisma.config.ts ./packages/backend-nestjs/prisma.config.ts

WORKDIR /app/packages/backend-nestjs

# Install dependencies (respecting root pnpm-workspace.yaml allowBuilds)
RUN pnpm install --frozen-lockfile=false

# Generate Prisma Client
RUN pnpm prisma generate

# Copy source and config
COPY packages/backend-nestjs/tsconfig*.json packages/backend-nestjs/nest-cli.json ./
COPY packages/backend-nestjs/src ./src

# Build NestJS
RUN pnpm run build

# --- Runner stage ---
FROM node:24-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

RUN npm install -g pnpm@12

# Copy workspace and backend files
COPY pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY packages/backend-nestjs/package.json ./packages/backend-nestjs/
COPY packages/backend-nestjs/prisma ./packages/backend-nestjs/prisma/
COPY packages/backend-nestjs/prisma.config.ts ./packages/backend-nestjs/prisma.config.ts
COPY packages/backend-nestjs/entrypoint.sh ./packages/backend-nestjs/entrypoint.sh
RUN chmod +x ./packages/backend-nestjs/entrypoint.sh

WORKDIR /app/packages/backend-nestjs

# Install production dependencies and prisma CLI for migrations
RUN pnpm install --prod --frozen-lockfile=false && pnpm add -D prisma && pnpm prisma generate

# Copy compiled files from builder
COPY --from=builder /app/packages/backend-nestjs/dist ./dist

EXPOSE 8080

ENTRYPOINT ["./entrypoint.sh"]
