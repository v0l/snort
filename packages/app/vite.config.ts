import basicSsl from "@vitejs/plugin-basic-ssl";
import react from "@vitejs/plugin-react";
import appConfig from "config";
import { visualizer } from "rollup-plugin-visualizer";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import { vitePluginVersionMark } from "vite-plugin-version-mark";

export default defineConfig({
  plugins: [
    basicSsl(),
    react({
      babel: {
        configFile: true,
      },
    }),
    VitePWA({
      strategies: "injectManifest",
      injectRegister: "script",
      srcDir: "src",
      filename: "service-worker.ts",
      registerType: "autoUpdate",
      devOptions: {
        enabled: false,
        type: "module",
      },
    }),
    visualizer({
      open: true,
      gzipSize: true,
      filename: "build/stats.html",
    }),
    vitePluginVersionMark({
      name: "snort",
      ifGitSHA: true,
      command: "git describe --always --tags",
      ifMeta: true,
      ifLog: false,
      ifGlobal: false,
    }),
  ],
  assetsInclude: ["**/*.md", "**/*.wasm"],
  build: {
    outDir: "build",
    commonjsOptions: { transformMixedEsModules: true },
    sourcemap: true,
  },
  clearScreen: false,
  publicDir: appConfig.get("publicDir"),
  resolve: {
    alias: {
      "@": "/src",
    },
  },
  define: {
    CONFIG: JSON.stringify(appConfig),
    global: {}, // needed for custom-event lib
  },
  worker: {
    format: "es",
  },
});
