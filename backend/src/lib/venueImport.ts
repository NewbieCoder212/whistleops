import type { SupabaseClient } from "@supabase/supabase-js";
import type { BulkVenueImportResult, BulkVenueRow } from "../types";

/** Hockey NB zone IDs from migration 0013 (Zone 1–9). */
export const ZONE_ID_BY_NUMBER: Record<number, string> = {
  1: "00000000-0000-4000-8000-000000000101",
  2: "00000000-0000-4000-8000-000000000102",
  3: "00000000-0000-4000-8000-000000000103",
  4: "00000000-0000-4000-8000-000000000104",
  5: "00000000-0000-4000-8000-000000000105",
  6: "00000000-0000-4000-8000-000000000106",
  7: "00000000-0000-4000-8000-000000000107",
  8: "00000000-0000-4000-8000-000000000108",
  9: "00000000-0000-4000-8000-000000000109",
};

export function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&nbsp;/gi, " ")
    .replace(/&([a-z]+);/gi, (_, name: string) => {
      const map: Record<string, string> = {
        ccedil: "ç",
        Ccedil: "Ç",
        eacute: "é",
        Eacute: "É",
        egrave: "è",
        agrave: "à",
        ocirc: "ô",
        ucirc: "û",
        icirc: "î",
        auml: "ä",
        ouml: "ö",
       uuml: "ü",
        nbsp: " ",
      };
      return map[name] ?? `&${name};`;
    })
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

export function buildVenueAddress(row: BulkVenueRow): string | null {
  const parts = [row.address, row.city, row.province, row.postal]
    .map((p) => p?.trim())
    .filter((p) => p && p.length > 0);
  return parts.length > 0 ? parts.join(", ") : null;
}

export function parseZoneNumber(raw: string | undefined): number | null {
  if (!raw?.trim()) return null;
  const n = parseInt(raw.trim(), 10);
  if (Number.isNaN(n) || n < 1 || n > 9) return null;
  return n;
}

export function zoneIdFromNumber(zoneNum: number): string | null {
  return ZONE_ID_BY_NUMBER[zoneNum] ?? null;
}

export async function loadZoneLookups(db: SupabaseClient) {
  const { data: zones } = await db.from("zones").select("id, name, sort_order");
  const byName = new Map<string, string>();
  const bySortOrder = new Map<number, string>();
  for (const z of zones ?? []) {
    byName.set(z.name.toLowerCase().trim(), z.id);
    if (z.sort_order != null) bySortOrder.set(z.sort_order, z.id);
  }
  return { byName, bySortOrder, zones: zones ?? [] };
}

export function resolveZoneId(
  row: BulkVenueRow,
  lookups: { byName: Map<string, string>; bySortOrder: Map<number, string> }
): string | null {
  const zoneNum = row.zone_number ?? parseZoneNumber(row.zone);
  if (zoneNum != null) {
    return lookups.bySortOrder.get(zoneNum) ?? zoneIdFromNumber(zoneNum);
  }
  const name = row.zone_name?.trim() || row.zone?.trim();
  if (name) {
    const byExact = lookups.byName.get(name.toLowerCase());
    if (byExact) return byExact;
    const numMatch = name.match(/zone\s*(\d)/i);
    if (numMatch) {
      const n = parseInt(numMatch[1]!, 10);
      return lookups.bySortOrder.get(n) ?? zoneIdFromNumber(n);
    }
  }
  return null;
}

export async function runBulkVenueImport(
  db: SupabaseClient,
  workspaceId: string,
  rows: BulkVenueRow[],
  options: { updateExisting?: boolean } = {}
): Promise<BulkVenueImportResult> {
  const updateExisting = options.updateExisting ?? false;
  const result: BulkVenueImportResult = {
    inserted: 0,
    skipped: 0,
    updated: 0,
    errors: [],
  };

  const lookups = await loadZoneLookups(db);

  const { data: existingVenues } = await db
    .from("venues")
    .select("id, name")
    .eq("workspace_id", workspaceId);

  const existingByName = new Map<string, { id: string; name: string }>();
  for (const v of existingVenues ?? []) {
    existingByName.set(v.name.toLowerCase().trim(), v);
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    const rowNum = i + 1;
    const name = decodeHtmlEntities(row.name.trim());

    if (!name) {
      result.errors.push({ row: rowNum, field: "name", message: "Venue name is empty" });
      result.skipped++;
      continue;
    }

    const zoneRaw = row.zone?.trim() || row.zone_name?.trim();
    let zone_id: string | null = null;
    if (zoneRaw) {
      zone_id = resolveZoneId(row, lookups);
      if (!zone_id) {
        result.errors.push({
          row: rowNum,
          field: "zone",
          message: `Unknown zone "${zoneRaw}"`,
        });
        result.skipped++;
        continue;
      }
    }

    const address = buildVenueAddress(row);
    const assignable = row.assignable !== false;

    const existing = existingByName.get(name.toLowerCase());
    if (existing) {
      if (updateExisting) {
        const { error } = await db
          .from("venues")
          .update({
            zone_id,
            address,
            assignable,
          })
          .eq("id", existing.id);
        if (error) {
          result.errors.push({ row: rowNum, field: "—", message: error.message });
          result.skipped++;
        } else {
          result.updated++;
        }
      } else {
        result.skipped++;
      }
      continue;
    }

    const { error } = await db.from("venues").insert({
      name,
      address,
      zone_id,
      workspace_id: workspaceId,
      assignable,
      timezone: "America/Halifax",
    });

    if (error) {
      result.errors.push({ row: rowNum, field: "—", message: error.message });
      result.skipped++;
    } else {
      existingByName.set(name.toLowerCase(), { id: "new", name });
      result.inserted++;
    }
  }

  return result;
}

/** Parse GrayJay-style venue CSV text into bulk import rows. */
export function parseVenueCsvText(text: string): BulkVenueRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]!);
  const col = (aliases: string[], exactOnly = false) => {
    for (let i = 0; i < headers.length; i++) {
      const h = headers[i]!.toLowerCase().trim();
      if (exactOnly) {
        if (aliases.some((a) => h === a)) return i;
      } else if (aliases.some((a) => h === a || h.includes(a))) return i;
    }
    return -1;
  };

  const nameCol = col(["venue name", "name", "rink"]);
  const zoneCol = col(["zone"], true);
  const addressCol = col(["address"]);
  const cityCol = col(["city"]);
  const provinceCol = col(["province", "province/state", "state"]);
  const postalCol = col(["postal", "zip", "postal/zip code"]);

  const rows: BulkVenueRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]!);
    const name = decodeHtmlEntities((cells[nameCol] ?? "").trim());
    if (!name) continue;
    rows.push({
      name,
      zone: zoneCol !== -1 ? (cells[zoneCol] ?? "").trim() || undefined : undefined,
      address: addressCol !== -1 ? (cells[addressCol] ?? "").trim() || undefined : undefined,
      city: cityCol !== -1 ? (cells[cityCol] ?? "").trim() || undefined : undefined,
      province: provinceCol !== -1 ? (cells[provinceCol] ?? "").trim() || undefined : undefined,
      postal: postalCol !== -1 ? (cells[postalCol] ?? "").trim() || undefined : undefined,
      assignable: true,
    });
  }
  return rows;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else current += ch;
  }
  result.push(current);
  return result;
}
