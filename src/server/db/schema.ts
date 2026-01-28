// Example model schema from the Drizzle docs
// https://orm.drizzle.team/docs/sql-schema-declaration

import { sql } from "drizzle-orm";
import { relations } from "drizzle-orm";
import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

/**
 * This is an example of how to use the multi-project schema feature of Drizzle ORM. Use the same
 * database instance for multiple projects.
 *
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
// export const createTable = sqliteTableCreator((name) => `problems_${name}`);

export const posts = sqliteTable(
  "posts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).$onUpdate(
      () => new Date(),
    ),
  },
  (t) => [index("posts_name_idx").on(t.name)],
);

export const transactions = sqliteTable(
  "transactions",
  {
    id: text("id").primaryKey(), // tx hash
    sourceAccount: text("source_account").notNull(),
    ledger: integer("ledger").notNull(),
    timestamp: integer("timestamp", { mode: "timestamp" }).notNull(),
    feeCharged: text("fee_charged").notNull(),
    successful: integer("successful", { mode: "boolean" }).notNull(),
    memo: text("memo"),
    memoType: text("memo_type"),
    envelopeXdr: text("envelope_xdr"),
    resultXdr: text("result_xdr"),
    createdAt: integer("created_at", { mode: "timestamp" }).default(
      sql`(unixepoch())`,
    ),
  },
  (t) => [
    index("tx_source_idx").on(t.sourceAccount),
    index("tx_time_idx").on(t.timestamp),
  ],
);

export const operations = sqliteTable(
  "operations",
  {
    id: text("id").primaryKey(),
    transactionId: text("transaction_id")
      .notNull()
      .references(() => transactions.id, { onDelete: "cascade" }),

    type: text("type").notNull(),
    sourceAccount: text("source_account"),
    from: text("from_account"),
    to: text("to_account"),
    amount: text("amount"),
    asset: text("asset"),
    createdAt: integer("created_at", { mode: "timestamp" }).default(
      sql`(unixepoch())`,
    ),
  },
  (t) => [index("op_tx_idx").on(t.transactionId)],
);

export const transactionsRelations = relations(transactions, ({ many }) => ({
  operations: many(operations),
}));

export const operationsRelations = relations(operations, ({ one }) => ({
  transaction: one(transactions, {
    fields: [operations.transactionId],
    references: [transactions.id],
  }),
}));
