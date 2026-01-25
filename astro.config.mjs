// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  integrations: [react()],
  output: 'static',
  site: 'https://anamnesis.fm',
  build: {
    assets: 'assets',
  },
  vite: {
    server: {
      proxy: {
        // Proxy API requests to local Cloudflare Worker during development
        '/api': {
          target: 'http://localhost:8787',
          changeOrigin: true,
        },
      },
    },
  },
});
