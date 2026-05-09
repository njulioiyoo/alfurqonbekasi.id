import type { Response } from "express";
import { z } from "zod";
import type { AuthedRequest } from "../middleware/auth.middleware.js";
import {
  createAnnouncement,
  deleteAnnouncement,
  getAnnouncementById,
  listAnnouncementsPaginatedFiltered,
  updateAnnouncement,
} from "../services/announcement.service.js";
import {
  deliverAnnouncementWaBlast,
  shouldAutoTriggerWaBlast,
} from "../services/announcement-wa-blast.service.js";
import { parseMetronicDatatableBody, queryGeneralSearch } from "../utils/metronic-datatable.js";

const statusSchema = z.enum(["draft", "published", "archived"]);
const prioritySchema = z.enum(["normal", "high", "urgent"]);
const slugSchema = z.string().trim().min(2).max(255).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const idParamSchema = z.object({ id: z.string().uuid() });

function parseDateInput(v: string | null | undefined): Date | null {
  if (v === undefined || v === null || v === "") return null;
  const s = v.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(`${s}T00:00:00.000Z`);
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function coercePhones(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    let p = item.trim().replace(/\s+/g, "");
    if (!p) continue;
    if (p.startsWith("0")) p = `62${p.slice(1)}`;
    else if (p.startsWith("+")) p = p.slice(1);
    if (/^[0-9]{10,15}$/.test(p)) out.push(p);
  }
  return out.slice(0, 500);
}

const announcementFields = z.object({
  title: z.string().trim().min(2).max(255),
  slug: slugSchema,
  summary: z.string().trim().min(10).max(4000),
  body: z.union([z.string().trim().max(50000), z.literal(""), z.null()]).optional(),
  status: statusSchema.default("draft"),
  publishedAt: z.union([z.string(), z.literal(""), z.null()]).optional(),
  validFrom: z.union([z.string(), z.literal("")]),
  validUntil: z.union([z.string(), z.literal(""), z.null()]).optional(),
  priority: prioritySchema.default("normal"),
  waBlastOnPublish: z.coerce.boolean().default(false),
  waMessage: z.union([z.string().trim().max(4000), z.literal(""), z.null()]).optional(),
  waRecipientPhones: z.array(z.string()).optional().default([]),
});

const announcementCreateSchema = announcementFields.superRefine((data, ctx) => {
  const vf = parseDateInput(data.validFrom);
  if (!vf) {
    ctx.addIssue({ code: "custom", path: ["validFrom"], message: "Tanggal mulai berlaku wajib valid" });
  }
  const vu = parseDateInput(data.validUntil ?? null);
  if (vf && vu && vu < vf) {
    ctx.addIssue({ code: "custom", path: ["validUntil"], message: "Akhir berlaku tidak boleh sebelum mulai" });
  }
});

const announcementPatchSchema = announcementFields.partial();

async function maybeRunWaBlastAfterSave(
  id: string,
  prev: { status: string; wa_blast_on_publish: boolean; wa_blast_sent_at: Date | null } | null,
  next: { status: string; wa_blast_on_publish: boolean }
): Promise<void> {
  const trigger = shouldAutoTriggerWaBlast({
    prevStatus: prev?.status ?? null,
    nextStatus: next.status,
    prevWaFlag: prev?.wa_blast_on_publish ?? null,
    nextWaFlag: next.wa_blast_on_publish,
    prevSentAt: prev?.wa_blast_sent_at ?? null,
  });
  if (!trigger) return;
  await updateAnnouncement(id, {
    wa_blast_status: "pending",
    wa_blast_requested_at: new Date(),
    wa_blast_last_error: null,
  });
  await deliverAnnouncementWaBlast(id);
}

export async function listAnnouncementsDatatable(req: AuthedRequest, res: Response): Promise<void> {
  const dt = parseMetronicDatatableBody(req.body);
  const search = queryGeneralSearch(dt.query);
  try {
    const result = await listAnnouncementsPaginatedFiltered({
      page: dt.page,
      limit: dt.perpage,
      search: search || undefined,
      sortField: dt.sortField,
      sortDir: dt.sortDir,
    });
    const pages = Math.max(Math.ceil(result.total / result.limit), 1);
    const data = result.items.map((x) => ({
      RecordID: x.id,
      title: x.title,
      slug: x.slug,
      status: x.status,
      publishedAt: x.published_at ? x.published_at.toISOString() : "",
      validFrom: x.valid_from ? x.valid_from.toISOString().slice(0, 10) : "",
      validUntil: x.valid_until ? x.valid_until.toISOString().slice(0, 10) : "",
      waBlastStatus: x.wa_blast_status,
    }));
    res.json({
      meta: { page: result.page, pages, perpage: result.limit, total: result.total },
      data,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: { code: "INTERNAL_ERROR", message: "Terjadi kesalahan server" } });
  }
}

