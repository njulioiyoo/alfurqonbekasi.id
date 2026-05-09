import type { Response } from "express";
import { z } from "zod";
import type { AuthedRequest } from "../middleware/auth.middleware.js";
import {
  createTpqStudent,
  deleteTpqStudent,
  getTpqStudentById,
  listTpqStudentsPaginatedFiltered,
  updateTpqStudent,
} from "../services/tpq-student.service.js";
import { parseMetronicDatatableBody, queryGeneralSearch } from "../utils/metronic-datatable.js";

const idParamSchema = z.object({ id: z.string().uuid() });
const statusSchema = z.enum(["active", "inactive", "graduated"]);
const genderSchema = z.enum(["male", "female"]);
const yyyyMmDdSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const createBodySchema = z.object({
  fullName: z.string().trim().min(2).max(255),
  nickname: z.union([z.string().trim().max(100), z.literal(""), z.null()]).optional(),
  birthDate: z.union([yyyyMmDdSchema, z.literal(""), z.null()]).optional(),
  gender: z.union([genderSchema, z.literal(""), z.null()]).optional(),
  classLevel: z.string().trim().max(80).default(""),
  parentName: z.union([z.string().trim().max(255), z.literal(""), z.null()]).optional(),
  parentPhone: z.union([z.string().trim().max(40), z.literal(""), z.null()]).optional(),
  address: z.union([z.string().trim().max(5000), z.literal(""), z.null()]).optional(),
  enrollmentYear: z.union([z.coerce.number().int().min(1990).max(2100), z.null()]).optional(),
  status: statusSchema.default("active"),
  notes: z.union([z.string().trim().max(10000), z.literal(""), z.null()]).optional(),
});

const patchBodySchema = z
  .object({
    fullName: z.string().trim().min(2).max(255).optional(),
    nickname: z.union([z.string().trim().max(100), z.literal(""), z.null()]).optional(),
    birthDate: z.union([yyyyMmDdSchema, z.literal(""), z.null()]).optional(),
    gender: z.union([genderSchema, z.literal(""), z.null()]).optional(),
    classLevel: z.string().trim().max(80).optional(),
    parentName: z.union([z.string().trim().max(255), z.literal(""), z.null()]).optional(),
    parentPhone: z.union([z.string().trim().max(40), z.literal(""), z.null()]).optional(),
    address: z.union([z.string().trim().max(5000), z.literal(""), z.null()]).optional(),
    enrollmentYear: z.union([z.coerce.number().int().min(1990).max(2100), z.null()]).optional(),
    status: statusSchema.optional(),
    notes: z.union([z.string().trim().max(10000), z.literal(""), z.null()]).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "Minimal satu field diisi" });

function mapNullable(v: string | null | undefined): string | null | undefined {
  if (v === undefined) return undefined;
  if (v === null) return null;
  const s = v.trim();
  return s === "" ? null : s;
}

export async function listTpqStudentsDatatable(req: AuthedRequest, res: Response): Promise<void> {
  const dt = parseMetronicDatatableBody(req.body);
  const search = queryGeneralSearch(dt.query);
  try {
    const result = await listTpqStudentsPaginatedFiltered({
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
        nickname: x.nickname ?? "",
        classLevel: x.class_level,
        parentPhone: x.parent_phone ?? "",
        status: x.student_status,
        enrollmentYear: x.enrollment_year ?? "",
        createdAt: x.created_at.toISOString(),
      })),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: { code: "INTERNAL_ERROR", message: "Terjadi kesalahan server" } });
  }
}

export async function getTpqStudent(req: AuthedRequest, res: Response): Promise<void> {
  const p = idParamSchema.safeParse(req.params);
  if (!p.success) {
    res.status(400).json({ ok: false, error: { code: "VALIDATION_ERROR", message: "ID tidak valid" } });
    return;
  }
  try {
    const row = await getTpqStudentById(p.data.id);
    if (!row) {
      res.status(404).json({ ok: false, error: { code: "NOT_FOUND", message: "Data santri tidak ditemukan" } });
      return;
    }
    res.json({
      ok: true,
      data: {
        id: row.id,
        fullName: row.full_name,
        nickname: row.nickname ?? "",
        birthDate: row.birth_date ? row.birth_date.toISOString().slice(0, 10) : "",
        gender: row.gender ?? "",
        classLevel: row.class_level,
        parentName: row.parent_name ?? "",
        parentPhone: row.parent_phone ?? "",
        address: row.address ?? "",
        enrollmentYear: row.enrollment_year,
        status: row.student_status,
        notes: row.notes ?? "",
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: { code: "INTERNAL_ERROR", message: "Terjadi kesalahan server" } });
  }
}

export async function postTpqStudent(req: AuthedRequest, res: Response): Promise<void> {
  const b = createBodySchema.safeParse(req.body);
  if (!b.success) {
    res.status(400).json({
      ok: false,
      error: { code: "VALIDATION_ERROR", message: "Data tidak valid", details: b.error.flatten() },
    });
    return;
  }
  try {
    const created = await createTpqStudent({
      full_name: b.data.fullName,
      nickname: mapNullable(b.data.nickname),
      birth_date: b.data.birthDate ? new Date(b.data.birthDate) : null,
      gender: mapNullable(b.data.gender),
      class_level: b.data.classLevel,
      parent_name: mapNullable(b.data.parentName),
      parent_phone: mapNullable(b.data.parentPhone),
      address: mapNullable(b.data.address),
      enrollment_year: b.data.enrollmentYear ?? null,
      student_status: b.data.status,
      notes: mapNullable(b.data.notes),
    });
    res.status(201).json({ ok: true, data: { id: created.id } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: { code: "INTERNAL_ERROR", message: "Terjadi kesalahan server" } });
  }
}

export async function patchTpqStudent(req: AuthedRequest, res: Response): Promise<void> {
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
    const ok = await updateTpqStudent(p.data.id, {
      full_name: b.data.fullName,
      nickname: b.data.nickname === undefined ? undefined : mapNullable(b.data.nickname),
      birth_date:
        b.data.birthDate === undefined ? undefined : b.data.birthDate ? new Date(b.data.birthDate) : null,
      gender: b.data.gender === undefined ? undefined : mapNullable(b.data.gender),
      class_level: b.data.classLevel,
      parent_name: b.data.parentName === undefined ? undefined : mapNullable(b.data.parentName),
      parent_phone: b.data.parentPhone === undefined ? undefined : mapNullable(b.data.parentPhone),
      address: b.data.address === undefined ? undefined : mapNullable(b.data.address),
      enrollment_year: b.data.enrollmentYear,
      student_status: b.data.status,
      notes: b.data.notes === undefined ? undefined : mapNullable(b.data.notes),
    });
    if (!ok) {
      res.status(404).json({ ok: false, error: { code: "NOT_FOUND", message: "Data santri tidak ditemukan" } });
      return;
    }
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: { code: "INTERNAL_ERROR", message: "Terjadi kesalahan server" } });
  }
}

export async function deleteTpqStudentHandler(req: AuthedRequest, res: Response): Promise<void> {
  const p = idParamSchema.safeParse(req.params);
  if (!p.success) {
    res.status(400).json({ ok: false, error: { code: "VALIDATION_ERROR", message: "ID tidak valid" } });
    return;
  }
  try {
    const ok = await deleteTpqStudent(p.data.id);
    if (!ok) {
      res.status(404).json({ ok: false, error: { code: "NOT_FOUND", message: "Data santri tidak ditemukan" } });
      return;
    }
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: { code: "INTERNAL_ERROR", message: "Terjadi kesalahan server" } });
  }
}
