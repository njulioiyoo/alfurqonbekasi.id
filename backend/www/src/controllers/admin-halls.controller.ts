import type { Response } from "express";
import { z } from "zod";
import type { AuthedRequest } from "../middleware/auth.middleware.js";
import {
  countHallBookings,
  createHall,
  deleteHall,
  getHallById,
  listAllHalls,
  listHallsPaginated,
  syncHalls,
  updateHall,
} from "../services/hall.service.js";
import {
  hallCreateSchema,
  hallPatchSchema,
  hallSyncSchema,
  hallValidationMessage,
  parseHallAmenities,
  slugifyHallName,
} from "../utils/hall-validation.js";
import { parseMetronicDatatableBody, queryGeneralSearch } from "../utils/metronic-datatable.js";
import { validateEventCoverUrl } from "../utils/event-cover-image.js";

const idParamSchema = z.object({ id: z.string().uuid() });

function amenitiesFromRow(json: unknown): string[] {
  return Array.isArray(json) ? (json as string[]) : [];
}

function canReadHalls(req: AuthedRequest): boolean {
  const a = req.ability;
  return Boolean(a && (a.can("manage", "all") || a.can("read", "Hall") || a.can("read", "Setting")));
}

function canMutateHalls(req: AuthedRequest): boolean {
  const a = req.ability;
  return Boolean(
    a && (a.can("manage", "all") || a.can("update", "Hall") || a.can("update", "Setting"))
  );
}

export async function listAllHallsHandler(req: AuthedRequest, res: Response): Promise<void> {
  if (!canReadHalls(req)) {
    res.status(403).json({ ok: false, error: { code: "FORBIDDEN", message: "Akses ditolak" } });
    return;
  }
  try {
    const rows = await listAllHalls();
    res.json({ ok: true, data: { items: rows.map(mapHallDetail) } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: { code: "INTERNAL_ERROR", message: "Terjadi kesalahan server" } });
  }
}

export async function syncHallsHandler(req: AuthedRequest, res: Response): Promise<void> {
  if (!canMutateHalls(req)) {
    res.status(403).json({ ok: false, error: { code: "FORBIDDEN", message: "Akses ditolak" } });
    return;
  }
  const parsed = hallSyncSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      ok: false,
      error: { code: "VALIDATION_ERROR", message: hallValidationMessage(parsed.error) },
    });
    return;
  }
  try {
    const normalized = [];
    for (let i = 0; i < parsed.data.items.length; i++) {
      const item = parsed.data.items[i]!;
      const slug = item.slug?.trim() || slugifyHallName(item.name);
      const coverUrl = item.coverImageUrl?.trim() || null;
      if (coverUrl) {
        const coverErr = await validateEventCoverUrl(coverUrl);
        if (coverErr) {
          res.status(400).json({ ok: false, error: { code: "VALIDATION_ERROR", message: coverErr } });
          return;
        }
      }
      normalized.push({
        id: item.id,
        name: item.name,
        slug,
        capacity: item.capacity ?? null,
        description: item.description?.trim() || null,
        coverImageUrl: coverUrl,
        amenities: parseHallAmenities(item.amenities),
        isActive: item.isActive ?? true,
        sortOrder: item.sortOrder ?? (i + 1) * 10,
      });
    }
    const rows = await syncHalls(normalized);
    res.json({ ok: true, data: { items: rows.map(mapHallDetail) } });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("pengajuan sewa") || msg.includes("unique") || msg.includes("duplicate")) {
      res.status(409).json({ ok: false, error: { code: "CONFLICT", message: msg || "Konflik data fasilitas" } });
      return;
    }
    console.error(e);
    res.status(500).json({ ok: false, error: { code: "INTERNAL_ERROR", message: "Terjadi kesalahan server" } });
  }
}

function mapHallDetail(row: NonNullable<Awaited<ReturnType<typeof getHallById>>>) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    capacity: row.capacity,
    description: row.description ?? "",
    coverImageUrl: row.cover_image_url ?? "",
    amenities: amenitiesFromRow(row.amenities_json),
    isActive: row.is_active,
    sortOrder: row.sort_order,
    createdAt: row.created_at?.toISOString() ?? "",
    updatedAt: row.updated_at?.toISOString() ?? "",
  };
}

export async function listHallsDatatable(req: AuthedRequest, res: Response): Promise<void> {
  const dt = parseMetronicDatatableBody(req.body);
  const search = queryGeneralSearch(dt.query);
  try {
    const result = await listHallsPaginated({
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
        name: x.name,
        slug: x.slug,
        capacity: x.capacity ?? "",
        isActive: x.is_active ? "aktif" : "nonaktif",
        sortOrder: x.sort_order,
        updatedAt: x.updated_at?.toISOString().slice(0, 16).replace("T", " ") ?? "",
      })),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: { code: "INTERNAL_ERROR", message: "Terjadi kesalahan server" } });
  }
}

