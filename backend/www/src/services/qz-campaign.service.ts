import { pool } from "../db/pool.js";

export type QzCampaignRow = {
  id: string;
  title: string;
  season_tag: string;
  hijri_year: number | null;
  date_start: Date | null;
  date_end: Date | null;
  status: string;
  description: string | null;
  created_at: Date;
  updated_at: Date;
};

const MAX_PAGE_SIZE = 100;

const SORT: Record<string, string> = {
  RecordID: "id",
  title: "title",
  seasonTag: "season_tag",
  hijriYear: "hijri_year",
  dateStart: "date_start",
  status: "status",
  createdAt: "created_at",
};

export async function listQzCampaignsBrief(): Promise<Array<{ id: string; title: string; status: string }>> {
  const r = await pool.query<{ id: string; title: string; status: string }>(
    `SELECT id, title, status FROM qz_campaigns ORDER BY date_start DESC NULLS LAST, created_at DESC LIMIT 200`
  );
  return r.rows;
}

export async function listQzCampaignsPaginatedFiltered(params: {
  page: number;
  limit: number;
  search?: string;
  sortField?: string;
  sortDir?: "asc" | "desc";
}): Promise<{ items: QzCampaignRow[]; total: number; page: number; limit: number }> {
  const limit = Math.min(Math.max(params.limit, 1), MAX_PAGE_SIZE);
  const page = Math.max(params.page, 1);
  const offset = (page - 1) * limit;
  const search = params.search?.trim() || "";
  const hasSearch = search.length > 0;
  const sortCol = SORT[params.sortField ?? ""] ?? "created_at";
  const sortDirSql = params.sortDir === "asc" ? "ASC" : "DESC";
  const whereSql = hasSearch
    ? `WHERE (
         title ILIKE '%' || $1::text || '%'
         OR season_tag ILIKE '%' || $1::text || '%'
         OR COALESCE(description, '') ILIKE '%' || $1::text || '%'
       )`
    : "";

  const countParams: unknown[] = hasSearch ? [search] : [];
  const countR = await pool.query<{ total: string }>(
    `SELECT COUNT(*)::text AS total FROM qz_campaigns ${whereSql}`,
    countParams
  );
  const total = Number(countR.rows[0]?.total ?? 0);

  const dataParams: unknown[] = hasSearch ? [search, limit, offset] : [limit, offset];
  const limitIdx = hasSearch ? 2 : 1;
  const offsetIdx = hasSearch ? 3 : 2;

  const r = await pool.query<QzCampaignRow>(
    `SELECT id, title, season_tag, hijri_year, date_start, date_end, status, description, created_at, updated_at
     FROM qz_campaigns ${whereSql}
     ORDER BY ${sortCol} ${sortDirSql} NULLS LAST, title ASC
     LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    dataParams
  );
  return { items: r.rows, total, page, limit };
}

export async function getQzCampaignById(id: string): Promise<QzCampaignRow | null> {
  const r = await pool.query<QzCampaignRow>(
    `SELECT id, title, season_tag, hijri_year, date_start, date_end, status, description, created_at, updated_at
     FROM qz_campaigns WHERE id = $1`,
    [id]
  );
  return r.rows[0] ?? null;
}

export async function createQzCampaign(input: {
  title: string;
  season_tag?: string;
  hijri_year?: number | null;
  date_start?: Date | null;
  date_end?: Date | null;
  status?: string;
  description?: string | null;
}): Promise<{ id: string }> {
  const r = await pool.query<{ id: string }>(
    `INSERT INTO qz_campaigns (title, season_tag, hijri_year, date_start, date_end, status, description)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
    [
      input.title,
      input.season_tag ?? "general",
      input.hijri_year ?? null,
      input.date_start ?? null,
      input.date_end ?? null,
      input.status ?? "draft",
      input.description ?? null,
    ]
  );
  return { id: r.rows[0].id };
}

export async function updateQzCampaign(
  id: string,
  patch: Partial<{
    title: string;
    season_tag: string;
    hijri_year: number | null;
    date_start: Date | null;
    date_end: Date | null;
    status: string;
    description: string | null;
  }>
): Promise<boolean> {
  const sets: string[] = [];
  const vals: unknown[] = [];
  let n = 1;
  const put = (col: string, val: unknown): void => {
    sets.push(`${col} = $${n++}`);
    vals.push(val);
  };
  if (patch.title !== undefined) put("title", patch.title);
  if (patch.season_tag !== undefined) put("season_tag", patch.season_tag);
  if (patch.hijri_year !== undefined) put("hijri_year", patch.hijri_year);
  if (patch.date_start !== undefined) put("date_start", patch.date_start);
  if (patch.date_end !== undefined) put("date_end", patch.date_end);
  if (patch.status !== undefined) put("status", patch.status);
  if (patch.description !== undefined) put("description", patch.description);
  if (sets.length === 0) return true;
  sets.push("updated_at = NOW()");
  vals.push(id);
  const r = await pool.query(`UPDATE qz_campaigns SET ${sets.join(", ")} WHERE id = $${n}`, vals);
  return (r.rowCount ?? 0) > 0;
}

export async function deleteQzCampaign(id: string): Promise<boolean> {
  const r = await pool.query(`DELETE FROM qz_campaigns WHERE id = $1`, [id]);
  return (r.rowCount ?? 0) > 0;
}
