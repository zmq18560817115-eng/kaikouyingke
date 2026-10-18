FROM node:22-alpine AS build
RUN apk add --no-cache bzip2
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . ./
RUN npm run speech:prepare && npm run build:h5

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/dist/build/h5 ./dist/build/h5
COPY --from=build /app/scripts/serve-h5.mjs ./scripts/serve-h5.mjs
COPY --from=build /app/server ./server
COPY --from=build /app/shared ./shared
USER node
CMD ["node", "scripts/serve-h5.mjs"]
