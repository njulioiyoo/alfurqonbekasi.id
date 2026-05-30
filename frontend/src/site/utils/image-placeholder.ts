/** Placeholder SVG saat URL gambar kosong / gagal dimuat. */
export function imagePlaceholderDataUrl(title = "Gambar tidak tersedia"): string {
  const safe = title.replace(/[<>&"]/g, "");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400" viewBox="0 0 640 400">
  <rect width="100%" height="100%" fill="#eef1f6"/>
  <g fill="none" stroke="#9aa3b5" stroke-width="2">
    <rect x="200" y="88" width="240" height="180" rx="8"/>
    <circle cx="280" cy="158" r="22"/>
    <path d="M210 248 L310 168 L390 210 L430 248 Z"/>
  </g>
  <text x="320" y="318" text-anchor="middle" fill="#6b7280" font-family="Arial,sans-serif" font-size="15">${safe}</text>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function isLikelyImageUrl(url: string): boolean {
  const t = url.trim();
  if (!t) return false;
  if (t.startsWith("data:image/")) return true;
  if (t.startsWith("/") || t.startsWith("./")) return true;
  if (/^https?:\/\//i.test(t)) return true;
  return false;
}
