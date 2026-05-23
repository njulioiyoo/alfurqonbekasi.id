import { pool } from "../db/pool.js";
import { comparePublicEvents, comparePublicPrayerStaff } from "../utils/event-datetime.js";

export type ContentListRow = {
  id: string;
  type: string;
  title: string;
  slug: string;
  status: string;
  published_at: Date | null;
  sort_order: number;
  is_featured: boolean;
  created_at: Date;
  updated_at: Date;
  attr_1: string | null;
  attr_2: string | null;
  attr_3: string | null;
};

export type ContentDetailRow = ContentListRow & {
  excerpt: string | null;
  body: string | null;
  cover_image_url: string | null;
  meta_json: Record<string, unknown>;
  attr_3: string | null;
  attr_4: string | null;
  attr_5: string | null;
};

const MAX_PAGE_SIZE = 100;

const CONTENT_SORT: Record<string, string> = {
  type: "type",
  title: "title",
  slug: "slug",
  status: "status",
  publishedAt: "published_at",
  sortOrder: "sort_order",
  createdAt: "created_at",
  updatedAt: "updated_at",
  attr1: "attr_1",
  attr2: "attr_2",
  attr3: "attr_3",
  RecordID: "id",
};

function buildContentWhereClause(params: {
  search: string;
  type?: string;
  /** Jika diisi tanpa `type`, batasi ke beberapa nilai `type` (mis. izin parsial). */
  typesIn?: string[];
}): { sql: string; values: unknown[] } {
  const parts: string[] = [];
  const values: unknown[] = [];
  let n = 1;
  const typeFilter = params.type?.trim();
  if (typeFilter) {
    parts.push(`type = $${n++}`);
    values.push(typeFilter);
  } else if (params.typesIn && params.typesIn.length > 0) {
    parts.push(`type = ANY($${n++}::text[])`);
    values.push(params.typesIn);
  }
  const search = params.search.trim();
  if (search.length > 0) {
    parts.push(`(
         type ILIKE '%' || $${n}::text || '%'
         OR title ILIKE '%' || $${n}::text || '%'
         OR slug ILIKE '%' || $${n}::text || '%'
         OR COALESCE(excerpt, '') ILIKE '%' || $${n}::text || '%'
         OR COALESCE(attr_1, '') ILIKE '%' || $${n}::text || '%'
         OR COALESCE(attr_2, '') ILIKE '%' || $${n}::text || '%'
         OR COALESCE(attr_3, '') ILIKE '%' || $${n}::text || '%'
       )`);
    values.push(search);
    n += 1;
  }
  const sql = parts.length ? `WHERE ${parts.join(" AND ")}` : "";
  return { sql, values };
}

