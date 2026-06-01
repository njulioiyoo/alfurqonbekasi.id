/** URL absolut untuk pratinjau / Summernote (path relatif dari API upload). */
export function resolveCmsAssetUrl(url: string): string {
  const t = url.trim();
  if (!t) return t;
  if (/^https?:\/\//i.test(t) || t.startsWith("data:")) return t;
  if (t.startsWith("/")) return `${window.location.origin}${t}`;
  return t;
}
