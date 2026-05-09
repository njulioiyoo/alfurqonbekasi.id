import { pool } from "../db/pool.js";

export type ConfigEntry = { key: string; value: string };

export async function listConfigEntries(): Promise<ConfigEntry[]> {
  const r = await pool.query<ConfigEntry>(`SELECT key, value FROM app_config ORDER BY key`);
  return r.rows;
}

export async function upsertConfigEntries(entries: ConfigEntry[]): Promise<void> {
  if (!entries.length) return;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const e of entries) {
      await client.query(
        `INSERT INTO app_config (key, value) VALUES ($1, $2)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [e.key, e.value]
      );
    }
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}
