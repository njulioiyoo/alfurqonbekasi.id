import { pool } from "./pool.js";
import { hashPassword } from "../utils/password.js";

const SUPERADMIN_EMAIL = "superadmin@alfurqonbekasi.id";
const SUPERADMIN_PASSWORD = "password123";

/** Sekali jalan saat startup: buat superadmin jika belum ada (tidak mengubah user yang sudah ada). */
export async function seedSuperAdmin(): Promise<void> {
  const exists = await pool.query<{ id: string }>(
    `SELECT id FROM users WHERE lower(email) = lower($1) LIMIT 1`,
    [SUPERADMIN_EMAIL]
  );
  if (exists.rows.length > 0) return;

  const password_hash = await hashPassword(SUPERADMIN_PASSWORD);
  await pool.query(
    `INSERT INTO users (email, password_hash, full_name, role_id)
     SELECT $1, $2, $3, r.id FROM roles r WHERE r.name = 'superadmin' LIMIT 1`,
    [SUPERADMIN_EMAIL, password_hash, "Super Admin"]
  );
}
