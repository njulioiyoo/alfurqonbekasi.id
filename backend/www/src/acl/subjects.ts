/**
 * Resource CASL untuk CRUD & menu admin.
 * `(string & {})` memungkinkan subjek dari permission DB yang belum terdaftar di union (tanpa ubah kode).
 */
export type AppSubject =
  | "all"
  | "Dashboard"
  | "Article"
  | "Announcement"
  | "Donation"
  | "PrayerSchedule"
  | "ProgramSocial"
  | "ProgramTpq"
  | "ProgramQurbanZakat"
  | "Gallery"
  | "ContactMessage"
  | "User"
  | "Role"
  | "Permission"
  | "Setting"
  | "Menu"
  | (string & {});

export type AppActions = "manage" | "create" | "read" | "update" | "delete";
