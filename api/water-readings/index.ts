import type { VercelRequest, VercelResponse } from '@vercel/node';
import { put } from '@vercel/blob';
import { db } from '../../src/db';
import { waterReadings, flats } from '../../src/db/schema';
import { eq, and, or, isNull } from 'drizzle-orm';
import { requireAuth } from '../_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const session = await requireAuth(req, res);
  if (!session) return;

  if (req.method === 'GET') {
    try {
      let readings;
      if (session.role === 'admin') {
        readings = await db.select().from(waterReadings)
          .where(eq(waterReadings.associationId, session.associationId));
      } else if (session.role === 'staff') {
        readings = await db.select().from(waterReadings)
          .where(and(eq(waterReadings.associationId, session.associationId), isNull(waterReadings.flatId)));
      } else {
        readings = await db.select().from(waterReadings).where(
          and(
            eq(waterReadings.associationId, session.associationId),
            or(eq(waterReadings.flatId, session.flatId), isNull(waterReadings.flatId)),
          ),
        );
      }
      return res.status(200).json({ readings });
    } catch (err: any) {
      console.error('water-readings GET error:', err);
      return res.status(500).json({ error: err.message || 'Internal server error' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { period, photoBase64, fileName } = req.body;
      if (!period || !photoBase64 || !fileName) {
        return res.status(400).json({ error: 'period, photoBase64, and fileName are required' });
      }

      let flatId: string | null;
      let readingType: 'flat' | 'common_area' | 'tank_inlet' = 'flat';

      if (session.role === 'staff') {
        flatId = null;
        readingType = req.body.readingType === 'tank_inlet' ? 'tank_inlet' : 'common_area';
      } else if (session.role === 'admin' && req.body.flatId !== undefined) {
        if (req.body.flatId) {
          const [flat] = await db.select().from(flats)
            .where(and(eq(flats.id, req.body.flatId), eq(flats.associationId, session.associationId))).limit(1);
          if (!flat) return res.status(400).json({ error: 'Invalid flatId' });
          flatId = req.body.flatId;
          readingType = 'flat';
        } else {
          flatId = null;
          readingType = req.body.readingType === 'tank_inlet' ? 'tank_inlet' : 'common_area';
        }
      } else {
        flatId = session.flatId;
        readingType = 'flat';
      }

      const base64Data = String(photoBase64).split(',').pop()!;
      const buffer = Buffer.from(base64Data, 'base64');

      const blob = await put(`water-readings/${session.associationId}/${period}/${Date.now()}-${fileName}`, buffer, {
        access: 'public',
        addRandomSuffix: true,
      });

      const [reading] = await db.insert(waterReadings).values({
        associationId: session.associationId,
        flatId,
        readingType,
        period,
        photoUrl: blob.url,
        submittedBy: session.userId,
      }).returning();

      return res.status(201).json({ reading });
    } catch (err: any) {
      console.error('water-readings POST error:', err);
      return res.status(500).json({ error: err.message || 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
