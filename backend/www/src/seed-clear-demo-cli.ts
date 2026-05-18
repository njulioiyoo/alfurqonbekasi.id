import { clearDemoContent } from "./db/seed-demo-content.js";
import { pool } from "./db/pool.js";

async function main(): Promise<void> {
  await clearDemoContent();
  await pool.end();
  console.log("Selesai: data demo (event, prayer_staff, gallery) dihapus.");
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
