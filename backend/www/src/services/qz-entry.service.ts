import { pool } from "../db/pool.js";
import { deleteFinanceTransaction } from "./finance.service.js";

export type QzEntryRow = {
  id: string;
  campaign_id: string;
  entry_kind: string;
  donor_name: string;
  donor_phone: string | null;
  donor_address: string | null;
  detail_note: string | null;
  amount: string;
  payment_status: string;
  paid_at: Date | null;
  attachment_url: string | null;
  notes: string | null;
  finance_transaction_id: string | null;
  created_at: Date;
  updated_at: Date;
};

const MAX_PAGE_SIZE = 100;

const SORT: Record<string, string> = {
  RecordID: "e.id",
  donorName: "e.donor_name",
  entryKind: "e.entry_kind",
  amount: "e.amount",
  paymentStatus: "e.payment_status",
  paidAt: "e.paid_at",
  createdAt: "e.created_at",
};

export async function listQzEntriesPaginatedFiltered(params: {
  campaignId: string;
  page: number;
  limit: number;
  search?: string;
  sortField?: string;
  sortDir?: "asc" | "desc";
}): Promise<{ items: QzEntryRow[]; total: number; page: number; limit: number }> {
  const limit = Math.min(Math.max(params.limit, 1), MAX_PAGE_SIZE);
  const page = Math.max(params.page, 1);
  const offset = (page - 1) * limit;
  const search = params.search?.trim() || "";
  const hasSearch = search.length > 0;
  const sortCol = SORT[params.sortField ?? ""] ?? "e.created_at";
  const sortDirSql = params.sortDir === "asc" ? "ASC" : "DESC";

  const baseWhere = `e.campaign_id = $1`;
  const searchClause = hasSearch
    ? ` AND (
         e.donor_name ILIKE '%' || $2::text || '%'
         OR COALESCE(e.donor_phone, '') ILIKE '%' || $2::text || '%'
         OR COALESCE(e.detail_note, '') ILIKE '%' || $2::text || '%'
         OR COALESCE(e.notes, '') ILIKE '%' || $2::text || '%'
       )`
    : "";

  const countParams: unknown[] = hasSearch ? [params.campaignId, search] : [params.campaignId];
  const countR = await pool.query<{ total: string }>(
    `SELECT COUNT(*)::text AS total FROM qz_entries e WHERE ${baseWhere}${searchClause}`,
    countParams
  );
  const total = Number(countR.rows[0]?.total ?? 0);

  const dataParams: unknown[] = hasSearch
    ? [params.campaignId, search, limit, offset]
    : [params.campaignId, limit, offset];
  let limitIdx = hasSearch ? 3 : 2;
  let offsetIdx = hasSearch ? 4 : 3;

  const r = await pool.query<QzEntryRow>(
    `SELECT e.id, e.campaign_id, e.entry_kind, e.donor_name, e.donor_phone, e.donor_address,
            e.detail_note, e.amount::text AS amount, e.payment_status, e.paid_at, e.attachment_url,
            e.notes, e.finance_transaction_id, e.created_at, e.updated_at
     FROM qz_entries e
     WHERE ${baseWhere}${searchClause}
     ORDER BY ${sortCol} ${sortDirSql} NULLS LAST, e.donor_name ASC
     LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    dataParams
  );
  return { items: r.rows, total, page, limit };
}

export async function getQzEntryById(id: string): Promise<QzEntryRow | null> {
  const r = await pool.query<QzEntryRow>(
    `SELECT id, campaign_id, entry_kind, donor_name, donor_phone, donor_address,
            detail_note, amount::text AS amount, payment_status, paid_at, attachment_url,
            notes, finance_transaction_id, created_at, updated_at
     FROM qz_entries WHERE id = $1`,
    [id]
  );
  return r.rows[0] ?? null;
}

export async function createQzEntry(input: {
  campaign_id: string;
  entry_kind: string;
  donor_name: string;
  donor_phone?: string | null;
  donor_address?: string | null;
  detail_note?: string | null;
  amount: number;
  payment_status?: string;
  paid_at?: Date | null;
  attachment_url?: string | null;
  notes?: string | null;
}): Promise<{ id: string }> {
  const r = await pool.query<{ id: string }>(
    `INSERT INTO qz_entries
       (campaign_id, entry_kind, donor_name, donor_phone, donor_address, detail_note, amount,
        payment_status, paid_at, attachment_url, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING id`,
    [
      input.campaign_id,
      input.entry_kind,
      input.donor_name,
      input.donor_phone ?? null,
      input.donor_address ?? null,
      input.detail_note ?? null,
      input.amount,
      input.payment_status ?? "pending",
      input.paid_at ?? null,
      input.attachment_url ?? null,
      input.notes ?? null,
    ]
  );
  return { id: r.rows[0].id };
}

export async function updateQzEntry(
  id: string,
  patch: Partial<{
    entry_kind: string;
    donor_name: string;
    donor_phone: string | null;
    donor_address: string | null;
    detail_note: string | null;
    amount: number;
    payment_status: string;
    paid_at: Date | null;
    attachment_url: string | null;
    notes: string | null;
    finance_transaction_id: string | null;
  }>
): Promise<boolean> {
  const sets: string[] = [];
  const vals: unknown[] = [];
  let n = 1;
  const put = (col: string, val: unknown): void => {
    sets.push(`${col} = $${n++}`);
    vals.push(val);
  };
  if (patch.entry_kind !== undefined) put("entry_kind", patch.entry_kind);
  if (patch.donor_name !== undefined) put("donor_name", patch.donor_name);
  if (patch.donor_phone !== undefined) put("donor_phone", patch.donor_phone);
  if (patch.donor_address !== undefined) put("donor_address", patch.donor_address);
  if (patch.detail_note !== undefined) put("detail_note", patch.detail_note);
  if (patch.amount !== undefined) put("amount", patch.amount);
  if (patch.payment_status !== undefined) put("payment_status", patch.payment_status);
  if (patch.paid_at !== undefined) put("paid_at", patch.paid_at);
  if (patch.attachment_url !== undefined) put("attachment_url", patch.attachment_url);
  if (patch.notes !== undefined) put("notes", patch.notes);
  if (patch.finance_transaction_id !== undefined) put("finance_transaction_id", patch.finance_transaction_id);
  if (sets.length === 0) return true;
  sets.push("updated_at = NOW()");
  vals.push(id);
  const r = await pool.query(`UPDATE qz_entries SET ${sets.join(", ")} WHERE id = $${n}`, vals);
  return (r.rowCount ?? 0) > 0;
}

export async function deleteQzEntry(id: string): Promise<boolean> {
  const existing = await getQzEntryById(id);
  if (existing?.finance_transaction_id) {
    await deleteFinanceTransaction(existing.finance_transaction_id);
  }
  const r = await pool.query(`DELETE FROM qz_entries WHERE id = $1`, [id]);
  return (r.rowCount ?? 0) > 0;
}
