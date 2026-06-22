import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '../_lib/db';
import { associations, officeBearers, utilityAccounts } from '../../src/db/schema';
import { eq } from 'drizzle-orm';
import { requireAuth, requireAdmin } from '../_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const session = await requireAuth(req, res);
    if (!session) return;
    try {
      const [association] = await db.select().from(associations).where(eq(associations.id, session.associationId)).limit(1);
      if (!association) return res.status(404).json({ error: 'Association not found' });
      const bearers = await db.select().from(officeBearers).where(eq(officeBearers.associationId, session.associationId));
      const utilities = await db.select().from(utilityAccounts).where(eq(utilityAccounts.associationId, session.associationId));
      return res.status(200).json({ association, officeBearers: bearers, utilities });
    } catch (err: any) {
      console.error('association GET error:', err);
      return res.status(500).json({ error: err.message || 'Internal server error' });
    }
  }

  if (req.method === 'PATCH') {
    const session = await requireAdmin(req, res);
    if (!session) return;
    try {
      const { name, address, registrationNo, bankAccountName, bankAccountNumber, bankIfsc, bankName, waterDiffEqualWeight, waterDiffAreaWeight, waterDiffConsumptionWeight } = req.body;      const updates: Record<string, any> = {};
      if (name !== undefined) updates.name = name;
      if (address !== undefined) updates.address = address;
      if (registrationNo !== undefined) updates.registrationNo = registrationNo;
      if (bankAccountName !== undefined) updates.bankAccountName = bankAccountName;
      if (bankAccountNumber !== undefined) updates.bankAccountNumber = bankAccountNumber;
      if (bankIfsc !== undefined) updates.bankIfsc = bankIfsc;
      if (bankName !== undefined) updates.bankName = bankName;
      if (waterDiffEqualWeight !== undefined) updates.waterDiffEqualWeight = waterDiffEqualWeight;
      if (waterDiffAreaWeight !== undefined) updates.waterDiffAreaWeight = waterDiffAreaWeight;
      if (waterDiffConsumptionWeight !== undefined) updates.waterDiffConsumptionWeight = waterDiffConsumptionWeight;
      if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No fields to update' });

      const [updated] = await db.update(associations).set(updates).where(eq(associations.id, session.associationId)).returning();
      return res.status(200).json({ association: updated });
    } catch (err: any) {
      console.error('association PATCH error:', err);
      return res.status(500).json({ error: err.message || 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
