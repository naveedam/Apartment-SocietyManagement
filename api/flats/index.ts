import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '../_lib/db';
import { flats } from '../../src/db/schema';
import { eq } from 'drizzle-orm';
import { requireAdmin } from '../_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const session = await requireAdmin(req, res);
  if (!session) return;

  try {
    if (req.method === 'GET') {
      const allFlats = await db.query.flats.findMany({
        where: eq(flats.associationId, session.associationId),
        with: { users: true },
        orderBy: flats.flatNumber,
      });

      const sanitized = allFlats.map((flat) => ({
        id: flat.id,
        flatNumber: flat.flatNumber,
        floor: flat.floor,
        flatType: flat.flatType,
        occupancyStatus: flat.occupancyStatus,
        residents: flat.users.map((u) => ({
          id: u.id,
          name: u.name,
          phone: u.phone,
          role: u.role,
          ownershipType: u.ownershipType,
          isActive: u.isActive,
        })),
      }));

      return res.status(200).json({ flats: sanitized });
    }

    if (req.method === 'POST') {
      const { flatNumber, floor, flatType, occupancyStatus } = req.body;
      if (!flatNumber) {
        return res.status(400).json({ error: 'flatNumber is required' });
      }

      const [newFlat] = await db.insert(flats).values({
        associationId: session.associationId,
        flatNumber,
        floor: floor ?? null,
        flatType: flatType ?? null,
        occupancyStatus: occupancyStatus ?? 'owner_occupied',
      }).returning();

      return res.status(201).json({ flat: newFlat });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    console.error('flats/index error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}