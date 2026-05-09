import { pool } from "../db/pool.js";
import { hashPassword } from "../utils/password.js";

export type UserRow = {
  id: string;
  email: string;
  password_hash: string;
  full_name: string | null;
  role: string;
  created_at: Date;
  updated_at: Date;
};

export async function findUserByEmail(email: string): Promise<UserRow | null> {
  const r = await pool.query<UserRow>(
    `SELECT u.id, u.email, u.password_hash, u.full_name, r.name AS role, u.created_at, u.updated_at
     FROM users u
     INNER JOIN roles r ON r.id = u.role_id
     WHERE lower(u.email) = lower($1) LIMIT 1`,
    [email]
  );
  return r.rows[0] ?? null;
}

export async function findUserById(id: string): Promise<Omit<UserRow, "password_hash"> | null> {
  const r = await pool.query<Omit<UserRow, "password_hash"> & { password_hash?: string }>(
    `SELECT u.id, u.email, u.full_name, r.name AS role, u.created_at, u.updated_at
     FROM users u
     INNER JOIN roles r ON r.id = u.role_id
     WHERE u.id = $1 LIMIT 1`,
    [id]
  );
  const row = r.rows[0];
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    full_name: row.full_name,
    role: row.role,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function createUser(input: {
  email: string;
  password: string;
  fullName?: string;
  role?: string;
}): Promise<Omit<UserRow, "password_hash">> {
  const password_hash = await hashPassword(input.password);
  const roleName = input.role ?? "user";
  const ins = await pool.query<{ id: string }>(
    `INSERT INTO users (email, password_hash, full_name, role_id)
     SELECT $1, $2, $3, r.id FROM roles r WHERE r.name = $4 LIMIT 1
     RETURNING id`,
    [input.email, password_hash, input.fullName ?? null, roleName]
  );
  const id = ins.rows[0]?.id;
  if (!id) throw new Error("Role tidak dikenal atau gagal membuat user");
  const user = await findUserById(id);
  if (!user) throw new Error("Gagal memuat user baru");
  return user;
}

export type UserListRow = {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  created_at: Date;
  updated_at: Date;
};

const MAX_PAGE_SIZE = 100;

const USER_LIST_SORT: Record<string, string> = {
  email: "u.email",
  fullName: "u.full_name",
  role: "r.name",
  createdAt: "u.created_at",
  RecordID: "u.created_at",
};

export async function listUsersPaginated(params: {
  page: number;
  limit: number;
}): Promise<{ items: UserListRow[]; total: number; page: number; limit: number }> {
  return listUsersPaginatedFiltered({
    page: params.page,
    limit: params.limit,
    search: undefined,
    sortField: undefined,
    sortDir: undefined,
  });
}

export async function listUsersPaginatedFiltered(params: {
  page: number;
  limit: number;
  search?: string;
  sortField?: string;
  sortDir?: "asc" | "desc";
}): Promise<{ items: UserListRow[]; total: number; page: number; limit: number }> {
  const limit = Math.min(Math.max(params.limit, 1), MAX_PAGE_SIZE);
  const page = Math.max(params.page, 1);
  const offset = (page - 1) * limit;

  const search = params.search?.trim() || "";
  const hasSearch = search.length > 0;
  const sortCol = USER_LIST_SORT[params.sortField ?? ""] ?? "u.created_at";
  const sortDirSql = params.sortDir === "asc" ? "ASC" : "DESC";

  const whereSql = hasSearch
    ? `WHERE (
          u.email ILIKE '%' || $1::text || '%'
          OR COALESCE(u.full_name, '') ILIKE '%' || $1::text || '%'
          OR r.name ILIKE '%' || $1::text || '%'
        )`
    : "";

  const countParams: string[] = hasSearch ? [search] : [];
  const countR = await pool.query<{ total: string }>(
    `SELECT COUNT(*)::text AS total
     FROM users u
     INNER JOIN roles r ON r.id = u.role_id
     ${whereSql}`,
    countParams
  );
  const total = Number(countR.rows[0]?.total ?? 0);

  const dataParams: (string | number)[] = hasSearch ? [search, limit, offset] : [limit, offset];
  const limitIdx = hasSearch ? 2 : 1;
  const offsetIdx = hasSearch ? 3 : 2;

  const r = await pool.query<UserListRow>(
    `SELECT u.id, u.email, u.full_name, r.name AS role, u.created_at, u.updated_at
     FROM users u
     INNER JOIN roles r ON r.id = u.role_id
     ${whereSql}
     ORDER BY ${sortCol} ${sortDirSql} NULLS LAST
     LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    dataParams
  );

  return { items: r.rows, total, page, limit };
}

export async function updateUserById(
  id: string,
  input: { fullName?: string | null; role?: string; password?: string }
): Promise<Omit<UserRow, "password_hash"> | null> {
  const pieces: string[] = [];
  const vals: unknown[] = [];
  let n = 1;
  if (input.fullName !== undefined) {
    pieces.push(`full_name = $${n++}`);
    vals.push(input.fullName);
  }
  if (input.role !== undefined) {
    pieces.push(`role_id = (SELECT id FROM roles WHERE name = $${n++} LIMIT 1)`);
    vals.push(input.role);
  }
  if (input.password !== undefined && input.password.length > 0) {
    pieces.push(`password_hash = $${n++}`);
    vals.push(await hashPassword(input.password));
  }
  if (pieces.length === 0) {
    return findUserById(id);
  }
  pieces.push(`updated_at = NOW()`);
  vals.push(id);
  const r = await pool.query<{ id: string }>(
    `UPDATE users SET ${pieces.join(", ")} WHERE id = $${n}
     RETURNING id`,
    vals
  );
  const updatedId = r.rows[0]?.id;
  if (!updatedId) return null;
  return findUserById(updatedId);
}

export async function deleteUserById(id: string): Promise<boolean> {
  const r = await pool.query(`DELETE FROM users WHERE id = $1`, [id]);
  return (r.rowCount ?? 0) > 0;
}
