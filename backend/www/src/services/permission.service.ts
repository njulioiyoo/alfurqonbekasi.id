import type { PoolClient } from "pg";
import { pool } from "../db/pool.js";

/** Selaras CASL DB: `aksi:Subjek` atau `manage:all`. */
export const PERMISSION_NAME_PATTERN = /^(manage:all|[a-z]+:[a-zA-Z][a-zA-Z0-9._-]*)$/;

export function isValidPermissionName(name: string): boolean {
  const n = name.trim();
  return n.length >= 4 && n.length <= 150 && PERMISSION_NAME_PATTERN.test(n);
}

export async function listPermissionCatalog(): Promise<{ id: string; name: string; guard_name: string }[]> {
  const r = await pool.query<{ id: string; name: string; guard_name: string }>(
    `SELECT id, name, guard_name FROM permissions ORDER BY name`
  );
  return r.rows;
}

export type PermissionListRow = {
  id: string;
  name: string;
  guard_name: string;
  role_count: number;
  created_at: Date;
};

const MAX_PAGE_SIZE = 100;

const PERM_LIST_SORT: Record<string, string> = {
  name: "name",
  guardName: "guard_name",
  roleCount: "role_count",
  RecordID: "name",
};

export async function listPermissionsPaginatedFiltered(params: {
  page: number;
  limit: number;
  search?: string;
  sortField?: string;
  sortDir?: "asc" | "desc";
}): Promise<{ items: PermissionListRow[]; total: number; page: number; limit: number }> {
  const limit = Math.min(Math.max(params.limit, 1), MAX_PAGE_SIZE);
  const page = Math.max(params.page, 1);
  const offset = (page - 1) * limit;

  const search = params.search?.trim() || "";
  const hasSearch = search.length > 0;
  const sortCol = PERM_LIST_SORT[params.sortField ?? ""] ?? "name";
  const sortDirSql = params.sortDir === "desc" ? "DESC" : "ASC";

  const whereSql = hasSearch
    ? `WHERE (
          name ILIKE '%' || $1::text || '%'
          OR guard_name ILIKE '%' || $1::text || '%'
        )`
    : "";

  const countParams: string[] = hasSearch ? [search] : [];
  const countR = await pool.query<{ total: string }>(
    `SELECT COUNT(*)::text AS total FROM (
       SELECT p.name,
              p.guard_name,
              (SELECT COUNT(*)::int FROM role_has_permissions rhp WHERE rhp.permission_id = p.id) AS role_count
       FROM permissions p
     ) t ${whereSql}`,
    countParams
  );
  const total = Math.max(0, Number(countR.rows[0]?.total ?? 0) || 0);

  const dataParams: (string | number)[] = hasSearch ? [search, limit, offset] : [limit, offset];
  const limitIdx = hasSearch ? 2 : 1;
  const offsetIdx = hasSearch ? 3 : 2;

  const r = await pool.query<PermissionListRow>(
    `SELECT id, name, guard_name, role_count, created_at
     FROM (
       SELECT p.id,
              p.name,
              p.guard_name,
              p.created_at,
              (SELECT COUNT(*)::int FROM role_has_permissions rhp WHERE rhp.permission_id = p.id) AS role_count
       FROM permissions p
     ) t
     ${whereSql}
     ORDER BY ${sortCol} ${sortDirSql} NULLS LAST
     LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    dataParams
  );

  return { items: r.rows, total, page, limit };
}

export type PermissionDetailRow = {
  id: string;
  name: string;
  guard_name: string;
  role_count: number;
};

export async function getPermissionById(id: string): Promise<PermissionDetailRow | null> {
  const r = await pool.query<PermissionDetailRow>(
    `SELECT p.id,
            p.name,
            p.guard_name,
            (SELECT COUNT(*)::int FROM role_has_permissions rhp WHERE rhp.permission_id = p.id) AS role_count
     FROM permissions p
     WHERE p.id = $1`,
    [id]
  );
  return r.rows[0] ?? null;
}

async function ensurePermissionMutable(client: PoolClient, id: string): Promise<{ name: string }> {
  const r = await client.query<{ name: string }>(`SELECT name FROM permissions WHERE id = $1`, [id]);
  const row = r.rows[0];
  if (!row) throw Object.assign(new Error("NOT_FOUND"), { code: "NOT_FOUND" as const });
  if (row.name === "manage:all") throw Object.assign(new Error("SYSTEM_LOCKED"), { code: "SYSTEM_LOCKED" as const });
  return row;
}

export async function createPermission(params: {
  name: string;
  guard_name: string;
}): Promise<{ id: string }> {
  const name = params.name.trim();
  const guard_name = params.guard_name.trim() || "web";
  if (!isValidPermissionName(name)) {
    throw Object.assign(new Error("INVALID_NAME"), { code: "INVALID_NAME" as const });
  }
  try {
    const r = await pool.query<{ id: string }>(
      `INSERT INTO permissions (name, guard_name) VALUES ($1, $2) RETURNING id`,
      [name, guard_name]
    );
    const id = r.rows[0]?.id;
    if (!id) throw new Error("INSERT_FAILED");
    return { id };
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err.code === "23505") throw Object.assign(new Error("DUPLICATE"), { code: "DUPLICATE" as const });
    throw e;
  }
}

export async function updatePermission(
  id: string,
  updates: { name?: string; guard_name?: string }
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await ensurePermissionMutable(client, id);

    const pieces: string[] = [];
    const vals: unknown[] = [];
    let n = 1;
    if (updates.name !== undefined) {
      const name = updates.name.trim();
      if (!isValidPermissionName(name)) {
        throw Object.assign(new Error("INVALID_NAME"), { code: "INVALID_NAME" as const });
      }
      pieces.push(`name = $${n++}`);
      vals.push(name);
    }
    if (updates.guard_name !== undefined) {
      const g = updates.guard_name.trim() || "web";
      pieces.push(`guard_name = $${n++}`);
      vals.push(g);
    }
    if (pieces.length === 0) {
      await client.query("ROLLBACK");
      return;
    }
    pieces.push(`updated_at = NOW()`);
    vals.push(id);
    const sql = `UPDATE permissions SET ${pieces.join(", ")} WHERE id = $${n}`;
    try {
      const r = await client.query(sql, vals);
      if (r.rowCount === 0) throw Object.assign(new Error("NOT_FOUND"), { code: "NOT_FOUND" as const });
    } catch (e: unknown) {
      const err = e as { code?: string };
      if (err.code === "23505") throw Object.assign(new Error("DUPLICATE"), { code: "DUPLICATE" as const });
      throw e;
    }
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

export async function deletePermission(id: string): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await ensurePermissionMutable(client, id);
    const r = await client.query(`DELETE FROM permissions WHERE id = $1`, [id]);
    if (r.rowCount === 0) throw Object.assign(new Error("NOT_FOUND"), { code: "NOT_FOUND" as const });
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}
