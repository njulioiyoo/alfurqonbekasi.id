import type { Response } from "express";
import { z } from "zod";
import type { AuthedRequest } from "../middleware/auth.middleware.js";
import {
  createFinanceTransaction,
  deleteFinanceTransaction,
  financeReportSummary,
  getFinanceTransactionById,
  listFinanceAccounts,
  listFinanceTransactions,
  listFinanceWallets,
  updateFinanceTransaction,
} from "../services/finance.service.js";
import { parseMetronicDatatableBody, queryGeneralSearch } from "../utils/metronic-datatable.js";

const idParamSchema = z.object({ id: z.string().uuid() });
const yyyyMmDdSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const createSchema = z.object({
  txDate: yyyyMmDdSchema,
  direction: z.enum(["in", "out"]),
  amount: z.coerce.number().positive(),
  accountId: z.string().uuid(),
  walletId: z.string().uuid(),
  description: z.union([z.string().trim().max(10000), z.literal(""), z.null()]).optional(),
  referenceNo: z.union([z.string().trim().max(100), z.literal(""), z.null()]).optional(),
  attachmentUrl: z.union([z.string().trim().url(), z.literal(""), z.null()]).optional(),
  status: z.enum(["draft", "posted", "approved"]).default("posted"),
});
const patchSchema = createSchema.partial().refine((v) => Object.keys(v).length > 0, {
  message: "Minimal satu field diisi",
});
const reportQuerySchema = z.object({
  from: yyyyMmDdSchema.optional(),
  to: yyyyMmDdSchema.optional(),
});

function mapNullable(v: string | null | undefined): string | null | undefined {
  if (v === undefined) return undefined;
  if (v === null) return null;
  const s = v.trim();
  return s.length > 0 ? s : null;
}

