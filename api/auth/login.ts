import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '../_lib/db';
import { users } from '../../src/db/schema.js';
import { eq, and } from 'drizzle-orm';
import { verifyPassword, createSessionToken, serializeSessionCookie } from '../_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { phone, password } = req.body;
    if (!phone || !password) return res.status(400).json({ error: 'Phone and password are required' });

    const [user] = await db.select().from(users)
      .where(and(eq(users.phone, phone), eq(users.isActive, true))).limit(1);

    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = await createSessionToken({
      userId: user.id,
      associationId: user.associationId!,
      role: user.role as 'admin' | 'resident' | 'staff',
      flatId: user.flatId ?? null,
    });

    res.setHeader('Set-Cookie', serializeSessionCookie(token));
    return res.status(200).json({
      user: { id: user.id, name: user.name, role: user.role, flatId: user.flatId ?? null },
    });

    res.setHeader('Set-Cookie', serializeSessionCookie(token));
    return res.status(200).json({
      user: { id: user.id, name: user.name, role: user.role, flatId: user.flatId ?? null },
    });

    res.setHeader('Set-Cookie', serializeSessionCookie(token));
    return res.status(200).json({
      user: { id: user.id, name: user.name, role: user.role, flatId: user.flatId ?? null },
    });
  } catch (err: any) {
    console.error('login error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
