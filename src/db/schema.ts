import {
  pgTable,
  uuid,
  text,
  integer,
  numeric,
  boolean,
  timestamp,
  date,
  unique,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const associations = pgTable('associations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  address: text('address'),
  registrationNo: text('registration_no'),
  bankAccountName: text('bank_account_name'),
  bankAccountNumber: text('bank_account_number'),
  bankIfsc: text('bank_ifsc'),
  bankName: text('bank_name'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  waterDiffEqualWeight: integer('water_diff_equal_weight').notNull().default(100),
  waterDiffAreaWeight: integer('water_diff_area_weight').notNull().default(0),
  waterDiffConsumptionWeight: integer('water_diff_consumption_weight').notNull().default(0),
});

export const flats = pgTable('flats', {
  id: uuid('id').primaryKey().defaultRandom(),
  associationId: uuid('association_id').notNull().references(() => associations.id),
  flatNumber: text('flat_number').notNull(),
  floor: integer('floor'),
  flatType: text('flat_type'),
  area: integer('area'), // sqft
  occupancyStatus: text('occupancy_status').notNull().default('owner_occupied'), //
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  uniqueFlatNumber: unique().on(table.associationId, table.flatNumber),
  assocIdx: index('flats_assoc_idx').on(table.associationId),
}));

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  associationId: uuid('association_id').references(() => associations.id),
  flatId: uuid('flat_id').notNull().references(() => flats.id),
  name: text('name').notNull(),
  phone: text('phone').notNull(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').notNull().default('resident'), // 'admin' | 'resident'
  ownershipType: text('ownership_type'), // 'owner' | 'tenant'
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  uniquePhone: unique().on(table.associationId, table.phone),
  assocIdx: index('users_assoc_idx').on(table.associationId),
}));

export const dues = pgTable('dues', {
  id: uuid('id').primaryKey().defaultRandom(),
  associationId: uuid('association_id').notNull().references(() => associations.id),
  flatId: uuid('flat_id').notNull().references(() => flats.id),
  period: text('period').notNull(), // '2026-06'
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  dueDate: date('due_date').notNull(),
  status: text('status').notNull().default('pending'), // 'pending' | 'paid' | 'overdue'
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  uniquePeriod: unique().on(table.associationId, table.flatId, table.period),
  assocIdx: index('dues_assoc_idx').on(table.associationId),
}));

export const payments = pgTable('payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  associationId: uuid('association_id').notNull().references(() => associations.id),
  dueId: uuid('due_id').notNull().references(() => dues.id),
  flatId: uuid('flat_id').notNull().references(() => flats.id),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  paymentDate: date('payment_date').notNull(),
  paymentMethod: text('payment_method').notNull(), // 'cash' | 'upi' | 'bank_transfer' | 'razorpay'
  referenceNumber: text('reference_number'),
  recordedBy: uuid('recorded_by').notNull().references(() => users.id),
  razorpayPaymentId: text('razorpay_payment_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  assocIdx: index('payments_assoc_idx').on(table.associationId),
}));

export const notices = pgTable('notices', {
  id: uuid('id').primaryKey().defaultRandom(),
  associationId: uuid('association_id').notNull().references(() => associations.id),
  title: text('title').notNull(),
  body: text('body').notNull(),
  postedBy: uuid('posted_by').notNull().references(() => users.id),
  category: text('category'), // 'general' | 'urgent' | 'event'
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  assocIdx: index('notices_assoc_idx').on(table.associationId),
}));

export const complaints = pgTable('complaints', {
  id: uuid('id').primaryKey().defaultRandom(),
  associationId: uuid('association_id').notNull().references(() => associations.id),
  flatId: uuid('flat_id').notNull().references(() => flats.id),
  raisedBy: uuid('raised_by').notNull().references(() => users.id),
  title: text('title').notNull(),
  description: text('description').notNull(),
  category: text('category'), // 'plumbing' | 'electrical' | 'lift' | 'other'
  status: text('status').notNull().default('open'), // 'open' | 'in_progress' | 'resolved' | 'closed'
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
}, (table) => ({
  assocIdx: index('complaints_assoc_idx').on(table.associationId),
}));

export const documents = pgTable('documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  associationId: uuid('association_id').notNull().references(() => associations.id),
  title: text('title').notNull(),
  fileUrl: text('file_url').notNull(),
  category: text('category'), // 'minutes' | 'accounts' | 'legal'
  uploadedBy: uuid('uploaded_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  assocIdx: index('documents_assoc_idx').on(table.associationId),
}));

