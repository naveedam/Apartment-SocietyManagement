import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '../_lib/db';
import { budgetProposals } from '../_lib/schema';
import { eq, desc } from 'drizzle-orm';
import { requireAdmin, requireAuth } from '../_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const session = await requireAuth(req, res);
    if (!session) return;
    const proposals = await db.select().from(budgetProposals)
      .where(eq(budgetProposals.associationId, session.associationId))
      .orderBy(desc(budgetProposals.createdAt));
    return res.status(200).json(proposals);
  }

  if (req.method === 'POST') {
    const session = await requireAdmin(req, res);
    if (!session) return;
    const { financialYear, operationalBudget, capitalBudget, lineItems } = req.body;
    if (!financialYear || operationalBudget == null || capitalBudget == null || !lineItems)
      return res.status(400).json({ error: 'Missing required fields' });
    const op = parseFloat(operationalBudget);
    const cap = parseFloat(capitalBudget);
    const [proposal] = await db.insert(budgetProposals).values({
      associationId: session.associationId,
      financialYear,
      operationalBudget: op.toFixed(2),
      capitalBudget: cap.toFixed(2),
      totalBudget: (op + cap).toFixed(2),
      lineItems: JSON.stringify(lineItems),
      createdBy: session.userId,
    }).returning();
    return res.status(201).json(proposal);
  }

  if (req.method === 'PATCH') {
    const session = await requireAdmin(req, res);
    if (!session) return;
    const { id } = req.query;
    if (!id || typeof id !== 'string') return res.status(400).json({ error: 'Missing id' });
    const [updated] = await db.update(budgetProposals)
      .set({ status: 'approved', approvedAt: new Date(), approvedBy: session.userId })
      .where(eq(budgetProposals.id, id)).returning();
    return res.status(200).json(updated);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
