import { serviceDb } from "../db";
import { splitFullName } from "./splitFullName";
import type { OfficialDirectoryEntry } from "../types";

export async function loadOfficialDirectory(
  workspaceId: string,
  opts?: { zoneSlug?: string; search?: string }
): Promise<{ count: number; officials: OfficialDirectoryEntry[] }> {
  const zoneSlug = opts?.zoneSlug?.trim().toLowerCase();
  const search = opts?.search?.trim().toLowerCase();

  const { data: members, error: memErr } = await serviceDb()
    .from("workspace_members")
    .select("profile_id")
    .eq("workspace_id", workspaceId);
  if (memErr) throw memErr;

  const memberIds = (members ?? []).map((m) => m.profile_id);
  if (memberIds.length === 0) return { count: 0, officials: [] };

  const { data: profiles, error: profErr } = await serviceDb()
    .from("profiles")
    .select("full_name, email, cell_phone, home_phone, zone_id, role, directory_visible")
    .in("id", memberIds)
    .in("role", ["OFFICIAL", "SUPERVISOR"])
    .eq("directory_visible", true)
    .order("full_name", { ascending: true });
  if (profErr) throw profErr;

  const zoneIds = [...new Set((profiles ?? []).map((p) => p.zone_id).filter(Boolean))] as string[];
  const zoneById = new Map<string, { name: string; slug: string }>();
  if (zoneIds.length > 0) {
    const { data: zones, error: zoneErr } = await serviceDb()
      .from("zones")
      .select("id, name, slug")
      .in("id", zoneIds);
    if (zoneErr) throw zoneErr;
    for (const z of zones ?? []) {
      zoneById.set(z.id, { name: z.name, slug: z.slug });
    }
  }

  let rows = (profiles ?? []).map((p) => {
    const zone = p.zone_id ? zoneById.get(p.zone_id) : undefined;
    const { first_name, last_name } = splitFullName(p.full_name);
    return {
      last_name,
      first_name,
      cell_phone: p.cell_phone,
      home_phone: p.home_phone,
      email: p.email,
      zone_slug: zone?.slug ?? null,
      zone_name: zone?.name ?? null,
    };
  });

  if (zoneSlug) {
    rows = rows.filter((r) => r.zone_slug?.toLowerCase() === zoneSlug);
  }

  if (search) {
    rows = rows.filter((r) => {
      const haystack = [
        r.last_name,
        r.first_name,
        r.email,
        r.cell_phone,
        r.home_phone,
        r.zone_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(search);
    });
  }

  rows.sort((a, b) => {
    const byLast = a.last_name.localeCompare(b.last_name, undefined, { sensitivity: "base" });
    if (byLast !== 0) return byLast;
    return a.first_name.localeCompare(b.first_name, undefined, { sensitivity: "base" });
  });

  const officials: OfficialDirectoryEntry[] = rows.map(({ zone_slug: _zs, ...entry }) => entry);
  return { count: officials.length, officials };
}
