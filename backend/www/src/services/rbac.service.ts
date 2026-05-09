import { pool } from "../db/pool.js";

export async function getPermissionNamesForRoleName(roleName: string): Promise<string[]> {
  const r = await pool.query<{ name: string }>(
    `SELECT p.name
     FROM roles r
     INNER JOIN role_has_permissions rhp ON rhp.role_id = r.id
     INNER JOIN permissions p ON p.id = rhp.permission_id
     WHERE r.name = $1
     ORDER BY p.name`,
    [roleName]
  );
  return r.rows.map((row) => row.name);
}
