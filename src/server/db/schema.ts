// Example model schema from the Drizzle docs
// https://orm.drizzle.team/docs/sql-schema-declaration

import { sql } from "drizzle-orm";
import { index, sqliteTableCreator } from "drizzle-orm/sqlite-core";

import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

import { relations } from "drizzle-orm";

/**
 * This is an example of how to use the multi-project schema feature of Drizzle ORM. Use the same
 * database instance for multiple projects.
 *
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
export const createTable = sqliteTableCreator((name) => `problems_${name}`);

export const posts = createTable(
  "post",
  (d) => ({
    id: d.integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
    name: d.text({ length: 256 }),
    createdAt: d
      .integer({ mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
    updatedAt: d.integer({ mode: "timestamp" }).$onUpdate(() => new Date()),
  }),
  (t) => [index("name_idx").on(t.name)],
);

export const transactions = sqliteTable("transactions", {
  id: text("id").primaryKey(),
  sourceAccount: text("source_account").notNull(),
  ledger: integer("ledger").notNull(),
  timestamp: integer("timestamp", { mode: "timestamp" }).notNull(),
  feeCharged: text("fee_charged").notNull(),
  successful: integer("successful", { mode: "boolean" }).notNull(),
  memo: text("memo"),
  memoType: text("memo_type"),
  envelopeXdr: text("envelope_xdr"),
  resultXdr: text("result_xdr"),
});

export const operations = sqliteTable("operations", {
  id: text("id").primaryKey(),
  transactionId: text("transaction_id")
    .notNull()
    .references(() => transactions.id),

  type: text("type").notNull(),
  sourceAccount: text("source_account"),
  from: text("from_account"),
  to: text("to_account"),
  amount: text("amount"),
  asset: text("asset"),
});

export const transactionsRelations = relations(transactions, ({ many }) => ({
  operations: many(operations),
}));

export const operationsRelations = relations(operations, ({ one }) => ({
  transaction: one(transactions, {
    fields: [operations.transactionId],
    references: [transactions.id],
  }),
}));
