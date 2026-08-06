# syntax=docker/dockerfile:1.7

# ---------- Stage 1: deps ----------
# Install all dependencies (including devDeps) needed to build the project.
# Bookworm-slim is chosen over Alpine because `canvas` and `sharp` ship
# glibc-based prebuilt binaries; Alpine (musl) would force source compiles.
FROM node:24-bookworm-slim AS deps

ENV NODE_ENV=development \
    NPM_CONFIG_FUND=false \
    NPM_CONFIG_AUDIT=false

# Build-time native libs required by `canvas`. `sharp` ships prebuilt binaries
# and does not need extra system packages on glibc.
RUN apt-get update && apt-get install -y --no-install-recommends \
      build-essential \
      pkg-config \
      python3 \
      libcairo2-dev \
      libpango1.0-dev \
      libjpeg-dev \
      libgif-dev \
      librsvg2-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy lockfiles first so dependency installs are cached as long as they don't change.
COPY package.json package-lock.json ./
COPY apps/chatbot-web/package.json   apps/chatbot-web/package.json
COPY apps/coach-web/package.json     apps/coach-web/package.json
COPY apps/wolt-web/package.json      apps/wolt-web/package.json
COPY apps/world-cup-web/package.json apps/world-cup-web/package.json
COPY apps/worldly-web/package.json   apps/worldly-web/package.json

RUN npm ci --include=dev


# ---------- Stage 2: builder ----------
# Compile TypeScript to `dist/` and build the Vite mini-apps into `apps/*/dist`.
FROM deps AS builder

ENV NODE_ENV=production

COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
COPY apps ./apps

RUN npm run build


# ---------- Stage 3: runner ----------
# Minimal runtime image. Only runtime shared libs for canvas, only prod deps.
FROM node:24-bookworm-slim AS runner

ENV NODE_ENV=production \
    NPM_CONFIG_FUND=false \
    NPM_CONFIG_AUDIT=false \
    PORT=3000

RUN apt-get update && apt-get install -y --no-install-recommends \
      libcairo2 \
      libpango-1.0-0 \
      libjpeg62-turbo \
      libgif7 \
      librsvg2-2 \
      curl \
      tini \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install production-only dependencies. Workspace package.jsons are needed so
# npm can resolve the workspace graph during install.
COPY package.json package-lock.json ./
COPY apps/chatbot-web/package.json   apps/chatbot-web/package.json
COPY apps/coach-web/package.json     apps/coach-web/package.json
COPY apps/wolt-web/package.json      apps/wolt-web/package.json
COPY apps/world-cup-web/package.json apps/world-cup-web/package.json
COPY apps/worldly-web/package.json   apps/worldly-web/package.json

RUN npm ci --omit=dev

# Bring in the compiled output from the builder stage.
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/apps/chatbot-web/dist   ./apps/chatbot-web/dist
COPY --from=builder /app/apps/coach-web/dist     ./apps/coach-web/dist
COPY --from=builder /app/apps/wolt-web/dist      ./apps/wolt-web/dist
COPY --from=builder /app/apps/world-cup-web/dist ./apps/world-cup-web/dist
COPY --from=builder /app/apps/worldly-web/dist   ./apps/worldly-web/dist

# Runtime-writable asset directories (mounted as a named volume in compose).
RUN mkdir -p assets/downloads assets/files assets/recordings \
    && chown -R node:node /app

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS http://localhost:${PORT}/ || exit 1

# `tini` reaps zombies and forwards signals cleanly to Node.
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "dist/index.js"]
