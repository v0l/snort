FROM node:19 as build
WORKDIR /app

COPY package.json yarn.lock .yarnrc.yml .
COPY .yarn .yarn
COPY packages packages
RUN yarn --network-timeout 1000000
RUN yarn build

FROM nginxinc/nginx-unprivileged:mainline-alpine
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/packages/app/build /usr/share/nginx/html
