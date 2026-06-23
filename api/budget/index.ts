import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '../_lib/db';
import { budgetProposals, flats, dues } from '../_lib/schema';
import { eq, and, desc } from 'drizzle-orm';
import { requireAdmin, requireAuth } from '../_lib/auth';

const TOTAL_AREA_SQFT = 17300;
const TOTAL_FLATS = 15;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const url = req.url || '';

  // /api/budget/statement
  if (url.includes('/statement')) {
    if (req.method === 'GET') {
      const session = await requireAdmin(req, res);
      if (!session) return;
      const { year, period } = req.query;
      if (!year || !period || typeof year !== 'string' || typeof period !== 'string')
        return res.status(400).json({ error: 'year and period required' });
      const [budget] = await db.select().from(budgetProposals)
        .where(and(eq(budgetProposals.associationId, session.associationId), eq(budgetProposals.financialYear, year))).limit(1);
      if (!budget) return res.status(404).json({ error: `No budget for ${year}` });
      const opMonthly = parseFloat(budget.operationalBudget) / 12;
      const capMonthly = parseFloat(budget.capitalBudget) / 12;
      const equalShare = opMonthly / TOTAL_FLATS;
      const allFlats = await db.select().from(flats).where(eq(flats.associationId, session.associationId));
      return res.status(200).json({
        financialYear: year, period, budgetId: budget.id, budgetStatus: budget.status,
        operationalBudget: parseFloat(budget.operationalBudget),
        capitalBudget: parseFloat(budget.capitalBudget),
        opMonthly: Math.round(opMonthly * 100) / 100,
        capMonthly: Math.round(capMonthly * 100) / 100,
        equalShare: Math.round(equalShare * 100) / 100,
        totalAreaSqft: TOTAL_AREA_SQFT,
        flats: allFlats.map(flat => {
          const area = flat.area ?? 0;
          const areaShare = capMonthly * (area / TOTAL_AREA_SQFT);
          return { flatId: flat.id, flatNumber: flat.flatNumber, area,
            equalShare: Math.round(equalShare * 100) / 100,
            areaShare: Math.round(areaShare * 100) / 100,
            totalDue: Math.round((equalShare + areaShare) * 100) / 100 };
        }),
      });
    }
    if (req.method === 'POST') {
      const session = await requireAdmin(req, res);
      if (!session) return;
      const { year, period, dueDate } = req.body;
      if (!year || !period || !dueDate) return res.status(400).json({ error: 'year, period, dueDate required' });
      const [budget] = await db.select().from(budgetProposals)
        .where(and(eq(budgetProposals.associationId, session.associationId), eq(budgetProposals.financialYear, year))).limit(1);
      if (!budget) return res.status(404).json({ error: `No budget for ${year}` });
      if (budget.status !== 'approved') return res.status(400).json({ error: 'Budget must be approved first' });
      const opMonthly = parseFloat(budget.operationalBudget) / 12;
      const capMonthly = parseFloat(budget.capitalBudget) / 12;
      const equalShare = opMonthly / TOTAL_FLATS;
      const allFlats = await db.select().from(flats).where(eq(flats.associationId, session.associationId));
      const dueRecords = allFlats.map(flat => {
        const area = flat.area ?? 0;
        const totalDue = Math.round((equalShare + capMonthly * (area / TOTAL_AREA_SQFT)) * 100) / 100;
        return { associationId: session.associationId, flatId: flat.id, period, amount: totalDue.toFixed(2), dueDate, status: 'pending' as const };
      });
      const inserted = await db.insert(dues).values(dueRecords).onConflictDoNothing().returning();
      return res.status(201).json({ generated: inserted.length, skipped: dueRecords.length - inserted.length, period });
    }
  }

  // /api/budget (base)
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
      associationId: session.associationId, financialYear,
      operationalBudget: op.toFixed(2), capitalBudget: cap.toFixed(2),
      totalBudget: (op + cap).toFixed(2), lineItems: JSON.stringify(lineItems),
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
