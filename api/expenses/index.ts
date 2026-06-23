import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '../_lib/db';
import { expenses } from '../_lib/schema';
import { eq, and, desc } from 'drizzle-orm';
import { requireAdmin, requireAuth } from '../_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const session = await requireAuth(req, res);
    if (!session) return;
    const { year, period } = req.query;
    const rows = await db.select().from(expenses).where(
      and(eq(expenses.associationId, session.associationId),
        ...(year && typeof year === 'string' ? [eq(expenses.financialYear, year)] : []),
        ...(period && typeof period === 'string' ? [eq(expenses.period, period)] : []))
    ).orderBy(desc(expenses.createdAt));
    return res.status(200).json(rows);
  }

  if (req.method === 'POST') {
    const session = await requireAdmin(req, res);
    if (!session) return;
    const { financialYear, period, category, description, amount, vendorId } = req.body;
    if (!financialYear || !period || !category || !description || amount == null)
      return res.status(400).json({ error: 'Missing required fields' });
    const [expense] = await db.insert(expenses).values({
      associationId: session.associationId, financialYear, period, category, description,
      amount: parseFloat(amount).toFixed(2), vendorId: vendorId || null, recordedBy: session.userId,
    }).returning();
    return res.status(201).json(expense);
  }

  if (req.method === 'DELETE') {
    const session = await requireAdmin(req, res);
    if (!session) return;
    const { id } = req.query;
    if (!id || typeof id !== 'string') return res.status(400).json({ error: 'Missing id' });
    await db.delete(expenses).where(and(eq(expenses.id, id), eq(expenses.associationId, session.associationId)));
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
