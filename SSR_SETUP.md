# SSR (Server-Side Rendering) Setup for Snort

This document describes the SSR implementation for the Snort application to improve SEO by rendering threads and profiles from the server side.

## Overview

The SSR implementation uses:
- **Vite** for build tooling with SSR mode support
- **React 19** with `react-dom/server` for server-side rendering
- **React Router DOM** with `StaticRouter` for routing in SSR
- **Express** as the SSR server

## Project Structure

```
packages/app/
├── src/
│   ├── entry-server.tsx    # SSR entry point
│   ├── index.tsx           # Client entry point
│   └── ...
├── server.ts               # SSR server (Express)
├── index.html              # HTML template
├── package.json            # Dependencies and scripts
└── vite.config.ts          # Vite configuration with SSR support
```

## Build Commands

```bash
# Build both client and server bundles
bun run build

# Build only client bundle
bun run build:client

# Build only server bundle (SSR)
bun run build:ssr

# Start SSR server in development
bun run server
```

## How SSR Works

1. **Client Build**: Creates the standard client-side bundle in `build/client/`
2. **Server Build**: Creates the SSR bundle in `build/server/` 
3. **SSR Server**: The Express server (`server.ts`) handles requests:
   - In development: Uses Vite's dev server middleware for hot reloading
   - In production: Serves pre-built client assets and renders SSR HTML

## Key Files

### `src/entry-server.tsx`
Server-side entry point that renders the React app to a string using `renderToString`. This is where the app is rendered on the server before being sent to the client.

### `server.ts`
Express server that:
- Handles all incoming requests
- Renders the React app to HTML on the server
- Injects the rendered HTML into the template
- Sends the complete HTML to the client

### `vite.config.ts`
Vite configuration updated to support:
- SSR build mode (`--mode ssr`)
- Separate output directories for client and server
- SSR manifest generation for proper asset loading

## Benefits

1. **Improved SEO**: Search engines can crawl the fully rendered HTML
2. **Faster First Paint**: Content is available immediately without waiting for JavaScript
3. **Better Social Sharing**: Open Graph and Twitter Card meta tags are properly rendered
4. **Enhanced User Experience**: Users see content faster on slow connections

## Deployment

### Using Docker

```bash
# Build the Docker image
docker build -t snort-ssr .

# Run the container
docker run -p 3000:3000 snort-ssr
```

### Environment Variables

- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Set to `production` for production mode

## Migration Notes

The existing Cloudflare Functions middleware (`functions/_middleware.ts`) for OpenGraph data fetching is still compatible and can be used alongside SSR for enhanced metadata.

## Future Enhancements

- Add streaming SSR with `renderToPipeableStream`
- Implement data prefetching on the server
- Add dynamic meta tag generation for profiles and threads
- Consider Next.js or Remix for a more complete SSR framework if needed
