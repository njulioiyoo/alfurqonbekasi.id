import type { Response } from "express";
import { z } from "zod";
import type { AuthedRequest } from "../middleware/auth.middleware.js";
import { listConfigEntries, upsertConfigEntries } from "../services/config.service.js";

const configMapSchema = z.record(z.string().trim().min(1).max(150), z.union([z.string(), z.number(), z.boolean()]));
const putConfigBodySchema = z.object({
  values: configMapSchema,
});

export async function getConfig(_req: AuthedRequest, res: Response): Promise<void> {
  try {
    const rows = await listConfigEntries();
    const values: Record<string, string> = {};
    for (const row of rows) values[row.key] = row.value;
    res.json({ ok: true, data: { values } });
  } catch (e) {
    console.error(e);
    res.status(500).json({
      ok: false,
      error: { code: "INTERNAL_ERROR", message: "Terjadi kesalahan server" },
    });
  }
}

export async function putConfig(req: AuthedRequest, res: Response): Promise<void> {
  const parsed = putConfigBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      ok: false,
      error: { code: "VALIDATION_ERROR", message: "Data tidak valid", details: parsed.error.flatten() },
    });
    return;
  }
  try {
    const entries = Object.entries(parsed.data.values).map(([key, value]) => ({
      key: key.trim(),
      value: String(value),
    }));
    await upsertConfigEntries(entries);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({
      ok: false,
      error: { code: "INTERNAL_ERROR", message: "Terjadi kesalahan server" },
    });
  }
}
