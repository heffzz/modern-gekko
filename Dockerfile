# Use Node.js 18 LTS as base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy web package files and install web dependencies
COPY web/package*.json ./web/
RUN cd web && npm ci

# Copy source code
COPY . .

# Build web application
RUN npm run build

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S gekko -u 1001

# Create necessary directories
RUN mkdir -p /app/data /app/logs /app/WORKLOG
RUN chown -R gekko:nodejs /app

# Switch to non-root user
USER gekko

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["npm", "start"]