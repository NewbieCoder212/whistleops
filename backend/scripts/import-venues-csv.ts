/**
 * One-off: import GrayJay-style venue/rink CSV into Supabase venues.
 * Usage: bun run scripts/import-venues-csv.ts <path-to.csv> [--update-existing]
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { parseVenueCsvText, runBulkVenueImport } from "../src/lib/venueImport";

const csvPath = process.argv[2];
const updateExisting = process.argv.includes("--update-existing");
const WORKSPACE_ID = "00000000-0000-4000-8000-000000000001";

if (!csvPath) {
  console.error("Usage: bun run scripts/import-venues-csv.ts <path-to.csv> [--update-existing]");
  process.exit(1);
}

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env");
  process.exit(1);
}

const text = readFileSync(csvPath, "utf8");
const rows = parseVenueCsvText(text);
if (rows.length === 0) {
  console.error("No venue rows parsed from CSV.");
  process.exit(1);
}

console.log(`Parsed ${rows.length} rows from ${csvPath}`);

const db = createClient(url, key, { auth: { persistSession: false } });
const result = await runBulkVenueImport(db, WORKSPACE_ID, rows, { updateExisting });

console.log(
  `Done: ${result.inserted} inserted, ${result.updated} updated, ${result.skipped} skipped`
);
if (result.errors.length > 0) {
  console.log("Errors:");
  for (const e of result.errors.slice(0, 20)) {
    console.log(`  Row ${e.row} (${e.field}): ${e.message}`);
  }
  if (result.errors.length > 20) {
    console.log(`  ... and ${result.errors.length - 20} more`);
  }
}
