import type { Response } from "express";
import { z } from "zod";
import type { AuthedRequest } from "../middleware/auth.middleware.js";
import {
  deleteHallBooking,
  findApprovedBookingConflict,
  getHallBookingById,
  listHallBookingsPaginated,
  markHallBookingReviewed,
  updateHallBooking,
} from "../services/hall-booking.service.js";
import { hallBookingPatchSchema } from "../utils/hall-booking-validation.js";
import { parseMetronicDatatableBody, queryGeneralSearch } from "../utils/metronic-datatable.js";

const idParamSchema = z.object({ id: z.string().uuid() });

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function mapBookingDetail(row: Awaited<ReturnType<typeof getHallBookingById>>) {
  if (!row) return null;
  return {
    id: row.id,
    hallId: row.hall_id,
    hallName: row.hall_name ?? "",
    applicantName: row.applicant_name,
    applicantPhone: row.applicant_phone,
    applicantEmail: row.applicant_email ?? "",
    organization: row.organization ?? "",
    eventType: row.event_type,
    eventTitle: row.event_title,
    eventDateStart: formatDate(row.event_date_start),
    eventDateEnd: formatDate(row.event_date_end),
    timeStart: row.time_start ?? "",
    timeEnd: row.time_end ?? "",
    expectedAttendees: row.expected_attendees,
    notes: row.notes ?? "",
    status: row.status,
    adminNotes: row.admin_notes ?? "",
    emailSent: row.email_sent,
    emailError: row.email_error ?? "",
    createdAt: row.created_at.toISOString(),
    reviewedAt: row.reviewed_at?.toISOString() ?? "",
  };
}

export async function listHallBookingsDatatable(req: AuthedRequest, res: Response): Promise<void> {
  const dt = parseMetronicDatatableBody(req.body);
  const search = queryGeneralSearch(dt.query);
  try {
    const result = await listHallBookingsPaginated({
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
        hallName: x.hall_name ?? "",
        applicantName: x.applicant_name,
        applicantPhone: x.applicant_phone,
        eventType: x.event_type,
        eventTitle: x.event_title,
        eventDateStart: formatDate(x.event_date_start),
        status: x.status,
        createdAt: x.created_at.toISOString(),
      })),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: { code: "INTERNAL_ERROR", message: "Terjadi kesalahan server" } });
  }
}

export async function getHallBooking(req: AuthedRequest, res: Response): Promise<void> {
  const p = idParamSchema.safeParse(req.params);
  if (!p.success) {
    res.status(400).json({ ok: false, error: { code: "VALIDATION_ERROR", message: "ID tidak valid" } });
    return;
  }
  try {
    const row = await getHallBookingById(p.data.id);
    if (!row) {
      res.status(404).json({ ok: false, error: { code: "NOT_FOUND", message: "Pengajuan tidak ditemukan" } });
      return;
    }
    if (row.status === "pending") {
      await markHallBookingReviewed(row.id, req.user?.sub ?? null);
    }
    const updated = await getHallBookingById(p.data.id);
    res.json({ ok: true, data: mapBookingDetail(updated ?? row) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: { code: "INTERNAL_ERROR", message: "Terjadi kesalahan server" } });
  }
}

export async function patchHallBooking(req: AuthedRequest, res: Response): Promise<void> {
  const p = idParamSchema.safeParse(req.params);
  if (!p.success) {
    res.status(400).json({ ok: false, error: { code: "VALIDATION_ERROR", message: "ID tidak valid" } });
    return;
  }
  const body = hallBookingPatchSchema.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: body.error.errors[0]?.message ?? "Data tidak valid",
        details: body.error.flatten(),
      },
    });
    return;
  }

  try {
    const existing = await getHallBookingById(p.data.id);
    if (!existing) {
      res.status(404).json({ ok: false, error: { code: "NOT_FOUND", message: "Pengajuan tidak ditemukan" } });
      return;
    }

    const nextStatus = body.data.status ?? existing.status;
    if (nextStatus === "approved") {
      const conflict = await findApprovedBookingConflict({
        hallId: existing.hall_id,
        eventDateStart: formatDate(existing.event_date_start),
        eventDateEnd: formatDate(existing.event_date_end),
        excludeId: existing.id,
      });
      if (conflict) {
        res.status(409).json({
          ok: false,
          error: {
            code: "BOOKING_CONFLICT",
            message: `Tanggal bentrok dengan pengajuan disetujui: "${conflict.event_title}" (${formatDate(conflict.event_date_start)}).`,
          },
        });
        return;
      }
    }

    const updated = await updateHallBooking(p.data.id, {
      status: body.data.status,
      adminNotes:
        body.data.adminNotes === undefined
          ? undefined
          : body.data.adminNotes === ""
            ? null
            : body.data.adminNotes,
      reviewedBy: req.user?.sub ?? null,
    });
    if (!updated) {
      res.status(404).json({ ok: false, error: { code: "NOT_FOUND", message: "Pengajuan tidak ditemukan" } });
      return;
    }
    const full = await getHallBookingById(updated.id);
    res.json({ ok: true, data: mapBookingDetail(full) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: { code: "INTERNAL_ERROR", message: "Terjadi kesalahan server" } });
  }
}

export async function deleteHallBookingHandler(req: AuthedRequest, res: Response): Promise<void> {
  const p = idParamSchema.safeParse(req.params);
  if (!p.success) {
    res.status(400).json({ ok: false, error: { code: "VALIDATION_ERROR", message: "ID tidak valid" } });
    return;
  }
  try {
    const ok = await deleteHallBooking(p.data.id);
    if (!ok) {
      res.status(404).json({ ok: false, error: { code: "NOT_FOUND", message: "Pengajuan tidak ditemukan" } });
      return;
    }
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: { code: "INTERNAL_ERROR", message: "Terjadi kesalahan server" } });
  }
}
