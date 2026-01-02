# Multi-stage build for production deployment
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build frontend with Vite
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy built frontend from builder stage
COPY --from=builder /app/dist ./dist

# Copy and compile server files
COPY server.ts ./
COPY services ./services
COPY types.ts ./
COPY constants.ts ./
COPY tsconfig.server.json ./

# Install esbuild for faster TypeScript compilation
RUN npm install -D esbuild

# Compile TypeScript to JavaScript using esbuild (no type checking, just transpilation)
# Use .cjs extension since package.json has "type": "module"
RUN npx esbuild server.ts --bundle --platform=node --format=cjs --outfile=server.cjs --external:pg --external:express --external:cors --external:node-cron

# Expose port (Cloud Run uses PORT env variable)
EXPOSE 8080

# Set environment to production
ENV NODE_ENV=production

# Start the compiled server
CMD ["node", "server.cjs"]
