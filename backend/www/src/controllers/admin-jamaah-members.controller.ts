import type { Response } from "express";
import { z } from "zod";
import type { AuthedRequest } from "../middleware/auth.middleware.js";
import {
  createJamaahMember,
  deleteJamaahMember,
  getJamaahMemberById,
  listJamaahMembersPaginatedFiltered,
  updateJamaahMember,
} from "../services/jamaah-member.service.js";
import { parseMetronicDatatableBody, queryGeneralSearch } from "../utils/metronic-datatable.js";

const idParamSchema = z.object({ id: z.string().uuid() });
const statusSchema = z.enum(["active", "inactive"]);
const categorySchema = z.enum(["general", "management", "donor"]);
const genderSchema = z.enum(["male", "female"]);
const yyyyMmDdSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const createBodySchema = z.object({
  fullName: z.string().trim().min(2).max(255),
  phone: z.string().trim().min(6).max(40),
  email: z.union([z.string().trim().email(), z.literal(""), z.null()]).optional(),
  gender: z.union([genderSchema, z.literal(""), z.null()]).optional(),
  birthDate: z.union([yyyyMmDdSchema, z.literal(""), z.null()]).optional(),
  address: z.union([z.string().trim().max(5000), z.literal(""), z.null()]).optional(),
  status: statusSchema.default("active"),
  category: categorySchema.default("general"),
  notes: z.union([z.string().trim().max(10000), z.literal(""), z.null()]).optional(),
});

const patchBodySchema = z
  .object({
    fullName: z.string().trim().min(2).max(255).optional(),
    phone: z.string().trim().min(6).max(40).optional(),
    email: z.union([z.string().trim().email(), z.literal(""), z.null()]).optional(),
    gender: z.union([genderSchema, z.literal(""), z.null()]).optional(),
    birthDate: z.union([yyyyMmDdSchema, z.literal(""), z.null()]).optional(),
    address: z.union([z.string().trim().max(5000), z.literal(""), z.null()]).optional(),
    status: statusSchema.optional(),
    category: categorySchema.optional(),
    notes: z.union([z.string().trim().max(10000), z.literal(""), z.null()]).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "Minimal satu field diisi" });

function mapNullable(v: string | null | undefined): string | null | undefined {
  if (v === undefined) return undefined;
  if (v === null) return null;
  const s = v.trim();
  return s === "" ? null : s;
}

export async function listJamaahMembersDatatable(req: AuthedRequest, res: Response): Promise<void> {
  const dt = parseMetronicDatatableBody(req.body);
  const search = queryGeneralSearch(dt.query);
  try {
    const result = await listJamaahMembersPaginatedFiltered({
      page: dt.page,
      limit: dt.perpage,
      search: search || undefined,
      sortField: dt.sortField,
      sortDir: dt.sortDir,
    });
    const pages = Math.max(Math.ceil(result.total / result.limit), 1);
    res.json({
      meta: { page: result.page, pages, perpage: result.limit, total: result.total },
      data: result.items.map((x) => ({
        RecordID: x.id,
        fullName: x.full_name,
        phone: x.phone,
        email: x.email ?? "",
        gender: x.gender ?? "",
        birthDate: x.birth_date ? x.birth_date.toISOString().slice(0, 10) : "",
        status: x.member_status,
        category: x.category,
        createdAt: x.created_at.toISOString(),
      })),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: { code: "INTERNAL_ERROR", message: "Terjadi kesalahan server" } });
  }
}

