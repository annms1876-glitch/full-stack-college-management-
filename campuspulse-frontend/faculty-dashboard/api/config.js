export default function handler(req, res) {
  if (!['GET', 'HEAD'].includes(req.method || '')) {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).end();
  }
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  const payload = JSON.stringify({ clerkPublishableKey: process.env.CLERK_PUBLISHABLE_KEY || '', supabaseUrl: process.env.SUPABASE_URL || '', publishableKey: process.env.SUPABASE_PUBLISHABLE_KEY || '' }).replace(/</g, '\\u003c');
  if (req.method === 'HEAD') return res.status(200).end();
  return res.status(200).send(payload);
}
