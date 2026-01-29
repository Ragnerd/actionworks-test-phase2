"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { api } from "~/trpc/react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";

const DEFAULT_PUBKEY =
  "GCMTJCWDCE6AVBJMFCYIIPSLISCOTG3W62MMYKQOWBC2M4SJ65DEMUYK";

const ITEMS_PER_PAGE = 20;

interface Balance {
  asset_type: string;
  balance: string;
  asset_code?: string;
  asset_issuer?: string;
}

interface Tx {
  id: string;
  operationCount?: number | null;
  timestamp: string | Date;
  feeCharged: string;
  successful: boolean;
  sourceAccount: string;
  memo?: string | null;
}

export function TransactionList() {
  const [pubKeyInput, setPubKeyInput] = useState(DEFAULT_PUBKEY);
  const [connectedPubKey, setConnectedPubKey] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const [selectedTxId, setSelectedTxId] = useState<string | null>(null);

  const publicKey = connectedPubKey ?? "";

  const { data, isLoading, error } = api.transaction.getAll.useQuery(
    { publicKey },
    { enabled: !!connectedPubKey },
  );

  const { data: accountData, isLoading: isLoadingAccount } =
    api.transaction.getAcc.useQuery(
      { publicKey },
      { enabled: !!connectedPubKey },
    );

  const { data: txDetails, isLoading: isLoadingDetails } =
    api.transaction.getById.useQuery(
      { id: selectedTxId ?? "" },
      { enabled: !!selectedTxId },
    );

  const handleConnect = () => {
    if (pubKeyInput.trim()) {
      setConnectedPubKey(pubKeyInput.trim());
      setPage(1);
    }
  };

  const totalPages = data
    ? Math.ceil(data.transactions.length / ITEMS_PER_PAGE)
    : 0;

  const paginatedTx =
    data?.transactions.slice(
      (page - 1) * ITEMS_PER_PAGE,
      page * ITEMS_PER_PAGE,
    ) ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Stellar Transaction History</h1>

        <div className="flex gap-2">
          <input
            type="text"
            value={pubKeyInput}
            onChange={(e) => setPubKeyInput(e.target.value)}
            placeholder="Enter Stellar public key"
            className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex-1 rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
          />
          <button
            onClick={handleConnect}
            className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2 text-sm font-medium"
          >
            Connect
          </button>
        </div>
      </div>

      {!connectedPubKey && (
        <div className="text-muted-foreground py-12 text-center">
          Enter a Stellar public key and click Connect to view transaction
          history
        </div>
      )}

      {/* Loading Skeletons */}
      {connectedPubKey && isLoading && (
        <div className="grid gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-40" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {connectedPubKey && error && (
        <div className="text-destructive py-12 text-center">
          Error loading transactions: {error.message}
        </div>
      )}

      {/* Data Display */}
      {connectedPubKey && data?.transactions && !isLoading && (
        <>
          {/* Account Card */}
          <div className="bg-card space-y-2 rounded-lg border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Account</p>
                <p className="font-mono text-sm">
                  {connectedPubKey.slice(0, 8)}...{connectedPubKey.slice(-8)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-muted-foreground text-sm">XLM Balance</p>
                {isLoadingAccount ? (
                  <Skeleton className="ml-auto h-8 w-32" />
                ) : (
                  <p className="text-2xl font-bold">
                    {accountData?.balances.find(
                      (b: Balance) => b.asset_type === "native",
                    )?.balance || "0"}{" "}
                    XLM
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Pagination Info */}
          <p className="text-muted-foreground">
            Page {page} of {totalPages}
          </p>

          {/* Transaction Cards */}
          <div className="grid gap-4">
            {paginatedTx.map((tx: Tx) => (
              <Card
                key={tx.id}
                onClick={() => setSelectedTxId(tx.id)}
                className="cursor-pointer transition-shadow hover:shadow-md"
              >
                <CardHeader>
                  <CardTitle className="font-mono text-sm">
                    <a
                      href={`https://stellar.expert/explorer/public/tx/${tx.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline"
                    >
                      {tx.id.slice(0, 16)}...
                    </a>
                  </CardTitle>
                </CardHeader>

                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Operations:</span>
                      <span className="font-semibold">
                        {tx.operationCount ?? "N/A"}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Time:</span>
                      <span className="text-sm">
                        {new Date(tx.timestamp).toLocaleString()}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Fee:</span>
                      <span className="text-sm">
                        {Number(tx.feeCharged) / 1e7} XLM
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      <span
                        className={`text-xs font-medium ${
                          tx.successful ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {tx.successful ? "✓ Success" : "✗ Failed"}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Source:</span>
                      <span className="font-mono text-sm">
                        {tx.sourceAccount?.slice(0, 6)}...
                        {tx.sourceAccount?.slice(-6)}
                      </span>
                    </div>

                    {tx.memo && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Memo:</span>
                        <span className="max-w-[220px] truncate text-sm">
                          {tx.memo}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center justify-center gap-4 pt-4">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-md border px-4 py-2 disabled:opacity-50"
            >
              Previous
            </button>

            <span className="text-muted-foreground text-sm">
              Page {page} of {totalPages}
            </span>

            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-md border px-4 py-2 disabled:opacity-50"
            >
              Next
            </button>
          </div>

          <Dialog
            open={!!selectedTxId}
            onOpenChange={(open) => {
              if (!open) setSelectedTxId(null);
            }}
          >
            <DialogContent className="max-h-[85vh] max-w-3xl overflow-x-hidden overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Transaction Details</DialogTitle>
              </DialogHeader>

              {isLoadingDetails && (
                <div className="space-y-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              )}

              {txDetails && (
                <div className="space-y-6 text-sm">
                  {/* TX INFO */}
                  <div className="space-y-2">
                    <p>
                      <b>Hash:</b> {txDetails.transaction.id}
                    </p>
                    <p>
                      <b>Source:</b> {txDetails.transaction.sourceAccount}
                    </p>
                    <p>
                      <b>Ledger:</b> {txDetails.transaction.ledger}
                    </p>
                    <p>
                      <b>Time:</b>{" "}
                      {new Date(
                        txDetails.transaction.timestamp,
                      ).toLocaleString()}
                    </p>
                    <p>
                      <b>Fee:</b>{" "}
                      {Number(txDetails.transaction.feeCharged) / 1e7} XLM
                    </p>
                    <p>
                      <b>Status:</b>{" "}
                      {txDetails.transaction.successful ? "Success" : "Failed"}
                    </p>

                    {txDetails.transaction.memo && (
                      <p>
                        <b>Memo ({txDetails.transaction.memoType}):</b>{" "}
                        {txDetails.transaction.memo}
                      </p>
                    )}
                  </div>

                  {/* XDR */}
                  <div className="space-y-4">
                    {/* Envelope XDR */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold">Envelope XDR</p>
                        <button
                          type="button"
                          onClick={() =>
                            navigator.clipboard.writeText(
                              txDetails.transaction.envelopeXdr ?? "",
                            )
                          }
                          className="text-primary text-xs hover:underline"
                        >
                          Copy
                        </button>
                      </div>

                      <pre className="bg-muted max-h-48 w-full overflow-x-hidden overflow-y-auto rounded p-3 text-xs leading-relaxed break-all whitespace-pre-wrap">
                        {txDetails.transaction.envelopeXdr}
                      </pre>
                    </div>

                    {/* Result XDR */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold">Result XDR</p>
                        <button
                          type="button"
                          onClick={() =>
                            navigator.clipboard.writeText(
                              txDetails.transaction.resultXdr ?? "",
                            )
                          }
                          className="text-primary text-xs hover:underline"
                        >
                          Copy
                        </button>
                      </div>

                      <pre className="bg-muted max-h-32 w-full overflow-x-hidden overflow-y-auto rounded p-3 text-xs leading-relaxed break-all whitespace-pre-wrap">
                        {txDetails.transaction.resultXdr}
                      </pre>
                    </div>
                  </div>

                  {/* OPERATIONS */}
                  <div className="space-y-3">
                    <p className="text-base font-semibold">
                      Operations ({txDetails.operations.length})
                    </p>

                    {txDetails.operations.map((op, i) => (
                      <div key={op.id} className="space-y-1 rounded border p-3">
                        <p>
                          <b>
                            #{i + 1} — {op.type}
                          </b>
                        </p>

                        {op.from && <p>From: {op.from}</p>}
                        {op.to && <p>To: {op.to}</p>}
                        {op.amount && <p>Amount: {op.amount}</p>}
                        {op.asset && <p>Asset: {op.asset}</p>}

                        <p className="text-muted-foreground text-xs">
                          Source: {op.sourceAccount}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
