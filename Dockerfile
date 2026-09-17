# ── Stage 1: build the frontend ──────────────────────────────────────────────
FROM node:24-alpine AS frontend-builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY frontend/package.json ./frontend/
COPY backend/package.json ./backend/

RUN npm ci --workspace=frontend --ignore-scripts

COPY frontend ./frontend
# The commit the build info reads, which is why .dockerignore lets three .git
# paths back in.
COPY .git/HEAD .git/HEAD
COPY .git/refs .git/refs

RUN npm run build --workspace=frontend

# ── Stage 2: production image ────────────────────────────────────────────────
FROM node:24-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/

RUN npm ci --workspace=backend --omit=dev --ignore-scripts

COPY backend ./backend
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist
COPY docker-entrypoint.sh /usr/local/bin/

ENV NODE_ENV=production
ENV DATA_DIR=/app/data

EXPOSE 20822

WORKDIR /app/backend
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "src/server.ts"]