export const polls = pgTable('polls', {
  id: uuid('id').primaryKey().defaultRandom(),
  associationId: uuid('association_id').notNull().references(() => associations.id),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status').notNull().default('draft'), // 'draft' | 'active' | 'closed'
  createdBy: uuid('created_by').notNull().references(() => users.id),
  closesAt: timestamp('closes_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  assocIdx: index('polls_assoc_idx').on(table.associationId),
}));

export const pollOptions = pgTable('poll_options', {
  id: uuid('id').primaryKey().defaultRandom(),
  pollId: uuid('poll_id').notNull().references(() => polls.id),
  optionText: text('option_text').notNull(),
});

export const pollVotes = pgTable('poll_votes', {
  id: uuid('id').primaryKey().defaultRandom(),
  pollId: uuid('poll_id').notNull().references(() => polls.id),
  optionId: uuid('option_id').notNull().references(() => pollOptions.id),
  flatId: uuid('flat_id').notNull().references(() => flats.id),
  votedAt: timestamp('voted_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  oneVotePerFlat: unique().on(table.pollId, table.flatId),
}));
export const flatsRelations = relations(flats, ({ many }) => ({
  users: many(users),
}));

export const usersRelations = relations(users, ({ one }) => ({
  flat: one(flats, { fields: [users.flatId], references: [flats.id] }),
}));
export const flatOwners = pgTable('flat_owners', {
  id: uuid('id').primaryKey().defaultRandom(),
  associationId: uuid('association_id').notNull().references(() => associations.id),
  flatId: uuid('flat_id').notNull().references(() => flats.id),
  ownerName: text('owner_name').notNull(),
  ownerPhone: text('owner_phone').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  assocIdx: index('flat_owners_assoc_idx').on(table.associationId),
}));
export const officeBearers = pgTable('office_bearers', {
  id: uuid('id').primaryKey().defaultRandom(),
  associationId: uuid('association_id').notNull().references(() => associations.id),
  designation: text('designation').notNull(),
  name: text('name').notNull(),
  phone: text('phone'),
  email: text('email'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  assocIdx: index('office_bearers_assoc_idx').on(table.associationId),
}));

export const utilityAccounts = pgTable('utility_accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  associationId: uuid('association_id').notNull().references(() => associations.id),
  utilityType: text('utility_type').notNull(),
  providerName: text('provider_name'),
  accountNumber: text('account_number'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  assocIdx: index('utility_accounts_assoc_idx').on(table.associationId),
}));

export const vendors = pgTable('vendors', {
  id: uuid('id').primaryKey().defaultRandom(),
  associationId: uuid('association_id').notNull().references(() => associations.id),
  category: text('category').notNull(),
  name: text('name').notNull(),
  phone: text('phone'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  assocIdx: index('vendors_assoc_idx').on(table.associationId),
}));
export const waterReadings = pgTable('water_readings', {
  id: uuid('id').primaryKey().defaultRandom(),
  associationId: uuid('association_id').notNull().references(() => associations.id),
  flatId: uuid('flat_id').references(() => flats.id), // null = common area
  period: text('period').notNull(), // '2026-06'
  photoUrl: text('photo_url').notNull(),
  submittedBy: uuid('submitted_by').notNull().references(() => users.id),
  submittedAt: timestamp('submitted_at', { withTimezone: true }).defaultNow().notNull(),
  previousReading: numeric('previous_reading', { precision: 10, scale: 2 }),
  currentReading: numeric('current_reading', { precision: 10, scale: 2 }),
  unitsConsumed: numeric('units_consumed', { precision: 10, scale: 2 }),
  ratePerUnit: numeric('rate_per_unit', { precision: 6, scale: 3 }),
  amount: numeric('amount', { precision: 10, scale: 2 }),
  status: text('status').notNull().default('submitted'), // 'submitted' | 'reading_entered'
  readingEnteredBy: uuid('reading_entered_by').references(() => users.id),
  readingEnteredAt: timestamp('reading_entered_at', { withTimezone: true }),
  readingType: text('reading_type').notNull().default('flat'), // 'flat' | 'common_area' | 'tank_inlet'
}, (table) => ({
  assocIdx: index('water_readings_assoc_idx').on(table.associationId),
}));