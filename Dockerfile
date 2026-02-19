# ─── Stage 1: Production dependencies ─────────────────────────────────────────
FROM node:22-bookworm-slim AS deps

# System libraries required by @napi-rs/canvas and sharp
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ─── Stage 2: Build ────────────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS builder

RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Generate Prisma client before building
# DATABASE_URL is required by prisma.config.ts at load time but not used during generate
RUN DATABASE_URL="postgresql://dummy:dummy@localhost/dummy" npx prisma generate

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ─── Stage 3: Production runner ────────────────────────────────────────────────
FROM node:22-bookworm-slim AS runner

# Runtime libraries only (no build tools or dev headers)
RUN apt-get update && apt-get install -y \
    libcairo2 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libjpeg62-turbo \
    libgif7 \
    librsvg2-2 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0

# Production node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Build output and app config from builder stage
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.ts ./next.config.ts

# Cloud Run injects PORT=8080; fallback to 8080 locally
EXPOSE 8080

CMD ["npm", "start"]
