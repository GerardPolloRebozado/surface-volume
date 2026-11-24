# Multi-stage Dockerfile for NestJS backend
FROM node:24-alpine AS builder

WORKDIR /app

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package files
COPY package.json pnpm-lock.yaml* ./
COPY prisma ./prisma/

# Install dependencies (including devDependencies for build)
RUN pnpm install --frozen-lockfile=false

# Generate Prisma Client
RUN pnpm prisma generate

# Copy source and config
COPY tsconfig*.json nest-cli.json ./
COPY src ./src

# Build NestJS
RUN pnpm run build

# --- Runner stage ---
FROM node:24-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package files and prisma migrations/schema
COPY package.json pnpm-lock.yaml* ./
COPY prisma ./prisma/
COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

# Install production dependencies and prisma CLI for migrations
RUN pnpm install --prod --frozen-lockfile=false && pnpm add -D prisma && pnpm prisma generate

# Copy compiled files from builder
COPY --from=builder /app/dist ./dist

EXPOSE 8080

ENTRYPOINT ["./entrypoint.sh"]
