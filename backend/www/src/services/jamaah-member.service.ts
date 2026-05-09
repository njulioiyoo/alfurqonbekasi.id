import { pool } from "../db/pool.js";

export type JamaahMemberRow = {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  gender: string | null;
  birth_date: Date | null;
  address: string | null;
  member_status: string;
  category: string;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
};

const MAX_PAGE_SIZE = 100;

const SORT_COLUMNS: Record<string, string> = {
  RecordID: "id",
  fullName: "full_name",
  phone: "phone",
  email: "email",
  status: "member_status",
  category: "category",
  createdAt: "created_at",
};

export async function listJamaahMembersPaginatedFiltered(params: {
  page: number;
  limit: number;
  search?: string;
  sortField?: string;
  sortDir?: "asc" | "desc";
}): Promise<{ items: JamaahMemberRow[]; total: number; page: number; limit: number }> {
  const limit = Math.min(Math.max(params.limit, 1), MAX_PAGE_SIZE);
  const page = Math.max(params.page, 1);
  const offset = (page - 1) * limit;
  const search = params.search?.trim() || "";
  const hasSearch = search.length > 0;
  const sortCol = SORT_COLUMNS[params.sortField ?? ""] ?? "created_at";
  const sortDirSql = params.sortDir === "asc" ? "ASC" : "DESC";
  const whereSql = hasSearch
    ? `WHERE (
         full_name ILIKE '%' || $1::text || '%'
         OR phone ILIKE '%' || $1::text || '%'
         OR COALESCE(email, '') ILIKE '%' || $1::text || '%'
         OR COALESCE(address, '') ILIKE '%' || $1::text || '%'
       )`
    : "";

  const countParams: unknown[] = hasSearch ? [search] : [];
  const countR = await pool.query<{ total: string }>(
    `SELECT COUNT(*)::text AS total FROM jamaah_members ${whereSql}`,
    countParams
  );
  const total = Number(countR.rows[0]?.total ?? 0);

  const dataParams: unknown[] = hasSearch ? [search, limit, offset] : [limit, offset];
  const limitIdx = hasSearch ? 2 : 1;
  const offsetIdx = hasSearch ? 3 : 2;

  const r = await pool.query<JamaahMemberRow>(
    `SELECT id, full_name, phone, email, gender, birth_date, address, member_status, category, notes, created_at, updated_at
     FROM jamaah_members
     ${whereSql}
     ORDER BY ${sortCol} ${sortDirSql} NULLS LAST, full_name ASC
     LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    dataParams
  );
  return { items: r.rows, total, page, limit };
}

export async function getJamaahMemberById(id: string): Promise<JamaahMemberRow | null> {
  const r = await pool.query<JamaahMemberRow>(
    `SELECT id, full_name, phone, email, gender, birth_date, address, member_status, category, notes, created_at, updated_at
     FROM jamaah_members
     WHERE id = $1`,
    [id]
  );
  return r.rows[0] ?? null;
}

export async function createJamaahMember(input: {
  full_name: string;
  phone: string;
  email?: string | null;
  gender?: string | null;
  birth_date?: Date | null;
  address?: string | null;
  member_status?: string;
  category?: string;
  notes?: string | null;
}): Promise<{ id: string }> {
  const r = await pool.query<{ id: string }>(
    `INSERT INTO jamaah_members
       (full_name, phone, email, gender, birth_date, address, member_status, category, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id`,
    [
      input.full_name,
      input.phone,
      input.email ?? null,
      input.gender ?? null,
      input.birth_date ?? null,
      input.address ?? null,
      input.member_status ?? "active",
      input.category ?? "general",
      input.notes ?? null,
    ]
  );
  return { id: r.rows[0].id };
}

export async function updateJamaahMember(
  id: string,
  patch: Partial<{
    full_name: string;
    phone: string;
    email: string | null;
    gender: string | null;
    birth_date: Date | null;
    address: string | null;
    member_status: string;
    category: string;
    notes: string | null;
  }>
): Promise<boolean> {
  const sets: string[] = [];
  const vals: unknown[] = [];
  let n = 1;
  const put = (col: string, val: unknown): void => {
    sets.push(`${col} = $${n++}`);
    vals.push(val);
  };
  if (patch.full_name !== undefined) put("full_name", patch.full_name);
  if (patch.phone !== undefined) put("phone", patch.phone);
  if (patch.email !== undefined) put("email", patch.email);
  if (patch.gender !== undefined) put("gender", patch.gender);
  if (patch.birth_date !== undefined) put("birth_date", patch.birth_date);
  if (patch.address !== undefined) put("address", patch.address);
  if (patch.member_status !== undefined) put("member_status", patch.member_status);
  if (patch.category !== undefined) put("category", patch.category);
  if (patch.notes !== undefined) put("notes", patch.notes);
  if (sets.length === 0) return true;
  sets.push("updated_at = NOW()");
  vals.push(id);
  const r = await pool.query(`UPDATE jamaah_members SET ${sets.join(", ")} WHERE id = $${n}`, vals);
  return (r.rowCount ?? 0) > 0;
}

export async function deleteJamaahMember(id: string): Promise<boolean> {
  const r = await pool.query(`DELETE FROM jamaah_members WHERE id = $1`, [id]);
  return (r.rowCount ?? 0) > 0;
}
