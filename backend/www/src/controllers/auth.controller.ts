import type { Response } from "express";
import { z } from "zod";
import type { AuthedRequest } from "../middleware/auth.middleware.js";
import { findUserByEmail, findUserById } from "../services/user.service.js";
import { verifyPassword } from "../utils/password.js";
import { signAccessToken } from "../utils/jwt.js";
import { clearAuthCredentialsCookie, setAuthCredentialsCookie } from "../utils/auth-cookie.js";
import { visibleMenuItemsForAbility } from "../services/menu.service.js";

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export async function login(req: AuthedRequest, res: Response): Promise<void> {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Data tidak valid",
        details: parsed.error.flatten(),
      },
    });
    return;
  }
  const { email, password } = parsed.data;
  try {
    const user = await findUserByEmail(email);
    if (!user) {
      res.status(401).json({
        ok: false,
        error: { code: "INVALID_CREDENTIALS", message: "Email atau password salah" },
      });
      return;
    }
    const ok = await verifyPassword(password, user.password_hash);
    if (!ok) {
      res.status(401).json({
        ok: false,
        error: { code: "INVALID_CREDENTIALS", message: "Email atau password salah" },
      });
      return;
    }
    const accessToken = signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
    setAuthCredentialsCookie(res, accessToken);
    res.json({
      ok: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          role: user.role,
          createdAt: user.created_at,
        },
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({
      ok: false,
      error: { code: "INTERNAL_ERROR", message: "Terjadi kesalahan server" },
    });
  }
}

export async function logout(_req: AuthedRequest, res: Response): Promise<void> {
  clearAuthCredentialsCookie(res);
  res.json({ ok: true, data: { loggedOut: true } });
}

export async function me(req: AuthedRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({
      ok: false,
      error: { code: "UNAUTHORIZED", message: "Tidak terautentikasi" },
    });
    return;
  }
  try {
    const user = await findUserById(req.user.sub);
    if (!user) {
      res.status(404).json({
        ok: false,
        error: { code: "USER_NOT_FOUND", message: "User tidak ditemukan" },
      });
      return;
    }
    res.json({
      ok: true,
      data: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({
      ok: false,
      error: { code: "INTERNAL_ERROR", message: "Terjadi kesalahan server" },
    });
  }
}

/** Rules CASL + menu yang boleh ditampilkan (untuk shell admin / frontend). */
export async function accessContext(req: AuthedRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({
      ok: false,
      error: { code: "UNAUTHORIZED", message: "Tidak terautentikasi" },
    });
    return;
  }
  try {
    if (!req.ability) {
      res.status(500).json({
        ok: false,
        error: {
          code: "ABILITY_MISSING",
          message: "Gunakan attachAbility sebelum access-context",
        },
      });
      return;
    }
    const menu = await visibleMenuItemsForAbility(req.ability);
    res.json({
      ok: true,
      data: {
        role: req.user.role,
        rules: req.ability.rules,
        menu,
        flags: {
          canCreatePrayerSchedule:
            req.ability.can("create", "PrayerSchedule") || req.ability.can("manage", "all"),
          canUpdatePrayerSchedule:
            req.ability.can("update", "PrayerSchedule") || req.ability.can("manage", "all"),
          canDeletePrayerSchedule:
            req.ability.can("delete", "PrayerSchedule") || req.ability.can("manage", "all"),
          canCreateJamaahData: req.ability.can("create", "JamaahData") || req.ability.can("manage", "all"),
          canUpdateJamaahData: req.ability.can("update", "JamaahData") || req.ability.can("manage", "all"),
          canDeleteJamaahData: req.ability.can("delete", "JamaahData") || req.ability.can("manage", "all"),
          canCreateFinanceCash: req.ability.can("create", "FinanceCash") || req.ability.can("manage", "all"),
          canUpdateFinanceCash: req.ability.can("update", "FinanceCash") || req.ability.can("manage", "all"),
          canDeleteFinanceCash: req.ability.can("delete", "FinanceCash") || req.ability.can("manage", "all"),
          canReadGallery: req.ability.can("read", "Gallery") || req.ability.can("manage", "all"),
          canCreateGallery: req.ability.can("create", "Gallery") || req.ability.can("manage", "all"),
          canUpdateGallery: req.ability.can("update", "Gallery") || req.ability.can("manage", "all"),
          canDeleteGallery: req.ability.can("delete", "Gallery") || req.ability.can("manage", "all"),
          canReadContactMessage: req.ability.can("read", "ContactMessage") || req.ability.can("manage", "all"),
          canDeleteContactMessage: req.ability.can("delete", "ContactMessage") || req.ability.can("manage", "all"),
          canReadProgramSocial: req.ability.can("read", "ProgramSocial") || req.ability.can("manage", "all"),
          canCreateProgramSocial: req.ability.can("create", "ProgramSocial") || req.ability.can("manage", "all"),
          canUpdateProgramSocial: req.ability.can("update", "ProgramSocial") || req.ability.can("manage", "all"),
          canDeleteProgramSocial: req.ability.can("delete", "ProgramSocial") || req.ability.can("manage", "all"),
          canReadProgramTpq: req.ability.can("read", "ProgramTpq") || req.ability.can("manage", "all"),
          canCreateProgramTpq: req.ability.can("create", "ProgramTpq") || req.ability.can("manage", "all"),
          canUpdateProgramTpq: req.ability.can("update", "ProgramTpq") || req.ability.can("manage", "all"),
          canDeleteProgramTpq: req.ability.can("delete", "ProgramTpq") || req.ability.can("manage", "all"),
          canReadProgramQurbanZakat:
            req.ability.can("read", "ProgramQurbanZakat") || req.ability.can("manage", "all"),
          canCreateProgramQurbanZakat:
            req.ability.can("create", "ProgramQurbanZakat") || req.ability.can("manage", "all"),
          canUpdateProgramQurbanZakat:
            req.ability.can("update", "ProgramQurbanZakat") || req.ability.can("manage", "all"),
          canDeleteProgramQurbanZakat:
            req.ability.can("delete", "ProgramQurbanZakat") || req.ability.can("manage", "all"),
          canCreateAnnouncement: req.ability.can("create", "Announcement"),
          canUpdateAnnouncement: req.ability.can("update", "Announcement"),
          canDeleteAnnouncement: req.ability.can("delete", "Announcement"),
          canCreateUser: req.ability.can("create", "User"),
          canUpdateUser: req.ability.can("update", "User"),
          canDeleteUser: req.ability.can("delete", "User"),
          canCreateRole: req.ability.can("create", "Role"),
          canUpdateRole: req.ability.can("update", "Role"),
          canDeleteRole: req.ability.can("delete", "Role"),
          canCreatePermission: req.ability.can("create", "Permission"),
          canUpdatePermission: req.ability.can("update", "Permission"),
          canDeletePermission: req.ability.can("delete", "Permission"),
          canUpdateSetting: req.ability.can("update", "Setting"),
        },
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({
      ok: false,
      error: { code: "INTERNAL_ERROR", message: "Terjadi kesalahan server" },
    });
  }
}
