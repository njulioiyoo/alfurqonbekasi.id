import { pool } from "../db/pool.js";

export type HallRow = {
  id: string;
  name: string;
  slug: string;
  capacity: number | null;
  description: string | null;
  cover_image_url: string | null;
  amenities_json: unknown;
  is_active: boolean;
  sort_order: number;
  created_at?: Date;
  updated_at?: Date;
};

const SORT_COLUMNS: Record<string, string> = {
  name: "h.name",
  slug: "h.slug",
  sortOrder: "h.sort_order",
  isActive: "h.is_active",
  updatedAt: "h.updated_at",
};

export async function listAllHalls(): Promise<HallRow[]> {
  const r = await pool.query<HallRow>(
    `SELECT id, name, slug, capacity, description, cover_image_url, amenities_json, is_active, sort_order,
            created_at, updated_at
     FROM halls
     ORDER BY sort_order ASC, name ASC`
  );
  return r.rows;
}

export async function syncHalls(
  items: Array<{
    id?: string;
    name: string;
    slug: string;
    capacity: number | null;
    description: string | null;
    coverImageUrl: string | null;
    amenities: string[];
    isActive: boolean;
    sortOrder: number;
  }>
): Promise<HallRow[]> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const existing = await listAllHalls();
    const keepIds = new Set(items.map((i) => i.id).filter(Boolean) as string[]);

    for (const row of existing) {
      if (keepIds.has(row.id)) continue;
      const bookings = await countHallBookings(row.id);
      if (bookings > 0) {
        throw new Error(
          `Fasilitas "${row.name}" masih memiliki ${bookings} pengajuan sewa. Nonaktifkan saja, jangan dihapus dari daftar.`
        );
      }
      await client.query(`DELETE FROM halls WHERE id = $1`, [row.id]);
    }

    const saved: HallRow[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i]!;
      const sortOrder = item.sortOrder ?? (i + 1) * 10;
      if (item.id) {
        const r = await client.query<HallRow>(
          `UPDATE halls SET name = $1, slug = $2, capacity = $3, description = $4, cover_image_url = $5,
                  amenities_json = $6::jsonb, is_active = $7, sort_order = $8, updated_at = NOW()
           WHERE id = $9
           RETURNING id, name, slug, capacity, description, cover_image_url, amenities_json, is_active, sort_order,
                     created_at, updated_at`,
          [
            item.name,
            item.slug,
            item.capacity,
            item.description,
            item.coverImageUrl,
            JSON.stringify(item.amenities),
            item.isActive,
            sortOrder,
            item.id,
          ]
        );
        const row = r.rows[0];
        if (!row) throw new Error(`Fasilitas tidak ditemukan: ${item.id}`);
        saved.push(row);
      } else {
        const r = await client.query<HallRow>(
          `INSERT INTO halls (name, slug, capacity, description, cover_image_url, amenities_json, is_active, sort_order)
           VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8)
           RETURNING id, name, slug, capacity, description, cover_image_url, amenities_json, is_active, sort_order,
                     created_at, updated_at`,
          [
            item.name,
            item.slug,
            item.capacity,
            item.description,
            item.coverImageUrl,
            JSON.stringify(item.amenities),
            item.isActive,
            sortOrder,
          ]
        );
        saved.push(r.rows[0]!);
      }
    }

    await client.query("COMMIT");
    return saved;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export async function listActiveHalls(): Promise<HallRow[]> {
  const r = await pool.query<HallRow>(
    `SELECT id, name, slug, capacity, description, cover_image_url, amenities_json, is_active, sort_order
     FROM halls
     WHERE is_active = true
     ORDER BY sort_order ASC, name ASC`
  );
  return r.rows;
}

export async function getHallById(id: string): Promise<HallRow | null> {
  const r = await pool.query<HallRow>(
    `SELECT id, name, slug, capacity, description, cover_image_url, amenities_json, is_active, sort_order,
            created_at, updated_at
     FROM halls WHERE id = $1`,
    [id]
  );
  return r.rows[0] ?? null;
}

export async function getActiveHallById(id: string): Promise<HallRow | null> {
  const r = await pool.query<HallRow>(
    `SELECT id, name, slug, capacity, description, cover_image_url, amenities_json, is_active, sort_order
     FROM halls WHERE id = $1 AND is_active = true`,
    [id]
  );
  return r.rows[0] ?? null;
}

