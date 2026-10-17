# syntax=docker/dockerfile:1

############################
# Base
############################
FROM node:22-alpine AS base

RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

############################
# Dependencies
############################
FROM base AS deps

# postinstall runs `prisma generate`, which loads prisma.config.ts and requires DATABASE_URL
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"

# schema + config must exist before npm install (postinstall → prisma generate)
COPY package*.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./

RUN npm install

############################
# Builder
############################
FROM base AS builder

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"

RUN npx prisma generate
RUN npm run build

############################
# Migrator
############################
FROM base AS migrator

COPY --from=deps /app/node_modules ./node_modules

COPY package*.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
COPY src ./src
COPY tsconfig.json ./

ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"

RUN npx prisma generate

############################
# Runner
############################
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=5050
ENV HOSTNAME=0.0.0.0

RUN apk add --no-cache libc6-compat

RUN addgroup -S nodejs \
 && adduser -S nextjs -G nodejs

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Custom Prisma client output (src/generated) is imported at runtime
COPY --from=builder --chown=nextjs:nodejs /app/src/generated ./src/generated

RUN mkdir -p /app/storage/uploads \
 && chown -R nextjs:nodejs /app/storage

USER nextjs

EXPOSE 5050

CMD ["node", "server.js"]
