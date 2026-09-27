FROM node:22-alpine AS build
WORKDIR /app
COPY apps/api/package*.json apps/api/
COPY packages/contracts/package*.json packages/contracts/
RUN npm ci --prefix apps/api && npm ci --prefix packages/contracts
COPY apps/api apps/api
COPY packages/contracts/src packages/contracts/src
RUN npm run build --prefix apps/api && npm prune --omit=dev --prefix apps/api
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/apps/api/node_modules apps/api/node_modules
COPY --from=build /app/packages/contracts packages/contracts
COPY --from=build /app/apps/api/package.json apps/api/package.json
COPY --from=build /app/apps/api/dist/apps/api/src apps/api/src
COPY --from=build /app/apps/api/dist/packages/contracts/src packages/contracts/src
COPY infra/migrations infra/migrations
USER node
CMD ["node","apps/api/src/index.js"]
