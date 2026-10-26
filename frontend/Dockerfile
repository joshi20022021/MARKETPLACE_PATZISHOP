FROM node:22-bookworm-slim@sha256:de170b39439eb0e5a3444ad7d60b015614a381e10fecae2e30ec9e735122f38d AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
RUN npm ci
COPY tsconfig.base.json ./
COPY frontend/ frontend/
RUN test ! -e frontend/.env && test ! -e frontend/test && test ! -e frontend/dist
ENV VITE_API_URL=/api/v1
RUN npm run build:frontend

FROM caddy:2-alpine@sha256:eb4d35b7452d1ab6171fbdbe8d9275b2301dad6dad92115d91e19fb9b24d510f
COPY --from=build /app/frontend/dist /srv
COPY docker/Caddyfile /etc/caddy/Caddyfile
RUN mkdir -p /data /config && chown -R 1000:1000 /data /config
USER 1000:1000
EXPOSE 8443
HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=6 CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
