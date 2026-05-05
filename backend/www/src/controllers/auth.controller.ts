import type { Response } from "express";
import { z } from "zod";
import type { AuthedRequest } from "../middleware/auth.middleware.js";
import { findUserByEmail, findUserById } from "../services/user.service.js";
import { verifyPassword } from "../utils/password.js";
import { signAccessToken } from "../utils/jwt.js";
import { defineAbilityFor } from "../acl/abilities.js";
import { visibleMenusForAbility } from "../acl/menu-definitions.js";

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
        accessToken,
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
    const ability = defineAbilityFor(req.user.role);
    const menu = visibleMenusForAbility(ability);
    res.json({
      ok: true,
      data: {
        role: req.user.role,
        rules: ability.rules,
        menu,
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
