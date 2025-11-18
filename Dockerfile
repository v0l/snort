FROM oven/bun:latest AS build
WORKDIR /src
RUN apt update \
    && apt install -y --no-install-recommends git ca-certificates \
    && git clone --single-branch -b main https://github.com/v0l/snort \
    && cd snort \
    && bun install \
    && bun run build

FROM nginxinc/nginx-unprivileged:mainline-alpine
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /src/snort/packages/app/build /usr/share/nginx/html
