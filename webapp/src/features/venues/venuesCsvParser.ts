import type { BulkVenueRow } from "@shared/types";

export interface ParsedVenueRow extends BulkVenueRow {
  _rowIndex: number;
}

export interface VenueParseError {
  row: number;
  message: string;
}

export interface VenuesCsvParseResult {
  rows: ParsedVenueRow[];
  errors: VenueParseError[];
  rawHeaders: string[];
}

const COL_ALIASES: Record<string, string[]> = {
  name: ["venue name", "name", "rink", "venue"],
  zone: ["zone"],
  address: ["address"],
  city: ["city"],
  province: ["province", "province/state", "state"],
  postal: ["postal", "zip", "postal/zip code", "postal code"],
};

function detectColumn(headers: string[], field: keyof typeof COL_ALIASES): number {
  const aliases = COL_ALIASES[field]!;
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i]!.toLowerCase().trim();
    if (field === "zone") {
      if (h === "zone") return i;
      continue;
    }
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

function decodeHtmlEntities(text: string): string {
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
      };
      return map[name] ?? `&${name};`;
    })
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

export function parseVenuesCsv(text: string): VenuesCsvParseResult {
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
    name: detectColumn(rawHeaders, "name"),
    zone: detectColumn(rawHeaders, "zone"),
    address: detectColumn(rawHeaders, "address"),
    city: detectColumn(rawHeaders, "city"),
    province: detectColumn(rawHeaders, "province"),
    postal: detectColumn(rawHeaders, "postal"),
  };

  if (colMap.name === -1) {
    return {
      rows: [],
      errors: [
        {
          row: 0,
          message: `Required column "Venue Name" not found. Headers: ${rawHeaders.join(", ")}`,
        },
      ],
      rawHeaders,
    };
  }

  const rows: ParsedVenueRow[] = [];
  const errors: VenueParseError[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]!);
    const rowNum = i;
    const name = decodeHtmlEntities((cells[colMap.name] ?? "").trim());
    const zoneRaw = colMap.zone !== -1 ? (cells[colMap.zone] ?? "").trim() : "";

    const rowErrors: string[] = [];
    if (!name) rowErrors.push("Venue name is empty");
    if (zoneRaw && !/^[1-9]$/.test(zoneRaw)) {
      rowErrors.push(`Zone must be 1–9 (got "${zoneRaw}")`);
    }

    const row: ParsedVenueRow = {
      _rowIndex: rowNum,
      name,
      assignable: true,
      ...(zoneRaw ? { zone: zoneRaw } : {}),
      ...(colMap.address !== -1 && cells[colMap.address]
        ? { address: cells[colMap.address]!.trim() }
        : {}),
      ...(colMap.city !== -1 && cells[colMap.city]
        ? { city: cells[colMap.city]!.trim() }
        : {}),
      ...(colMap.province !== -1 && cells[colMap.province]
        ? { province: cells[colMap.province]!.trim() }
        : {}),
      ...(colMap.postal !== -1 && cells[colMap.postal]
        ? { postal: cells[colMap.postal]!.trim() }
        : {}),
    };

    if (rowErrors.length > 0) {
      for (const msg of rowErrors) errors.push({ row: rowNum, message: msg });
    }
    rows.push(row);
  }

  return { rows, errors, rawHeaders };
}
