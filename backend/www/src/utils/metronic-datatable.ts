/**
 * Parsing body POST KTDatatable (`application/x-www-form-urlencoded`) — dipakai beberapa controller admin.
 */
export function parseMetronicDatatableBody(body: unknown): {
  page: number;
  perpage: number;
  query: Record<string, unknown> | undefined;
  sortField?: string;
  sortDir?: "asc" | "desc";
  /** Filter isi kolom `content_items.type` (opsional, untuk submenu jadwal / tipe tetap). */
  contentType?: string;
  /** Filter entri qurban/zakat per kampanye (`qz_entries.campaign_id`). */
  campaignId?: string;
} {
  const b =
    body != null && typeof body === "object" && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : {};
  let page = 1;
  let perpage = 10;
  const p = b.pagination;
  if (p != null && typeof p === "object" && !Array.isArray(p)) {
    const po = p as Record<string, unknown>;
    page = Math.max(1, parseInt(String(po.page ?? "1"), 10) || 1);
    perpage = Math.min(100, Math.max(1, parseInt(String(po.perpage ?? "10"), 10) || 10));
  }
  let sortField: string | undefined;
  let sortDir: "asc" | "desc" | undefined;
  const s = b.sort;
  if (s != null && typeof s === "object" && !Array.isArray(s)) {
    const so = s as Record<string, unknown>;
    const f = so.field;
    if (f != null && String(f).trim() !== "") sortField = String(f).trim();
    const d = so.sort;
    if (d === "asc" || d === "desc") sortDir = d;
  }
  let query: Record<string, unknown> | undefined;
  const q = b.query;
  if (q != null && typeof q === "object" && !Array.isArray(q)) query = q as Record<string, unknown>;
  let contentType: string | undefined;
  const ct = b.contentType;
  if (typeof ct === "string" && ct.trim() !== "") contentType = ct.trim();
  let campaignId: string | undefined;
  const cid = b.campaignId;
  if (typeof cid === "string" && cid.trim() !== "") campaignId = cid.trim();
  return { page, perpage, query, sortField, sortDir, contentType, campaignId };
}

/**
 * Nilai pencarian umum dari `query` body KTDatatable.
 * Metronic memakai `name` input search sebagai key (`getGeneralSearchKey`); kita set `name="generalSearch"`.
 * Legacy: key sama dengan `id` input (berakhiran `_generalSearch`) — dukung itu sebelum string lain di `query`.
 */
export function queryGeneralSearch(query: Record<string, unknown> | undefined): string {
  if (!query) return "";
  const read = (v: unknown): string => {
    if (typeof v === "string") return v.trim();
    if (Array.isArray(v) && typeof v[0] === "string") return v[0].trim();
    return "";
  };

  const byName = read(query.generalSearch);
  if (byName) return byName;

  for (const [k, val] of Object.entries(query)) {
    if (k.endsWith("_generalSearch")) {
      const s = read(val);
      if (s) return s;
    }
  }

  for (const val of Object.values(query)) {
    const s = read(val);
    if (s) return s;
  }
  return "";
}
