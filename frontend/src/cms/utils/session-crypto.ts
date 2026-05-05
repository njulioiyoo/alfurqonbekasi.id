/**
 * Enkripsi sesi di sessionStorage agar token/user tidak terlihat plaintext di DevTools.
 *
 * Penting: kunci ada di `VITE_SESSION_SECRET` (ter-bundle ke client). Ini mengaburkan
 * data dari orang yang sekadar membuka tab Application — bukan pengganti httpOnly cookie.
 */

const encoder = new TextEncoder();

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
  }
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function getSessionSecret(): string {
  const s = import.meta.env.VITE_SESSION_SECRET;
  if (typeof s === "string" && s.length >= 16) {
    return s;
  }
  if (import.meta.env.DEV) {
    console.warn(
      "[cms] Set `VITE_SESSION_SECRET` (≥16 karakter) di `.env`. Saat ini memakai fallback dev."
    );
    return "__alfurqon-dev-session-secret-min16__";
  }
  console.warn("[cms] `VITE_SESSION_SECRET` kurang atau kosong — sesi tetap dienkripsi dengan fallback lemah.");
  return "__alfurqon-prod-set-VITE_SESSION_SECRET__";
}

async function importAesKey(secret: string): Promise<CryptoKey> {
  const hash = await crypto.subtle.digest("SHA-256", encoder.encode(secret));
  return crypto.subtle.importKey("raw", hash, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function encryptAdminSessionPayload(plaintext: string): Promise<string> {
  const secret = getSessionSecret();
  const key = await importAesKey(secret);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoder.encode(plaintext));
  const ct = new Uint8Array(ciphertext);
  const combined = new Uint8Array(iv.length + ct.length);
  combined.set(iv);
  combined.set(ct, iv.length);
  return bytesToBase64(combined);
}

export async function decryptAdminSessionPayload(blob: string): Promise<string> {
  const secret = getSessionSecret();
  const combined = base64ToBytes(blob);
  if (combined.length < 13) {
    throw new Error("invalid blob");
  }
  const iv = combined.slice(0, 12);
  const data = combined.slice(12);
  const key = await importAesKey(secret);
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
  return new TextDecoder().decode(decrypted);
}
