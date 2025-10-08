# Base image with specific version for consistency
FROM node:20-alpine

# Install system dependencies needed for some npm packages
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    curl \
    wget

# Create a non-root user to run the application FIRST (before creating directories)
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Create app directory and set ownership immediately
WORKDIR /usr/src/app
RUN chown nodejs:nodejs /usr/src/app

# Copy package files with ownership
COPY --chown=nodejs:nodejs package*.json ./

# Switch to nodejs user for all subsequent operations
USER nodejs

# Install dependencies as nodejs user (who now owns the directory)
RUN npm ci --only=production || npm install --production

# Copy application source code with proper ownership
# Note: --chown flag works even when USER is set
COPY --chown=nodejs:nodejs . .

# Create logs directory (as nodejs user, within owned directory)
RUN mkdir -p logs && \
    chmod 755 logs

# Expose port
EXPOSE 5001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:5001/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); })"

# Start the server with proper error handling
CMD ["node", "server.js"]