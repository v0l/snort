/**
 * Production server — Bun.serve with static file serving + SSR.
 * Uses Bun for high-performance production serving.
 */

import { renderPage } from "./ssr-render.js";

const port = Number(process.env.PORT) || 3000;

const templateHtml = await Bun.file("./build/client/index.html").text();

const ssr: typeof import("../dist/server/entry-server.js") =
  // @ts-ignore built SSR output has no declarations
  await import("../dist/server/entry-server.js");

const server = Bun.serve({
  port,
  async fetch(req: Request) {
    const url = new URL(req.url);
    const pathname = url.pathname;

    // Serve static files from build/client
    const staticFile = Bun.file(`./build/client${pathname}`);
    if (pathname !== "/" && (await staticFile.exists())) {
      return new Response(staticFile, {
        headers: {
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }

    // SSR for everything else
    try {
      const result = await renderPage(
        url.pathname + url.search,
        templateHtml,
        ssr,
        req.headers.get("accept-language"),
        req.headers.get("cookie"),
      );
      return new Response(result.html, {
        status: result.status,
        headers: { "Content-Type": "text/html" },
      });
    } catch {
      console.error(`[${req.method}] ${pathname} 500`);
      return new Response("Internal Server Error", { status: 500 });
    }
  },
});

console.log(`Server running at http://localhost:${server.port}`);

function shutdown() {
  server.stop();
  process.exit(0);
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
