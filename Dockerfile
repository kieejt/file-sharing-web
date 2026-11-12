# syntax=docker/dockerfile:1

# ---------- 1. Cài dependencies & build (server TypeScript + client Vite) ----------
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY server/package.json server/
COPY client/package.json client/
RUN npm ci
COPY server server
COPY client client
RUN npm run build

# ---------- 2. Chỉ dependencies production của server ----------
FROM node:22-alpine AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY server/package.json server/
COPY client/package.json client/
RUN npm ci --omit=dev --workspace=server --include-workspace-root=false

# ---------- 3. Image chạy ----------
FROM node:22-alpine
ENV NODE_ENV=production \
    PORT=5000 \
    UPLOAD_DIR=/data/uploads \
    CLIENT_DIST=/app/client/dist
WORKDIR /app
COPY --from=prod-deps /app/node_modules node_modules
COPY --from=build /app/server/package.json server/package.json
COPY --from=build /app/server/dist server/dist
COPY --from=build /app/client/dist client/dist
RUN mkdir -p /data/uploads && chown -R node:node /data
USER node
EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD wget -qO- http://127.0.0.1:5000/api/health || exit 1
CMD ["node", "server/dist/index.js"]
