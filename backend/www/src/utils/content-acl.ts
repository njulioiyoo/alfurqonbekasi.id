import type { AppAbility } from "../acl/abilities.js";
import type { AppActions, AppSubject } from "../acl/subjects.js";

/** Jadwal operasional (satu tabel `content_items`, beda izin dari artikel/konten umum). */
export function isScheduleContentType(type: string): boolean {
  return type === "event" || type === "prayer_staff";
}

/** Program sosial memakai `content_items.type = program` dengan izin `ProgramSocial`. */
export function isProgramSocialContentType(type: string): boolean {
  return type === "program";
}

export function contentManagementSubject(type: string): AppSubject {
  if (isScheduleContentType(type)) return "PrayerSchedule";
  if (isProgramSocialContentType(type)) return "ProgramSocial";
  return "Article";
}

export function canManageContentType(
  ability: AppAbility | undefined,
  action: AppActions,
  type: string
): boolean {
  if (!ability) return false;
  const subject = contentManagementSubject(type);
  return ability.can(action, subject) || ability.can("manage", "all");
}