export async function getHall(req: AuthedRequest, res: Response): Promise<void> {
  const p = idParamSchema.safeParse(req.params);
  if (!p.success) {
    res.status(400).json({ ok: false, error: { code: "VALIDATION_ERROR", message: "ID tidak valid" } });
    return;
  }
  try {
    const row = await getHallById(p.data.id);
    if (!row) {
      res.status(404).json({ ok: false, error: { code: "NOT_FOUND", message: "Aula tidak ditemukan" } });
      return;
    }
    res.json({ ok: true, data: mapHallDetail(row) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: { code: "INTERNAL_ERROR", message: "Terjadi kesalahan server" } });
  }
}

export async function postHall(req: AuthedRequest, res: Response): Promise<void> {
  const parsed = hallCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      ok: false,
      error: { code: "VALIDATION_ERROR", message: hallValidationMessage(parsed.error) },
    });
    return;
  }
  const data = parsed.data;
  const slug = data.slug?.trim() || slugifyHallName(data.name);
  const coverUrl = data.coverImageUrl?.trim() || null;
  if (coverUrl) {
    const coverErr = await validateEventCoverUrl(coverUrl);
    if (coverErr) {
      res.status(400).json({ ok: false, error: { code: "VALIDATION_ERROR", message: coverErr } });
      return;
    }
  }
  try {
    const row = await createHall({
      name: data.name,
      slug,
      capacity: data.capacity ?? null,
      description: data.description?.trim() || null,
      coverImageUrl: coverUrl,
      amenities: parseHallAmenities(data.amenities),
      isActive: data.isActive,
      sortOrder: data.sortOrder,
    });
    res.status(201).json({ ok: true, data: mapHallDetail(row) });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("unique") || msg.includes("duplicate")) {
      res.status(409).json({ ok: false, error: { code: "CONFLICT", message: "Slug sudah dipakai aula lain" } });
      return;
    }
    console.error(e);
    res.status(500).json({ ok: false, error: { code: "INTERNAL_ERROR", message: "Terjadi kesalahan server" } });
  }
}

export async function patchHall(req: AuthedRequest, res: Response): Promise<void> {
  const p = idParamSchema.safeParse(req.params);
  if (!p.success) {
    res.status(400).json({ ok: false, error: { code: "VALIDATION_ERROR", message: "ID tidak valid" } });
    return;
  }
  const parsed = hallPatchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      ok: false,
      error: { code: "VALIDATION_ERROR", message: hallValidationMessage(parsed.error) },
    });
    return;
  }
  const data = parsed.data;
  try {
    const existing = await getHallById(p.data.id);
    if (!existing) {
      res.status(404).json({ ok: false, error: { code: "NOT_FOUND", message: "Aula tidak ditemukan" } });
      return;
    }
    const nextCover =
      data.coverImageUrl === undefined ? undefined : data.coverImageUrl?.trim() || null;
    if (nextCover) {
      const coverErr = await validateEventCoverUrl(nextCover);
      if (coverErr) {
        res.status(400).json({ ok: false, error: { code: "VALIDATION_ERROR", message: coverErr } });
        return;
      }
    }
    const row = await updateHall(p.data.id, {
      name: data.name,
      slug: data.slug,
      capacity: data.capacity,
      description: data.description === undefined ? undefined : data.description?.trim() || null,
      coverImageUrl: nextCover,
      amenities: data.amenities === undefined ? undefined : parseHallAmenities(data.amenities),
      isActive: data.isActive,
      sortOrder: data.sortOrder,
    });
    if (!row) {
      res.status(404).json({ ok: false, error: { code: "NOT_FOUND", message: "Aula tidak ditemukan" } });
      return;
    }
    res.json({ ok: true, data: mapHallDetail(row) });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("unique") || msg.includes("duplicate")) {
      res.status(409).json({ ok: false, error: { code: "CONFLICT", message: "Slug sudah dipakai aula lain" } });
      return;
    }
    console.error(e);
    res.status(500).json({ ok: false, error: { code: "INTERNAL_ERROR", message: "Terjadi kesalahan server" } });
  }
}

export async function deleteHallHandler(req: AuthedRequest, res: Response): Promise<void> {
  const p = idParamSchema.safeParse(req.params);
  if (!p.success) {
    res.status(400).json({ ok: false, error: { code: "VALIDATION_ERROR", message: "ID tidak valid" } });
    return;
  }
  try {
    const bookings = await countHallBookings(p.data.id);
    if (bookings > 0) {
      res.status(409).json({
        ok: false,
        error: {
          code: "HAS_BOOKINGS",
          message: `Aula memiliki ${bookings} pengajuan sewa. Nonaktifkan saja atau hapus pengajuan terlebih dahulu.`,
        },
      });
      return;
    }
    const ok = await deleteHall(p.data.id);
    if (!ok) {
      res.status(404).json({ ok: false, error: { code: "NOT_FOUND", message: "Aula tidak ditemukan" } });
      return;
    }
    res.json({ ok: true, data: { deleted: true } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: { code: "INTERNAL_ERROR", message: "Terjadi kesalahan server" } });
  }
}
