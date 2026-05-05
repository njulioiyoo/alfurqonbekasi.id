import { runMigrations } from "./db/migrate.js";
import { seedSuperAdmin } from "./db/seed.js";
import { pool } from "./db/pool.js";

async function main(): Promise<void> {
  await runMigrations();
  await seedSuperAdmin();
  await pool.end();
  console.log("Selesai: migration + seed (superadmin@alfurqonbekasi.id jika belum ada).");
}

main().catch(async (e) => {
  console.error(e);
  try {
    await pool.end();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
