import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { db } = await import('../../src/db/index.js');
    const { users } = await import('../../src/db/schema.js');
    const { verifySessionToken, parseSessionCookie } = await import('../_lib/auth.js');
    const { eq } = await import('drizzle-orm');

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
    return res.status(200).json({
      diagnosticError: true,
      message: err.message,
      code: err.code,
      stack: err.stack?.split('\n').slice(0, 8),
    });
  }
}
