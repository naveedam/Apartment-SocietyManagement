import { db } from '../src/db';
import { associations, flats, users, flatOwners } from '../src/db/schema';
import { eq, and } from 'drizzle-orm';
import { hashPassword } from '../api/_lib/auth';

const TEMP_PASSWORD = 'Welcome123';

interface FlatData {
  flatNumber: string;
  occupancyStatus: 'owner_occupied' | 'rented' | 'vacant';
  residentName?: string;
  residentPhone?: string;
  ownershipType?: 'owner' | 'tenant';
}

const flatsData: FlatData[] = [
  { flatNumber: 'GF1', occupancyStatus: 'rented', residentName: 'AZ', residentPhone: '9535408757', ownershipType: 'tenant' },
  { flatNumber: 'GF2', occupancyStatus: 'rented', residentName: 'Chie Kondo', residentPhone: '8970823398', ownershipType: 'tenant' },
  { flatNumber: 'GF3', occupancyStatus: 'rented', residentName: 'Shahrukh Ameer', residentPhone: '9845564786', ownershipType: 'tenant' },
  { flatNumber: 'GF4', occupancyStatus: 'rented', residentName: 'Dr.Vivek', residentPhone: '9916880099', ownershipType: 'tenant' },
  { flatNumber: 'FF1', occupancyStatus: 'owner_occupied', residentName: 'Ghouse', residentPhone: '9742014346', ownershipType: 'owner' },
  { flatNumber: 'FF2', occupancyStatus: 'rented', residentName: 'Mohammed Haaris', residentPhone: '8548853984', ownershipType: 'tenant' },
  { flatNumber: 'FF3', occupancyStatus: 'owner_occupied', residentName: 'Ansar', residentPhone: '8123450077', ownershipType: 'owner' },
  { flatNumber: 'FF4', occupancyStatus: 'rented', residentName: 'Firoze', residentPhone: '8431963192', ownershipType: 'tenant' },
  { flatNumber: 'SF1', occupancyStatus: 'owner_occupied', residentName: 'Niloy Biswas', residentPhone: '9945098082', ownershipType: 'owner' },
  { flatNumber: 'SF2', occupancyStatus: 'owner_occupied', residentName: 'Syed Sulaiman Rizwan', residentPhone: '9845057787', ownershipType: 'owner' },
  { flatNumber: 'SF3', occupancyStatus: 'owner_occupied', residentName: 'Radhakrishnan', residentPhone: '9880695993', ownershipType: 'owner' },
  { flatNumber: 'SF4', occupancyStatus: 'rented' },
  { flatNumber: 'PH1', occupancyStatus: 'rented', residentName: 'Syed Qadri', residentPhone: '9742883086', ownershipType: 'tenant' },
  { flatNumber: 'PH2', occupancyStatus: 'owner_occupied', residentName: 'Arshia Suman', residentPhone: '9742004294', ownershipType: 'owner' },
  { flatNumber: 'ST1', occupancyStatus: 'owner_occupied' },
];

const ownerContacts = [
  { flatNumber: 'GF1', ownerName: 'Elizabeth', ownerPhone: '9029020154' },
  { flatNumber: 'GF2', ownerName: 'Elizabeth', ownerPhone: '9029020154' },
  { flatNumber: 'GF3', ownerName: 'Meena Jacob', ownerPhone: '9844016086' },
  { flatNumber: 'GF4', ownerName: 'Meena Jacob', ownerPhone: '9844016086' },
  { flatNumber: 'FF2', ownerName: 'Amjad Ali', ownerPhone: '9880761275' },
  { flatNumber: 'SF4', ownerName: 'Meena Jacob', ownerPhone: '9844016086' },
  { flatNumber: 'PH1', ownerName: 'Meena Jacob', ownerPhone: '9844016086' },
  { flatNumber: 'ST1', ownerName: 'Nilay Biswas', ownerPhone: '9945098082' },
];

async function run() {
  const [association] = await db.select().from(associations).limit(1);
  if (!association) throw new Error('No association found — run seed.ts first');

  // Clean up the test flat from API debugging
  const [testFlat] = await db.select().from(flats)
    .where(and(eq(flats.associationId, association.id), eq(flats.flatNumber, '2'))).limit(1);
  if (testFlat) {
    await db.delete(users).where(eq(users.flatId, testFlat.id));
    await db.delete(flats).where(eq(flats.id, testFlat.id));
    console.log('Removed test flat "2" and its test resident');
  }

  // Mark Naveed's existing FF4 record as the owner explicitly
  await db.update(users).set({ ownershipType: 'owner' })
    .where(and(eq(users.associationId, association.id), eq(users.phone, '9986058837')));

  for (const f of flatsData) {
    const [existing] = await db.select().from(flats)
      .where(and(eq(flats.associationId, association.id), eq(flats.flatNumber, f.flatNumber))).limit(1);

    let flatId: string;
    if (existing) {
      await db.update(flats).set({ occupancyStatus: f.occupancyStatus }).where(eq(flats.id, existing.id));
      flatId = existing.id;
      console.log(`Updated existing flat ${f.flatNumber}`);
    } else {
      const [created] = await db.insert(flats).values({
        associationId: association.id,
        flatNumber: f.flatNumber,
        occupancyStatus: f.occupancyStatus,
      }).returning();
      flatId = created.id;
      console.log(`Created flat ${f.flatNumber}`);
    }

    if (f.residentName && f.residentPhone) {
      const [existingUser] = await db.select().from(users)
        .where(and(eq(users.associationId, association.id), eq(users.phone, f.residentPhone))).limit(1);
      if (existingUser) {
        await db.update(users).set({ ownershipType: f.ownershipType }).where(eq(users.id, existingUser.id));
        console.log(`  Updated existing resident for ${f.flatNumber} (${f.residentName})`);
      } else {
        const passwordHash = await hashPassword(TEMP_PASSWORD);
        await db.insert(users).values({
          associationId: association.id,
          flatId,
          name: f.residentName,
          phone: f.residentPhone,
          passwordHash,
          role: 'resident',
          ownershipType: f.ownershipType ?? 'owner',
        });
        console.log(`  Added resident ${f.residentName} to ${f.flatNumber}`);
      }
    }
  }

  for (const o of ownerContacts) {
    const [flat] = await db.select().from(flats)
      .where(and(eq(flats.associationId, association.id), eq(flats.flatNumber, o.flatNumber))).limit(1);
    if (!flat) {
      console.warn(`  Skipping owner contact for ${o.flatNumber} — flat not found`);
      continue;
    }
    await db.insert(flatOwners).values({
      associationId: association.id,
      flatId: flat.id,
      ownerName: o.ownerName,
      ownerPhone: o.ownerPhone,
    });
    console.log(`Added owner contact ${o.ownerName} for ${o.flatNumber}`);
  }

  console.log(`\nImport complete. All new resident logins use password: ${TEMP_PASSWORD}`);
}

run().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); });
