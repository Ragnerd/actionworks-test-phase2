const HORIZON_URL = "https://horizon.stellar.org";

export async function fetchStellarTransactionOperations(pubKey: string) {
  try {
    // Fetch transactions for the account using Horizon API
    const response = await fetch(
      `${HORIZON_URL}/accounts/${pubKey}/transactions?limit=200&order=desc`,
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch transactions: ${response.statusText}`);
    }

    const data = await response.json();
    if (!data?._embedded?.records) {
      throw new Error("Invalid Horizon response shape");
    }

    const transactions = data._embedded.records.map((transaction: any) => {
      return {
        id: transaction.id,
        hash: transaction.hash,
        timestamp: transaction.created_at,
        sourceAccount: transaction.source_account,
        operationCount: transaction.operation_count,
        successful: transaction.successful,
        ledger: transaction.ledger,
        memo: transaction.memo || undefined,
        memoType: transaction.memo_type,
        feeCharged: transaction.fee_charged,

        envelopeXdr: transaction.envelope_xdr,
        resultXdr: transaction.result_xdr,
      };
    });

    return transactions;
  } catch (error) {
    console.error("Error fetching Stellar transactions:", error);
    throw new Error("Failed to fetch transactions from Stellar network");
  }
}

export async function fetchAcc(pubkey: string) {
  try {
    const response = await fetch(`${HORIZON_URL}/accounts/${pubkey}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch account: ${response.statusText}`);
    }

    const accountData = await response.json();

    // Extract native XLM balance
    const xlmBalance = accountData.balances.find(
      (balance: any) => balance.asset_type === "native",
    );

    return {
      id: accountData.id,
      sequence: accountData.sequence,
      balance: xlmBalance?.balance || "0",
      balances: accountData.balances,
      subentryCount: accountData.subentry_count,
      numSponsoring: accountData.num_sponsoring,
      numSponsored: accountData.num_sponsored,
    };
  } catch (error) {
    console.error("Error fetching Stellar account:", error);
    throw new Error("Failed to fetch account from Stellar network");
  }
}
