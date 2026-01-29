import { z } from "zod";
import {
  fetchAcc,
  fetchStellarTransactionOperations,
} from "~/lib/stellar/trx-api";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { transactions, operations } from "~/server/db/schema";
import { eq } from "drizzle-orm";

interface HorizonTx {
  id: string;
  sourceAccount: string;
  ledger: number;
  timestamp: string;
  feeCharged: string;
  successful: boolean;
  memo: string | null;
  memoType: string | null;
  envelopeXdr: string | null;
  resultXdr: string | null;
}

interface HorizonOp {
  id: string;
  type: string;
  source_account?: string;
  from?: string;
  to?: string;
  amount?: string;
  asset_type?: string;
}

interface HorizonOpApi {
  id: string;
  type: string;
  source_account?: string;
  from?: string;
  to?: string;
  amount?: string;
  asset_type?: string;
}

interface HorizonTxApi {
  id: string;
  source_account: string;
  ledger: number;
  created_at: string;
  fee_charged: string;
  successful: boolean;
  memo: string | null;
  memo_type: string | null;
  envelope_xdr: string | null;
  result_xdr: string | null;
}

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
      let dbTxs: (typeof transactions.$inferSelect)[] = [];
      try {
        dbTxs = await db.query.transactions.findMany({
          where: eq(transactions.sourceAccount, input.publicKey),
          orderBy: (t, { desc }) => [desc(t.timestamp)],
          limit: 200,
        });
      } catch (err) {
        console.error("DB read failed:", err);
      }

      if (dbTxs.length > 0) {
        return { transactions: dbTxs };
      }

      if (!Array.isArray(dbTxs)) {
        throw new Error("Invalid transaction response from Horizon");
      }

      // Fetch from Horizon
      let txs;
      try {
        txs = await fetchStellarTransactionOperations(input.publicKey);
      } catch (err) {
        console.error("Horizon fetch failed:", err);
        throw new Error("Failed to fetch transactions from Horizon");
      }

      // Save to DB
      const rows = (txs as HorizonTx[]).map((tx) => ({
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

      if (!txRes.ok || !opsRes.ok) {
        if (dbTx) {
          return { transaction: dbTx, operations: dbTx.operations ?? [] };
        }
        throw new Error("Failed to fetch transaction details");
      }

      const tx = (await txRes.json()) as HorizonTxApi;
      const opsJson = (await opsRes.json()) as {
        _embedded: { records: HorizonOpApi[] };
      };

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
      const opRows = ops.map((op) => ({
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
