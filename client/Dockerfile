# Base image
FROM node:20-alpine

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

# Build the app as nodejs user
RUN pnpm build

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); }).on('error', () => { process.exit(1); })"

# Start the app as nodejs user
CMD ["pnpm", "start"]