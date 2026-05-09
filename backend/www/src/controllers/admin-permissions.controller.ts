import type { Response } from "express";
import { z } from "zod";
import type { AuthedRequest } from "../middleware/auth.middleware.js";
import {
  createPermission,
  deletePermission,
  getPermissionById,
  isValidPermissionName,
  listPermissionCatalog,
  listPermissionsPaginatedFiltered,
  updatePermission,
} from "../services/permission.service.js";
import { parseMetronicDatatableBody, queryGeneralSearch } from "../utils/metronic-datatable.js";

const permNameSchema = z
  .string()
  .trim()
  .min(4)
  .max(150)
  .refine((s) => isValidPermissionName(s), { message: "Format nama tidak valid (contoh read:Article, manage:all)" });

const createPermSchema = z.object({
  name: permNameSchema,
  guardName: z.string().trim().min(1).max(50).optional(),
});

const patchPermSchema = z
  .object({
    name: permNameSchema.optional(),
    guardName: z.string().trim().min(1).max(50).optional(),
  })
  .refine((b) => b.name !== undefined || b.guardName !== undefined, {
    message: "Minimal satu field diisi",
  });

function permErr(e: unknown): { status: number; code: string; message: string } {
  const code = typeof e === "object" && e !== null && "code" in e ? String((e as { code: string }).code) : "";
  switch (code) {
    case "NOT_FOUND":
      return { status: 404, code: "NOT_FOUND", message: "Permission tidak ditemukan" };
    case "DUPLICATE":
      return { status: 409, code: "DUPLICATE", message: "Nama permission sudah dipakai" };
    case "INVALID_NAME":
      return { status: 400, code: "INVALID_NAME", message: "Format nama permission tidak valid" };
    case "SYSTEM_LOCKED":
      return { status: 403, code: "SYSTEM_LOCKED", message: "Permission sistem tidak boleh diubah atau dihapus" };
    default:
      return { status: 500, code: "INTERNAL_ERROR", message: "Terjadi kesalahan server" };
  }
}

export async function listPermissions(_req: AuthedRequest, res: Response): Promise<void> {
  try {
    const items = await listPermissionCatalog();
    res.json({ ok: true, data: { items } });
  } catch (e) {
    console.error(e);
    res.status(500).json({
      ok: false,
      error: { code: "INTERNAL_ERROR", message: "Terjadi kesalahan server" },
    });
  }
}

export async function listPermissionsDatatable(req: AuthedRequest, res: Response): Promise<void> {
  const dt = parseMetronicDatatableBody(req.body);
  const search = queryGeneralSearch(dt.query);

  try {
    const result = await listPermissionsPaginatedFiltered({
      page: dt.page,
      limit: dt.perpage,
      search: search || undefined,
      sortField: dt.sortField,
      sortDir: dt.sortDir,
    });
    const pages = Math.max(Math.ceil(result.total / result.limit), 1);
    const data = result.items.map((p) => ({
      RecordID: p.id,
      name: p.name,
      guardName: p.guard_name,
      roleCount: p.role_count,
      createdAt: p.created_at instanceof Date ? p.created_at.toISOString() : String(p.created_at),
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

export async function getPermission(req: AuthedRequest, res: Response): Promise<void> {
  const id = req.params.id;
  if (!id || typeof id !== "string") {
    res.status(400).json({ ok: false, error: { code: "VALIDATION_ERROR", message: "ID tidak valid" } });
    return;
  }
  try {
    const row = await getPermissionById(id);
    if (!row) {
      res.status(404).json({ ok: false, error: { code: "NOT_FOUND", message: "Permission tidak ditemukan" } });
      return;
    }
    res.json({
      ok: true,
      data: {
        id: row.id,
        name: row.name,
        guardName: row.guard_name,
        roleCount: row.role_count,
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

export async function postPermission(req: AuthedRequest, res: Response): Promise<void> {
  const parsed = createPermSchema.safeParse(req.body);
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
  try {
    const guardName = parsed.data.guardName?.trim() || "web";
    const { id } = await createPermission({
      name: parsed.data.name,
      guard_name: guardName,
    });
    res.status(201).json({
      ok: true,
      data: { id, name: parsed.data.name.trim(), guardName },
    });
  } catch (e) {
    const x = permErr(e);
    if (x.status === 500) console.error(e);
    res.status(x.status).json({ ok: false, error: { code: x.code, message: x.message } });
  }
}

export async function patchPermission(req: AuthedRequest, res: Response): Promise<void> {
  const id = req.params.id;
  if (!id || typeof id !== "string") {
    res.status(400).json({ ok: false, error: { code: "VALIDATION_ERROR", message: "ID tidak valid" } });
    return;
  }
  const parsed = patchPermSchema.safeParse(req.body);
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
  try {
    const updates: { name?: string; guard_name?: string } = {};
    if (parsed.data.name !== undefined) updates.name = parsed.data.name.trim();
    if (parsed.data.guardName !== undefined) updates.guard_name = parsed.data.guardName;
    await updatePermission(id, updates);
    res.json({ ok: true });
  } catch (e) {
    const x = permErr(e);
    if (x.status === 500) console.error(e);
    res.status(x.status).json({ ok: false, error: { code: x.code, message: x.message } });
  }
}

export async function deletePermissionHandler(req: AuthedRequest, res: Response): Promise<void> {
  const id = req.params.id;
  if (!id || typeof id !== "string") {
    res.status(400).json({ ok: false, error: { code: "VALIDATION_ERROR", message: "ID tidak valid" } });
    return;
  }
  try {
    await deletePermission(id);
    res.json({ ok: true });
  } catch (e) {
    const x = permErr(e);
    if (x.status === 500) console.error(e);
    res.status(x.status).json({ ok: false, error: { code: x.code, message: x.message } });
  }
}
