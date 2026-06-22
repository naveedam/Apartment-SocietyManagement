import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await import('../_lib/db.js');
    return res.status(200).json({ step: 1, ok: true, msg: '_lib/db imported fine' });
  } catch (err: any) {
    return res.status(200).json({ step: 1, error: err.message, code: err.code });
  }
}
