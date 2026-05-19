import { runMigrations } from "./db/migrate.js";
import { seedSuperAdmin } from "./db/seed.js";
import { pool } from "./db/pool.js";

async function main(): Promise<void> {
  await runMigrations();
  await seedSuperAdmin();
  await pool.end();
  console.log(
    "Selesai: migration + akun superadmin (superadmin@alfurqonbekasi.id / password123 jika belum ada).\n" +
      "Data jadwal kajian, petugas ibadah, dan galeri TIDAK ikut migrate — jalankan: npm run seed:demo"
  );
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
