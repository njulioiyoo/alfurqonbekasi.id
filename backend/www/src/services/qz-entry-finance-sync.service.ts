import { pool } from "../db/pool.js";
import {
  createFinanceTransaction,
  deleteFinanceTransaction,
  getFinanceTransactionById,
  updateFinanceTransaction,
} from "./finance.service.js";
import { getQzCampaignById } from "./qz-campaign.service.js";
import { getQzEntryById, updateQzEntry } from "./qz-entry.service.js";

const ACCOUNT_CODE = "INC-QURBAN-ZAKAT";
const WALLET_CODE = "CASH-UTAMA";

export async function resolveQzFinanceSink(): Promise<{ accountId: string; walletId: string }> {
  const a = await pool.query<{ id: string }>(
    `SELECT id FROM finance_accounts WHERE code = $1 AND is_active = true LIMIT 1`,
    [ACCOUNT_CODE]
  );
  const w = await pool.query<{ id: string }>(
    `SELECT id FROM finance_wallets WHERE code = $1 AND is_active = true LIMIT 1`,
    [WALLET_CODE]
  );
  if (!a.rows[0]?.id) {
    throw new Error(`Akun kas pemasukan "${ACCOUNT_CODE}" tidak ada. Jalankan migrasi DB (seed finance_accounts).`);
  }
  if (!w.rows[0]?.id) {
    throw new Error(`Wallet "${WALLET_CODE}" tidak ada. Jalankan migrasi DB (seed finance_wallets).`);
  }
  return { accountId: a.rows[0].id, walletId: w.rows[0].id };
}

function wantsFinanceLink(row: { payment_status: string; amount: string }): boolean {
  return row.payment_status === "paid" && Number(row.amount) > 0;
}

function buildQzFinanceDescription(params: {
  campaignTitle: string;
  donorName: string;
  entryKind: string;
}): string {
  return `[Qurban/Zakat] ${params.campaignTitle} — ${params.donorName} (${params.entryKind})`;
}

/**
 * Setelah entri disimpan: buat/perbarui/hapus transaksi Kas (pemasukan) bila status `paid` + nominal > 0.
 * Akun: INC-QURBAN-ZAKAT, wallet: CASH-UTAMA.
 */
export async function syncQzEntryToFinance(entryId: string, createdByUserId: string | null): Promise<void> {
  const row = await getQzEntryById(entryId);
  if (!row) return;

  const financeTxId = row.finance_transaction_id;

  const campaign = await getQzCampaignById(row.campaign_id);
  const campaignTitle = campaign?.title ?? "Tanpa judul";

  if (!wantsFinanceLink(row)) {
    if (financeTxId) {
      await deleteFinanceTransaction(financeTxId);
      await updateQzEntry(entryId, { finance_transaction_id: null });
    }
    return;
  }

  const { accountId, walletId } = await resolveQzFinanceSink();
  const txDate = row.paid_at ?? new Date();
  const amountStr = Number(row.amount).toFixed(2);
  const description = buildQzFinanceDescription({
    campaignTitle,
    donorName: row.donor_name,
    entryKind: row.entry_kind,
  });
  const referenceNo = `QZ-${entryId.replace(/-/g, "").slice(0, 12)}`;

  if (financeTxId) {
    const existing = await getFinanceTransactionById(financeTxId);
    if (existing) {
      await updateFinanceTransaction(financeTxId, {
        tx_date: txDate,
        direction: "in",
        amount: amountStr,
        account_id: accountId,
        wallet_id: walletId,
        description,
        reference_no: referenceNo,
        attachment_url: row.attachment_url,
        status: "posted",
      });
      return;
    }
    await updateQzEntry(entryId, { finance_transaction_id: null });
  }

  const created = await createFinanceTransaction({
    tx_date: txDate,
    direction: "in",
    amount: amountStr,
    account_id: accountId,
    wallet_id: walletId,
    description,
    reference_no: referenceNo,
    attachment_url: row.attachment_url,
    status: "posted",
    created_by: createdByUserId,
  });
  await updateQzEntry(entryId, { finance_transaction_id: created.id });
}
