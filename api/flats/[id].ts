import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '../_lib/db';
import { flats } from '../_lib/schema';
import { eq, and } from 'drizzle-orm';
import { requireAdmin } from '../_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const session = await requireAdmin(req, res);
  if (!session) return;

  const flatId = req.query.id as string;

  try {
    if (req.method === 'PATCH') {
      const { flatNumber, floor, flatType, occupancyStatus } = req.body;

      const updates: Record<string, any> = {};
      if (flatNumber !== undefined) updates.flatNumber = flatNumber;
      if (floor !== undefined) updates.floor = floor;
      if (flatType !== undefined) updates.flatType = flatType;
      if (occupancyStatus !== undefined) updates.occupancyStatus = occupancyStatus;

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      const [updated] = await db
        .update(flats)
        .set(updates)
        .where(and(eq(flats.id, flatId), eq(flats.associationId, session.associationId)))
        .returning();

      if (!updated) return res.status(404).json({ error: 'Flat not found' });
      return res.status(200).json({ flat: updated });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    console.error('flats/[id] error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
