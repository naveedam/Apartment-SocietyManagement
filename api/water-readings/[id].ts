import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '../_lib/db';
import { waterReadings } from '../_lib/schema';
import { eq, and } from 'drizzle-orm';
import { requireAdmin } from '../_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const session = await requireAdmin(req, res);
  if (!session) return;

  if (req.method !== 'PATCH') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const readingId = req.query.id as string;
    const { previousReading, currentReading, ratePerUnit } = req.body;

    if (previousReading === undefined || currentReading === undefined || ratePerUnit === undefined) {
      return res.status(400).json({ error: 'previousReading, currentReading, and ratePerUnit are required' });
    }

    const unitsConsumed = Number(currentReading) - Number(previousReading);
    const amount = unitsConsumed * Number(ratePerUnit);

    const [updated] = await db.update(waterReadings).set({
      previousReading: String(previousReading),
      currentReading: String(currentReading),
      ratePerUnit: String(ratePerUnit),
      unitsConsumed: String(unitsConsumed),
      amount: String(amount),
      status: 'reading_entered',
      readingEnteredBy: session.userId,
      readingEnteredAt: new Date(),
    }).where(and(eq(waterReadings.id, readingId), eq(waterReadings.associationId, session.associationId)))
      .returning();

    if (!updated) return res.status(404).json({ error: 'Reading not found' });
    return res.status(200).json({ reading: updated });
  } catch (err: any) {
    console.error('water-readings/[id] PATCH error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