export async function listFinanceLookups(_req: AuthedRequest, res: Response): Promise<void> {
  try {
    const [accounts, wallets] = await Promise.all([listFinanceAccounts(), listFinanceWallets()]);
    res.json({
      ok: true,
      data: {
        accounts: accounts.map((x) => ({ id: x.id, code: x.code, name: x.name, type: x.type })),
        wallets: wallets.map((x) => ({ id: x.id, code: x.code, name: x.name, kind: x.kind })),
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: { code: "INTERNAL_ERROR", message: "Terjadi kesalahan server" } });
  }
}

export async function listFinanceTransactionsDatatable(req: AuthedRequest, res: Response): Promise<void> {
  const dt = parseMetronicDatatableBody(req.body);
  const search = queryGeneralSearch(dt.query);
  try {
    const result = await listFinanceTransactions({
      page: dt.page,
      limit: dt.perpage,
      search: search || undefined,
      sortField: dt.sortField,
      sortDir: dt.sortDir,
    });
    const pages = Math.max(Math.ceil(result.total / result.limit), 1);
    res.json({
      meta: { page: result.page, pages, perpage: result.limit, total: result.total },
      data: result.items.map((x) => ({
        RecordID: x.id,
        txDate: x.tx_date.toISOString().slice(0, 10),
        direction: x.direction,
        amount: Number(x.amount),
        account: x.account_name,
        wallet: x.wallet_name,
        status: x.status,
        description: x.description ?? "",
        createdAt: x.created_at.toISOString(),
      })),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: { code: "INTERNAL_ERROR", message: "Terjadi kesalahan server" } });
  }
}

export async function getFinanceTransaction(req: AuthedRequest, res: Response): Promise<void> {
  const p = idParamSchema.safeParse(req.params);
  if (!p.success) {
    res.status(400).json({ ok: false, error: { code: "VALIDATION_ERROR", message: "ID tidak valid" } });
    return;
  }
  try {
    const row = await getFinanceTransactionById(p.data.id);
    if (!row) {
      res.status(404).json({ ok: false, error: { code: "NOT_FOUND", message: "Transaksi tidak ditemukan" } });
      return;
    }
    res.json({
      ok: true,
      data: {
        id: row.id,
        txDate: row.tx_date.toISOString().slice(0, 10),
        direction: row.direction,
        amount: Number(row.amount),
        accountId: row.account_id,
        walletId: row.wallet_id,
        description: row.description ?? "",
        referenceNo: row.reference_no ?? "",
        attachmentUrl: row.attachment_url ?? "",
        status: row.status,
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: { code: "INTERNAL_ERROR", message: "Terjadi kesalahan server" } });
  }
}

export async function postFinanceTransaction(req: AuthedRequest, res: Response): Promise<void> {
  const b = createSchema.safeParse(req.body);
  if (!b.success) {
    res.status(400).json({ ok: false, error: { code: "VALIDATION_ERROR", message: "Data tidak valid", details: b.error.flatten() } });
    return;
  }
  try {
    const created = await createFinanceTransaction({
      tx_date: new Date(b.data.txDate),
      direction: b.data.direction,
      amount: b.data.amount.toFixed(2),
      account_id: b.data.accountId,
      wallet_id: b.data.walletId,
      description: mapNullable(b.data.description),
      reference_no: mapNullable(b.data.referenceNo),
      attachment_url: mapNullable(b.data.attachmentUrl),
      status: b.data.status,
      created_by: req.user?.sub ?? null,
    });
    res.status(201).json({ ok: true, data: { id: created.id } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: { code: "INTERNAL_ERROR", message: "Gagal menyimpan transaksi" } });
  }
}

export async function patchFinanceTransaction(req: AuthedRequest, res: Response): Promise<void> {
  const p = idParamSchema.safeParse(req.params);
  if (!p.success) {
    res.status(400).json({ ok: false, error: { code: "VALIDATION_ERROR", message: "ID tidak valid" } });
    return;
  }
  const b = patchSchema.safeParse(req.body);
  if (!b.success) {
    res.status(400).json({ ok: false, error: { code: "VALIDATION_ERROR", message: "Data tidak valid", details: b.error.flatten() } });
    return;
  }
  try {
    const ok = await updateFinanceTransaction(p.data.id, {
      tx_date: b.data.txDate ? new Date(b.data.txDate) : undefined,
      direction: b.data.direction,
      amount: b.data.amount !== undefined ? Number(b.data.amount).toFixed(2) : undefined,
      account_id: b.data.accountId,
      wallet_id: b.data.walletId,
      description: mapNullable(b.data.description),
      reference_no: mapNullable(b.data.referenceNo),
      attachment_url: mapNullable(b.data.attachmentUrl),
      status: b.data.status,
      approved_by: b.data.status === "approved" ? req.user?.sub ?? null : undefined,
    });
    if (!ok) {
      res.status(404).json({ ok: false, error: { code: "NOT_FOUND", message: "Transaksi tidak ditemukan" } });
      return;
    }
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: { code: "INTERNAL_ERROR", message: "Gagal mengubah transaksi" } });
  }
}

export async function deleteFinanceTransactionHandler(req: AuthedRequest, res: Response): Promise<void> {
  const p = idParamSchema.safeParse(req.params);
  if (!p.success) {
    res.status(400).json({ ok: false, error: { code: "VALIDATION_ERROR", message: "ID tidak valid" } });
    return;
  }
  try {
    const ok = await deleteFinanceTransaction(p.data.id);
    if (!ok) {
      res.status(404).json({ ok: false, error: { code: "NOT_FOUND", message: "Transaksi tidak ditemukan" } });
      return;
    }
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: { code: "INTERNAL_ERROR", message: "Gagal menghapus transaksi" } });
  }
}

export async function getFinanceReportSummary(req: AuthedRequest, res: Response): Promise<void> {
  const q = reportQuerySchema.safeParse(req.query);
  if (!q.success) {
    res.status(400).json({ ok: false, error: { code: "VALIDATION_ERROR", message: "Query tidak valid" } });
    return;
  }
  const now = new Date();
  const from = q.data.from ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const to = q.data.to ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()).padStart(2, "0")}`;
  try {
    const data = await financeReportSummary({ from: new Date(from), to: new Date(to) });
    res.json({ ok: true, data: { from, to, ...data } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: { code: "INTERNAL_ERROR", message: "Gagal memuat laporan" } });
  }
}
