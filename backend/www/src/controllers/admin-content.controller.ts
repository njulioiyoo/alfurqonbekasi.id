import type { Response } from "express";
import { z } from "zod";
import type { AuthedRequest } from "../middleware/auth.middleware.js";
import {
  createContent,
  deleteContent,
  getContentById,
  listContentPaginatedFiltered,
  updateContent,
} from "../services/content.service.js";
import { canManageContentType } from "../utils/content-acl.js";
import { parseMetronicDatatableBody, queryGeneralSearch } from "../utils/metronic-datatable.js";

const contentTypeSchema = z.enum([
  "article",
  "announcement",
  "program",
  "event",
  "prayer_staff",
  "page",
  "gallery",
]);
const contentStatusSchema = z.enum(["draft", "published", "archived"]);
const slugSchema = z.string().trim().min(2).max(255).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const idParamSchema = z.object({ id: z.string().uuid() });

const attrSchema = z.union([z.string().max(8000), z.literal(""), z.null()]).optional();

function plainTextLen(html: string): number {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim().length;
}

function mapAttr(v: string | null | undefined): string | null {
  if (v === undefined || v === null) return null;
  const s = v.trim();
  return s === "" ? null : s;
}

function isLightweightType(t: string): boolean {
  return t === "event" || t === "prayer_staff";
}

const contentCreateSchema = z
  .object({
    type: contentTypeSchema,
    title: z.string().trim().min(2).max(255),
    slug: slugSchema,
    excerpt: z.string().trim().max(4000),
    body: z.string().trim().max(100000),
    coverImageUrl: z.union([z.string().trim().url(), z.literal(""), z.null()]).optional(),
    status: contentStatusSchema.default("draft"),
    publishedAt: z.union([z.string().datetime(), z.literal(""), z.null()]).optional(),
    sortOrder: z.coerce.number().int().min(-99999).max(99999).default(0),
    isFeatured: z.coerce.boolean().default(false),
    attr1: attrSchema,
    attr2: attrSchema,
    attr3: attrSchema,
    attr4: attrSchema,
    attr5: attrSchema,
  })
  .superRefine((data, ctx) => {
    const light = isLightweightType(data.type);
    const minEx = light ? 20 : 300;
    if (data.excerpt.trim().length < minEx) {
      ctx.addIssue({
        code: "custom",
        path: ["excerpt"],
        message: light ? "Ringkasan minimal 20 karakter (jadwal)" : "Ringkasan minimal 300 karakter",
      });
    }
    if (!light) {
      if (plainTextLen(data.body) < 300) {
        ctx.addIssue({
          code: "custom",
          path: ["body"],
          message: "Body minimal 300 karakter (plain text)",
        });
      }
    }
  });

const contentPatchSchema = z
  .object({
    type: contentTypeSchema.optional(),
    title: z.string().trim().min(2).max(255).optional(),
    slug: slugSchema.optional(),
    excerpt: z.string().trim().max(4000).optional(),
    body: z.string().trim().max(100000).optional(),
    coverImageUrl: z.union([z.string().trim().url(), z.literal(""), z.null()]).optional(),
    status: contentStatusSchema.optional(),
    publishedAt: z.union([z.string().datetime(), z.literal(""), z.null()]).optional(),
    sortOrder: z.coerce.number().int().min(-99999).max(99999).optional(),
    isFeatured: z.coerce.boolean().optional(),
    attr1: attrSchema,
    attr2: attrSchema,
    attr3: attrSchema,
    attr4: attrSchema,
    attr5: attrSchema,
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: "Minimal satu field diisi",
  })
  .superRefine((data, ctx) => {
    const typ = data.type;
    if (data.excerpt !== undefined && typ !== undefined) {
      const light = isLightweightType(typ);
      const minEx = light ? 20 : 300;
      if (data.excerpt.trim().length < minEx) {
        ctx.addIssue({
          code: "custom",
          path: ["excerpt"],
          message: light ? "Ringkasan minimal 20 karakter" : "Ringkasan minimal 300 karakter",
        });
      }
    }
    if (data.body !== undefined && typ !== undefined && !isLightweightType(typ)) {
      if (plainTextLen(data.body) < 300) {
        ctx.addIssue({
          code: "custom",
          path: ["body"],
          message: "Body minimal 300 karakter (plain text)",
        });
      }
    }
  });

const NON_SCHEDULE_CONTENT_TYPES = ["article", "announcement", "program", "page", "gallery"] as const;

