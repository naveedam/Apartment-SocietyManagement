import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '../_lib/db';
import { associations, officeBearers, utilityAccounts } from '../_lib/schema';
import { eq } from 'drizzle-orm';
import { requireAuth, requireAdmin } from '../_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const session = await requireAuth(req, res);
  if (!session) return;

  const url = req.url || '';

  // /api/association/office-bearers
  if (url.includes('/office-bearers')) {
    if (req.method === 'GET') {
      const rows = await db.select().from(officeBearers).where(eq(officeBearers.associationId, session.associationId));
      return res.status(200).json(rows);
    }
    if (req.method === 'POST') {
      const admin = await requireAdmin(req, res);
      if (!admin) return;
      const { designation, name, phone, email } = req.body;
      if (!designation || !name) return res.status(400).json({ error: 'designation and name required' });
      const [row] = await db.insert(officeBearers).values({ associationId: session.associationId, designation, name, phone, email }).returning();
      return res.status(201).json(row);
    }
    if (req.method === 'DELETE') {
      const admin = await requireAdmin(req, res);
      if (!admin) return;
      const { id } = req.query;
      if (!id || typeof id !== 'string') return res.status(400).json({ error: 'Missing id' });
      await db.delete(officeBearers).where(eq(officeBearers.id, id));
      return res.status(200).json({ success: true });
    }
  }

  // /api/association/utilities
  if (url.includes('/utilities')) {
    if (req.method === 'GET') {
      const rows = await db.select().from(utilityAccounts).where(eq(utilityAccounts.associationId, session.associationId));
      return res.status(200).json(rows);
    }
    if (req.method === 'POST') {
      const admin = await requireAdmin(req, res);
      if (!admin) return;
      const { utilityType, providerName, accountNumber, notes } = req.body;
      if (!utilityType) return res.status(400).json({ error: 'utilityType required' });
      const [row] = await db.insert(utilityAccounts).values({ associationId: session.associationId, utilityType, providerName, accountNumber, notes }).returning();
      return res.status(201).json(row);
    }
    if (req.method === 'DELETE') {
      const admin = await requireAdmin(req, res);
      if (!admin) return;
      const { id } = req.query;
      if (!id || typeof id !== 'string') return res.status(400).json({ error: 'Missing id' });
      await db.delete(utilityAccounts).where(eq(utilityAccounts.id, id));
      return res.status(200).json({ success: true });
    }
  }

  // /api/association (base — GET association info)
  if (req.method === 'GET') {
    const [assoc] = await db.select().from(associations).where(eq(associations.id, session.associationId)).limit(1);
    return res.status(200).json(assoc);
  }

  return res.status(404).json({ error: 'Not found' });
}
