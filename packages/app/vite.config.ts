import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { visualizer } from "rollup-plugin-visualizer";
import { defineConfig } from "vite";

import appConfig from "config";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: "injectManifest",
      srcDir: "src",
      filename: "service-worker.ts",
      devOptions: {
        enabled: true,
        type: "module",
      },
    }),
    visualizer({
      open: true,
      gzipSize: true,
      filename: "dist/stats.html",
    }),
  ],
  assetsInclude: ["**/*.md"],
  resolve: {
    alias: {
      "@": "/src",
    },
  },
  define: {
    CONFIG: JSON.stringify(appConfig),
    global: {}, // needed for custom-event lib
    SINGLE_RELAY: JSON.stringify(process.env.SINGLE_RELAY),
  },
});
