# Base image
FROM node:20-alpine AS builder

# Install pnpm globally
RUN npm install -g pnpm

# Create a non-root user to run the application FIRST
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Create app directory and set ownership immediately
WORKDIR /usr/src/app
RUN chown nodejs:nodejs /usr/src/app

# Copy package files with ownership
COPY --chown=nodejs:nodejs package.json pnpm-lock.yaml ./

# Switch to nodejs user for all subsequent operations
USER nodejs

# Install dependencies as nodejs user
RUN pnpm install

# Copy application source code with proper ownership
COPY --chown=nodejs:nodejs . .

# CRITICAL: Accept build arguments for Next.js environment variables
# These MUST be available at build time for Next.js to embed them in the client bundle
ARG NEXT_PUBLIC_API_BASE_URL
ARG NEXT_PUBLIC_FRONTEND_URL

# Set them as environment variables for the build process
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}
ENV NEXT_PUBLIC_FRONTEND_URL=${NEXT_PUBLIC_FRONTEND_URL}

# Build the app with the environment variables available
RUN pnpm build

# Production stage
FROM node:20-alpine AS runner

# Install pnpm
RUN npm install -g pnpm

# Create nodejs user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Create app directory and set ownership BEFORE copying files
WORKDIR /usr/src/app
RUN chown nodejs:nodejs /usr/src/app

# Copy built application from builder stage
COPY --from=builder --chown=nodejs:nodejs /usr/src/app/.next ./.next
COPY --from=builder --chown=nodejs:nodejs /usr/src/app/public ./public
COPY --from=builder --chown=nodejs:nodejs /usr/src/app/package.json ./package.json
COPY --from=builder --chown=nodejs:nodejs /usr/src/app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=builder --chown=nodejs:nodejs /usr/src/app/next.config.mjs ./next.config.mjs

# Switch to nodejs user
USER nodejs

# Install only production dependencies
RUN pnpm install --prod

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); }).on('error', () => { process.exit(1); })"

# Start the app as nodejs user
CMD ["pnpm", "start"]