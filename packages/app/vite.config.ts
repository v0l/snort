import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

import appConfig from "config";

export default defineConfig({
  plugins: [react()],
  assetsInclude: ['**/*.md'],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  define: {
    CONFIG: JSON.stringify(appConfig),
    global: {}, // needed for custom-event lib
    SINGLE_RELAY: JSON.stringify(process.env.SINGLE_RELAY),
  },
});