export async function listContentDatatable(req: AuthedRequest, res: Response): Promise<void> {
  const dt = parseMetronicDatatableBody(req.body);
  const search = queryGeneralSearch(dt.query);
  const rawCt = dt.contentType?.trim();
  const typeFilter =
    rawCt && contentTypeSchema.safeParse(rawCt).success ? rawCt : undefined;

  let typesIn: string[] | undefined;
  if (typeFilter !== undefined) {
    if (!canManageContentType(req.ability, "read", typeFilter)) {
      res.status(403).json({
        ok: false,
        error: { code: "FORBIDDEN", message: "Anda tidak punya akses untuk daftar konten ini" },
      });
      return;
    }
  } else {
    const readableNonSchedule = NON_SCHEDULE_CONTENT_TYPES.filter((t) =>
      canManageContentType(req.ability, "read", t)
    );
    const canScheduleTypes =
      canManageContentType(req.ability, "read", "event") ||
      canManageContentType(req.ability, "read", "prayer_staff");
    if (readableNonSchedule.length === 0 && !canScheduleTypes) {
      res.status(403).json({
        ok: false,
        error: { code: "FORBIDDEN", message: "Anda tidak punya akses untuk daftar konten ini" },
      });
      return;
    }
    if (readableNonSchedule.length > 0 && !canScheduleTypes) {
      typesIn = [...readableNonSchedule];
    } else if (readableNonSchedule.length === 0 && canScheduleTypes) {
      typesIn = ["event", "prayer_staff"];
    } else {
      typesIn = [...readableNonSchedule, "event", "prayer_staff"];
    }
  }

  try {
    const result = await listContentPaginatedFiltered({
      page: dt.page,
      limit: dt.perpage,
      search: search || undefined,
      sortField: dt.sortField,
      sortDir: dt.sortDir,
      type: typeFilter,
      typesIn,
    });
    const pages = Math.max(Math.ceil(result.total / result.limit), 1);
    const data = result.items.map((x) => ({
      RecordID: x.id,
      type: x.type,
      title: x.title,
      slug: x.slug,
      status: x.status,
      publishedAt: x.published_at ? x.published_at.toISOString() : "",
      sortOrder: x.sort_order,
      isFeatured: x.is_featured,
      attr1: x.attr_1 ?? "",
      attr2: x.attr_2 ?? "",
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

export async function getContent(req: AuthedRequest, res: Response): Promise<void> {
  const parsed = idParamSchema.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ ok: false, error: { code: "VALIDATION_ERROR", message: "ID konten tidak valid" } });
    return;
  }
  try {
    const row = await getContentById(parsed.data.id);
    if (!row) {
      res.status(404).json({ ok: false, error: { code: "NOT_FOUND", message: "Konten tidak ditemukan" } });
      return;
    }
    if (!canManageContentType(req.ability, "read", row.type)) {
      res.status(403).json({
        ok: false,
        error: { code: "FORBIDDEN", message: "Anda tidak punya akses ke konten ini" },
      });
      return;
    }
    res.json({
      ok: true,
      data: {
        id: row.id,
        type: row.type,
        title: row.title,
        slug: row.slug,
        excerpt: row.excerpt ?? "",
        body: row.body ?? "",
        coverImageUrl: row.cover_image_url ?? "",
        status: row.status,
        publishedAt: row.published_at ? row.published_at.toISOString() : "",
        sortOrder: row.sort_order,
        isFeatured: row.is_featured,
        attr1: row.attr_1 ?? "",
        attr2: row.attr_2 ?? "",
        attr3: row.attr_3 ?? "",
        attr4: row.attr_4 ?? "",
        attr5: row.attr_5 ?? "",
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: { code: "INTERNAL_ERROR", message: "Terjadi kesalahan server" } });
  }
}

export async function postContent(req: AuthedRequest, res: Response): Promise<void> {
  const parsed = contentCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      ok: false,
      error: { code: "VALIDATION_ERROR", message: "Data tidak valid", details: parsed.error.flatten() },
    });
    return;
  }
  if (!canManageContentType(req.ability, "create", parsed.data.type)) {
    res.status(403).json({
      ok: false,
      error: { code: "FORBIDDEN", message: "Anda tidak punya akses membuat konten tipe ini" },
    });
    return;
  }
  try {
    const p = parsed.data;
    const created = await createContent({
      type: p.type,
      title: p.title,
      slug: p.slug,
      excerpt: p.excerpt,
      body: p.body,
      cover_image_url: p.coverImageUrl === "" ? null : (p.coverImageUrl ?? null),
      status: p.status,
      published_at: p.publishedAt ? new Date(p.publishedAt) : null,
      sort_order: p.sortOrder,
      is_featured: p.isFeatured,
      attr_1: mapAttr(p.attr1 ?? null),
      attr_2: mapAttr(p.attr2 ?? null),
      attr_3: mapAttr(p.attr3 ?? null),
      attr_4: mapAttr(p.attr4 ?? null),
      attr_5: mapAttr(p.attr5 ?? null),
    });
    res.status(201).json({ ok: true, data: { id: created.id } });
  } catch (e: unknown) {
    const code = typeof e === "object" && e && "code" in e ? String((e as { code: string }).code) : "";
    if (code === "23505") {
      res.status(409).json({ ok: false, error: { code: "DUPLICATE", message: "Slug sudah dipakai pada tipe ini" } });
      return;
    }
    console.error(e);
    res.status(500).json({ ok: false, error: { code: "INTERNAL_ERROR", message: "Terjadi kesalahan server" } });
  }
}

