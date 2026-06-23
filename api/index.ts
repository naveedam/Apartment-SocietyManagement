import type { VercelRequest, VercelResponse } from '@vercel/node';

// Re-export a router that dispatches to the right handler based on path
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.status(404).json({ error: 'Use /api/v1/...' });
}
