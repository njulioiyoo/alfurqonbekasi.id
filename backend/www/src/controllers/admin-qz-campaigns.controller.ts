import type { Response } from "express";
import { z } from "zod";
import type { AuthedRequest } from "../middleware/auth.middleware.js";
import {
  createQzCampaign,
  deleteQzCampaign,
  getQzCampaignById,
  listQzCampaignsBrief,
  listQzCampaignsPaginatedFiltered,
  updateQzCampaign,
} from "../services/qz-campaign.service.js";
import { parseMetronicDatatableBody, queryGeneralSearch } from "../utils/metronic-datatable.js";

const idParamSchema = z.object({ id: z.string().uuid() });
const statusSchema = z.enum(["draft", "open", "closed"]);
const seasonTagSchema = z.enum(["general", "ramadan", "idul_adha"]);
const yyyyMmDdSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const createBodySchema = z.object({
  title: z.string().trim().min(2).max(255),
  seasonTag: seasonTagSchema.default("general"),
  hijriYear: z.union([z.coerce.number().int().min(1300).max(1600), z.null()]).optional(),
  dateStart: z.union([yyyyMmDdSchema, z.literal(""), z.null()]).optional(),
  dateEnd: z.union([yyyyMmDdSchema, z.literal(""), z.null()]).optional(),
  status: statusSchema.default("draft"),
  description: z.union([z.string().trim().max(10000), z.literal(""), z.null()]).optional(),
});

const patchBodySchema = z
  .object({
    title: z.string().trim().min(2).max(255).optional(),
    seasonTag: seasonTagSchema.optional(),
    hijriYear: z.union([z.coerce.number().int().min(1300).max(1600), z.null()]).optional(),
    dateStart: z.union([yyyyMmDdSchema, z.literal(""), z.null()]).optional(),
    dateEnd: z.union([yyyyMmDdSchema, z.literal(""), z.null()]).optional(),
    status: statusSchema.optional(),
    description: z.union([z.string().trim().max(10000), z.literal(""), z.null()]).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "Minimal satu field diisi" });

function mapNullable(v: string | null | undefined): string | null | undefined {
  if (v === undefined) return undefined;
  if (v === null) return null;
  const s = v.trim();
  return s === "" ? null : s;
}

export async function listQzCampaignsBriefHandler(req: AuthedRequest, res: Response): Promise<void> {
  try {
    const items = await listQzCampaignsBrief();
    res.json({ ok: true, data: { items } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: { code: "INTERNAL_ERROR", message: "Terjadi kesalahan server" } });
  }
}

export async function listQzCampaignsDatatable(req: AuthedRequest, res: Response): Promise<void> {
  const dt = parseMetronicDatatableBody(req.body);
  const search = queryGeneralSearch(dt.query);
  try {
    const result = await listQzCampaignsPaginatedFiltered({
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
        title: x.title,
        seasonTag: x.season_tag,
        hijriYear: x.hijri_year ?? "",
        dateStart: x.date_start ? x.date_start.toISOString().slice(0, 10) : "",
        dateEnd: x.date_end ? x.date_end.toISOString().slice(0, 10) : "",
        status: x.status,
        createdAt: x.created_at.toISOString(),
      })),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: { code: "INTERNAL_ERROR", message: "Terjadi kesalahan server" } });
  }
}

export async function getQzCampaign(req: AuthedRequest, res: Response): Promise<void> {
  const p = idParamSchema.safeParse(req.params);
  if (!p.success) {
    res.status(400).json({ ok: false, error: { code: "VALIDATION_ERROR", message: "ID tidak valid" } });
    return;
  }
  try {
    const row = await getQzCampaignById(p.data.id);
    if (!row) {
      res.status(404).json({ ok: false, error: { code: "NOT_FOUND", message: "Kampanye tidak ditemukan" } });
      return;
    }
    res.json({
      ok: true,
      data: {
        id: row.id,
        title: row.title,
        seasonTag: row.season_tag,
        hijriYear: row.hijri_year,
        dateStart: row.date_start ? row.date_start.toISOString().slice(0, 10) : "",
        dateEnd: row.date_end ? row.date_end.toISOString().slice(0, 10) : "",
        status: row.status,
        description: row.description ?? "",
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: { code: "INTERNAL_ERROR", message: "Terjadi kesalahan server" } });
  }
}

export async function postQzCampaign(req: AuthedRequest, res: Response): Promise<void> {
  const b = createBodySchema.safeParse(req.body);
  if (!b.success) {
    res.status(400).json({
      ok: false,
      error: { code: "VALIDATION_ERROR", message: "Data tidak valid", details: b.error.flatten() },
    });
    return;
  }
  try {
    const created = await createQzCampaign({
      title: b.data.title,
      season_tag: b.data.seasonTag,
      hijri_year: b.data.hijriYear ?? null,
      date_start: b.data.dateStart ? new Date(b.data.dateStart) : null,
      date_end: b.data.dateEnd ? new Date(b.data.dateEnd) : null,
      status: b.data.status,
      description: mapNullable(b.data.description),
    });
    res.status(201).json({ ok: true, data: { id: created.id } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: { code: "INTERNAL_ERROR", message: "Terjadi kesalahan server" } });
  }
}

export async function patchQzCampaign(req: AuthedRequest, res: Response): Promise<void> {
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
    const ok = await updateQzCampaign(p.data.id, {
      title: b.data.title,
      season_tag: b.data.seasonTag,
      hijri_year: b.data.hijriYear,
      date_start:
        b.data.dateStart === undefined ? undefined : b.data.dateStart ? new Date(b.data.dateStart) : null,
      date_end: b.data.dateEnd === undefined ? undefined : b.data.dateEnd ? new Date(b.data.dateEnd) : null,
      status: b.data.status,
      description: b.data.description === undefined ? undefined : mapNullable(b.data.description),
    });
    if (!ok) {
      res.status(404).json({ ok: false, error: { code: "NOT_FOUND", message: "Kampanye tidak ditemukan" } });
      return;
    }
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: { code: "INTERNAL_ERROR", message: "Terjadi kesalahan server" } });
  }
}

export async function deleteQzCampaignHandler(req: AuthedRequest, res: Response): Promise<void> {
  const p = idParamSchema.safeParse(req.params);
  if (!p.success) {
    res.status(400).json({ ok: false, error: { code: "VALIDATION_ERROR", message: "ID tidak valid" } });
    return;
  }
  try {
    const ok = await deleteQzCampaign(p.data.id);
    if (!ok) {
      res.status(404).json({ ok: false, error: { code: "NOT_FOUND", message: "Kampanye tidak ditemukan" } });
      return;
    }
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: { code: "INTERNAL_ERROR", message: "Terjadi kesalahan server" } });
  }
}
