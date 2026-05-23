/** SweetAlert2 global dari bundle Metronic (`swal.fire`, bukan `Swal`). */
type SwalFireResult = { value?: boolean; dismiss?: string };

type SwalGlobal = {
  fire: (
    options: Record<string, unknown> | string,
    text?: string,
    icon?: string
  ) => Promise<SwalFireResult>;
};

declare global {
  interface Window {
    swal?: SwalGlobal;
  }
}

function swal(): SwalGlobal | undefined {
  return typeof window !== "undefined" ? window.swal : undefined;
}

export function escapeHtmlForSwal(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function isCmsSwalReady(): boolean {
  return typeof swal()?.fire === "function";
}

/** Konfirmasi hapus — gaya Metronic demo (warning + tombol danger). */
export async function confirmDeleteDialog(opts: {
  title?: string;
  html: string;
  confirmText?: string;
  cancelText?: string;
}): Promise<boolean> {
  const s = swal();
  if (!s) return window.confirm(opts.html.replace(/<[^>]*>/g, ""));

  const result = await s.fire({
    title: opts.title ?? "Yakin hapus?",
    html: opts.html,
    type: "warning",
    showCancelButton: true,
    buttonsStyling: false,
    reverseButtons: true,
    confirmButtonText: opts.confirmText ?? "<i class='la la-trash'></i> Ya, hapus",
    confirmButtonClass: "btn btn-bold btn-sm btn-danger",
    cancelButtonText: opts.cancelText ?? "Batal",
    cancelButtonClass: "btn btn-bold btn-sm btn-default",
  });
  return Boolean(result.value);
}

export async function alertSuccessDialog(opts: {
  title?: string;
  text: string;
}): Promise<void> {
  const s = swal();
  if (!s) {
    window.alert(opts.text);
    return;
  }
  await s.fire({
    title: opts.title ?? "Berhasil",
    text: opts.text,
    type: "success",
    buttonsStyling: false,
    confirmButtonText: "OK",
    confirmButtonClass: "btn btn-bold btn-sm btn-brand",
  });
}

export async function alertErrorDialog(opts: {
  title?: string;
  text: string;
}): Promise<void> {
  const s = swal();
  if (!s) {
    window.alert(opts.text);
    return;
  }
  await s.fire({
    title: opts.title ?? "Gagal",
    text: opts.text,
    type: "error",
    buttonsStyling: false,
    confirmButtonText: "OK",
    confirmButtonClass: "btn btn-bold btn-sm btn-brand",
  });
}
