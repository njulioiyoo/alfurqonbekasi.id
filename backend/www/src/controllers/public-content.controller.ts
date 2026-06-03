import type { Request, Response } from "express";
import {
  countContentByTypeAndStatus,
  getPublishedContentByTypeAndSlug,
  listPublishedContentByTypePaginated,
  type PublicContentDetailRow,
  type PublicContentRow,
} from "../services/content.service.js";

const ALLOWED_TYPES = new Set(["event", "prayer_staff", "gallery"]);

function mapPublicItem(row: PublicContentRow) {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt ?? "",
    coverImageUrl: row.cover_image_url ?? "",
    publishedAt: row.published_at?.toISOString() ?? null,
    sortOrder: row.sort_order,
    isFeatured: row.is_featured,
    attr1: row.attr_1 ?? "",
    attr2: row.attr_2 ?? "",
    attr3: row.attr_3 ?? "",
    attr4: row.attr_4 ?? "",
    attr5: row.attr_5 ?? "",
  };
}

function mapPublicDetailItem(row: PublicContentDetailRow) {
  return {
    ...mapPublicItem(row),
    body: row.body ?? "",
  };
}

export async function getPublicContentByType(req: Request, res: Response): Promise<void> {
  const type = String(req.params.type ?? "").trim();
  if (!ALLOWED_TYPES.has(type)) {
    res.status(400).json({
      ok: false,
      error: { code: "INVALID_TYPE", message: "Tipe konten tidak didukung" },
    });
    return;
  }

  const page = Math.max(1, Number.parseInt(String(req.query.page ?? "1"), 10) || 1);
  const limit = Math.min(24, Math.max(1, Number.parseInt(String(req.query.limit ?? "6"), 10) || 6));

  const [result, statusCounts] = await Promise.all([
    listPublishedContentByTypePaginated(type, page, limit),
    countContentByTypeAndStatus(type),
  ]);
  res.json({
    ok: true,
    data: {
      items: result.items.map(mapPublicItem),
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: result.total > 0 ? Math.ceil(result.total / result.limit) : 0,
      statusCounts,
    },
  });
}

export async function getPublicContentByTypeAndSlug(req: Request, res: Response): Promise<void> {
  const type = String(req.params.type ?? "").trim();
  const slug = String(req.params.slug ?? "").trim();
  if (!ALLOWED_TYPES.has(type)) {
    res.status(400).json({
      ok: false,
      error: { code: "INVALID_TYPE", message: "Tipe konten tidak didukung" },
    });
    return;
  }
  if (!slug) {
    res.status(400).json({
      ok: false,
      error: { code: "VALIDATION_ERROR", message: "Slug wajib" },
    });
    return;
  }

  try {
    const row = await getPublishedContentByTypeAndSlug(type, slug);
    if (!row) {
      res.status(404).json({
        ok: false,
        error: { code: "NOT_FOUND", message: "Konten tidak ditemukan" },
      });
      return;
    }
    res.json({ ok: true, data: mapPublicDetailItem(row) });
  } catch (e) {
    console.error(e);
    res.status(500).json({
      ok: false,
      error: { code: "INTERNAL_ERROR", message: "Terjadi kesalahan server" },
    });
  }
}
