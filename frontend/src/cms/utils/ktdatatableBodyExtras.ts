/**
 * Merge field tambahan ke body JSON KTDatatable (remote) per `readPath` API.
 * Dipakai mis. filter `contentType: event` tanpa mengubah URL endpoint.
 */
const extrasByReadPath = new Map<string, Record<string, unknown>>();

function normReadPath(p: string): string {
  let s = p.startsWith("/") ? p : `/${p}`;
  const q = s.indexOf("?");
  if (q >= 0) s = s.slice(0, q);
  return s.replace(/\/+$/, "") || s;
}

export function registerKtdatatableBodyExtra(
  readPath: string,
  extra: Record<string, unknown>
): () => void {
  const key = normReadPath(readPath);
  extrasByReadPath.set(key, { ...extra });
  return () => {
    extrasByReadPath.delete(key);
  };
}

/** `ajaxUrl` dari jQuery bisa absolut atau relatif. */
export function getKtdatatableBodyExtraForAjaxUrl(ajaxUrl: string): Record<string, unknown> | undefined {
  let pathname = ajaxUrl.split("?")[0] ?? ajaxUrl;
  let search = "";
  try {
    const u = new URL(ajaxUrl, "http://localhost");
    pathname = u.pathname;
    search = u.search;
  } catch {
    const q = ajaxUrl.indexOf("?");
    if (q >= 0) search = ajaxUrl.slice(q);
  }
  const p = pathname.replace(/\/+$/, "") || pathname;
  for (const [prefix, ex] of extrasByReadPath) {
    if (p === prefix || p.endsWith(prefix)) return ex;
  }
  if (search) {
    const params = new URLSearchParams(search);
    const ct = params.get("contentType")?.trim();
    if (ct) return { contentType: ct };
  }
  return undefined;
}
