import { pool } from "../db/pool.js";

export type TpqStudentRow = {
  id: string;
  full_name: string;
  nickname: string | null;
  birth_date: Date | null;
  gender: string | null;
  class_level: string;
  parent_name: string | null;
  parent_phone: string | null;
  address: string | null;
  enrollment_year: number | null;
  student_status: string;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
};

const MAX_PAGE_SIZE = 100;

const SORT_COLUMNS: Record<string, string> = {
  RecordID: "id",
  fullName: "full_name",
  nickname: "nickname",
  classLevel: "class_level",
  parentPhone: "parent_phone",
  status: "student_status",
  enrollmentYear: "enrollment_year",
  createdAt: "created_at",
};

export async function listTpqStudentsPaginatedFiltered(params: {
  page: number;
  limit: number;
  search?: string;
  sortField?: string;
  sortDir?: "asc" | "desc";
}): Promise<{ items: TpqStudentRow[]; total: number; page: number; limit: number }> {
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
         OR COALESCE(nickname, '') ILIKE '%' || $1::text || '%'
         OR COALESCE(class_level, '') ILIKE '%' || $1::text || '%'
         OR COALESCE(parent_name, '') ILIKE '%' || $1::text || '%'
         OR COALESCE(parent_phone, '') ILIKE '%' || $1::text || '%'
         OR COALESCE(address, '') ILIKE '%' || $1::text || '%'
       )`
    : "";

  const countParams: unknown[] = hasSearch ? [search] : [];
  const countR = await pool.query<{ total: string }>(
    `SELECT COUNT(*)::text AS total FROM tpq_students ${whereSql}`,
    countParams
  );
  const total = Number(countR.rows[0]?.total ?? 0);

  const dataParams: unknown[] = hasSearch ? [search, limit, offset] : [limit, offset];
  const limitIdx = hasSearch ? 2 : 1;
  const offsetIdx = hasSearch ? 3 : 2;

  const r = await pool.query<TpqStudentRow>(
    `SELECT id, full_name, nickname, birth_date, gender, class_level, parent_name, parent_phone,
            address, enrollment_year, student_status, notes, created_at, updated_at
     FROM tpq_students
     ${whereSql}
     ORDER BY ${sortCol} ${sortDirSql} NULLS LAST, full_name ASC
     LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    dataParams
  );
  return { items: r.rows, total, page, limit };
}

export async function getTpqStudentById(id: string): Promise<TpqStudentRow | null> {
  const r = await pool.query<TpqStudentRow>(
    `SELECT id, full_name, nickname, birth_date, gender, class_level, parent_name, parent_phone,
            address, enrollment_year, student_status, notes, created_at, updated_at
     FROM tpq_students WHERE id = $1`,
    [id]
  );
  return r.rows[0] ?? null;
}

export async function createTpqStudent(input: {
  full_name: string;
  nickname?: string | null;
  birth_date?: Date | null;
  gender?: string | null;
  class_level?: string;
  parent_name?: string | null;
  parent_phone?: string | null;
  address?: string | null;
  enrollment_year?: number | null;
  student_status?: string;
  notes?: string | null;
}): Promise<{ id: string }> {
  const r = await pool.query<{ id: string }>(
    `INSERT INTO tpq_students
       (full_name, nickname, birth_date, gender, class_level, parent_name, parent_phone, address,
        enrollment_year, student_status, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING id`,
    [
      input.full_name,
      input.nickname ?? null,
      input.birth_date ?? null,
      input.gender ?? null,
      input.class_level ?? "",
      input.parent_name ?? null,
      input.parent_phone ?? null,
      input.address ?? null,
      input.enrollment_year ?? null,
      input.student_status ?? "active",
      input.notes ?? null,
    ]
  );
  return { id: r.rows[0].id };
}

export async function updateTpqStudent(
  id: string,
  patch: Partial<{
    full_name: string;
    nickname: string | null;
    birth_date: Date | null;
    gender: string | null;
    class_level: string;
    parent_name: string | null;
    parent_phone: string | null;
    address: string | null;
    enrollment_year: number | null;
    student_status: string;
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
  if (patch.nickname !== undefined) put("nickname", patch.nickname);
  if (patch.birth_date !== undefined) put("birth_date", patch.birth_date);
  if (patch.gender !== undefined) put("gender", patch.gender);
  if (patch.class_level !== undefined) put("class_level", patch.class_level);
  if (patch.parent_name !== undefined) put("parent_name", patch.parent_name);
  if (patch.parent_phone !== undefined) put("parent_phone", patch.parent_phone);
  if (patch.address !== undefined) put("address", patch.address);
  if (patch.enrollment_year !== undefined) put("enrollment_year", patch.enrollment_year);
  if (patch.student_status !== undefined) put("student_status", patch.student_status);
  if (patch.notes !== undefined) put("notes", patch.notes);
  if (sets.length === 0) return true;
  sets.push("updated_at = NOW()");
  vals.push(id);
  const r = await pool.query(`UPDATE tpq_students SET ${sets.join(", ")} WHERE id = $${n}`, vals);
  return (r.rowCount ?? 0) > 0;
}

export async function deleteTpqStudent(id: string): Promise<boolean> {
  const r = await pool.query(`DELETE FROM tpq_students WHERE id = $1`, [id]);
  return (r.rowCount ?? 0) > 0;
}