export async function getAnnouncement(req: AuthedRequest, res: Response): Promise<void> {
  const parsed = idParamSchema.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ ok: false, error: { code: "VALIDATION_ERROR", message: "ID tidak valid" } });
    return;
  }
  try {
    const row = await getAnnouncementById(parsed.data.id);
    if (!row) {
      res.status(404).json({ ok: false, error: { code: "NOT_FOUND", message: "Pengumuman tidak ditemukan" } });
      return;
    }
    const phones = Array.isArray(row.wa_recipient_phones)
      ? (row.wa_recipient_phones as string[])
      : [];
    res.json({
      ok: true,
      data: {
        id: row.id,
        title: row.title,
        slug: row.slug,
        summary: row.summary,
        body: row.body ?? "",
        status: row.status,
        publishedAt: row.published_at ? row.published_at.toISOString() : "",
        validFrom: row.valid_from ? row.valid_from.toISOString().slice(0, 10) : "",
        validUntil: row.valid_until ? row.valid_until.toISOString().slice(0, 10) : "",
        priority: row.priority,
        waBlastOnPublish: row.wa_blast_on_publish,
        waMessage: row.wa_message ?? "",
        waRecipientPhones: phones,
        waBlastStatus: row.wa_blast_status,
        waBlastRequestedAt: row.wa_blast_requested_at ? row.wa_blast_requested_at.toISOString() : "",
        waBlastSentAt: row.wa_blast_sent_at ? row.wa_blast_sent_at.toISOString() : "",
        waBlastLastError: row.wa_blast_last_error ?? "",
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: { code: "INTERNAL_ERROR", message: "Terjadi kesalahan server" } });
  }
}

export async function postAnnouncement(req: AuthedRequest, res: Response): Promise<void> {
  const parsed = announcementCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      ok: false,
      error: { code: "VALIDATION_ERROR", message: "Data tidak valid", details: parsed.error.flatten() },
    });
    return;
  }
  const p = parsed.data;
  const validFrom = parseDateInput(p.validFrom)!;
  const validUntil = parseDateInput(p.validUntil ?? null);
  const publishedAt = parseDateInput(p.publishedAt ?? null);
  const phones = coercePhones(p.waRecipientPhones ?? []);
  try {
    const created = await createAnnouncement({
      title: p.title,
      slug: p.slug,
      summary: p.summary,
      body: p.body === "" || p.body === null ? null : p.body,
      status: p.status,
      published_at: p.status === "published" ? publishedAt ?? new Date() : publishedAt,
      valid_from: validFrom,
      valid_until: validUntil,
      priority: p.priority,
      wa_blast_on_publish: p.waBlastOnPublish,
      wa_message: p.waMessage === "" || p.waMessage === null ? null : p.waMessage,
      wa_recipient_phones: phones,
    });
    await maybeRunWaBlastAfterSave(created.id, null, {
      status: p.status,
      wa_blast_on_publish: p.waBlastOnPublish,
    });
    res.status(201).json({ ok: true, data: { id: created.id } });
  } catch (e: unknown) {
    const code = typeof e === "object" && e && "code" in e ? String((e as { code: string }).code) : "";
    if (code === "23505") {
      res.status(409).json({ ok: false, error: { code: "DUPLICATE", message: "Slug sudah dipakai" } });
      return;
    }
    console.error(e);
    res.status(500).json({ ok: false, error: { code: "INTERNAL_ERROR", message: "Terjadi kesalahan server" } });
  }
}

