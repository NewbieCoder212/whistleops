import type { BulkOfficialRow } from "@shared/types";

export interface ParsedOfficialRow extends BulkOfficialRow {
  _rowIndex: number;
}

export interface OfficialParseError {
  row: number;
  message: string;
}

export interface OfficialsCsvParseResult {
  rows: ParsedOfficialRow[];
  errors: OfficialParseError[];
  rawHeaders: string[];
}

const COL_ALIASES: Record<keyof BulkOfficialRow, string[]> = {
  full_name: ["name", "full name", "full_name", "official name"],
  email: ["email", "e-mail"],
  cell_phone: ["phone", "cell", "cell phone", "cell_phone", "mobile"],
  jersey_number: ["jersey", "jersey number", "jersey_number", "#"],
  official_type: ["type", "official type", "official_type", "referee type"],
  certification_level: ["level", "certification", "cert level", "certification level"],
  zone_name: ["zone", "zone name", "region"],
  distance_km: ["distance", "distance km", "distance_km", "km"],
  role: ["role"],
};

function detectColumn(headers: string[], field: keyof BulkOfficialRow): number {
  const aliases = COL_ALIASES[field];
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i]!.toLowerCase().trim();
    if (aliases.some((a) => h === a || h.includes(a))) return i;
  }
  return -1;
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

function parseOfficialType(raw: string): "REFEREE" | "LINESMAN" | undefined {
  const k = raw.trim().toLowerCase();
  if (!k) return undefined;
  if (k.includes("line")) return "LINESMAN";
  if (k.includes("ref")) return "REFEREE";
  return undefined;
}

export function parseOfficialsCsv(text: string): OfficialsCsvParseResult {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    return {
      rows: [],
      errors: [{ row: 0, message: "File is empty or has no data rows." }],
      rawHeaders: [],
    };
  }

  const rawHeaders = parseCsvLine(lines[0]!);
  const colMap = {
    full_name: detectColumn(rawHeaders, "full_name"),
    email: detectColumn(rawHeaders, "email"),
    cell_phone: detectColumn(rawHeaders, "cell_phone"),
    jersey_number: detectColumn(rawHeaders, "jersey_number"),
    official_type: detectColumn(rawHeaders, "official_type"),
    certification_level: detectColumn(rawHeaders, "certification_level"),
    zone_name: detectColumn(rawHeaders, "zone_name"),
    distance_km: detectColumn(rawHeaders, "distance_km"),
    role: detectColumn(rawHeaders, "role"),
  };

  const missing = Object.entries(colMap)
    .filter(([k, v]) => v === -1 && (k === "full_name" || k === "email"))
    .map(([k]) => k);

  if (missing.length > 0) {
    return {
      rows: [],
      errors: [
        {
          row: 0,
          message: `Required columns not found: ${missing.join(", ")}. Headers: ${rawHeaders.join(", ")}`,
        },
      ],
      rawHeaders,
    };
  }

  const rows: ParsedOfficialRow[] = [];
  const errors: OfficialParseError[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]!);
    const rowNum = i;
    const full_name = (cells[colMap.full_name] ?? "").trim();
    const email = (cells[colMap.email] ?? "").trim();
    const distanceRaw =
      colMap.distance_km !== -1 ? (cells[colMap.distance_km] ?? "").trim() : "";
    const distance_km = distanceRaw ? parseFloat(distanceRaw) : undefined;

    const rowErrors: string[] = [];
    if (!full_name) rowErrors.push("Name is empty");
    if (!email) rowErrors.push("Email is empty");
    if (distanceRaw && Number.isNaN(distance_km)) rowErrors.push(`Invalid distance "${distanceRaw}"`);

    const official_type =
      colMap.official_type !== -1
        ? parseOfficialType(cells[colMap.official_type] ?? "")
        : undefined;

    const row: ParsedOfficialRow = {
      _rowIndex: rowNum,
      full_name,
      email,
      role: "OFFICIAL",
      ...(colMap.cell_phone !== -1 && cells[colMap.cell_phone]
        ? { cell_phone: cells[colMap.cell_phone]!.trim() }
        : {}),
      ...(colMap.jersey_number !== -1 && cells[colMap.jersey_number]
        ? { jersey_number: cells[colMap.jersey_number]!.trim() }
        : {}),
      ...(official_type ? { official_type } : {}),
      ...(colMap.certification_level !== -1 && cells[colMap.certification_level]
        ? { certification_level: cells[colMap.certification_level]!.trim() }
        : {}),
      ...(colMap.zone_name !== -1 && cells[colMap.zone_name]
        ? { zone_name: cells[colMap.zone_name]!.trim() }
        : {}),
      ...(distance_km !== undefined && !Number.isNaN(distance_km) ? { distance_km } : {}),
    };

    if (rowErrors.length > 0) {
      for (const msg of rowErrors) errors.push({ row: rowNum, message: msg });
    }
    rows.push(row);
  }

  return { rows, errors, rawHeaders };
}
