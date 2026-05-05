/** Path ke file di bawah `public/metronic/assets/` (Vite `base` = `/`). */
export function metronicAsset(path: string): string {
  const clean = path.replace(/^\/+/, "");
  return `/metronic/assets/${clean}`.replace(/([^:]\/)\/+/g, "$1");
}
