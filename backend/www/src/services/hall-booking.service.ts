import { pool } from "../db/pool.js";

export type HallBookingRow = {
  id: string;
  hall_id: string;
  applicant_name: string;
  applicant_phone: string;
  applicant_email: string | null;
  organization: string | null;
  event_type: string;
  event_title: string;
  event_date_start: Date;
  event_date_end: Date;
  time_start: string | null;
  time_end: string | null;
  expected_attendees: number | null;
  notes: string | null;
  status: string;
  admin_notes: string | null;
  email_sent: boolean;
  email_error: string | null;
  reviewed_at: Date | null;
  reviewed_by: string | null;
  created_at: Date;
  updated_at: Date;
  hall_name?: string;
};

const SORT_FIELDS: Record<string, string> = {
  hallName: "h.name",
  applicantName: "b.applicant_name",
  applicantPhone: "b.applicant_phone",
  eventType: "b.event_type",
  eventDateStart: "b.event_date_start",
  status: "b.status",
  createdAt: "b.created_at",
};

export async function createHallBooking(input: {
  hallId: string;
  applicantName: string;
  applicantPhone: string;
  applicantEmail?: string | null;
  organization?: string | null;
  eventType: string;
  eventTitle: string;
  eventDateStart: string;
  eventDateEnd: string;
  timeStart?: string | null;
  timeEnd?: string | null;
  expectedAttendees?: number | null;
  notes?: string | null;
  emailSent: boolean;
  emailError?: string | null;
}): Promise<HallBookingRow> {
  const r = await pool.query<HallBookingRow>(
    `INSERT INTO hall_booking_requests (
       hall_id, applicant_name, applicant_phone, applicant_email, organization,
       event_type, event_title, event_date_start, event_date_end,
       time_start, time_end, expected_attendees, notes,
       status, email_sent, email_error
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7, $8::date, $9::date, $10, $11, $12, $13,
       'pending', $14, $15
     )
     RETURNING *`,
    [
      input.hallId,
      input.applicantName,
      input.applicantPhone,
      input.applicantEmail?.trim() || null,
      input.organization?.trim() || null,
      input.eventType,
      input.eventTitle,
      input.eventDateStart,
      input.eventDateEnd,
      input.timeStart?.trim() || null,
      input.timeEnd?.trim() || null,
      input.expectedAttendees ?? null,
      input.notes?.trim() || null,
      input.emailSent,
      input.emailError ?? null,
    ]
  );
  return r.rows[0]!;
}

export async function findApprovedBookingConflict(params: {
  hallId: string;
  eventDateStart: string;
  eventDateEnd: string;
  excludeId?: string;
}): Promise<{ id: string; event_title: string; event_date_start: Date } | null> {
  const vals: unknown[] = [params.hallId, params.eventDateEnd, params.eventDateStart];
  let excludeSql = "";
  if (params.excludeId) {
    vals.push(params.excludeId);
    excludeSql = ` AND b.id <> $${vals.length}`;
  }
  const r = await pool.query<{ id: string; event_title: string; event_date_start: Date }>(
    `SELECT b.id, b.event_title, b.event_date_start
     FROM hall_booking_requests b
     WHERE b.hall_id = $1
       AND b.status = 'approved'
       AND b.event_date_start <= $2::date
       AND COALESCE(b.event_date_end, b.event_date_start) >= $3::date
       ${excludeSql}
     LIMIT 1`,
    vals
  );
  return r.rows[0] ?? null;
}

