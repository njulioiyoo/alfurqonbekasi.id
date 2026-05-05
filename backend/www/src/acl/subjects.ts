/** Resource CASL untuk CRUD & menu admin (diperluas seiring fitur). */
export type AppSubject =
  | "all"
  | "Dashboard"
  | "Article"
  | "Announcement"
  | "Donation"
  | "PrayerSchedule"
  | "Gallery"
  | "User"
  | "Role"
  | "Setting"
  | "Menu";

export type AppActions = "manage" | "create" | "read" | "update" | "delete";
