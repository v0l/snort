FROM oven/bun:latest AS build
WORKDIR /src
RUN apt update \
    && apt install -y --no-install-recommends git ca-certificates \
    && git clone --single-branch -b main https://github.com/v0l/snort \
    && cd snort \
    && bun install \
    && bun run build

FROM oven/bun:latest AS runtime
WORKDIR /app

# Copy built assets
COPY --from=build /src/snort/packages/app/build /app/build

# Copy server files
COPY --from=build /src/snort/packages/app/package.json /app/package.json
COPY --from=build /src/snort/packages/app/server.ts /app/server.ts

# Install production dependencies
RUN cd /app && bun install --production

# Expose port
EXPOSE 3000

# Start SSR server
CMD ["bun", "run", "server"]
