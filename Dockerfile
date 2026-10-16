FROM node:22-alpine AS build
WORKDIR /app/mobile
COPY mobile/package.json mobile/package-lock.json ./
RUN npm ci
COPY mobile/ ./
RUN npm run build:h5

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/mobile/dist/build/h5 ./dist/build/h5
COPY mobile/scripts/serve-h5.mjs ./scripts/serve-h5.mjs
USER node
CMD ["node", "scripts/serve-h5.mjs"]
