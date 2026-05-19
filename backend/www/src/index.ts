import { config } from "./config.js";
import { runMigrations } from "./db/migrate.js";
import { seedSuperAdmin } from "./db/seed.js";
import { createApp } from "./app.js";
import { getRuntimeConfig } from "./services/runtime-config.service.js";

async function main(): Promise<void> {
  await runMigrations();
  await seedSuperAdmin();
  await getRuntimeConfig();
  const app = createApp();
  app.listen(config.port, () => {
    console.log(`API listening on port ${config.port} (${config.nodeEnv})`);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
