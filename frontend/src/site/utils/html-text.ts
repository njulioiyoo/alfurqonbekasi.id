/** Ringkasan/konten dari Summernote CMS → teks biasa untuk kartu publik. */
export function plainTextFromHtml(html: string): string {
  if (!html?.trim()) return "";
  const decoded = html
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
  return decoded.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}
