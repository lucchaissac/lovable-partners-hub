import {defineConfig} from 'vite';

const noindex = (_request,response,next) => {
  response.setHeader('X-Robots-Tag','noindex, nofollow');
  next();
};

export default defineConfig({
  plugins:[{
    name:'demo-noindex',
    configureServer(server) {server.middlewares.use(noindex);},
    configurePreviewServer(server) {server.middlewares.use(noindex);},
  }],
});
