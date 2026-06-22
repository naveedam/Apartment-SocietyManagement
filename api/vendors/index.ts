import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '../../src/db';
import { vendors } from '../../src/db/schema';
import { eq } from 'drizzle-orm';
import { requireAuth, requireAdmin } from '../_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const session = await requireAuth(req, res);
    if (!session) return;
    try {
      const allVendors = await db.select().from(vendors).where(eq(vendors.associationId, session.associationId));
      return res.status(200).json({ vendors: allVendors });
    } catch (err: any) {
      console.error('vendors GET error:', err);
      return res.status(500).json({ error: err.message || 'Internal server error' });
    }
  }

  if (req.method === 'POST') {
    const session = await requireAdmin(req, res);
    if (!session) return;
    try {
      const { category, name, phone, notes } = req.body;
      if (!category || !name) return res.status(400).json({ error: 'category and name are required' });
      const [created] = await db.insert(vendors).values({
        associationId: session.associationId, category, name, phone: phone || null, notes: notes || null,
      }).returning();
      return res.status(201).json({ vendor: created });
    } catch (err: any) {
      console.error('vendors POST error:', err);
      return res.status(500).json({ error: err.message || 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
