import {build} from 'vite';
await build({configFile:false,logLevel:'warn',build:{ssr:'server/hubDocument.ts',outDir:'server/generated',emptyOutDir:true,copyPublicDir:false,minify:false,rollupOptions:{output:{entryFileNames:'hubDocument.mjs'}}}});
