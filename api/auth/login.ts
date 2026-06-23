import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '../_lib/db';
import { users } from '../_lib/schema';
import { eq } from 'drizzle-orm';
import { verifyPassword, createSessionToken, serializeSessionCookie } from '../_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { phone, password } = req.body;
    if (!phone || !password) return res.status(400).json({ error: 'Phone and password required' });
    const [user] = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
    if (!user || !user.isActive) return res.status(401).json({ error: 'Invalid credentials' });
    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    const token = await createSessionToken({
      userId: user.id, associationId: user.associationId!,
      role: user.role as 'admin' | 'resident' | 'staff', flatId: user.flatId,
    });
    res.setHeader('Set-Cookie', serializeSessionCookie(token));
    return res.status(200).json({ user: { id: user.id, name: user.name, role: user.role, flatId: user.flatId } });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
