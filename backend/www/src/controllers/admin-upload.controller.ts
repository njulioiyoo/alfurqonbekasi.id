import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import { extname, join } from "node:path";
import type { Response } from "express";
import multer from "multer";
import type { AuthedRequest } from "../middleware/auth.middleware.js";
import { uploadsRootDir } from "../utils/uploads-path.js";
import { validateBannerImageBuffer } from "../utils/banner-image.js";
import { validateEventCoverBuffer } from "../utils/event-cover-image.js";
import { validateGalleryImageBuffer } from "../utils/gallery-image.js";
import { validatePrayerStaffCoverBuffer } from "../utils/prayer-staff-cover-image.js";

const allowedMime = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "image/x-icon",
  "image/vnd.microsoft.icon",
]);

const allowedDocMime = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
]);

export const uploadImageMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 6 * 1024 * 1024 }, // banner 1920×990 can exceed 3MB
}).single("file");

export const uploadFileMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
}).single("file");

function normalizedExt(originalName: string, mime: string): string {
  const byMime: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "image/svg+xml": ".svg",
    "image/x-icon": ".ico",
    "image/vnd.microsoft.icon": ".ico",
  };
  const ext = byMime[mime] ?? extname(originalName).toLowerCase();
  return ext || ".bin";
}

function normalizedDocExt(originalName: string, mime: string): string {
  const byMime: Record<string, string> = {
    "application/pdf": ".pdf",
    "application/msword": ".doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
    "application/vnd.ms-excel": ".xls",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
    "application/vnd.ms-powerpoint": ".ppt",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": ".pptx",
    "text/plain": ".txt",
  };
  const ext = byMime[mime] ?? extname(originalName).toLowerCase();
  return ext || ".bin";
}

export async function postImage(req: AuthedRequest, res: Response): Promise<void> {
  const a = req.ability;
  if (
    !a ||
    (!a.can("manage", "all") &&
      !a.can("update", "Setting") &&
      !a.can("create", "Article") &&
      !a.can("update", "Article") &&
      !a.can("create", "PrayerSchedule") &&
      !a.can("update", "PrayerSchedule") &&
      !a.can("create", "Gallery") &&
      !a.can("update", "Gallery") &&
      !a.can("create", "Program") &&
      !a.can("update", "Program"))
  ) {
    res.status(403).json({
      ok: false,
      error: { code: "FORBIDDEN", message: "Anda tidak punya akses upload gambar konten" },
    });
    return;
  }
  const file = req.file;
  if (!file) {
    res.status(400).json({ ok: false, error: { code: "NO_FILE", message: "File tidak ditemukan" } });
    return;
  }
  if (!allowedMime.has(file.mimetype)) {
    res.status(400).json({ ok: false, error: { code: "INVALID_FILE_TYPE", message: "Format file tidak didukung" } });
    return;
  }
  const uploadContext = typeof req.body?.context === "string" ? req.body.context.trim() : "";
  if (uploadContext === "gallery") {
    const dimErr = validateGalleryImageBuffer(file.buffer, file.mimetype);
    if (dimErr) {
      res.status(400).json({ ok: false, error: { code: "INVALID_IMAGE_SIZE", message: dimErr } });
      return;
    }
  }
  if (uploadContext === "banner") {
    const dimErr = validateBannerImageBuffer(file.buffer, file.mimetype);
    if (dimErr) {
      res.status(400).json({ ok: false, error: { code: "INVALID_IMAGE_SIZE", message: dimErr } });
      return;
    }
  }
  if (uploadContext === "event_cover") {
    const dimErr = validateEventCoverBuffer(file.buffer, file.mimetype);
    if (dimErr) {
      res.status(400).json({ ok: false, error: { code: "INVALID_IMAGE_SIZE", message: dimErr } });
      return;
    }
  }
  if (uploadContext === "prayer_staff_cover") {
    const dimErr = validatePrayerStaffCoverBuffer(file.buffer, file.mimetype);
    if (dimErr) {
      res.status(400).json({ ok: false, error: { code: "INVALID_IMAGE_SIZE", message: dimErr } });
      return;
    }
  }
  try {
    const uploadDir = join(uploadsRootDir(), "content");
    await fs.mkdir(uploadDir, { recursive: true });
    const ext = normalizedExt(file.originalname, file.mimetype);
    const filename = `${Date.now()}-${randomUUID()}${ext}`;
    const abs = join(uploadDir, filename);
    await fs.writeFile(abs, file.buffer);
    const path = `/uploads/content/${filename}`;
    const url = `/api/uploads/content/${filename}`;
    res.status(201).json({ ok: true, data: { path, url } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: { code: "INTERNAL_ERROR", message: "Gagal menyimpan file" } });
  }
}

export async function postFile(req: AuthedRequest, res: Response): Promise<void> {
  const a = req.ability;
  if (
    !a ||
    (!a.can("manage", "all") &&
      !a.can("create", "Article") &&
      !a.can("update", "Article") &&
      !a.can("create", "PrayerSchedule") &&
      !a.can("update", "PrayerSchedule") &&
      !a.can("create", "Gallery") &&
      !a.can("update", "Gallery") &&
      !a.can("create", "Program") &&
      !a.can("update", "Program"))
  ) {
    res.status(403).json({
      ok: false,
      error: { code: "FORBIDDEN", message: "Anda tidak punya akses upload dokumen" },
    });
    return;
  }
  const file = req.file;
  if (!file) {
    res.status(400).json({ ok: false, error: { code: "NO_FILE", message: "File tidak ditemukan" } });
    return;
  }
  if (!allowedDocMime.has(file.mimetype)) {
    res.status(400).json({ ok: false, error: { code: "INVALID_FILE_TYPE", message: "Format dokumen tidak didukung" } });
    return;
  }
  try {
    const uploadDir = join(uploadsRootDir(), "documents");
    await fs.mkdir(uploadDir, { recursive: true });
    const ext = normalizedDocExt(file.originalname, file.mimetype);
    const filename = `${Date.now()}-${randomUUID()}${ext}`;
    const abs = join(uploadDir, filename);
    await fs.writeFile(abs, file.buffer);
    const path = `/uploads/documents/${filename}`;
    const url = `/api/uploads/documents/${filename}`;
    res.status(201).json({ ok: true, data: { path, url } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: { code: "INTERNAL_ERROR", message: "Gagal menyimpan dokumen" } });
  }
}