export async function getJamaahMember(req: AuthedRequest, res: Response): Promise<void> {
  const p = idParamSchema.safeParse(req.params);
  if (!p.success) {
    res.status(400).json({ ok: false, error: { code: "VALIDATION_ERROR", message: "ID tidak valid" } });
    return;
  }
  try {
    const row = await getJamaahMemberById(p.data.id);
    if (!row) {
      res.status(404).json({ ok: false, error: { code: "NOT_FOUND", message: "Data jamaah tidak ditemukan" } });
      return;
    }
    res.json({
      ok: true,
      data: {
        id: row.id,
        fullName: row.full_name,
        phone: row.phone,
        email: row.email ?? "",
        gender: row.gender ?? "",
        birthDate: row.birth_date ? row.birth_date.toISOString().slice(0, 10) : "",
        address: row.address ?? "",
        status: row.member_status,
        category: row.category,
        notes: row.notes ?? "",
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: { code: "INTERNAL_ERROR", message: "Terjadi kesalahan server" } });
  }
}

export async function postJamaahMember(req: AuthedRequest, res: Response): Promise<void> {
  const b = createBodySchema.safeParse(req.body);
  if (!b.success) {
    res.status(400).json({
      ok: false,
      error: { code: "VALIDATION_ERROR", message: "Data tidak valid", details: b.error.flatten() },
    });
    return;
  }
  try {
    const created = await createJamaahMember({
      full_name: b.data.fullName,
      phone: b.data.phone,
      email: mapNullable(b.data.email),
      gender: mapNullable(b.data.gender),
      birth_date: b.data.birthDate ? new Date(b.data.birthDate) : null,
      address: mapNullable(b.data.address),
      member_status: b.data.status,
      category: b.data.category,
      notes: mapNullable(b.data.notes),
    });
    res.status(201).json({ ok: true, data: { id: created.id } });
  } catch (e: unknown) {
    const code = typeof e === "object" && e && "code" in e ? String((e as { code: string }).code) : "";
    if (code === "23505") {
      res.status(409).json({ ok: false, error: { code: "DUPLICATE", message: "Nomor HP atau email sudah terdaftar" } });
      return;
    }
    console.error(e);
    res.status(500).json({ ok: false, error: { code: "INTERNAL_ERROR", message: "Terjadi kesalahan server" } });
  }
}

export async function patchJamaahMember(req: AuthedRequest, res: Response): Promise<void> {
  const p = idParamSchema.safeParse(req.params);
  if (!p.success) {
    res.status(400).json({ ok: false, error: { code: "VALIDATION_ERROR", message: "ID tidak valid" } });
    return;
  }
  const b = patchBodySchema.safeParse(req.body);
  if (!b.success) {
    res.status(400).json({
      ok: false,
      error: { code: "VALIDATION_ERROR", message: "Data tidak valid", details: b.error.flatten() },
    });
    return;
  }
  try {
    const ok = await updateJamaahMember(p.data.id, {
      full_name: b.data.fullName,
      phone: b.data.phone,
      email: mapNullable(b.data.email),
      gender: mapNullable(b.data.gender),
      birth_date: b.data.birthDate === undefined ? undefined : b.data.birthDate ? new Date(b.data.birthDate) : null,
      address: mapNullable(b.data.address),
      member_status: b.data.status,
      category: b.data.category,
      notes: mapNullable(b.data.notes),
    });
    if (!ok) {
      res.status(404).json({ ok: false, error: { code: "NOT_FOUND", message: "Data jamaah tidak ditemukan" } });
      return;
    }
    res.json({ ok: true });
  } catch (e: unknown) {
    const code = typeof e === "object" && e && "code" in e ? String((e as { code: string }).code) : "";
    if (code === "23505") {
      res.status(409).json({ ok: false, error: { code: "DUPLICATE", message: "Nomor HP atau email sudah terdaftar" } });
      return;
    }
    console.error(e);
    res.status(500).json({ ok: false, error: { code: "INTERNAL_ERROR", message: "Terjadi kesalahan server" } });
  }
}

export async function deleteJamaahMemberHandler(req: AuthedRequest, res: Response): Promise<void> {
  const p = idParamSchema.safeParse(req.params);
  if (!p.success) {
    res.status(400).json({ ok: false, error: { code: "VALIDATION_ERROR", message: "ID tidak valid" } });
    return;
  }
  try {
    const ok = await deleteJamaahMember(p.data.id);
    if (!ok) {
      res.status(404).json({ ok: false, error: { code: "NOT_FOUND", message: "Data jamaah tidak ditemukan" } });
      return;
    }
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: { code: "INTERNAL_ERROR", message: "Terjadi kesalahan server" } });
  }
}
