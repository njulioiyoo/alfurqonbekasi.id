import { listConfigEntries } from "./config.service.js";

export type RuntimeConfig = {
  cacheTtlSeconds: number;
  rateLimitPerMinute: number;
  maintenanceMode: boolean;
};

const DEFAULTS: RuntimeConfig = {
  cacheTtlSeconds: 300,
  rateLimitPerMinute: 120,
  maintenanceMode: false,
};

const CONFIG_RELOAD_MS = 15_000;

let cached: RuntimeConfig = { ...DEFAULTS };
let loadedAt = 0;
let loading: Promise<RuntimeConfig> | null = null;

function readBool(raw: string | undefined, fallback: boolean): boolean {
  if (raw === undefined) return fallback;
  const s = raw.trim().toLowerCase();
  if (s === "true" || s === "1" || s === "yes") return true;
  if (s === "false" || s === "0" || s === "no") return false;
  return fallback;
}

function readInt(raw: string | undefined, fallback: number, min: number, max: number): number {
  if (raw === undefined) return fallback;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function mapRows(rows: { key: string; value: string }[]): RuntimeConfig {
  const map = new Map(rows.map((r) => [r.key, r.value]));
  return {
    cacheTtlSeconds: readInt(map.get("cacheTtlSeconds"), DEFAULTS.cacheTtlSeconds, 0, 86_400),
    rateLimitPerMinute: readInt(map.get("rateLimitPerMinute"), DEFAULTS.rateLimitPerMinute, 1, 10_000),
    maintenanceMode: readBool(map.get("maintenanceMode"), DEFAULTS.maintenanceMode),
  };
}

async function loadFromDb(): Promise<RuntimeConfig> {
  const rows = await listConfigEntries();
  cached = mapRows(rows);
  loadedAt = Date.now();
  return cached;
}

/** Ambil konfigurasi runtime (cache TTL, rate limit, maintenance) dari `app_config`. */
export async function getRuntimeConfig(): Promise<RuntimeConfig> {
  const stale = Date.now() - loadedAt > CONFIG_RELOAD_MS;
  if (!stale && loadedAt > 0) return cached;
  if (loading) return loading;
  loading = loadFromDb().finally(() => {
    loading = null;
  });
  return loading;
}

/** Panggil setelah CMS menyimpan pengaturan agar perubahan langsung dipakai. */
export function invalidateRuntimeConfigCache(): void {
  loadedAt = 0;
}

export function getRuntimeConfigSync(): RuntimeConfig {
  return cached;
}
