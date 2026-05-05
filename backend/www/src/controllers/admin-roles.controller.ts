import type { Response } from "express";
import type { AuthedRequest } from "../middleware/auth.middleware.js";
import { listRoleCatalogPaginated } from "../services/role-catalog.service.js";
import { parseMetronicDatatableBody, queryGeneralSearch } from "../utils/metronic-datatable.js";

export async function listRolesDatatable(req: AuthedRequest, res: Response): Promise<void> {
  const dt = parseMetronicDatatableBody(req.body);
  const search = queryGeneralSearch(dt.query);

  try {
    const result = await listRoleCatalogPaginated({
      page: dt.page,
      limit: dt.perpage,
      search: search || undefined,
      sortField: dt.sortField,
      sortDir: dt.sortDir,
    });
    const pages = Math.max(Math.ceil(result.total / result.limit), 1);
    const data = result.items.map((r) => ({
      RecordID: r.roleKey,
      roleKey: r.roleKey,
      label: r.label,
      description: r.description,
      userCount: r.userCount,
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
