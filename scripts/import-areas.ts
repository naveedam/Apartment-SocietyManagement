import { db } from '../src/db';
import { associations, flats } from '../src/db/schema';
import { eq, and } from 'drizzle-orm';

const areas: Record<string, number> = {
  GF1: 1200, GF2: 1100, GF3: 1100, GF4: 1200,
  FF1: 1200, FF2: 1100, FF3: 1100, FF4: 1200,
  SF1: 1200, SF2: 1100, SF3: 1200, SF4: 1500,
  PH1: 1700, PH2: 1400, ST1: 450,
};

async function run() {
  const [association] = await db.select().from(associations).limit(1);
  if (!association) throw new Error('No association found');

  for (const [flatNumber, area] of Object.entries(areas)) {
    const result = await db.update(flats).set({ area })
      .where(and(eq(flats.associationId, association.id), eq(flats.flatNumber, flatNumber)))
      .returning();
    console.log(result.length ? `Set ${flatNumber} area to ${area} sqft` : `Flat ${flatNumber} not found`);
  }
}

run().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); });
