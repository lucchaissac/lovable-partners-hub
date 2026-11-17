import { defineConfig,loadEnv } from 'vite';
import {communityChatPlugin} from './server/communityChat.mjs';
import { fileURLToPath } from 'node:url';

export default defineConfig(({mode})=>({
  // These variables stay in Node; Vite only exposes VITE_-prefixed values to the page.
  plugins: [communityChatPlugin({env:loadEnv(mode,process.cwd(),['COMMUNITY_','OPENAI_','BLOB_'])})],
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
}));