export async function patchContent(req: AuthedRequest, res: Response): Promise<void> {
  const parsedParam = idParamSchema.safeParse(req.params);
  if (!parsedParam.success) {
    res.status(400).json({ ok: false, error: { code: "VALIDATION_ERROR", message: "ID konten tidak valid" } });
    return;
  }
  const parsed = contentPatchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      ok: false,
      error: { code: "VALIDATION_ERROR", message: "Data tidak valid", details: parsed.error.flatten() },
    });
    return;
  }
  try {
    const existing = await getContentById(parsedParam.data.id);
    if (!existing) {
      res.status(404).json({ ok: false, error: { code: "NOT_FOUND", message: "Konten tidak ditemukan" } });
      return;
    }
    const fromType = existing.type;
    const toType = parsed.data.type ?? fromType;
    if (!canManageContentType(req.ability, "update", fromType)) {
      res.status(403).json({
        ok: false,
        error: { code: "FORBIDDEN", message: "Anda tidak punya akses mengubah konten ini" },
      });
      return;
    }
    if (toType !== fromType && !canManageContentType(req.ability, "update", toType)) {
      res.status(403).json({
        ok: false,
        error: { code: "FORBIDDEN", message: "Anda tidak punya akses mengubah ke tipe konten tersebut" },
      });
      return;
    }
    const p = parsed.data;
    const patch: Parameters<typeof updateContent>[1] = {
      type: p.type,
      title: p.title,
      slug: p.slug,
      excerpt: p.excerpt,
      body: p.body,
      cover_image_url:
        p.coverImageUrl === undefined ? undefined : p.coverImageUrl === "" ? null : p.coverImageUrl,
      status: p.status,
      published_at: p.publishedAt === undefined ? undefined : p.publishedAt ? new Date(p.publishedAt) : null,
      sort_order: p.sortOrder,
      is_featured: p.isFeatured,
    };
    if (p.attr1 !== undefined) patch.attr_1 = mapAttr(p.attr1);
    if (p.attr2 !== undefined) patch.attr_2 = mapAttr(p.attr2);
    if (p.attr3 !== undefined) patch.attr_3 = mapAttr(p.attr3);
    if (p.attr4 !== undefined) patch.attr_4 = mapAttr(p.attr4);
    if (p.attr5 !== undefined) patch.attr_5 = mapAttr(p.attr5);
    const ok = await updateContent(parsedParam.data.id, patch);
    if (!ok) {
      res.status(404).json({ ok: false, error: { code: "NOT_FOUND", message: "Konten tidak ditemukan" } });
      return;
    }
    res.json({ ok: true });
  } catch (e: unknown) {
    const code = typeof e === "object" && e && "code" in e ? String((e as { code: string }).code) : "";
    if (code === "23505") {
      res.status(409).json({ ok: false, error: { code: "DUPLICATE", message: "Slug sudah dipakai pada tipe ini" } });
      return;
    }
    console.error(e);
    res.status(500).json({ ok: false, error: { code: "INTERNAL_ERROR", message: "Terjadi kesalahan server" } });
  }
}

export async function deleteContentHandler(req: AuthedRequest, res: Response): Promise<void> {
  const parsed = idParamSchema.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ ok: false, error: { code: "VALIDATION_ERROR", message: "ID konten tidak valid" } });
    return;
  }
  try {
    const row = await getContentById(parsed.data.id);
    if (!row) {
      res.status(404).json({ ok: false, error: { code: "NOT_FOUND", message: "Konten tidak ditemukan" } });
      return;
    }
    if (!canManageContentType(req.ability, "delete", row.type)) {
      res.status(403).json({
        ok: false,
        error: { code: "FORBIDDEN", message: "Anda tidak punya akses menghapus konten ini" },
      });
      return;
    }
    const ok = await deleteContent(parsed.data.id);
    if (!ok) {
      res.status(404).json({ ok: false, error: { code: "NOT_FOUND", message: "Konten tidak ditemukan" } });
      return;
    }
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: { code: "INTERNAL_ERROR", message: "Terjadi kesalahan server" } });
  }
}
