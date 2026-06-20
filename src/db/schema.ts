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

export const associations = pgTable('associations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  address: text('address'),
  registrationNo: text('registration_no'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const flats = pgTable('flats', {
  id: uuid('id').primaryKey().defaultRandom(),
  associationId: uuid('association_id').notNull().references(() => associations.id),
  flatNumber: text('flat_number').notNull(),
  floor: integer('floor'),
  flatType: text('flat_type'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  uniqueFlatNumber: unique().on(table.associationId, table.flatNumber),
  assocIdx: index('flats_assoc_idx').on(table.associationId),
}));

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  associationId: uuid('association_id').notNull().references(() => associations.id),
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
