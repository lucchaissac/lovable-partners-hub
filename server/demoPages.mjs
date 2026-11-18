export const opportunitiesDemoPath = '/1000-opportunities';
const sourcePath = '/demo/1000-opportunities';
const demoPaths = new Set([
  opportunitiesDemoPath, `${opportunitiesDemoPath}/`, `${opportunitiesDemoPath}/index.html`,
  sourcePath, `${sourcePath}/`, `${sourcePath}/index.html`,
]);

// Enabled for this review. Set DEMO_OPPORTUNITIES_ENABLED=false and rebuild to
// remove the entry from production; the same flag returns 404 in development.
export function opportunitiesDemoEnabled(env = {}) {
  return !['false', '0', 'off'].includes(String(env.DEMO_OPPORTUNITIES_ENABLED ?? 'true').trim().toLowerCase());
}

export function demoPagesPlugin(enabled) {
  const middleware = (request, response, next) => {
    const url = new URL(request.url, 'http://localhost');
    if (!demoPaths.has(url.pathname)) return next();
    response.setHeader('X-Robots-Tag', 'noindex, nofollow');
    if (!enabled) {
      response.statusCode = 404;
      response.setHeader('Content-Type', 'text/plain; charset=utf-8');
      response.end('This demo is not available.');
      return;
    }
    if (url.pathname !== opportunitiesDemoPath) {
      response.statusCode = 308;
      response.setHeader('Location', `${opportunitiesDemoPath}${url.search}`);
      response.end();
      return;
    }
    request.url = `${sourcePath}/index.html${url.search}`;
    next();
  };
  return {
    name:'isolated-demo-pages',
    configureServer(server) { server.middlewares.use(middleware); },
    configurePreviewServer(server) { server.middlewares.use(middleware); },
  };
}
