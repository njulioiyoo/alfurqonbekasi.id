import { CMS_ACCESS_DENIED_TITLE } from "../constants/access-messages.js";

/** Toast Metronic (toastr) — dipakai setelah bundle admin ter-load. */

export function toastError(message: string, title = CMS_ACCESS_DENIED_TITLE): void {
  if (typeof window !== "undefined" && window.toastr) {
    window.toastr.clear();
    window.toastr.options = { closeButton: true, progressBar: true, timeOut: 3200 };
    window.toastr.error(message, title);
    return;
  }
  console.warn(`[CMS] ${title}:`, message);
}

declare global {
  interface Window {
    toastr?: {
      clear: () => void;
      options: Record<string, unknown>;
      error: (message: string, title?: string) => void;
    };
  }
}
