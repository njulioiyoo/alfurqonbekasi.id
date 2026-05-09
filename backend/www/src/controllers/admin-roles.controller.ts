import type { Response } from "express";
import { DatabaseError } from "pg";
import { z } from "zod";
import type { AuthedRequest } from "../middleware/auth.middleware.js";
import {
  createRole,
  deleteRoleIfAllowed,
  getRoleDetailById,
  listAssignableRoleNames,
  listRolesPaginatedFiltered,
  replaceRolePermissions,
  updateRoleMetadata,
} from "../services/role.service.js";
import { parseMetronicDatatableBody, queryGeneralSearch } from "../utils/metronic-datatable.js";

const idParamSchema = z.object({
  id: z.string().uuid(),
});

const patchRoleBodySchema = z.object({
  displayName: z.string().trim().min(1).max(255).optional(),
  description: z.union([z.string().trim().max(2000), z.literal(""), z.null()]).optional(),
});

const putPermissionsBodySchema = z.object({
  names: z.array(z.string().trim().min(1).max(150)).default([]),
});

const postRoleBodySchema = z.object({
  name: z.string().trim().min(2).max(64),
  displayName: z.string().trim().min(1).max(255),
  description: z.union([z.string().trim().max(2000), z.literal(""), z.null()]).optional(),
});

