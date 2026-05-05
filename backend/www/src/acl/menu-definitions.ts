import type { AppAbility } from "./abilities.js";
import type { AppActions, AppSubject } from "./subjects.js";

export type MenuDefinition = {
  id: string;
  label: string;
  path: string;
  icon?: string;
  action: AppActions;
  subject: AppSubject;
};

/**
 * Blueprint menu admin — frontend bisa pakai yang sudah difilter dari `/auth/access-context`,
 * atau filter manual dari `rules` dengan CASL client (`@casl/ability`).
 */
export const MENU_DEFINITIONS: MenuDefinition[] = [
  { id: "dashboard", label: "Dashboard", path: "/admin", action: "read", subject: "Dashboard", icon: "layout-dashboard" },
  { id: "articles", label: "Artikel", path: "/admin/articles", action: "read", subject: "Article", icon: "newspaper" },
  { id: "announcements", label: "Pengumuman", path: "/admin/announcements", action: "read", subject: "Announcement", icon: "megaphone" },
  { id: "donations", label: "Donasi", path: "/admin/donations", action: "read", subject: "Donation", icon: "heart-handshake" },
  { id: "prayer-schedule", label: "Jadwal Sholat", path: "/admin/jadwal-sholat", action: "read", subject: "PrayerSchedule", icon: "clock" },
  { id: "gallery", label: "Galeri", path: "/admin/galeri", action: "read", subject: "Gallery", icon: "images" },
  { id: "users", label: "Pengguna", path: "/admin/users", action: "read", subject: "User", icon: "users" },
  { id: "roles", label: "Role", path: "/admin/roles", action: "read", subject: "Role", icon: "shield" },
  { id: "settings", label: "Pengaturan", path: "/admin/settings", action: "read", subject: "Setting", icon: "settings" },
];

export function visibleMenusForAbility(ability: AppAbility): MenuDefinition[] {
  return MENU_DEFINITIONS.filter((item) => ability.can(item.action, item.subject));
}
