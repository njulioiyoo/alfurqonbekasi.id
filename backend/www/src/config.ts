import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
/** File pertama yang terbaca menang (dotenv tidak menimpa env yang sudah ada). Dev lokal: www/.env. */
for (const envPath of [
  path.resolve(process.cwd(), ".env"),
  path.resolve(process.cwd(), "../.env"),
  path.resolve(here, "../../.env"),
]) {
  dotenv.config({ path: envPath });
}

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env: ${name}`);
  return v;
}

const nodeEnv = process.env.NODE_ENV || "development";

export const config = {
  port: Number(process.env.PORT) || 3000,
  nodeEnv,
  databaseUrl: required("DATABASE_URL"),
  jwtSecret: required("JWT_SECRET"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  /** Cookie httpOnly `auth-credentials` — domain opsional (mis. `.alfurqonbekasi.id`). */
  authCookieDomain: process.env.AUTH_COOKIE_DOMAIN?.trim() || undefined,
  authCookieSecure:
    process.env.AUTH_COOKIE_SECURE === "true" ||
    (process.env.AUTH_COOKIE_SECURE !== "false" && nodeEnv === "production"),
  authCookieSameSite: (process.env.AUTH_COOKIE_SAMESITE?.trim().toLowerCase() || "lax") as
    | "strict"
    | "lax"
    | "none",
};
