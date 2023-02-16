FROM node:16 as build
WORKDIR /app

COPY package.json yarn.lock .
COPY packages/app/package.json packages/app/
COPY packages/nostr/package.json packages/nostr/
RUN yarn install --network-timeout 1000000

COPY . .
RUN yarn build

FROM nginx:mainline-alpine
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/packages/app/build /usr/share/nginx/html