export async function listHallBookingsPaginated(opts: {
  page: number;
  limit: number;
  search?: string;
  sortField?: string;
  sortDir?: "asc" | "desc";
}): Promise<{ items: HallBookingRow[]; total: number; page: number; limit: number }> {
  const page = Math.max(opts.page, 1);
  const limit = Math.min(Math.max(opts.limit, 1), 100);
  const offset = (page - 1) * limit;
  const sortCol = SORT_FIELDS[opts.sortField ?? ""] ?? "b.created_at";
  const sortDir = opts.sortDir === "asc" ? "ASC" : "DESC";

  const params: unknown[] = [];
  let where = "";
  if (opts.search) {
    params.push(`%${opts.search}%`);
    const n = params.length;
    where = `WHERE (
      b.applicant_name ILIKE $${n}
      OR b.applicant_phone ILIKE $${n}
      OR COALESCE(b.applicant_email, '') ILIKE $${n}
      OR b.event_title ILIKE $${n}
      OR h.name ILIKE $${n}
      OR b.event_type ILIKE $${n}
      OR b.status ILIKE $${n}
    )`;
  }

  const countR = await pool.query<{ c: string }>(
    `SELECT COUNT(*)::text AS c
     FROM hall_booking_requests b
     INNER JOIN halls h ON h.id = b.hall_id
     ${where}`,
    params
  );
  const total = Number.parseInt(countR.rows[0]?.c ?? "0", 10);

  const listParams = [...params, limit, offset];
  const limitIdx = params.length + 1;
  const offsetIdx = params.length + 2;

  const r = await pool.query<HallBookingRow>(
    `SELECT b.*, h.name AS hall_name
     FROM hall_booking_requests b
     INNER JOIN halls h ON h.id = b.hall_id
     ${where}
     ORDER BY ${sortCol} ${sortDir}
     LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    listParams
  );

  return { items: r.rows, total, page, limit };
}

export async function getHallBookingById(id: string): Promise<HallBookingRow | null> {
  const r = await pool.query<HallBookingRow>(
    `SELECT b.*, h.name AS hall_name
     FROM hall_booking_requests b
     INNER JOIN halls h ON h.id = b.hall_id
     WHERE b.id = $1`,
    [id]
  );
  return r.rows[0] ?? null;
}

export async function markHallBookingReviewed(id: string, userId: string | null): Promise<void> {
  await pool.query(
    `UPDATE hall_booking_requests
     SET status = CASE WHEN status = 'pending' THEN 'reviewed' ELSE status END,
         reviewed_at = COALESCE(reviewed_at, NOW()),
         reviewed_by = COALESCE(reviewed_by, $2::uuid),
         updated_at = NOW()
     WHERE id = $1`,
    [id, userId]
  );
}

export async function updateHallBooking(
  id: string,
  input: { status?: string; adminNotes?: string | null; reviewedBy?: string | null }
): Promise<HallBookingRow | null> {
  const sets: string[] = ["updated_at = NOW()"];
  const vals: unknown[] = [];
  let n = 1;

  if (input.status !== undefined) {
    sets.push(`status = $${n++}`);
    vals.push(input.status);
    if (input.status === "approved" || input.status === "rejected") {
      sets.push(`reviewed_at = COALESCE(reviewed_at, NOW())`);
      if (input.reviewedBy) {
        sets.push(`reviewed_by = $${n++}`);
        vals.push(input.reviewedBy);
      }
    }
  }
  if (input.adminNotes !== undefined) {
    sets.push(`admin_notes = $${n++}`);
    vals.push(input.adminNotes);
  }

  vals.push(id);
  const r = await pool.query<HallBookingRow>(
    `UPDATE hall_booking_requests SET ${sets.join(", ")} WHERE id = $${n} RETURNING *`,
    vals
  );
  return r.rows[0] ?? null;
}

export async function deleteHallBooking(id: string): Promise<boolean> {
  const r = await pool.query(`DELETE FROM hall_booking_requests WHERE id = $1`, [id]);
  return (r.rowCount ?? 0) > 0;
}

/** Tanggal yang sudah disetujui untuk aula (untuk hint availability publik). */
export async function listApprovedDateRangesForHall(
  hallId: string
): Promise<{ eventDateStart: string; eventDateEnd: string }[]> {
  const r = await pool.query<{ event_date_start: Date; event_date_end: Date }>(
    `SELECT event_date_start, event_date_end
     FROM hall_booking_requests
     WHERE hall_id = $1 AND status = 'approved'
       AND event_date_start >= CURRENT_DATE - INTERVAL '1 day'
     ORDER BY event_date_start ASC`,
    [hallId]
  );
  return r.rows.map((row) => ({
    eventDateStart: row.event_date_start.toISOString().slice(0, 10),
    eventDateEnd: (row.event_date_end ?? row.event_date_start).toISOString().slice(0, 10),
  }));
}
