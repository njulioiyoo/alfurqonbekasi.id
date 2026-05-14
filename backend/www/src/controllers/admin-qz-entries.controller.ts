import type { Response } from "express";
import { z } from "zod";
import type { AuthedRequest } from "../middleware/auth.middleware.js";
import {
  createQzEntry,
  deleteQzEntry,
  getQzEntryById,
  listQzEntriesPaginatedFiltered,
  updateQzEntry,
} from "../services/qz-entry.service.js";
import { syncQzEntryToFinance } from "../services/qz-entry-finance-sync.service.js";
import { parseMetronicDatatableBody, queryGeneralSearch } from "../utils/metronic-datatable.js";

const idParamSchema = z.object({ id: z.string().uuid() });
const entryKindSchema = z.enum(["qurban_adha", "zakat_fitrah", "zakat_mal", "fidyah", "other"]);
const paymentStatusSchema = z.enum(["pending", "partial", "paid", "refunded"]);
const yyyyMmDdSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const createBodySchema = z.object({
  campaignId: z.string().uuid(),
  entryKind: entryKindSchema.default("other"),
  donorName: z.string().trim().min(2).max(255),
  donorPhone: z.union([z.string().trim().max(40), z.literal(""), z.null()]).optional(),
  donorAddress: z.union([z.string().trim().max(5000), z.literal(""), z.null()]).optional(),
  detailNote: z.union([z.string().trim().max(8000), z.literal(""), z.null()]).optional(),
  amount: z.coerce.number().min(0),
  paymentStatus: paymentStatusSchema.default("pending"),
  paidAt: z.union([yyyyMmDdSchema, z.literal(""), z.null()]).optional(),
  attachmentUrl: z.union([z.string().trim().url(), z.literal(""), z.null()]).optional(),
  notes: z.union([z.string().trim().max(10000), z.literal(""), z.null()]).optional(),
});

const patchBodySchema = z
  .object({
    entryKind: entryKindSchema.optional(),
    donorName: z.string().trim().min(2).max(255).optional(),
    donorPhone: z.union([z.string().trim().max(40), z.literal(""), z.null()]).optional(),
    donorAddress: z.union([z.string().trim().max(5000), z.literal(""), z.null()]).optional(),
    detailNote: z.union([z.string().trim().max(8000), z.literal(""), z.null()]).optional(),
    amount: z.coerce.number().min(0).optional(),
    paymentStatus: paymentStatusSchema.optional(),
    paidAt: z.union([yyyyMmDdSchema, z.literal(""), z.null()]).optional(),
    attachmentUrl: z.union([z.string().trim().url(), z.literal(""), z.null()]).optional(),
    notes: z.union([z.string().trim().max(10000), z.literal(""), z.null()]).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "Minimal satu field diisi" });

function mapNullable(v: string | null | undefined): string | null | undefined {
  if (v === undefined) return undefined;
  if (v === null) return null;
  const s = v.trim();
  return s === "" ? null : s;
}

export async function listQzEntriesDatatable(req: AuthedRequest, res: Response): Promise<void> {
  const dt = parseMetronicDatatableBody(req.body);
  const campaignId = dt.campaignId;
  if (!campaignId || !z.string().uuid().safeParse(campaignId).success) {
    res.json({
      meta: { page: 1, pages: 1, perpage: dt.perpage, total: 0 },
      data: [],
    });
    return;
  }
  const search = queryGeneralSearch(dt.query);
  try {
    const result = await listQzEntriesPaginatedFiltered({
      campaignId,
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
        donorName: x.donor_name,
        entryKind: x.entry_kind,
        amount: Number(x.amount),
        paymentStatus: x.payment_status,
        detailNote: x.detail_note ?? "",
        donorPhone: x.donor_phone ?? "",
        paidAt: x.paid_at ? x.paid_at.toISOString().slice(0, 10) : "",
        financeLinked: Boolean(x.finance_transaction_id),
        createdAt: x.created_at.toISOString(),
      })),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: { code: "INTERNAL_ERROR", message: "Terjadi kesalahan server" } });
  }
}

