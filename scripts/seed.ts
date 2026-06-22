import { db } from '../src/db';
import { associations, flats, users } from '../src/db/schema';
import { hashPassword } from '../api/_lib/auth';

async function seed() {
  const [association] = await db.insert(associations).values({
    name: 'Emerald Grandeur Residents Association',
    address: '11, Srinivasa Layout, Kavalbyrasandra, R T Nagar Post, Bangalore 560032',
  }).returning();

  const [flat] = await db.insert(flats).values({
    associationId: association.id,
    flatNumber: 'FF4',
  }).returning();

  const passwordHash = await hashPassword('changeme123');

  const [admin] = await db.insert(users).values({
    associationId: association.id,
    flatId: flat.id,
    name: 'Naveed',
    phone: '9986058837',
    passwordHash,
    role: 'admin',
  }).returning();

  console.log(`Admin created — login with phone ${admin.phone} / password changeme123`);
}

seed().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); });