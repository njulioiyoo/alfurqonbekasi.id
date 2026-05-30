/** Apakah rules CASL dari backend menyertakan `manage` + `all` (superadmin). */
export function rulesGrantManageAll(rules: unknown[]): boolean {
  for (const raw of rules) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as { action?: unknown; subject?: unknown };
    const actions = Array.isArray(r.action) ? r.action : r.action != null ? [r.action] : [];
    const subjects = Array.isArray(r.subject) ? r.subject : r.subject != null ? [r.subject] : [];
    if (actions.includes("manage") && subjects.includes("all")) return true;
  }
  return false;
}
