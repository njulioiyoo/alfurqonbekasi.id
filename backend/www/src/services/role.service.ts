import { pool } from "../db/pool.js";

export type RoleListRow = {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  user_count: number;
};

export type RoleDetailRow = RoleListRow & {
  system_locked: boolean;
  assignable_in_cms: boolean;
  permission_names: string[];
};

const MAX_PAGE_SIZE = 100;

const ROLE_LIST_SORT: Record<string, string> = {
  name: "name",
  displayName: "display_name",
  description: "description",
  userCount: "user_count",
  RecordID: "id",
};

export async function listRolesPaginatedFiltered(params: {
  page: number;
  limit: number;
  search?: string;
  sortField?: string;
  sortDir?: "asc" | "desc";
}): Promise<{ items: RoleListRow[]; total: number; page: number; limit: number }> {
  const limit = Math.min(Math.max(params.limit, 1), MAX_PAGE_SIZE);
  const page = Math.max(params.page, 1);
  const offset = (page - 1) * limit;

  const search = params.search?.trim() || "";
  const hasSearch = search.length > 0;
  const sortCol = ROLE_LIST_SORT[params.sortField ?? ""] ?? "name";
  const sortDirSql = params.sortDir === "desc" ? "DESC" : "ASC";

  const whereSql = hasSearch
    ? `WHERE (
          name ILIKE '%' || $1::text || '%'
          OR display_name ILIKE '%' || $1::text || '%'
          OR COALESCE(description, '') ILIKE '%' || $1::text || '%'
        )`
    : "";

  const countParams: string[] = hasSearch ? [search] : [];
  const countR = await pool.query<{ total: string }>(
    `SELECT COUNT(*)::text AS total FROM (
       SELECT r.id,
              r.name,
              r.display_name,
              r.description,
              (SELECT COUNT(*)::int FROM users u WHERE u.role_id = r.id) AS user_count
       FROM roles r
     ) t ${whereSql}`,
    countParams
  );
  const total = Number(countR.rows[0]?.total ?? 0);

  const dataParams: (string | number)[] = hasSearch ? [search, limit, offset] : [limit, offset];
  const limitIdx = hasSearch ? 2 : 1;
  const offsetIdx = hasSearch ? 3 : 2;

  const r = await pool.query<RoleListRow>(
    `SELECT id, name, display_name, description, user_count
     FROM (
       SELECT r.id,
              r.name,
              r.display_name,
              r.description,
              (SELECT COUNT(*)::int FROM users u WHERE u.role_id = r.id) AS user_count
       FROM roles r
     ) t
     ${whereSql}
     ORDER BY ${sortCol} ${sortDirSql} NULLS LAST
     LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    dataParams
  );

  return { items: r.rows, total, page, limit };
}

export async function listAssignableRoleNames(): Promise<string[]> {
  const r = await pool.query<{ name: string }>(
    `SELECT name FROM roles WHERE assignable_in_cms = TRUE ORDER BY name`
  );
  return r.rows.map((row) => row.name);
}

export async function getRoleDetailById(roleId: string): Promise<RoleDetailRow | null> {
  const r = await pool.query<{
    id: string;
    name: string;
    display_name: string;
    description: string | null;
    user_count: number;
    system_locked: boolean;
    assignable_in_cms: boolean;
    permission_names: string[] | null;
  }>(
    `SELECT r.id,
            r.name,
            r.display_name,
            r.description,
            r.system_locked,
            r.assignable_in_cms,
            (SELECT COUNT(*)::int FROM users u WHERE u.role_id = r.id) AS user_count,
            COALESCE(array_agg(p.name ORDER BY p.name) FILTER (WHERE p.id IS NOT NULL), ARRAY[]::varchar[]) AS permission_names
     FROM roles r
     LEFT JOIN role_has_permissions rhp ON rhp.role_id = r.id
     LEFT JOIN permissions p ON p.id = rhp.permission_id
     WHERE r.id = $1
     GROUP BY r.id`,
    [roleId]
  );
  const row = r.rows[0];
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    display_name: row.display_name,
    description: row.description,
    user_count: row.user_count,
    system_locked: row.system_locked,
    assignable_in_cms: row.assignable_in_cms,
    permission_names: row.permission_names ?? [],
  };
}

export async function updateRoleMetadata(
  roleId: string,
  input: { display_name?: string; description?: string | null }
): Promise<RoleListRow | null> {
  const pieces: string[] = [];
  const vals: unknown[] = [];
  let n = 1;
  if (input.display_name !== undefined) {
    pieces.push(`display_name = $${n++}`);
    vals.push(input.display_name);
  }
  if (input.description !== undefined) {
    pieces.push(`description = $${n++}`);
    vals.push(input.description);
  }
  if (pieces.length === 0) {
    const d = await getRoleDetailById(roleId);
    if (!d) return null;
    return {
      id: d.id,
      name: d.name,
      display_name: d.display_name,
      description: d.description,
      user_count: d.user_count,
    };
  }
  pieces.push(`updated_at = NOW()`);
  vals.push(roleId);
  await pool.query(`UPDATE roles SET ${pieces.join(", ")} WHERE id = $${n}`, vals);
  const d = await getRoleDetailById(roleId);
  if (!d) return null;
  return {
    id: d.id,
    name: d.name,
    display_name: d.display_name,
    description: d.description,
    user_count: d.user_count,
  };
}

export async function replaceRolePermissions(roleId: string, permissionNames: string[]): Promise<void> {
  const uniq = [...new Set(permissionNames.map((x) => x.trim()).filter(Boolean))];
  const roleR = await pool.query<{ name: string }>(`SELECT name FROM roles WHERE id = $1`, [roleId]);
  const roleName = roleR.rows[0]?.name;
  if (!roleName) throw new Error("ROLE_NOT_FOUND");

  if (roleName === "superadmin" && !uniq.includes("manage:all")) {
    throw new Error("SUPERADMIN_REQUIRES_MANAGE_ALL");
  }

  const chk = await pool.query<{ c: string }>(
    `SELECT COUNT(*)::text AS c FROM permissions WHERE name = ANY($1::text[])`,
    [uniq]
  );
  const found = Number(chk.rows[0]?.c ?? 0);
  if (found !== uniq.length) {
    throw new Error("UNKNOWN_PERMISSION");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`DELETE FROM role_has_permissions WHERE role_id = $1`, [roleId]);
    if (uniq.length > 0) {
      await client.query(
        `INSERT INTO role_has_permissions (role_id, permission_id)
         SELECT $1::uuid, p.id FROM permissions p WHERE p.name = ANY($2::text[])`,
        [roleId, uniq]
      );
    }
    await client.query(`UPDATE roles SET updated_at = NOW() WHERE id = $1`, [roleId]);
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

const ROLE_NAME_RE = /^[a-z][a-z0-9_-]{1,62}$/;

export async function createRole(input: {
  name: string;
  display_name: string;
  description?: string | null;
}): Promise<RoleListRow> {
  const name = input.name.trim().toLowerCase();
  if (!ROLE_NAME_RE.test(name)) {
    throw new Error("INVALID_ROLE_NAME");
  }
  const r = await pool.query<RoleListRow>(
    `INSERT INTO roles AS r (name, display_name, description, guard_name, assignable_in_cms, system_locked)
     VALUES ($1, $2, $3, 'web', false, false)
     RETURNING r.id,
               r.name,
               r.display_name,
               r.description,
               (SELECT COUNT(*)::int FROM users u WHERE u.role_id = r.id) AS user_count`,
    [name, input.display_name.trim(), input.description ?? null]
  );
  const row = r.rows[0];
  if (!row) throw new Error("CREATE_ROLE_FAILED");
  return row;
}

export type DeleteRoleResult = "ok" | "missing" | "locked" | "in_use";

export async function deleteRoleIfAllowed(roleId: string): Promise<DeleteRoleResult> {
  const d = await getRoleDetailById(roleId);
  if (!d) return "missing";
  if (d.system_locked) return "locked";
  if (d.user_count > 0) return "in_use";
  const r = await pool.query(`DELETE FROM roles WHERE id = $1`, [roleId]);
  return (r.rowCount ?? 0) > 0 ? "ok" : "missing";
}
