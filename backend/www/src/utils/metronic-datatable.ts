/**
 * Parsing body POST KTDatatable (`application/x-www-form-urlencoded`) — dipakai beberapa controller admin.
 */
export function parseMetronicDatatableBody(body: unknown): {
  page: number;
  perpage: number;
  query: Record<string, unknown> | undefined;
  sortField?: string;
  sortDir?: "asc" | "desc";
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
  return { page, perpage, query, sortField, sortDir };
}

export function queryGeneralSearch(query: Record<string, unknown> | undefined): string {
  if (!query) return "";
  const v = query.generalSearch;
  if (typeof v === "string") return v.trim();
  if (Array.isArray(v) && typeof v[0] === "string") return v[0].trim();
  return "";
}
