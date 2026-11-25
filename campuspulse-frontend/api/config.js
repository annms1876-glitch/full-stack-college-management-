export default function handler(req, res) {
  if (!['GET', 'HEAD'].includes(req.method || '')) {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  const payload = {
    supabaseUrl: process.env.SUPABASE_URL || '',
    publishableKey: process.env.SUPABASE_PUBLISHABLE_KEY || '',
  };
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.method === 'HEAD') return res.status(200).end();
  return res.status(200).json(payload);
}
