FROM node:22-alpine AS build
WORKDIR /app
COPY apps/web/package*.json apps/web/
COPY packages/contracts/package*.json packages/contracts/
RUN npm ci --prefix apps/web && npm ci --prefix packages/contracts
COPY apps/web apps/web
COPY packages/contracts/src packages/contracts/src
RUN npm run build --prefix apps/web
FROM nginxinc/nginx-unprivileged:1.28-alpine
COPY infra/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html

USER 101
HEALTHCHECK --interval=15s --timeout=3s --retries=5 CMD wget -q --spider http://127.0.0.1:8080/healthz || exit 1
