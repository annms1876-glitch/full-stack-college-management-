function runtimeAuthConfig() {
  const handler = (req, res, next) => {
    if (req.url?.split('?')[0] !== '/api/config') return next();
    if (!['GET', 'HEAD'].includes(req.method || '')) {
      res.statusCode = 405;
      res.setHeader('Allow', 'GET, HEAD');
      return res.end();
    }
    const payload = JSON.stringify({
      clerkPublishableKey: process.env.CLERK_PUBLISHABLE_KEY || '',
      supabaseUrl: process.env.SUPABASE_URL || '',
      publishableKey: process.env.SUPABASE_PUBLISHABLE_KEY || '',
    }).replace(/</g, '\\u003c');
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return res.end(req.method === 'HEAD' ? undefined : payload);
  };
  return {
    name: 'campuspulse-runtime-auth-config',
    configureServer(server) { server.middlewares.use(handler); },
    configurePreviewServer(server) { server.middlewares.use(handler); },
  };
}

export default { plugins: [runtimeAuthConfig()] };