export async function listHallsPaginated(opts: {
  page: number;
  limit: number;
  search?: string;
  sortField?: string;
  sortDir?: "asc" | "desc";
}): Promise<{ items: HallRow[]; total: number; page: number; limit: number }> {
  const page = Math.max(1, opts.page);
  const limit = Math.min(100, Math.max(1, opts.limit));
  const offset = (page - 1) * limit;
  const params: unknown[] = [];
  const where: string[] = [];
  if (opts.search) {
    params.push(`%${opts.search}%`);
    where.push(`(h.name ILIKE $${params.length} OR h.slug ILIKE $${params.length})`);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const countR = await pool.query<{ c: string }>(
    `SELECT COUNT(*)::text AS c FROM halls h ${whereSql}`,
    params
  );
  const total = parseInt(countR.rows[0]?.c ?? "0", 10);
  const sortCol = SORT_COLUMNS[opts.sortField ?? ""] ?? "h.sort_order";
  const sortDir = opts.sortDir === "desc" ? "DESC" : "ASC";
  const listParams = [...params, limit, offset];
  const r = await pool.query<HallRow>(
    `SELECT h.id, h.name, h.slug, h.capacity, h.description, h.cover_image_url, h.amenities_json,
            h.is_active, h.sort_order, h.created_at, h.updated_at
     FROM halls h
     ${whereSql}
     ORDER BY ${sortCol} ${sortDir}, h.name ASC
     LIMIT $${listParams.length - 1} OFFSET $${listParams.length}`,
    listParams
  );
  return { items: r.rows, total, page, limit };
}

export async function countHallBookings(hallId: string): Promise<number> {
  const r = await pool.query<{ c: string }>(
    `SELECT COUNT(*)::text AS c FROM hall_booking_requests WHERE hall_id = $1`,
    [hallId]
  );
  return parseInt(r.rows[0]?.c ?? "0", 10);
}

export async function createHall(input: {
  name: string;
  slug: string;
  capacity: number | null;
  description: string | null;
  coverImageUrl: string | null;
  amenities: string[];
  isActive: boolean;
  sortOrder: number;
}): Promise<HallRow> {
  const r = await pool.query<HallRow>(
    `INSERT INTO halls (name, slug, capacity, description, cover_image_url, amenities_json, is_active, sort_order)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8)
     RETURNING id, name, slug, capacity, description, cover_image_url, amenities_json, is_active, sort_order,
               created_at, updated_at`,
    [
      input.name,
      input.slug,
      input.capacity,
      input.description,
      input.coverImageUrl,
      JSON.stringify(input.amenities),
      input.isActive,
      input.sortOrder,
    ]
  );
  return r.rows[0]!;
}

export async function updateHall(
  id: string,
  input: {
    name?: string;
    slug?: string;
    capacity?: number | null;
    description?: string | null;
    coverImageUrl?: string | null;
    amenities?: string[];
    isActive?: boolean;
    sortOrder?: number;
  }
): Promise<HallRow | null> {
  const sets: string[] = [];
  const vals: unknown[] = [];
  const add = (col: string, val: unknown) => {
    vals.push(val);
    sets.push(`${col} = $${vals.length}`);
  };
  if (input.name !== undefined) add("name", input.name);
  if (input.slug !== undefined) add("slug", input.slug);
  if (input.capacity !== undefined) add("capacity", input.capacity);
  if (input.description !== undefined) add("description", input.description);
  if (input.coverImageUrl !== undefined) add("cover_image_url", input.coverImageUrl);
  if (input.amenities !== undefined) {
    vals.push(JSON.stringify(input.amenities));
    sets.push(`amenities_json = $${vals.length}::jsonb`);
  }
  if (input.isActive !== undefined) add("is_active", input.isActive);
  if (input.sortOrder !== undefined) add("sort_order", input.sortOrder);
  if (!sets.length) return getHallById(id);
  vals.push(id);
  const r = await pool.query<HallRow>(
    `UPDATE halls SET ${sets.join(", ")}, updated_at = NOW()
     WHERE id = $${vals.length}
     RETURNING id, name, slug, capacity, description, cover_image_url, amenities_json, is_active, sort_order,
               created_at, updated_at`,
    vals
  );
  return r.rows[0] ?? null;
}

export async function deleteHall(id: string): Promise<boolean> {
  const r = await pool.query(`DELETE FROM halls WHERE id = $1`, [id]);
  return (r.rowCount ?? 0) > 0;
}
