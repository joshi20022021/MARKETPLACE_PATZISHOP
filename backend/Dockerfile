FROM node:22-bookworm-slim@sha256:de170b39439eb0e5a3444ad7d60b015614a381e10fecae2e30ec9e735122f38d AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
RUN npm ci
COPY tsconfig.base.json ./
COPY backend/ backend/
RUN test ! -e backend/.env && test ! -e backend/.env.test && test ! -e backend/uploads && test ! -e backend/test && test ! -e backend/src/generated
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
RUN DATABASE_URL=postgresql://build:unused@localhost/build npm run prisma:generate
RUN npm run build:backend

FROM build AS tools
WORKDIR /app/backend
ENV PATH="/app/node_modules/.bin:${PATH}"
USER node
CMD ["../node_modules/.bin/prisma", "migrate", "deploy"]

FROM build AS production-deps
RUN npm prune --omit=dev --workspace backend --include-workspace-root=false

FROM node:22-bookworm-slim@sha256:de170b39439eb0e5a3444ad7d60b015614a381e10fecae2e30ec9e735122f38d AS runtime
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000
WORKDIR /app
COPY --from=production-deps /app/node_modules ./node_modules
COPY --from=production-deps /app/backend/node_modules ./backend/node_modules
COPY --from=build /app/backend/dist ./backend/dist
COPY backend/package.json ./backend/package.json
RUN mkdir -p /app/backend/uploads/product-images && chown -R node:node /app/backend/uploads
WORKDIR /app/backend
USER node
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=5s --start-period=20s --retries=6 CMD ["node", "-e", "fetch('http://127.0.0.1:3000/api/v1/health/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
CMD ["node", "dist/main.js"]
