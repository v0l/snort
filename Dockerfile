FROM node:16 as build
WORKDIR /app

COPY . .
RUN yarn install --network-timeout 1000000
RUN yarn build

FROM nginxinc/nginx-unprivileged:mainline-alpine
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/packages/app/build /usr/share/nginx/html
