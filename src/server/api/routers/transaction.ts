import { z } from "zod";
import {
  fetchAcc,
  fetchStellarTransactionOperations,
} from "~/lib/stellar/trx-api";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { transactions, operations } from "~/server/db/schema";
import { eq } from "drizzle-orm";

export const transactionRouter = createTRPCRouter({
  getAcc: publicProcedure
    .input(z.object({ publicKey: z.string() }))
    .query(async ({ input }) => {
      return await fetchAcc(input.publicKey);
    }),

  // Get all transactions
  getAll: publicProcedure
    .input(z.object({ publicKey: z.string() }))
    .query(async ({ input }) => {
      // Try DB first
      const dbTxs = await db.query.transactions.findMany({
        where: eq(transactions.sourceAccount, input.publicKey),
        orderBy: (t, { desc }) => [desc(t.timestamp)],
        limit: 200,
      });

      if (dbTxs.length > 0) {
        return { transactions: dbTxs };
      }

      // Fetch from Horizon
      const txs = await fetchStellarTransactionOperations(input.publicKey);

      // Save to DB
      const rows = txs.map((tx) => ({
        id: tx.id,
        sourceAccount: tx.sourceAccount,
        ledger: tx.ledger,
        timestamp: new Date(tx.timestamp),
        feeCharged: tx.feeCharged,
        successful: tx.successful,
        memo: tx.memo,
        memoType: tx.memoType,
        envelopeXdr: tx.envelopeXdr,
        resultXdr: tx.resultXdr,
      }));

      if (rows.length) {
        await db.insert(transactions).values(rows).onConflictDoNothing();
      }

      return { transactions: txs };
    }),

  // Get transaction by ID
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      // 1. Try DB first (with operations)
      const dbTx = await db.query.transactions.findFirst({
        where: eq(transactions.id, input.id),
        with: { operations: true },
      });

      // If tx + ops already exist
      if (dbTx && dbTx.operations.length > 0) {
        return {
          transaction: dbTx,
          operations: dbTx.operations,
        };
      }

      // 2. Fetch from Horizon
      const [txRes, opsRes] = await Promise.all([
        fetch(`https://horizon.stellar.org/transactions/${input.id}`),
        fetch(
          `https://horizon.stellar.org/transactions/${input.id}/operations?limit=200`,
        ),
      ]);

      if (!txRes.ok) throw new Error("Failed to fetch transaction");
      if (!opsRes.ok) throw new Error("Failed to fetch operations");

      const tx = await txRes.json();
      const opsJson = await opsRes.json();
      const ops = opsJson._embedded.records;

      // 3. Save transaction if not exists
      await db
        .insert(transactions)
        .values({
          id: tx.id,
          sourceAccount: tx.source_account,
          ledger: tx.ledger,
          timestamp: new Date(tx.created_at),
          feeCharged: tx.fee_charged,
          successful: tx.successful,
          memo: tx.memo,
          memoType: tx.memo_type,
          envelopeXdr: tx.envelope_xdr,
          resultXdr: tx.result_xdr,
        })
        .onConflictDoNothing();

      // 4. Save operations (if missing)
      const opRows = ops.map((op: any) => ({
        id: op.id,
        transactionId: tx.id,
        type: op.type,
        sourceAccount: op.source_account,
        from: op.from,
        to: op.to,
        amount: op.amount,
        asset: op.asset_type,
      }));

      if (opRows.length) {
        await db.insert(operations).values(opRows).onConflictDoNothing();
      }

      return {
        transaction: {
          id: tx.id,
          sourceAccount: tx.source_account,
          ledger: tx.ledger,
          timestamp: tx.created_at,
          feeCharged: tx.fee_charged,
          successful: tx.successful,
          memo: tx.memo,
          memoType: tx.memo_type,
          envelopeXdr: tx.envelope_xdr,
          resultXdr: tx.result_xdr,
        },
        operations: opRows,
      };
    }),
});
