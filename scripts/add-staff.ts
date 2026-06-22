import { db } from '../src/db';
import { associations, users } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import { hashPassword } from '../api/_lib/auth';

async function run() {
  const [association] = await db.select().from(associations).limit(1);
  if (!association) throw new Error('No association found');

  const passwordHash = await hashPassword('Welcome123');
  const [staff] = await db.insert(users).values({
    associationId: association.id,
    flatId: null,
    name: 'Anil',
    phone: '9591306273',
    passwordHash,
    role: 'staff',
  }).returning();

  console.log(`Created staff login for ${staff.name} — phone ${staff.phone}, password Welcome123`);
}

run().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); });