export async function listRolesDatatable(req: AuthedRequest, res: Response): Promise<void> {
  const dt = parseMetronicDatatableBody(req.body);
  const search = queryGeneralSearch(dt.query);

  try {
    const result = await listRolesPaginatedFiltered({
      page: dt.page,
      limit: dt.perpage,
      search: search || undefined,
      sortField: dt.sortField,
      sortDir: dt.sortDir,
    });
    const pages = Math.max(Math.ceil(result.total / result.limit), 1);
    const data = result.items.map((r) => ({
      RecordID: r.id,
      name: r.name,
      displayName: r.display_name,
      description: r.description ?? "",
      userCount: r.user_count,
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

export async function listAssignableRoles(_req: AuthedRequest, res: Response): Promise<void> {
  try {
    const names = await listAssignableRoleNames();
    res.json({ ok: true, data: { names } });
  } catch (e) {
    console.error(e);
    res.status(500).json({
      ok: false,
      error: { code: "INTERNAL_ERROR", message: "Terjadi kesalahan server" },
    });
  }
}

export async function getRole(req: AuthedRequest, res: Response): Promise<void> {
  const parsed = idParamSchema.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({
      ok: false,
      error: { code: "VALIDATION_ERROR", message: "ID role tidak valid" },
    });
    return;
  }
  try {
    const row = await getRoleDetailById(parsed.data.id);
    if (!row) {
      res.status(404).json({
        ok: false,
        error: { code: "NOT_FOUND", message: "Role tidak ditemukan" },
      });
      return;
    }
    res.json({
      ok: true,
      data: {
        id: row.id,
        name: row.name,
        displayName: row.display_name,
        description: row.description,
        userCount: row.user_count,
        systemLocked: row.system_locked,
        assignableInCms: row.assignable_in_cms,
        permissions: row.permission_names,
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

export async function patchRole(req: AuthedRequest, res: Response): Promise<void> {
  const parsedParam = idParamSchema.safeParse(req.params);
  if (!parsedParam.success) {
    res.status(400).json({
      ok: false,
      error: { code: "VALIDATION_ERROR", message: "ID role tidak valid" },
    });
    return;
  }
  const parsedBody = patchRoleBodySchema.safeParse(req.body);
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
    const target = await getRoleDetailById(parsedParam.data.id);
    if (!target) {
      res.status(404).json({
        ok: false,
        error: { code: "NOT_FOUND", message: "Role tidak ditemukan" },
      });
      return;
    }
    const { displayName, description } = parsedBody.data;
    const payload: { display_name?: string; description?: string | null } = {};
    if (displayName !== undefined) payload.display_name = displayName;
    if (description !== undefined) {
      payload.description = description === "" || description === null ? null : description;
    }
    const updated = await updateRoleMetadata(parsedParam.data.id, payload);
    if (!updated) {
      res.status(404).json({
        ok: false,
        error: { code: "NOT_FOUND", message: "Role tidak ditemukan" },
      });
      return;
    }
    res.json({
      ok: true,
      data: {
        id: updated.id,
        name: updated.name,
        displayName: updated.display_name,
        description: updated.description,
        userCount: updated.user_count,
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

export async function putRolePermissions(req: AuthedRequest, res: Response): Promise<void> {
  const parsedParam = idParamSchema.safeParse(req.params);
  if (!parsedParam.success) {
    res.status(400).json({
      ok: false,
      error: { code: "VALIDATION_ERROR", message: "ID role tidak valid" },
    });
    return;
  }
  const parsedBody = putPermissionsBodySchema.safeParse(req.body);
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
    await replaceRolePermissions(parsedParam.data.id, parsedBody.data.names);
    const row = await getRoleDetailById(parsedParam.data.id);
    res.json({
      ok: true,
      data: {
        id: row?.id,
        permissions: row?.permission_names ?? [],
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "SUPERADMIN_REQUIRES_MANAGE_ALL") {
      res.status(400).json({
        ok: false,
        error: {
          code: "SUPERADMIN_REQUIRES_MANAGE_ALL",
          message: "Role superadmin wajib mempertahankan permission manage:all",
        },
      });
      return;
    }
    if (msg === "UNKNOWN_PERMISSION") {
      res.status(400).json({
        ok: false,
        error: {
          code: "UNKNOWN_PERMISSION",
          message: "Ada nama permission yang tidak terdaftar di database",
        },
      });
      return;
    }
    if (msg === "ROLE_NOT_FOUND") {
      res.status(404).json({
        ok: false,
        error: { code: "NOT_FOUND", message: "Role tidak ditemukan" },
      });
      return;
    }
    console.error(e);
    res.status(500).json({
      ok: false,
      error: { code: "INTERNAL_ERROR", message: "Terjadi kesalahan server" },
    });
  }
}

export async function postRole(req: AuthedRequest, res: Response): Promise<void> {
  const parsed = postRoleBodySchema.safeParse(req.body);
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
    const row = await createRole({
      name: parsed.data.name,
      display_name: parsed.data.displayName,
      description:
        parsed.data.description === "" || parsed.data.description === undefined
          ? null
          : parsed.data.description,
    });
    res.status(201).json({
      ok: true,
      data: {
        id: row.id,
        name: row.name,
        displayName: row.display_name,
        description: row.description,
        userCount: row.user_count,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "INVALID_ROLE_NAME") {
      res.status(400).json({
        ok: false,
        error: {
          code: "INVALID_ROLE_NAME",
          message: "Nama role hanya huruf kecil, angka, _ dan - (2–63 karakter, diawali huruf)",
        },
      });
      return;
    }
    if (e instanceof DatabaseError && e.code === "23505") {
      res.status(409).json({
        ok: false,
        error: { code: "DUPLICATE", message: "Nama role sudah dipakai" },
      });
      return;
    }
    console.error(e);
    res.status(500).json({
      ok: false,
      error: { code: "INTERNAL_ERROR", message: "Terjadi kesalahan server" },
    });
  }
}

export async function deleteRole(req: AuthedRequest, res: Response): Promise<void> {
  const parsed = idParamSchema.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({
      ok: false,
      error: { code: "VALIDATION_ERROR", message: "ID role tidak valid" },
    });
    return;
  }
  try {
    const result = await deleteRoleIfAllowed(parsed.data.id);
    if (result === "missing") {
      res.status(404).json({
        ok: false,
        error: { code: "NOT_FOUND", message: "Role tidak ditemukan" },
      });
      return;
    }
    if (result === "locked") {
      res.status(400).json({
        ok: false,
        error: { code: "LOCKED", message: "Role sistem tidak boleh dihapus" },
      });
      return;
    }
    if (result === "in_use") {
      res.status(400).json({
        ok: false,
        error: { code: "IN_USE", message: "Role masih dipakai pengguna" },
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
