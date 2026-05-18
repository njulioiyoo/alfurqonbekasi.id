import { runMigrations } from "./db/migrate.js";
import { clearDemoContent, seedDemoContent } from "./db/seed-demo-content.js";
import { seedSuperAdmin } from "./db/seed.js";
import { pool } from "./db/pool.js";

async function main(): Promise<void> {
  await runMigrations();
  await seedSuperAdmin();
  await clearDemoContent();
  await seedDemoContent();
  await pool.end();
  console.log("Selesai: hapus data demo lama → seed ulang (event, prayer_staff, gallery).");
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