export async function listContentPaginatedFiltered(params: {
  page: number;
  limit: number;
  search?: string;
  sortField?: string;
  sortDir?: "asc" | "desc";
  /** Jika diisi, hanya baris dengan `type` ini (mis. `event` untuk jadwal). */
  type?: string;
  /** Jika diisi tanpa `type`, filter `type = ANY(typesIn)`. */
  typesIn?: string[];
}): Promise<{ items: ContentListRow[]; total: number; page: number; limit: number }> {
  const limit = Math.min(Math.max(params.limit, 1), MAX_PAGE_SIZE);
  const page = Math.max(params.page, 1);
  const offset = (page - 1) * limit;
  const search = params.search?.trim() || "";
  const sortCol = CONTENT_SORT[params.sortField ?? ""] ?? "updated_at";
  const sortDirSql = params.sortDir === "asc" ? "ASC" : "DESC";
  const { sql: whereSql, values: whereVals } = buildContentWhereClause({
    search,
    type: params.type,
    typesIn: params.typesIn,
  });

  const countR = await pool.query<{ total: string }>(
    `SELECT COUNT(*)::text AS total FROM content_items ${whereSql}`,
    whereVals
  );
  const total = Number(countR.rows[0]?.total ?? 0);

  const dataParams: unknown[] = [...whereVals, limit, offset];
  const limitIdx = whereVals.length + 1;
  const offsetIdx = whereVals.length + 2;

  const r = await pool.query<ContentListRow>(
    `SELECT id, type, title, slug, status, published_at, sort_order, is_featured, created_at, updated_at,
            attr_1, attr_2, attr_3
     FROM content_items
     ${whereSql}
     ORDER BY ${sortCol} ${sortDirSql} NULLS LAST, title ASC
     LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    dataParams
  );
  return { items: r.rows, total, page, limit };
}

export async function getContentById(id: string): Promise<ContentDetailRow | null> {
  const r = await pool.query<ContentDetailRow>(
    `SELECT id, type, title, slug, excerpt, body, cover_image_url, status, published_at, sort_order, is_featured, meta_json,
            attr_1, attr_2, attr_3, attr_4, attr_5
     FROM content_items
     WHERE id = $1`,
    [id]
  );
  return r.rows[0] ?? null;
}

export async function createContent(input: {
  type: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  body?: string | null;
  cover_image_url?: string | null;
  status: string;
  published_at?: Date | null;
  sort_order?: number;
  is_featured?: boolean;
  meta_json?: Record<string, unknown>;
  attr_1?: string | null;
  attr_2?: string | null;
  attr_3?: string | null;
  attr_4?: string | null;
  attr_5?: string | null;
}): Promise<{ id: string }> {
  const r = await pool.query<{ id: string }>(
    `INSERT INTO content_items (
       type, title, slug, excerpt, body, cover_image_url, status, published_at, sort_order, is_featured, meta_json,
       attr_1, attr_2, attr_3, attr_4, attr_5
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12, $13, $14, $15, $16
     )
     RETURNING id`,
    [
      input.type,
      input.title,
      input.slug,
      input.excerpt ?? null,
      input.body ?? null,
      input.cover_image_url ?? null,
      input.status,
      input.published_at ?? null,
      input.sort_order ?? 0,
      input.is_featured ?? false,
      JSON.stringify(input.meta_json ?? {}),
      input.attr_1 ?? null,
      input.attr_2 ?? null,
      input.attr_3 ?? null,
      input.attr_4 ?? null,
      input.attr_5 ?? null,
    ]
  );
  return { id: String(r.rows[0]?.id ?? "") };
}

export async function updateContent(
  id: string,
  input: {
    type?: string;
    title?: string;
    slug?: string;
    excerpt?: string | null;
    body?: string | null;
    cover_image_url?: string | null;
    status?: string;
    published_at?: Date | null;
    sort_order?: number;
    is_featured?: boolean;
    meta_json?: Record<string, unknown>;
    attr_1?: string | null;
    attr_2?: string | null;
    attr_3?: string | null;
    attr_4?: string | null;
    attr_5?: string | null;
  }
): Promise<boolean> {
  const sets: string[] = [];
  const vals: unknown[] = [];
  let n = 1;
  const assign = (field: string, value: unknown): void => {
    sets.push(`${field} = $${n++}`);
    vals.push(value);
  };
  if (input.type !== undefined) assign("type", input.type);
  if (input.title !== undefined) assign("title", input.title);
  if (input.slug !== undefined) assign("slug", input.slug);
  if (input.excerpt !== undefined) assign("excerpt", input.excerpt);
  if (input.body !== undefined) assign("body", input.body);
  if (input.cover_image_url !== undefined) assign("cover_image_url", input.cover_image_url);
  if (input.status !== undefined) assign("status", input.status);
  if (input.published_at !== undefined) assign("published_at", input.published_at);
  if (input.sort_order !== undefined) assign("sort_order", input.sort_order);
  if (input.is_featured !== undefined) assign("is_featured", input.is_featured);
  if (input.meta_json !== undefined) assign("meta_json", JSON.stringify(input.meta_json));
  if (input.attr_1 !== undefined) assign("attr_1", input.attr_1);
  if (input.attr_2 !== undefined) assign("attr_2", input.attr_2);
  if (input.attr_3 !== undefined) assign("attr_3", input.attr_3);
  if (input.attr_4 !== undefined) assign("attr_4", input.attr_4);
  if (input.attr_5 !== undefined) assign("attr_5", input.attr_5);
  if (!sets.length) return true;
  sets.push("updated_at = NOW()");
  vals.push(id);
  const r = await pool.query(
    `UPDATE content_items SET ${sets.join(", ")} WHERE id = $${n}`,
    vals
  );
  return (r.rowCount ?? 0) > 0;
}

export async function deleteContent(id: string): Promise<boolean> {
  const r = await pool.query(`DELETE FROM content_items WHERE id = $1`, [id]);
  return (r.rowCount ?? 0) > 0;
}

export type PublicContentRow = {
  id: string;
  type: string;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_image_url: string | null;
  published_at: Date | null;
  sort_order: number;
  is_featured: boolean;
  attr_1: string | null;
  attr_2: string | null;
  attr_3: string | null;
  attr_4: string | null;
  attr_5: string | null;
};

/** Konten terpublikasi untuk website (tanpa auth). */
export async function listPublishedContentByType(type: string): Promise<PublicContentRow[]> {
  const r = await listPublishedContentByTypePaginated(type, 1, 100);
  return r.items;
}

export async function listPublishedContentByTypePaginated(
  type: string,
  page: number,
  limit: number
): Promise<{ items: PublicContentRow[]; total: number; page: number; limit: number }> {
  const safeLimit = Math.min(Math.max(limit, 1), 24);
  const safePage = Math.max(page, 1);
  const offset = (safePage - 1) * safeLimit;

  const countR = await pool.query<{ total: string }>(
    `SELECT COUNT(*)::text AS total FROM content_items WHERE type = $1 AND status = 'published'`,
    [type]
  );
  const total = Number(countR.rows[0]?.total ?? 0);

  const selectSql = `SELECT id, type, title, slug, excerpt, cover_image_url, published_at, sort_order, is_featured,
            attr_1, attr_2, attr_3, attr_4, attr_5
     FROM content_items
     WHERE type = $1 AND status = 'published'`;

  if (type === "event") {
    const allR = await pool.query<PublicContentRow>(selectSql, [type]);
    const sorted = [...allR.rows].sort(comparePublicEvents);
    return {
      items: sorted.slice(offset, offset + safeLimit),
      total,
      page: safePage,
      limit: safeLimit,
    };
  }

  if (type === "prayer_staff") {
    const allR = await pool.query<PublicContentRow>(selectSql, [type]);
    const sorted = [...allR.rows].sort(comparePublicPrayerStaff);
    return {
      items: sorted.slice(offset, offset + safeLimit),
      total,
      page: safePage,
      limit: safeLimit,
    };
  }

  const r = await pool.query<PublicContentRow>(
    `${selectSql}
     ORDER BY sort_order ASC, published_at DESC NULLS LAST, title ASC
     LIMIT $2 OFFSET $3`,
    [type, safeLimit, offset]
  );

  return { items: r.rows, total, page: safePage, limit: safeLimit };
}

export type ContentStatusCounts = {
  published: number;
  draft: number;
  archived: number;
  all: number;
};

export async function countContentByTypeAndStatus(type: string): Promise<ContentStatusCounts> {
  const r = await pool.query<{ status: string; c: string }>(
    `SELECT status, COUNT(*)::text AS c
     FROM content_items
     WHERE type = $1
     GROUP BY status`,
    [type]
  );
  const counts: ContentStatusCounts = { published: 0, draft: 0, archived: 0, all: 0 };
  for (const row of r.rows) {
    const n = Number(row.c) || 0;
    counts.all += n;
    if (row.status === "published") counts.published = n;
    else if (row.status === "draft") counts.draft = n;
    else if (row.status === "archived") counts.archived = n;
  }
  return counts;
}
