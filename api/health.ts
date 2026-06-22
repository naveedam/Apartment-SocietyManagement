import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  return res.status(200).json({
    hasDbUrl: !!process.env.DATABASE_URL,
    hasJwt: !!process.env.JWT_SECRET,
    hasBlob: !!process.env.BLOB_READ_WRITE_TOKEN,
    dbUrlPrefix: process.env.DATABASE_URL?.substring(0, 30) ?? 'missing',
  });
}
