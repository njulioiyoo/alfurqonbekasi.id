import { pool } from "../db/pool.js";

export type FinanceAccountRow = {
  id: string;
  code: string;
  name: string;
  type: "income" | "expense";
  is_active: boolean;
};

export type FinanceWalletRow = {
  id: string;
  code: string;
  name: string;
  kind: "cash" | "bank";
  is_active: boolean;
};

export type FinanceTransactionRow = {
  id: string;
  tx_date: Date;
  direction: "in" | "out";
  amount: string;
  account_id: string;
  wallet_id: string;
  description: string | null;
  reference_no: string | null;
  attachment_url: string | null;
  status: string;
  created_by: string | null;
  approved_by: string | null;
  created_at: Date;
  updated_at: Date;
};

const SORT_MAP: Record<string, string> = {
  RecordID: "t.id",
  txDate: "t.tx_date",
  direction: "t.direction",
  amount: "t.amount",
  account: "a.name",
  wallet: "w.name",
  status: "t.status",
  createdAt: "t.created_at",
};

export async function listFinanceAccounts(): Promise<FinanceAccountRow[]> {
  const r = await pool.query<FinanceAccountRow>(
    `SELECT id, code, name, type, is_active
     FROM finance_accounts
     WHERE is_active = true
     ORDER BY type, code`
  );
  return r.rows;
}

export async function listFinanceWallets(): Promise<FinanceWalletRow[]> {
  const r = await pool.query<FinanceWalletRow>(
    `SELECT id, code, name, kind, is_active
     FROM finance_wallets
     WHERE is_active = true
     ORDER BY kind, code`
  );
  return r.rows;
}

