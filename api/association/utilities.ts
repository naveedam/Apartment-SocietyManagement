import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '../_lib/db';
import { utilityAccounts } from '../../src/db/schema';
import { eq } from 'drizzle-orm';
import { requireAuth, requireAdmin } from '../_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const session = await requireAuth(req, res);
    if (!session) return;
    try {
      const utilities = await db.select().from(utilityAccounts).where(eq(utilityAccounts.associationId, session.associationId));
      return res.status(200).json({ utilities });
    } catch (err: any) {
      console.error('utilities GET error:', err);
      return res.status(500).json({ error: err.message || 'Internal server error' });
    }
  }

  if (req.method === 'POST') {
    const session = await requireAdmin(req, res);
    if (!session) return;
    try {
      const { utilityType, providerName, accountNumber, notes } = req.body;
      if (!utilityType) return res.status(400).json({ error: 'utilityType is required' });
      const [created] = await db.insert(utilityAccounts).values({
        associationId: session.associationId, utilityType, providerName: providerName || null, accountNumber: accountNumber || null, notes: notes || null,
      }).returning();
      return res.status(201).json({ utility: created });
    } catch (err: any) {
      console.error('utilities POST error:', err);
      return res.status(500).json({ error: err.message || 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
