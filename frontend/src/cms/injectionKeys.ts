import type { InjectionKey, Ref } from "vue";

/** `true` setelah layout admin selesai memuat chain CSS/JS Metronic (jQuery + `KTDatatable`). */
export const ADMIN_SHELL_READY: InjectionKey<Ref<boolean>> = Symbol("adminShellReady");