export async function listFinanceTransactions(params: {
  page: number;
  limit: number;
  search?: string;
  sortField?: string;
  sortDir?: "asc" | "desc";
}): Promise<{ items: Array<FinanceTransactionRow & { account_name: string; wallet_name: string }>; total: number; page: number; limit: number }> {
  const limit = Math.min(Math.max(params.limit, 1), 100);
  const page = Math.max(params.page, 1);
  const offset = (page - 1) * limit;
  const search = params.search?.trim() || "";
  const hasSearch = search.length > 0;
  const where = hasSearch
    ? `WHERE (
         a.name ILIKE '%' || $1::text || '%'
         OR w.name ILIKE '%' || $1::text || '%'
         OR COALESCE(t.description, '') ILIKE '%' || $1::text || '%'
         OR COALESCE(t.reference_no, '') ILIKE '%' || $1::text || '%'
       )`
    : "";
  const sortCol = SORT_MAP[params.sortField ?? ""] ?? "t.tx_date";
  const sortDir = params.sortDir === "asc" ? "ASC" : "DESC";

  const countParams: unknown[] = hasSearch ? [search] : [];
  const count = await pool.query<{ total: string }>(
    `SELECT COUNT(*)::text AS total
     FROM finance_transactions t
     JOIN finance_accounts a ON a.id = t.account_id
     JOIN finance_wallets w ON w.id = t.wallet_id
     ${where}`,
    countParams
  );
  const total = Number(count.rows[0]?.total ?? 0);

  const dataParams: unknown[] = hasSearch ? [search, limit, offset] : [limit, offset];
  const limitIdx = hasSearch ? 2 : 1;
  const offsetIdx = hasSearch ? 3 : 2;
  const data = await pool.query<FinanceTransactionRow & { account_name: string; wallet_name: string }>(
    `SELECT t.id, t.tx_date, t.direction, t.amount::text, t.account_id, t.wallet_id,
            t.description, t.reference_no, t.attachment_url, t.status,
            t.created_by, t.approved_by, t.created_at, t.updated_at,
            a.name AS account_name, w.name AS wallet_name
     FROM finance_transactions t
     JOIN finance_accounts a ON a.id = t.account_id
     JOIN finance_wallets w ON w.id = t.wallet_id
     ${where}
     ORDER BY ${sortCol} ${sortDir} NULLS LAST, t.created_at DESC
     LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    dataParams
  );
  return { items: data.rows, total, page, limit };
}

export async function getFinanceTransactionById(id: string): Promise<FinanceTransactionRow | null> {
  const r = await pool.query<FinanceTransactionRow>(
    `SELECT id, tx_date, direction, amount::text, account_id, wallet_id, description, reference_no, attachment_url, status,
            created_by, approved_by, created_at, updated_at
     FROM finance_transactions WHERE id = $1`,
    [id]
  );
  return r.rows[0] ?? null;
}

export async function createFinanceTransaction(input: {
  tx_date: Date;
  direction: "in" | "out";
  amount: string;
  account_id: string;
  wallet_id: string;
  description?: string | null;
  reference_no?: string | null;
  attachment_url?: string | null;
  status?: string;
  created_by?: string | null;
}): Promise<{ id: string }> {
  const r = await pool.query<{ id: string }>(
    `INSERT INTO finance_transactions
      (tx_date, direction, amount, account_id, wallet_id, description, reference_no, attachment_url, status, created_by)
     VALUES ($1,$2,$3::numeric,$4,$5,$6,$7,$8,$9,$10)
     RETURNING id`,
    [
      input.tx_date,
      input.direction,
      input.amount,
      input.account_id,
      input.wallet_id,
      input.description ?? null,
      input.reference_no ?? null,
      input.attachment_url ?? null,
      input.status ?? "posted",
      input.created_by ?? null,
    ]
  );
  return { id: r.rows[0].id };
}

export async function updateFinanceTransaction(
  id: string,
  patch: Partial<{
    tx_date: Date;
    direction: "in" | "out";
    amount: string;
    account_id: string;
    wallet_id: string;
    description: string | null;
    reference_no: string | null;
    attachment_url: string | null;
    status: string;
    approved_by: string | null;
  }>
): Promise<boolean> {
  const sets: string[] = [];
  const vals: unknown[] = [];
  let n = 1;
  const push = (key: string, val: unknown): void => {
    sets.push(`${key} = $${n++}`);
    vals.push(val);
  };
  if (patch.tx_date !== undefined) push("tx_date", patch.tx_date);
  if (patch.direction !== undefined) push("direction", patch.direction);
  if (patch.amount !== undefined) push("amount", Number(patch.amount));
  if (patch.account_id !== undefined) push("account_id", patch.account_id);
  if (patch.wallet_id !== undefined) push("wallet_id", patch.wallet_id);
  if (patch.description !== undefined) push("description", patch.description);
  if (patch.reference_no !== undefined) push("reference_no", patch.reference_no);
  if (patch.attachment_url !== undefined) push("attachment_url", patch.attachment_url);
  if (patch.status !== undefined) push("status", patch.status);
  if (patch.approved_by !== undefined) push("approved_by", patch.approved_by);
  if (sets.length === 0) return true;
  sets.push("updated_at = NOW()");
  vals.push(id);
  const r = await pool.query(`UPDATE finance_transactions SET ${sets.join(", ")} WHERE id = $${n}`, vals);
  return (r.rowCount ?? 0) > 0;
}

export async function deleteFinanceTransaction(id: string): Promise<boolean> {
  const r = await pool.query(`DELETE FROM finance_transactions WHERE id = $1`, [id]);
  return (r.rowCount ?? 0) > 0;
}

export async function financeReportSummary(params: { from: Date; to: Date }): Promise<{
  total_in: string;
  total_out: string;
  balance: string;
  by_account: Array<{ account_name: string; total_in: string; total_out: string }>;
}> {
  const totals = await pool.query<{ total_in: string; total_out: string; balance: string }>(
    `SELECT
       COALESCE(SUM(CASE WHEN direction='in' THEN amount ELSE 0 END),0)::text AS total_in,
       COALESCE(SUM(CASE WHEN direction='out' THEN amount ELSE 0 END),0)::text AS total_out,
       COALESCE(SUM(CASE WHEN direction='in' THEN amount ELSE -amount END),0)::text AS balance
     FROM finance_transactions
     WHERE tx_date BETWEEN $1 AND $2`,
    [params.from, params.to]
  );
  const byAcc = await pool.query<{ account_name: string; total_in: string; total_out: string }>(
    `SELECT a.name AS account_name,
            COALESCE(SUM(CASE WHEN t.direction='in' THEN t.amount ELSE 0 END),0)::text AS total_in,
            COALESCE(SUM(CASE WHEN t.direction='out' THEN t.amount ELSE 0 END),0)::text AS total_out
     FROM finance_transactions t
     JOIN finance_accounts a ON a.id = t.account_id
     WHERE t.tx_date BETWEEN $1 AND $2
     GROUP BY a.name
     ORDER BY a.name`,
    [params.from, params.to]
  );
  return {
    total_in: totals.rows[0]?.total_in ?? "0",
    total_out: totals.rows[0]?.total_out ?? "0",
    balance: totals.rows[0]?.balance ?? "0",
    by_account: byAcc.rows,
  };
}
