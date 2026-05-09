import type { Response } from "express";
import { z } from "zod";
import type { AuthedRequest } from "../middleware/auth.middleware.js";
import {
  createUser,
  deleteUserById,
  findUserByEmail,
  findUserById,
  listUsersPaginated,
  listUsersPaginatedFiltered,
  updateUserById,
} from "../services/user.service.js";
import { listAssignableRoleNames } from "../services/role.service.js";
import { parseMetronicDatatableBody, queryGeneralSearch } from "../utils/metronic-datatable.js";

const createUserBodySchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8, "Password minimal 8 karakter"),
  fullName: z.string().trim().min(1).max(255).optional(),
  role: z.string().trim().min(1).max(100),
});

const patchUserBodySchema = z.object({
  fullName: z.union([z.string().trim().max(255), z.literal(""), z.null()]).optional(),
  role: z.string().trim().min(1).max(100).optional(),
  password: z.union([z.string().min(8, "Password minimal 8 karakter"), z.literal("")]).optional(),
});

async function isAssignableCmsRole(roleName: string): Promise<boolean> {
  const allowed = await listAssignableRoleNames();
  return allowed.includes(roleName);
}

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

const idParamSchema = z.object({
  id: z.string().uuid(),
});

export async function createUserByAdmin(req: AuthedRequest, res: Response): Promise<void> {
  const parsed = createUserBodySchema.safeParse(req.body);
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
  const { email, password, fullName, role } = parsed.data;
  try {
    if (!(await isAssignableCmsRole(role))) {
      res.status(400).json({
        ok: false,
        error: {
          code: "INVALID_ROLE",
          message: "Role tidak diizinkan untuk akun CMS (cek kolom assignable_in_cms di tabel roles)",
        },
      });
      return;
    }
    const existing = await findUserByEmail(email);
    if (existing) {
      res.status(409).json({
        ok: false,
        error: { code: "EMAIL_TAKEN", message: "Email sudah terdaftar" },
      });
      return;
    }
    const user = await createUser({ email, password, fullName, role });
    res.status(201).json({
      ok: true,
      data: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        createdAt: user.created_at,
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

export async function listUsers(req: AuthedRequest, res: Response): Promise<void> {
  const parsed = listQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Query tidak valid",
        details: parsed.error.flatten(),
      },
    });
    return;
  }
  const { page, limit } = parsed.data;
  try {
    const result = await listUsersPaginated({ page, limit });
    res.json({
      ok: true,
      data: {
        items: result.items.map((u) => ({
          id: u.id,
          email: u.email,
          fullName: u.full_name,
          role: u.role,
          createdAt: u.created_at,
          updatedAt: u.updated_at,
        })),
        total: result.total,
        page: result.page,
        limit: result.limit,
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

export async function listUsersDatatable(req: AuthedRequest, res: Response): Promise<void> {
  const dt = parseMetronicDatatableBody(req.body);
  const search = queryGeneralSearch(dt.query);

  try {
    const result = await listUsersPaginatedFiltered({
      page: dt.page,
      limit: dt.perpage,
      search: search || undefined,
      sortField: dt.sortField,
      sortDir: dt.sortDir,
    });
    const pages = Math.max(Math.ceil(result.total / result.limit), 1);
    const data = result.items.map((u) => ({
      /** Nilai unik baris + checkbox KTDatatable (sama pola demo `data-local.js`). */
      RecordID: u.id,
      email: u.email,
      fullName: u.full_name ?? "",
      role: u.role,
      createdAt: u.created_at instanceof Date ? u.created_at.toISOString() : String(u.created_at),
    }));

    res.json({
      meta: {
        page: result.page,
        pages,
        perpage: result.limit,
        total: result.total,
      },
      data,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({
      ok: false,
      error: { code: "INTERNAL_ERROR", message: "Terjadi kesalahan server" },
    });
  }
}

function adminCannotTouchSuperadminRow(actorRole: string | undefined, targetRole: string): boolean {
  return targetRole === "superadmin" && actorRole !== "superadmin";
}

export async function patchUserByAdmin(req: AuthedRequest, res: Response): Promise<void> {
  const parsedParam = idParamSchema.safeParse(req.params);
  if (!parsedParam.success) {
    res.status(400).json({
      ok: false,
      error: { code: "VALIDATION_ERROR", message: "ID user tidak valid" },
    });
    return;
  }
  const parsedBody = patchUserBodySchema.safeParse(req.body);
  if (!parsedBody.success) {
    res.status(400).json({
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Data tidak valid",
        details: parsedBody.error.flatten(),
      },
    });
    return;
  }

  try {
    const target = await findUserById(parsedParam.data.id);
    if (!target) {
      res.status(404).json({
        ok: false,
        error: { code: "USER_NOT_FOUND", message: "User tidak ditemukan" },
      });
      return;
    }
    const actorRole = req.user?.role;
    if (adminCannotTouchSuperadminRow(actorRole, target.role)) {
      res.status(403).json({
        ok: false,
        error: { code: "FORBIDDEN", message: "Anda tidak dapat mengubah akun ini" },
      });
      return;
    }

    const { fullName, role, password } = parsedBody.data;
    if (role !== undefined && !(await isAssignableCmsRole(role))) {
      res.status(400).json({
        ok: false,
        error: {
          code: "INVALID_ROLE",
          message: "Role tidak diizinkan untuk akun CMS (cek assignable_in_cms di tabel roles)",
        },
      });
      return;
    }
    const payload: { fullName?: string | null; role?: string; password?: string } = {};
    if (fullName !== undefined) payload.fullName = fullName === "" || fullName === null ? null : fullName;
    if (role !== undefined) payload.role = role;
    if (password !== undefined && password !== "") payload.password = password;

    const updated = await updateUserById(parsedParam.data.id, payload);
    if (!updated) {
      res.status(404).json({
        ok: false,
        error: { code: "USER_NOT_FOUND", message: "User tidak ditemukan" },
      });
      return;
    }
    res.json({
      ok: true,
      data: {
        id: updated.id,
        email: updated.email,
        fullName: updated.full_name,
        role: updated.role,
        createdAt: updated.created_at,
        updatedAt: updated.updated_at,
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

export async function deleteUserByAdmin(req: AuthedRequest, res: Response): Promise<void> {
  const parsedParam = idParamSchema.safeParse(req.params);
  if (!parsedParam.success) {
    res.status(400).json({
      ok: false,
      error: { code: "VALIDATION_ERROR", message: "ID user tidak valid" },
    });
    return;
  }
  const id = parsedParam.data.id;

  try {
    const target = await findUserById(id);
    if (!target) {
      res.status(404).json({
        ok: false,
        error: { code: "USER_NOT_FOUND", message: "User tidak ditemukan" },
      });
      return;
    }
    if (req.user?.sub === id) {
      res.status(400).json({
        ok: false,
        error: { code: "SELF_DELETE", message: "Anda tidak dapat menghapus akun sendiri" },
      });
      return;
    }
    if (target.role === "superadmin") {
      res.status(403).json({
        ok: false,
        error: { code: "FORBIDDEN", message: "Akun super admin tidak dapat dihapus" },
      });
      return;
    }
    if (adminCannotTouchSuperadminRow(req.user?.role, target.role)) {
      res.status(403).json({
        ok: false,
        error: { code: "FORBIDDEN", message: "Anda tidak dapat menghapus akun ini" },
      });
      return;
    }

    const deleted = await deleteUserById(id);
    if (!deleted) {
      res.status(404).json({
        ok: false,
        error: { code: "USER_NOT_FOUND", message: "User tidak ditemukan" },
      });
      return;
    }
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({
      ok: false,
      error: { code: "INTERNAL_ERROR", message: "Terjadi kesalahan server" },
    });
  }
}

export async function getUserById(req: AuthedRequest, res: Response): Promise<void> {
  const parsed = idParamSchema.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({
      ok: false,
      error: { code: "VALIDATION_ERROR", message: "ID user tidak valid" },
    });
    return;
  }
  try {
    const user = await findUserById(parsed.data.id);
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
