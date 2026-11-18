export const opportunitiesDemoPath = '/demo/1000-opportunities';

// Enabled for this review. Set DEMO_OPPORTUNITIES_ENABLED=false and rebuild to
// remove the entry from production; the same flag returns 404 in development.
export function opportunitiesDemoEnabled(env = {}) {
  return !['false', '0', 'off'].includes(String(env.DEMO_OPPORTUNITIES_ENABLED ?? 'true').trim().toLowerCase());
}

export function demoPagesPlugin(enabled) {
  const middleware = (request, response, next) => {
    const url = new URL(request.url, 'http://localhost');
    if (url.pathname !== opportunitiesDemoPath && !url.pathname.startsWith(`${opportunitiesDemoPath}/`)) return next();
    if (!enabled) {
      response.statusCode = 404;
      response.setHeader('Content-Type', 'text/plain; charset=utf-8');
      response.end('This demo is not available.');
      return;
    }
    if ([opportunitiesDemoPath, `${opportunitiesDemoPath}/`].includes(url.pathname)) request.url = `${opportunitiesDemoPath}/index.html${url.search}`;
    next();
  };
  return {
    name:'isolated-demo-pages',
    configureServer(server) { server.middlewares.use(middleware); },
    configurePreviewServer(server) { server.middlewares.use(middleware); },
  };
}
