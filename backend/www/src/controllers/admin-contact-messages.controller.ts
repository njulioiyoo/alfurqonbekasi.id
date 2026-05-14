import type { Response } from "express";
import { z } from "zod";
import type { AuthedRequest } from "../middleware/auth.middleware.js";
import {
  deleteContactMessage,
  getContactMessageById,
  listContactMessagesPaginatedFiltered,
  markContactMessageRead,
} from "../services/contact-message.service.js";
import { parseMetronicDatatableBody, queryGeneralSearch } from "../utils/metronic-datatable.js";

const idParamSchema = z.object({ id: z.string().uuid() });

export async function listContactMessagesDatatable(req: AuthedRequest, res: Response): Promise<void> {
  const dt = parseMetronicDatatableBody(req.body);
  const search = queryGeneralSearch(dt.query);
  try {
    const result = await listContactMessagesPaginatedFiltered({
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
        name: x.name,
        email: x.email,
        phone: x.phone ?? "",
        status: x.status,
        emailSent: x.email_sent ? "ya" : "tidak",
        createdAt: x.created_at.toISOString(),
      })),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: { code: "INTERNAL_ERROR", message: "Terjadi kesalahan server" } });
  }
}

export async function getContactMessage(req: AuthedRequest, res: Response): Promise<void> {
  const p = idParamSchema.safeParse(req.params);
  if (!p.success) {
    res.status(400).json({ ok: false, error: { code: "VALIDATION_ERROR", message: "ID tidak valid" } });
    return;
  }
  try {
    const row = await getContactMessageById(p.data.id);
    if (!row) {
      res.status(404).json({ ok: false, error: { code: "NOT_FOUND", message: "Pesan tidak ditemukan" } });
      return;
    }
    if (row.status === "new") {
      await markContactMessageRead(row.id);
    }
    const updated = await getContactMessageById(p.data.id);
    const r = updated ?? row;
    res.json({
      ok: true,
      data: {
        id: r.id,
        name: r.name,
        email: r.email,
        phone: r.phone ?? "",
        message: r.message,
        status: r.status,
        emailSent: r.email_sent,
        emailError: r.email_error ?? "",
        createdAt: r.created_at.toISOString(),
        readAt: r.read_at?.toISOString() ?? "",
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: { code: "INTERNAL_ERROR", message: "Terjadi kesalahan server" } });
  }
}

export async function deleteContactMessageHandler(req: AuthedRequest, res: Response): Promise<void> {
  const p = idParamSchema.safeParse(req.params);
  if (!p.success) {
    res.status(400).json({ ok: false, error: { code: "VALIDATION_ERROR", message: "ID tidak valid" } });
    return;
  }
  try {
    const ok = await deleteContactMessage(p.data.id);
    if (!ok) {
      res.status(404).json({ ok: false, error: { code: "NOT_FOUND", message: "Pesan tidak ditemukan" } });
      return;
    }
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: { code: "INTERNAL_ERROR", message: "Terjadi kesalahan server" } });
  }
}
