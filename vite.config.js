import { defineConfig,loadEnv } from 'vite';
import {communityChatPlugin} from './server/communityChat.mjs';
import {studioAnimationPlugin} from './server/studioAnimation.mjs';
import {partnerLogoPlugin} from './server/partnerLogo.mjs';
import {sharePagesPlugin} from './server/sharePages.mjs';
import {demoPagesPlugin,opportunitiesDemoEnabled} from './server/demoPages.mjs';
import { fileURLToPath } from 'node:url';

export default defineConfig(({mode})=>{
 const demoEnabled=opportunitiesDemoEnabled({...loadEnv(mode,process.cwd(),['DEMO_']),...process.env});
 return {
  // These variables stay in Node; Vite only exposes VITE_-prefixed values to the page.
  plugins: [communityChatPlugin({env:loadEnv(mode,process.cwd(),['COMMUNITY_','OPENAI_','BLOB_'])}),studioAnimationPlugin({env:loadEnv(mode,process.cwd(),['COMMUNITY_','OPENAI_','BLOB_'])}),partnerLogoPlugin(),sharePagesPlugin(),demoPagesPlugin(demoEnabled)],
  optimizeDeps: { include: ['react', 'react-dom', 'react-dom/client', 'react-router-dom', 'mediabunny', 'html-to-image', 'fflate'] },
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
        ...(demoEnabled?{opportunities:fileURLToPath(new URL('./demo/1000-opportunities/index.html', import.meta.url))}:{}),
      },
    },
    chunkSizeWarningLimit: 1800,
  },
};});
