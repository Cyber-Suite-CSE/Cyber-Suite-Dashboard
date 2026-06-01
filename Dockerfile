FROM node:20-alpine AS base

# Builder stage - build the application
FROM base AS builder
WORKDIR /app

# Copy source files FIRST
COPY . .

# THEN install dependencies and build
RUN npm ci --legacy-peer-deps
RUN npm run build

# Production image - only copy built artifacts
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy public assets
COPY --from=builder /app/public ./public

# Create .next directory with correct permissions
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Copy ONLY the built artifacts from builder stage
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

CMD ["node", "server.js"]
