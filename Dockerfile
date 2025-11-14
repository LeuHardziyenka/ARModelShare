# Multi-stage build for ARModelShare
# Stage 1: Dependencies
FROM node:20-alpine AS deps

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including devDependencies for build)
RUN npm ci

# Stage 2: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Accept build arguments for frontend environment variables
# These will be baked into the Vite frontend bundle at build time
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY

# Set as environment variables so Vite can access them during build
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

# Build frontend with Vite (outputs to dist/public)
# Set NODE_ENV to production for optimized build
ENV NODE_ENV=production

# Build both frontend and backend
RUN npm run build

# Stage 3: Production runtime
FROM node:20-alpine AS runner

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy built artifacts from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/shared ./shared

# Copy necessary config files
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts

# Set production environment
ENV NODE_ENV=production

# Cloud Run will set PORT automatically (usually 8080)
# DO NOT hardcode PORT here - let Cloud Run set it at runtime
EXPOSE 8080

# Health check - uses $PORT from Cloud Run
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node --input-type=module -e "import http from 'http'; http.get('http://localhost:' + (process.env.PORT || 8080) + '/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Run the application
CMD ["node", "dist/index.js"]
