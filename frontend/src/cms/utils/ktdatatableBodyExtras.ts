/**
 * Merge field tambahan ke body JSON KTDatatable (remote) per `readPath` API.
 * Dipakai mis. filter `contentType: event` tanpa mengubah URL endpoint.
 */
const extrasByReadPath = new Map<string, Record<string, unknown>>();

function normReadPath(p: string): string {
  const s = p.startsWith("/") ? p : `/${p}`;
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
  try {
    pathname = new URL(ajaxUrl, "http://localhost").pathname;
  } catch {
    /* relatif */
  }
  const p = pathname.replace(/\/+$/, "") || pathname;
  for (const [prefix, ex] of extrasByReadPath) {
    if (p === prefix || p.endsWith(prefix)) return ex;
  }
  return undefined;
}
