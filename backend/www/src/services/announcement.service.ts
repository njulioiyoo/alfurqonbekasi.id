import { pool } from "../db/pool.js";

export type AnnouncementListRow = {
  id: string;
  title: string;
  slug: string;
  status: string;
  published_at: Date | null;
  valid_from: Date;
  valid_until: Date | null;
  wa_blast_status: string;
};

export type AnnouncementDetailRow = AnnouncementListRow & {
  summary: string;
  body: string | null;
  priority: string;
  wa_blast_on_publish: boolean;
  wa_message: string | null;
  wa_recipient_phones: unknown;
  wa_blast_requested_at: Date | null;
  wa_blast_sent_at: Date | null;
  wa_blast_last_error: string | null;
};

const MAX_PAGE_SIZE = 100;

const SORT: Record<string, string> = {
  title: "title",
  slug: "slug",
  status: "status",
  publishedAt: "published_at",
  validFrom: "valid_from",
  validUntil: "valid_until",
  waBlastStatus: "wa_blast_status",
  RecordID: "id",
};

export async function listAnnouncementsPaginatedFiltered(params: {
  page: number;
  limit: number;
  search?: string;
  sortField?: string;
  sortDir?: "asc" | "desc";
}): Promise<{ items: AnnouncementListRow[]; total: number; page: number; limit: number }> {
  const limit = Math.min(Math.max(params.limit, 1), MAX_PAGE_SIZE);
  const page = Math.max(params.page, 1);
  const offset = (page - 1) * limit;
  const search = params.search?.trim() || "";
  const hasSearch = search.length > 0;
  const sortCol = SORT[params.sortField ?? ""] ?? "valid_from";
  const sortDirSql = params.sortDir === "desc" ? "DESC" : "ASC";
  const whereSql = hasSearch
    ? `WHERE (
         title ILIKE '%' || $1::text || '%'
         OR slug ILIKE '%' || $1::text || '%'
         OR COALESCE(summary, '') ILIKE '%' || $1::text || '%'
       )`
    : "";

  const countParams: string[] = hasSearch ? [search] : [];
  const countR = await pool.query<{ total: string }>(
    `SELECT COUNT(*)::text AS total FROM announcements ${whereSql}`,
    countParams
  );
  const total = Number(countR.rows[0]?.total ?? 0);

  const dataParams: (string | number)[] = hasSearch ? [search, limit, offset] : [limit, offset];
  const limitIdx = hasSearch ? 2 : 1;
  const offsetIdx = hasSearch ? 3 : 2;

  const r = await pool.query<AnnouncementListRow>(
    `SELECT id, title, slug, status, published_at, valid_from, valid_until, wa_blast_status
     FROM announcements
     ${whereSql}
     ORDER BY ${sortCol} ${sortDirSql} NULLS LAST, title ASC
     LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    dataParams
  );
  return { items: r.rows, total, page, limit };
}

export async function getAnnouncementById(id: string): Promise<AnnouncementDetailRow | null> {
  const r = await pool.query<AnnouncementDetailRow>(
    `SELECT id, title, slug, summary, body, status, published_at, valid_from, valid_until, priority,
            wa_blast_on_publish, wa_message, wa_recipient_phones, wa_blast_status,
            wa_blast_requested_at, wa_blast_sent_at, wa_blast_last_error
     FROM announcements
     WHERE id = $1`,
    [id]
  );
  return r.rows[0] ?? null;
}

export async function createAnnouncement(input: {
  title: string;
  slug: string;
  summary: string;
  body?: string | null;
  status: string;
  published_at?: Date | null;
  valid_from: Date;
  valid_until?: Date | null;
  priority: string;
  wa_blast_on_publish: boolean;
  wa_message?: string | null;
  wa_recipient_phones: string[];
}): Promise<{ id: string }> {
  const r = await pool.query<{ id: string }>(
    `INSERT INTO announcements (
       title, slug, summary, body, status, published_at, valid_from, valid_until, priority,
       wa_blast_on_publish, wa_message, wa_recipient_phones
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb
     )
     RETURNING id`,
    [
      input.title,
      input.slug,
      input.summary,
      input.body ?? null,
      input.status,
      input.published_at ?? null,
      input.valid_from,
      input.valid_until ?? null,
      input.priority,
      input.wa_blast_on_publish,
      input.wa_message ?? null,
      JSON.stringify(input.wa_recipient_phones),
    ]
  );
  return { id: String(r.rows[0]?.id ?? "") };
}

export async function updateAnnouncement(
  id: string,
  input: {
    title?: string;
    slug?: string;
    summary?: string;
    body?: string | null;
    status?: string;
    published_at?: Date | null;
    valid_from?: Date;
    valid_until?: Date | null;
    priority?: string;
    wa_blast_on_publish?: boolean;
    wa_message?: string | null;
    wa_recipient_phones?: string[];
    wa_blast_status?: string;
    wa_blast_requested_at?: Date | null;
    wa_blast_sent_at?: Date | null;
    wa_blast_last_error?: string | null;
  }
): Promise<boolean> {
  const sets: string[] = [];
  const vals: unknown[] = [];
  let n = 1;
  const assign = (field: string, value: unknown): void => {
    sets.push(`${field} = $${n++}`);
    vals.push(value);
  };
  if (input.title !== undefined) assign("title", input.title);
  if (input.slug !== undefined) assign("slug", input.slug);
  if (input.summary !== undefined) assign("summary", input.summary);
  if (input.body !== undefined) assign("body", input.body);
  if (input.status !== undefined) assign("status", input.status);
  if (input.published_at !== undefined) assign("published_at", input.published_at);
  if (input.valid_from !== undefined) assign("valid_from", input.valid_from);
  if (input.valid_until !== undefined) assign("valid_until", input.valid_until);
  if (input.priority !== undefined) assign("priority", input.priority);
  if (input.wa_blast_on_publish !== undefined) assign("wa_blast_on_publish", input.wa_blast_on_publish);
  if (input.wa_message !== undefined) assign("wa_message", input.wa_message);
  if (input.wa_recipient_phones !== undefined)
    assign("wa_recipient_phones", JSON.stringify(input.wa_recipient_phones));
  if (input.wa_blast_status !== undefined) assign("wa_blast_status", input.wa_blast_status);
  if (input.wa_blast_requested_at !== undefined) assign("wa_blast_requested_at", input.wa_blast_requested_at);
  if (input.wa_blast_sent_at !== undefined) assign("wa_blast_sent_at", input.wa_blast_sent_at);
  if (input.wa_blast_last_error !== undefined) assign("wa_blast_last_error", input.wa_blast_last_error);
  if (!sets.length) return true;
  assign("updated_at", new Date());
  vals.push(id);
  const r = await pool.query(`UPDATE announcements SET ${sets.join(", ")} WHERE id = $${n}`, vals);
  return (r.rowCount ?? 0) > 0;
}

export async function deleteAnnouncement(id: string): Promise<boolean> {
  const r = await pool.query(`DELETE FROM announcements WHERE id = $1`, [id]);
  return (r.rowCount ?? 0) > 0;
}

export function parseRecipientPhonesJson(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === "string").map((s) => s.trim()).filter(Boolean);
}
