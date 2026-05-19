import type { CookieOptions, Request, Response } from "express";
import { config } from "../config.js";

/** Nama cookie httpOnly untuk JWT CMS (bukan localStorage). */
export const AUTH_CREDENTIALS_COOKIE = "auth-credentials";

function jwtExpiresToMs(expiresIn: string): number {
  const m = /^(\d+)\s*([dhms])$/i.exec(expiresIn.trim());
  if (!m) return 7 * 24 * 60 * 60 * 1000;
  const n = Number(m[1]);
  const unit = m[2].toLowerCase();
  const mult =
    unit === "d" ? 86_400_000 : unit === "h" ? 3_600_000 : unit === "m" ? 60_000 : 1_000;
  return n * mult;
}

function baseCookieOptions(): CookieOptions {
  const opts: CookieOptions = {
    httpOnly: true,
    secure: config.authCookieSecure,
    sameSite: config.authCookieSameSite,
    path: "/",
    maxAge: jwtExpiresToMs(config.jwtExpiresIn),
  };
  if (config.authCookieDomain) {
    opts.domain = config.authCookieDomain;
  }
  return opts;
}

export function setAuthCredentialsCookie(res: Response, accessToken: string): void {
  res.cookie(AUTH_CREDENTIALS_COOKIE, accessToken, baseCookieOptions());
}

export function clearAuthCredentialsCookie(res: Response): void {
  const opts: CookieOptions = {
    httpOnly: true,
    secure: config.authCookieSecure,
    sameSite: config.authCookieSameSite,
    path: "/",
  };
  if (config.authCookieDomain) {
    opts.domain = config.authCookieDomain;
  }
  res.clearCookie(AUTH_CREDENTIALS_COOKIE, opts);
}

/** Token dari cookie httpOnly (utama) atau header Bearer (Postman / tooling). */
export function readAccessToken(req: Request): string | null {
  const fromCookie = req.cookies?.[AUTH_CREDENTIALS_COOKIE];
  if (typeof fromCookie === "string" && fromCookie.trim()) {
    return fromCookie.trim();
  }
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    const t = header.slice("Bearer ".length).trim();
    return t || null;
  }
  return null;
}
