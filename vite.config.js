import { defineConfig } from 'vite';
import {communityChatPlugin} from './server/communityChat.mjs';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [communityChatPlugin()],
  optimizeDeps: { include: ['react', 'react-dom/client', 'react-router-dom'] },
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: [
      { find: '@asset/ui/theme', replacement: fileURLToPath(new URL('./studio/packages/ui/src/theme.ts', import.meta.url)) },
      { find: '@asset/ui', replacement: fileURLToPath(new URL('./studio/packages/ui/src/index.ts', import.meta.url)) },
    ],
  },
  build: {
    rollupOptions: {
      input: {
        hub: fileURLToPath(new URL('./index.html', import.meta.url)),
        studio: fileURLToPath(new URL('./studio/index.html', import.meta.url)),
      },
    },
    chunkSizeWarningLimit: 1800,
  },
});
