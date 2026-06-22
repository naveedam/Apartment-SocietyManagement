import { db } from '../src/db';
import { associations, flats, users } from '../src/db/schema';
import { eq, and } from 'drizzle-orm';

const GOOD_ASSOCIATION_ID = 'adfc8e99-3747-4c03-ae4a-386adbb3a435';
const BAD_ASSOCIATION_ID = '88bb69fb-dd0a-4da4-aa51-7791fc8e0fdc';

async function fix() {
  const [ff4] = await db.select().from(flats)
    .where(and(eq(flats.associationId, GOOD_ASSOCIATION_ID), eq(flats.flatNumber, 'FF4')))
    .limit(1);

  if (!ff4 || ff4.occupancyStatus !== 'rented') {
    throw new Error('FF4 in the target association is missing or not marked as rented — stopping before making changes.');
  }

  const ff4Residents = await db.select().from(users).where(eq(users.flatId, ff4.id));
  if (!ff4Residents.some((u) => u.name === 'Firoze')) {
    throw new Error('Firoze not found as a resident of FF4 in the target association — stopping before making changes.');
  }

  await db.update(users)
    .set({ associationId: GOOD_ASSOCIATION_ID, flatId: ff4.id })
    .where(eq(users.phone, '9986058837'));
  console.log(`Moved your login to association ${GOOD_ASSOCIATION_ID}, flat FF4 (${ff4.id})`);

  const deletedFlats = await db.delete(flats).where(eq(flats.associationId, BAD_ASSOCIATION_ID)).returning();
  console.log(`Deleted ${deletedFlats.length} stray flats from the old association`);

  await db.delete(associations).where(eq(associations.id, BAD_ASSOCIATION_ID));
  console.log('Deleted the stray duplicate association');

  console.log('\nDone — log in again, you should see all 15 real flats now.');
}

fix().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); });
