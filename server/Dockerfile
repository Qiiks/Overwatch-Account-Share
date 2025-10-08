# Base image with specific version for consistency
FROM node:20-alpine

# Install system dependencies needed for some npm packages
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    curl \
    wget

# Create app directory
WORKDIR /usr/src/app

# Create a non-root user to run the application FIRST
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy package files first for better Docker layer caching
COPY --chown=nodejs:nodejs package*.json ./

# Install dependencies with clean install for production as nodejs user
USER nodejs
RUN npm ci --only=production || npm install --production

# Switch back to root to copy files
USER root

# Copy application source code with proper ownership
COPY --chown=nodejs:nodejs . .

# Create logs directory with proper ownership and permissions
RUN mkdir -p logs && \
    chown nodejs:nodejs logs && \
    chmod 755 logs

# Ensure all files have correct ownership (double-check)
RUN chown -R nodejs:nodejs /app

# Switch to non-root user for runtime
USER nodejs

# Expose port
EXPOSE 5001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:5001/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); })"

# Start the server with proper error handling
CMD ["node", "server.js"]