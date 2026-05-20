import { Hono } from "hono";
import { serviceDb } from "../db";
import { dbError, runRoute } from "../lib/handleDb";
import { inviteOfficialByEmail } from "../lib/inviteOfficial";
import { parseJson } from "../lib/validate";
import { requireAuth, requireAdmin } from "../middleware/auth";
import {
  BulkOfficialImportPayloadSchema,
  type BulkOfficialImportResult,
  OfficialTypeEnum,
  ProfileCreateSchema,
  ProfileUpdateSchema,
  RoleEnum,
} from "../types";
const profilesRouter = new Hono();

profilesRouter.get("/", async (c) =>
  runRoute(c, async () => {
    const { data, error } = await serviceDb()
      .from("profiles")
      .select("*")
      .order("full_name", { ascending: true });
    if (error) return dbError(c, error);
    return data ?? [];
  })
);

profilesRouter.get("/me", requireAuth, async (c) =>
  runRoute(c, async () => {
    const userId = c.get("userId");
    const { data, error } = await serviceDb()
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) return dbError(c, error);
    if (!data) return c.json({ error: { message: "Profile not found", code: "NOT_FOUND" } }, 404);
    return data;
  })
);

// ── POST /api/profiles/bulk ───────────────────────────────────────────────────
profilesRouter.post("/bulk", requireAdmin, async (c) =>
  runRoute(c, async () => {
    const body = await parseJson(c, BulkOfficialImportPayloadSchema);
    if (body instanceof Response) return body;

    const db = serviceDb();
    const result: BulkOfficialImportResult = {
      inserted: 0,
      skipped: 0,
      invited: 0,
      errors: [],
    };

    const { data: levels } = await db.from("certification_levels").select("id, name");
    const levelByName = new Map(
      (levels ?? []).map((l) => [l.name.toLowerCase().trim(), l.id])
    );

    const { data: zones } = await db.from("zones").select("id, name");
    const zoneByName = new Map(
      (zones ?? []).map((z) => [z.name.toLowerCase().trim(), z.id])
    );

    for (let i = 0; i < body.rows.length; i++) {
      const row = body.rows[i]!;
      const rowNum = i + 1;
      const rowErrors: string[] = [];

      if (!row.full_name?.trim()) rowErrors.push("full_name is empty");
      if (!row.email?.trim()) rowErrors.push("email is empty");

      const typeParsed = row.official_type
        ? OfficialTypeEnum.safeParse(row.official_type)
        : { success: true as const, data: undefined };
      if (!typeParsed.success) rowErrors.push(`Invalid official_type "${row.official_type}"`);

      const roleParsed = RoleEnum.safeParse(row.role ?? "OFFICIAL");
      if (!roleParsed.success) rowErrors.push(`Invalid role "${row.role}"`);

      if (rowErrors.length > 0) {
        for (const msg of rowErrors) {
          result.errors.push({ row: rowNum, field: "—", message: msg });
        }
        result.skipped++;
        continue;
      }

      let official_level_id: string | undefined;
      if (row.certification_level?.trim()) {
        const lid = levelByName.get(row.certification_level.toLowerCase().trim());
        if (!lid) {
          result.errors.push({
            row: rowNum,
            field: "certification_level",
            message: `Unknown level "${row.certification_level}"`,
          });
          result.skipped++;
          continue;
        }
        official_level_id = lid;
      }

      let zone_id: string | undefined;
      if (row.zone_name?.trim()) {
        const zid = zoneByName.get(row.zone_name.toLowerCase().trim());
        if (!zid) {
          result.errors.push({
            row: rowNum,
            field: "zone_name",
            message: `Unknown zone "${row.zone_name}"`,
          });
          result.skipped++;
          continue;
        }
        zone_id = zid;
      }

      let user_id: string | undefined;
      if (body.send_invites) {
        const inv = await inviteOfficialByEmail(row.email.trim(), {
          full_name: row.full_name.trim(),
        });
        if (inv.ok) {
          user_id = inv.userId;
          result.invited++;
        }
      }

      const { error } = await db.from("profiles").insert({
        email: row.email.trim().toLowerCase(),
        full_name: row.full_name.trim(),
        cell_phone: row.cell_phone?.trim() || null,
        jersey_number: row.jersey_number?.trim() || null,
        role: roleParsed.data,
        official_type: typeParsed.data ?? null,
        official_level_id: official_level_id ?? null,
        zone_id: zone_id ?? null,
        distance_km: row.distance_km ?? null,
        user_id: user_id ?? null,
      });

      if (error) {
        result.errors.push({
          row: rowNum,
          field: "—",
          message: error.message.includes("duplicate")
            ? `Email already exists: ${row.email}`
            : error.message,
        });
        result.skipped++;
      } else {
        result.inserted++;
      }
    }

    return result;
  })
);

profilesRouter.get("/:id", async (c) =>
  runRoute(c, async () => {
    const { data, error } = await serviceDb()
      .from("profiles")
      .select("*")
      .eq("id", c.req.param("id"))
      .maybeSingle();
    if (error) return dbError(c, error);
    if (!data) return c.json({ error: { message: "Profile not found", code: "NOT_FOUND" } }, 404);
    return data;
  })
);

profilesRouter.post("/", requireAuth, async (c) =>
  runRoute(c, async () => {
    const body = await parseJson(c, ProfileCreateSchema);
    if (body instanceof Response) return body;

    let user_id = body.user_id ?? c.get("userId");

    if (
      body.send_invite &&
      !body.user_id &&
      (body.role === "OFFICIAL" || body.role === "SUPERVISOR")
    ) {
      const inv = await inviteOfficialByEmail(body.email, {
        full_name: body.full_name,
      });
      if (!inv.ok) {
        return c.json(
          { error: { message: inv.message, code: "INVITE_FAILED" } },
          422
        );
      }
      user_id = inv.userId;
    }

    const { send_invite: _, ...row } = body;
    const { data, error } = await serviceDb()
      .from("profiles")
      .insert({ ...row, user_id })
      .select("*")
      .single();
    if (error) return dbError(c, error);
    return data;
  })
);

profilesRouter.put("/:id", requireAuth, async (c) =>
  runRoute(c, async () => {
    const body = await parseJson(c, ProfileUpdateSchema);
    if (body instanceof Response) return body;
    const { data, error } = await serviceDb()
      .from("profiles")
      .update(body)
      .eq("id", c.req.param("id"))
      .select("*")
      .single();
    if (error) return dbError(c, error);
    return data;
  })
);

profilesRouter.delete("/:id", requireAdmin, async (c) =>
  runRoute(c, async () => {
    const id = c.req.param("id");
    const { error } = await serviceDb().from("profiles").delete().eq("id", id);
    if (error) return dbError(c, error);
    return { id, deleted: true };
  })
);

export { profilesRouter };
