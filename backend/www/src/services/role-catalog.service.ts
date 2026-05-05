import { pool } from "../db/pool.js";

export type RoleCatalogRow = {
  roleKey: string;
  label: string;
  description: string;
  userCount: number;
};

const CATALOG: Omit<RoleCatalogRow, "userCount">[] = [
  {
    roleKey: "superadmin",
    label: "Super Admin",
    description: "Akses penuh termasuk manajemen pengguna dan role.",
  },
  {
    roleKey: "admin",
    label: "Admin",
    description: "Mengelola konten CMS; pembatasan pada akun super admin.",
  },
  {
    roleKey: "user",
    label: "User",
    description: "Pengunjung terdaftar / akses terbatas (baca konten publik).",
  },
];

type SortKey = "roleKey" | "label" | "description" | "userCount";

const SORT_COL: Record<string, SortKey> = {
  roleKey: "roleKey",
  label: "label",
  description: "description",
  userCount: "userCount",
  RecordID: "roleKey",
};

export async function listRoleCatalogPaginated(params: {
  page: number;
  limit: number;
  search?: string;
  sortField?: string;
  sortDir?: "asc" | "desc";
}): Promise<{ items: RoleCatalogRow[]; total: number; page: number; limit: number }> {
  const limit = Math.min(Math.max(params.limit, 1), 100);
  const page = Math.max(params.page, 1);

  const countR = await pool.query<{ role: string; c: string }>(
    `SELECT role, COUNT(*)::text AS c FROM users GROUP BY role`
  );
  const counts: Record<string, number> = {};
  for (const row of countR.rows) {
    counts[row.role] = Number(row.c);
  }

  let rows: RoleCatalogRow[] = CATALOG.map((r) => ({
    ...r,
    userCount: counts[r.roleKey] ?? 0,
  }));

  const search = params.search?.trim().toLowerCase() ?? "";
  if (search) {
    rows = rows.filter(
      (r) =>
        r.roleKey.toLowerCase().includes(search) ||
        r.label.toLowerCase().includes(search) ||
        r.description.toLowerCase().includes(search) ||
        String(r.userCount).includes(search)
    );
  }

  const sortKey: SortKey = SORT_COL[params.sortField ?? ""] ?? "roleKey";
  const dir = params.sortDir === "desc" ? -1 : 1;
  rows = [...rows].sort((a, b) => {
    const av = a[sortKey];
    const bv = b[sortKey];
    if (sortKey === "userCount") return (av - bv) * dir;
    return String(av).localeCompare(String(bv), "id") * dir;
  });

  const total = rows.length;
  const offset = (page - 1) * limit;
  const items = rows.slice(offset, offset + limit);

  return { items, total, page, limit };
}
