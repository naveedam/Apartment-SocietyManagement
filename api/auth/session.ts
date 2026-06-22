import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '../_lib/db';
import { users } from '../../src/db/schema';
import { eq } from 'drizzle-orm';
import { verifySessionToken, parseSessionCookie } from '../_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const token = parseSessionCookie(req.headers.cookie);
    if (!token) return res.status(401).json({ user: null });

    const payload = await verifySessionToken(token);
    if (!payload) return res.status(401).json({ user: null });

    const [user] = await db.select().from(users).where(eq(users.id, payload.userId)).limit(1);
    if (!user || !user.isActive) return res.status(401).json({ user: null });

    return res.status(200).json({
      user: { id: user.id, name: user.name, role: user.role, flatId: user.flatId ?? null },
    });
  } catch (err: any) {
    console.error('session error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
