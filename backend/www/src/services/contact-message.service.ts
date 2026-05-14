import { pool } from "../db/pool.js";

export type ContactMessageRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  status: string;
  email_sent: boolean;
  email_error: string | null;
  created_at: Date;
  read_at: Date | null;
};

export async function createContactMessage(input: {
  name: string;
  email: string;
  phone?: string | null;
  message: string;
  emailSent: boolean;
  emailError?: string | null;
}): Promise<ContactMessageRow> {
  const r = await pool.query<ContactMessageRow>(
    `INSERT INTO contact_messages (name, email, phone, message, status, email_sent, email_error)
     VALUES ($1, $2, $3, $4, 'new', $5, $6)
     RETURNING *`,
    [
      input.name,
      input.email,
      input.phone?.trim() || null,
      input.message,
      input.emailSent,
      input.emailError ?? null,
    ]
  );
  return r.rows[0]!;
}

const SORT_FIELDS: Record<string, string> = {
  name: "name",
  email: "email",
  status: "status",
  createdAt: "created_at",
};

export async function listContactMessagesPaginatedFiltered(opts: {
  page: number;
  limit: number;
  search?: string;
  sortField?: string;
  sortDir?: "asc" | "desc";
}): Promise<{ items: ContactMessageRow[]; total: number; page: number; limit: number }> {
  const page = Math.max(opts.page, 1);
  const limit = Math.min(Math.max(opts.limit, 1), 100);
  const offset = (page - 1) * limit;
  const sortCol = SORT_FIELDS[opts.sortField ?? ""] ?? "created_at";
  const sortDir = opts.sortDir === "asc" ? "ASC" : "DESC";

  const params: unknown[] = [];
  let where = "";
  if (opts.search) {
    params.push(`%${opts.search}%`);
    where = `WHERE name ILIKE $1 OR email ILIKE $1 OR phone ILIKE $1 OR message ILIKE $1`;
  }

  const countR = await pool.query<{ c: string }>(
    `SELECT COUNT(*)::text AS c FROM contact_messages ${where}`,
    params
  );
  const total = Number.parseInt(countR.rows[0]?.c ?? "0", 10);

  const listParams = [...params, limit, offset];
  const limitIdx = params.length + 1;
  const offsetIdx = params.length + 2;
  const r = await pool.query<ContactMessageRow>(
    `SELECT * FROM contact_messages ${where}
     ORDER BY ${sortCol} ${sortDir}
     LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    listParams
  );

  return { items: r.rows, total, page, limit };
}

export async function getContactMessageById(id: string): Promise<ContactMessageRow | null> {
  const r = await pool.query<ContactMessageRow>(`SELECT * FROM contact_messages WHERE id = $1`, [id]);
  return r.rows[0] ?? null;
}

export async function markContactMessageRead(id: string): Promise<ContactMessageRow | null> {
  const r = await pool.query<ContactMessageRow>(
    `UPDATE contact_messages
     SET status = 'read', read_at = COALESCE(read_at, NOW())
     WHERE id = $1
     RETURNING *`,
    [id]
  );
  return r.rows[0] ?? null;
}

export async function deleteContactMessage(id: string): Promise<boolean> {
  const r = await pool.query(`DELETE FROM contact_messages WHERE id = $1`, [id]);
  return (r.rowCount ?? 0) > 0;
}