export async function patchAnnouncement(req: AuthedRequest, res: Response): Promise<void> {
  const parsedParam = idParamSchema.safeParse(req.params);
  if (!parsedParam.success) {
    res.status(400).json({ ok: false, error: { code: "VALIDATION_ERROR", message: "ID tidak valid" } });
    return;
  }
  const parsed = announcementPatchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      ok: false,
      error: { code: "VALIDATION_ERROR", message: "Data tidak valid", details: parsed.error.flatten() },
    });
    return;
  }
  const p = parsed.data;
  if (!Object.keys(p).length) {
    res.status(400).json({ ok: false, error: { code: "VALIDATION_ERROR", message: "Minimal satu field diisi" } });
    return;
  }

  const prev = await getAnnouncementById(parsedParam.data.id);
  if (!prev) {
    res.status(404).json({ ok: false, error: { code: "NOT_FOUND", message: "Pengumuman tidak ditemukan" } });
    return;
  }

  const patch: Parameters<typeof updateAnnouncement>[1] = {};
  if (p.title !== undefined) patch.title = p.title;
  if (p.slug !== undefined) patch.slug = p.slug;
  if (p.summary !== undefined) patch.summary = p.summary;
  if (p.body !== undefined) patch.body = p.body === "" || p.body === null ? null : p.body;
  if (p.status !== undefined) patch.status = p.status;
  if (p.publishedAt !== undefined) {
    patch.published_at =
      p.publishedAt === "" || p.publishedAt === null ? null : parseDateInput(p.publishedAt);
  }
  if (p.validFrom !== undefined && p.validFrom !== "") {
    const vf = parseDateInput(p.validFrom);
    if (vf) patch.valid_from = vf;
  }
  if (p.validUntil !== undefined) {
    patch.valid_until =
      p.validUntil === "" || p.validUntil === null ? null : parseDateInput(p.validUntil);
  }
  if (p.priority !== undefined) patch.priority = p.priority;
  if (p.waBlastOnPublish !== undefined) patch.wa_blast_on_publish = p.waBlastOnPublish;
  if (p.waMessage !== undefined) patch.wa_message = p.waMessage === "" || p.waMessage === null ? null : p.waMessage;
  if (p.waRecipientPhones !== undefined) {
    patch.wa_recipient_phones = coercePhones(p.waRecipientPhones);
  }

  const nextValidFrom = patch.valid_from ?? prev.valid_from;
  const nextValidUntil =
    patch.valid_until !== undefined ? patch.valid_until : prev.valid_until;
  if (nextValidUntil && nextValidFrom && nextValidUntil < nextValidFrom) {
    res.status(400).json({
      ok: false,
      error: { code: "VALIDATION_ERROR", message: "Akhir berlaku tidak boleh sebelum mulai berlaku" },
    });
    return;
  }

  try {
    const ok = await updateAnnouncement(parsedParam.data.id, patch);
    if (!ok) {
      res.status(404).json({ ok: false, error: { code: "NOT_FOUND", message: "Pengumuman tidak ditemukan" } });
      return;
    }
    const next = await getAnnouncementById(parsedParam.data.id);
    if (next) {
      await maybeRunWaBlastAfterSave(next.id, prev, {
        status: next.status,
        wa_blast_on_publish: next.wa_blast_on_publish,
      });
    }
    res.json({ ok: true });
  } catch (e: unknown) {
    const code = typeof e === "object" && e && "code" in e ? String((e as { code: string }).code) : "";
    if (code === "23505") {
      res.status(409).json({ ok: false, error: { code: "DUPLICATE", message: "Slug sudah dipakai" } });
      return;
    }
    console.error(e);
    res.status(500).json({ ok: false, error: { code: "INTERNAL_ERROR", message: "Terjadi kesalahan server" } });
  }
}

export async function deleteAnnouncementHandler(req: AuthedRequest, res: Response): Promise<void> {
  const parsed = idParamSchema.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ ok: false, error: { code: "VALIDATION_ERROR", message: "ID tidak valid" } });
    return;
  }
  try {
    const ok = await deleteAnnouncement(parsed.data.id);
    if (!ok) {
      res.status(404).json({ ok: false, error: { code: "NOT_FOUND", message: "Pengumuman tidak ditemukan" } });
      return;
    }
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: { code: "INTERNAL_ERROR", message: "Terjadi kesalahan server" } });
  }
}

export async function postAnnouncementWaBlast(req: AuthedRequest, res: Response): Promise<void> {
  const parsed = idParamSchema.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ ok: false, error: { code: "VALIDATION_ERROR", message: "ID tidak valid" } });
    return;
  }
  try {
    const row = await getAnnouncementById(parsed.data.id);
    if (!row) {
      res.status(404).json({ ok: false, error: { code: "NOT_FOUND", message: "Pengumuman tidak ditemukan" } });
      return;
    }
    if (row.status !== "published") {
      res.status(400).json({
        ok: false,
        error: { code: "INVALID_STATE", message: "Hanya pengumuman berstatus published yang bisa dikirim blast WA" },
      });
      return;
    }
    await updateAnnouncement(parsed.data.id, {
      wa_blast_status: "pending",
      wa_blast_requested_at: new Date(),
      wa_blast_last_error: null,
    });
    await deliverAnnouncementWaBlast(parsed.data.id);
    const after = await getAnnouncementById(parsed.data.id);
    res.json({
      ok: true,
      data: {
        waBlastStatus: after?.wa_blast_status ?? "unknown",
        waBlastLastError: after?.wa_blast_last_error ?? "",
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: { code: "INTERNAL_ERROR", message: "Terjadi kesalahan server" } });
  }
}
