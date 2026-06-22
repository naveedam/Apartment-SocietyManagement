import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '../../_lib/db';
import { users, flats } from '../../../src/db/schema';
import { eq, and } from 'drizzle-orm';
import { requireAdmin, hashPassword } from '../../_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const session = await requireAdmin(req, res);
  if (!session) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const flatId = req.query.id as string;
  const { name, phone, password, role, ownershipType } = req.body;

  if (!name || !phone || !password) {
    return res.status(400).json({ error: 'name, phone, and password are required' });
  }

  const [flat] = await db
    .select()
    .from(flats)
    .where(and(eq(flats.id, flatId), eq(flats.associationId, session.associationId)))
    .limit(1);

  if (!flat) {
    return res.status(404).json({ error: 'Flat not found' });
  }

  const passwordHash = await hashPassword(password);

  const [newUser] = await db.insert(users).values({
    associationId: session.associationId,
    flatId,
    name,
    phone,
    passwordHash,
    role: role === 'admin' ? 'admin' : 'resident',
    ownershipType: ownershipType ?? 'owner',
  }).returning();

  return res.status(201).json({
    user: { id: newUser.id, name: newUser.name, phone: newUser.phone, role: newUser.role, ownershipType: newUser.ownershipType },
  });
}
