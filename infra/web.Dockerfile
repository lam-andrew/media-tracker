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
