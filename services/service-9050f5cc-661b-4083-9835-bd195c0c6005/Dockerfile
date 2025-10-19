# Dockerfile for js
# Language: JavaScript (Node.js)
# Type: execution
# Optimized with dependency caching

FROM node:18-alpine

# Set environment variables (no secrets hardcoded)
ENV NODE_ENV=production \
		HOST=0.0.0.0 \
		PORT=3000 \
		SERVICE_NAME="js" \
    SERVICE_TYPE="execution"

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy package files first for better caching
COPY package.json package-lock.json* ./

# Install dependencies (fallback to npm install if no lockfile)
RUN if [ -f package-lock.json ]; then       npm ci --only=production --silent;     else       npm install --omit=dev --silent;     fi &&     npm cache clean --force

# Copy application code
COPY --chown=nodejs:nodejs . /app

# Switch to non-root user
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
	CMD node -e "fetch('http://127.0.0.1:'+ (process.env.PORT||3000) +'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

EXPOSE ${PORT}

# Start application
CMD ["node", "index.js"]
