import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '../_lib/db';
import { users } from '../_lib/schema';
import { eq } from 'drizzle-orm';
import {
  verifyPassword, createSessionToken, serializeSessionCookie,
  clearSessionCookie, parseSessionCookie, verifySessionToken,
  requireAuth
} from '../_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const url = req.url || '';

  // POST /api/auth/login
  if (url.includes('/login') && req.method === 'POST') {
    const { phone, password } = req.body;
    if (!phone || !password) return res.status(400).json({ error: 'Phone and password required' });
    const [user] = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
    if (!user || !user.isActive) return res.status(401).json({ error: 'Invalid credentials' });
    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    const token = await createSessionToken({
      userId: user.id,
      associationId: user.associationId!,
      role: user.role as 'admin' | 'resident' | 'staff',
      flatId: user.flatId,
    });
    res.setHeader('Set-Cookie', serializeSessionCookie(token));
    return res.status(200).json({ user: { id: user.id, name: user.name, role: user.role, flatId: user.flatId } });
  }

  // POST /api/auth/logout
  if (url.includes('/logout') && req.method === 'POST') {
    res.setHeader('Set-Cookie', clearSessionCookie());
    return res.status(200).json({ success: true });
  }

  // GET /api/auth/session
  if (url.includes('/session') && req.method === 'GET') {
    try {
      const token = parseSessionCookie(req.headers.cookie);
      if (!token) return res.status(401).json({ user: null });
      const payload = await verifySessionToken(token);
      if (!payload) return res.status(401).json({ user: null });
      const [user] = await db.select().from(users).where(eq(users.id, payload.userId)).limit(1);
      if (!user || !user.isActive) return res.status(401).json({ user: null });
      return res.status(200).json({ user: { id: user.id, name: user.name, role: user.role, flatId: user.flatId ?? null } });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(404).json({ error: 'Not found' });
}
