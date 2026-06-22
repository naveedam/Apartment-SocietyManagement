import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '../_lib/db';
import { officeBearers } from '../../src/db/schema.js';
import { eq } from 'drizzle-orm';
import { requireAuth, requireAdmin } from '../_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const session = await requireAuth(req, res);
    if (!session) return;
    try {
      const bearers = await db.select().from(officeBearers).where(eq(officeBearers.associationId, session.associationId));
      return res.status(200).json({ officeBearers: bearers });
    } catch (err: any) {
      console.error('office-bearers GET error:', err);
      return res.status(500).json({ error: err.message || 'Internal server error' });
    }
  }

  if (req.method === 'POST') {
    const session = await requireAdmin(req, res);
    if (!session) return;
    try {
      const { designation, name, phone, email } = req.body;
      if (!designation || !name) return res.status(400).json({ error: 'designation and name are required' });
      const [created] = await db.insert(officeBearers).values({
        associationId: session.associationId, designation, name, phone: phone || null, email: email || null,
      }).returning();
      return res.status(201).json({ officeBearer: created });
    } catch (err: any) {
      console.error('office-bearers POST error:', err);
      return res.status(500).json({ error: err.message || 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