export async function getQzEntry(req: AuthedRequest, res: Response): Promise<void> {
  const p = idParamSchema.safeParse(req.params);
  if (!p.success) {
    res.status(400).json({ ok: false, error: { code: "VALIDATION_ERROR", message: "ID tidak valid" } });
    return;
  }
  try {
    const row = await getQzEntryById(p.data.id);
    if (!row) {
      res.status(404).json({ ok: false, error: { code: "NOT_FOUND", message: "Data tidak ditemukan" } });
      return;
    }
    res.json({
      ok: true,
      data: {
        id: row.id,
        campaignId: row.campaign_id,
        entryKind: row.entry_kind,
        donorName: row.donor_name,
        donorPhone: row.donor_phone ?? "",
        donorAddress: row.donor_address ?? "",
        detailNote: row.detail_note ?? "",
        amount: Number(row.amount),
        paymentStatus: row.payment_status,
        paidAt: row.paid_at ? row.paid_at.toISOString().slice(0, 10) : "",
        attachmentUrl: row.attachment_url ?? "",
        notes: row.notes ?? "",
        financeTransactionId: row.finance_transaction_id ?? "",
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: { code: "INTERNAL_ERROR", message: "Terjadi kesalahan server" } });
  }
}

export async function postQzEntry(req: AuthedRequest, res: Response): Promise<void> {
  const b = createBodySchema.safeParse(req.body);
  if (!b.success) {
    res.status(400).json({
      ok: false,
      error: { code: "VALIDATION_ERROR", message: "Data tidak valid", details: b.error.flatten() },
    });
    return;
  }
  try {
    const created = await createQzEntry({
      campaign_id: b.data.campaignId,
      entry_kind: b.data.entryKind,
      donor_name: b.data.donorName,
      donor_phone: mapNullable(b.data.donorPhone),
      donor_address: mapNullable(b.data.donorAddress),
      detail_note: mapNullable(b.data.detailNote),
      amount: b.data.amount,
      payment_status: b.data.paymentStatus,
      paid_at: b.data.paidAt ? new Date(b.data.paidAt) : null,
      attachment_url: mapNullable(b.data.attachmentUrl),
      notes: mapNullable(b.data.notes),
    });
    try {
      await syncQzEntryToFinance(created.id, req.user?.sub ?? null);
    } catch (syncErr) {
      console.error(syncErr);
      const msg = syncErr instanceof Error ? syncErr.message : "Gagal sinkron ke kas";
      res.status(500).json({
        ok: false,
        error: {
          code: "FINANCE_SYNC_FAILED",
          message: `${msg} Entri tersimpan; ubah lagi atau perbaiki pengaturan akun kas.`,
        },
      });
      return;
    }
    res.status(201).json({ ok: true, data: { id: created.id } });
  } catch (e: unknown) {
    const code = typeof e === "object" && e && "code" in e ? String((e as { code: string }).code) : "";
    if (code === "23503") {
      res.status(400).json({ ok: false, error: { code: "BAD_CAMPAIGN", message: "Kampanye tidak valid" } });
      return;
    }
    console.error(e);
    res.status(500).json({ ok: false, error: { code: "INTERNAL_ERROR", message: "Terjadi kesalahan server" } });
  }
}

export async function patchQzEntry(req: AuthedRequest, res: Response): Promise<void> {
  const p = idParamSchema.safeParse(req.params);
  if (!p.success) {
    res.status(400).json({ ok: false, error: { code: "VALIDATION_ERROR", message: "ID tidak valid" } });
    return;
  }
  const b = patchBodySchema.safeParse(req.body);
  if (!b.success) {
    res.status(400).json({
      ok: false,
      error: { code: "VALIDATION_ERROR", message: "Data tidak valid", details: b.error.flatten() },
    });
    return;
  }
  try {
    const ok = await updateQzEntry(p.data.id, {
      entry_kind: b.data.entryKind,
      donor_name: b.data.donorName,
      donor_phone: b.data.donorPhone === undefined ? undefined : mapNullable(b.data.donorPhone),
      donor_address: b.data.donorAddress === undefined ? undefined : mapNullable(b.data.donorAddress),
      detail_note: b.data.detailNote === undefined ? undefined : mapNullable(b.data.detailNote),
      amount: b.data.amount,
      payment_status: b.data.paymentStatus,
      paid_at: b.data.paidAt === undefined ? undefined : b.data.paidAt ? new Date(b.data.paidAt) : null,
      attachment_url: b.data.attachmentUrl === undefined ? undefined : mapNullable(b.data.attachmentUrl),
      notes: b.data.notes === undefined ? undefined : mapNullable(b.data.notes),
    });
    if (!ok) {
      res.status(404).json({ ok: false, error: { code: "NOT_FOUND", message: "Data tidak ditemukan" } });
      return;
    }
    try {
      await syncQzEntryToFinance(p.data.id, req.user?.sub ?? null);
    } catch (syncErr) {
      console.error(syncErr);
      const msg = syncErr instanceof Error ? syncErr.message : "Gagal sinkron ke kas";
      res.status(500).json({
        ok: false,
        error: { code: "FINANCE_SYNC_FAILED", message: msg },
      });
      return;
    }
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: { code: "INTERNAL_ERROR", message: "Terjadi kesalahan server" } });
  }
}

export async function deleteQzEntryHandler(req: AuthedRequest, res: Response): Promise<void> {
  const p = idParamSchema.safeParse(req.params);
  if (!p.success) {
    res.status(400).json({ ok: false, error: { code: "VALIDATION_ERROR", message: "ID tidak valid" } });
    return;
  }
  try {
    const ok = await deleteQzEntry(p.data.id);
    if (!ok) {
      res.status(404).json({ ok: false, error: { code: "NOT_FOUND", message: "Data tidak ditemukan" } });
      return;
    }
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: { code: "INTERNAL_ERROR", message: "Terjadi kesalahan server" } });
  }
}
