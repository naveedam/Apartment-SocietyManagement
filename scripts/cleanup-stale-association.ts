import { db } from '../src/db';
import { associations, flats, users } from '../src/db/schema';
import { eq } from 'drizzle-orm';

const BAD_ASSOCIATION_ID = '88bb69fb-dd0a-4da4-aa51-7791fc8e0fdc';

async function cleanup() {
  const deletedUsers = await db.delete(users).where(eq(users.associationId, BAD_ASSOCIATION_ID)).returning();
  console.log(`Deleted ${deletedUsers.length} leftover user(s) from the old association`);

  const deletedFlats = await db.delete(flats).where(eq(flats.associationId, BAD_ASSOCIATION_ID)).returning();
  console.log(`Deleted ${deletedFlats.length} stray flats from the old association`);

  await db.delete(associations).where(eq(associations.id, BAD_ASSOCIATION_ID));
  console.log('Deleted the stray duplicate association');
}

cleanup().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); });
