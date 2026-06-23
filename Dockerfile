# ─────────────────────────────────────────────────────────────────────────────
# Stage 1: deps — install node_modules
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

# Install dependencies needed by some native packages
RUN apk add --no-cache libc6-compat

COPY package.json package-lock.json ./
RUN npm ci --frozen-lockfile

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2: builder — build the Next.js app
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy deps from previous stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Disable Next.js telemetry during build
ENV NEXT_TELEMETRY_DISABLED=1

# Build production bundle
RUN npm run build

# ─────────────────────────────────────────────────────────────────────────────
# Stage 3: runner — minimal production image
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# Copy built assets from builder
COPY --from=builder /app/public       ./public
COPY --from=builder /app/.next/static ./.next/static

# Copy standalone output (requires output: 'standalone' in next.config.ts)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Start the server
CMD ["node", "server.js"]
