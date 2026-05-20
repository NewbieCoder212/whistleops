import type { Position, PositionLabelsConfig } from "../types";

export const DEFAULT_POSITION_LABELS: PositionLabelsConfig = {
  REF1: { label: "Referee 1", abbr: "R1", show_on_assignment: true },
  REF2: { label: "Referee 2", abbr: "R2", show_on_assignment: true },
  LINE1: { label: "Linesman 1", abbr: "L1", show_on_assignment: true },
  LINE2: { label: "Linesman 2", abbr: "L2", show_on_assignment: true },
  SUPERVISOR: { label: "Supervisor", abbr: "SV", show_on_assignment: true },
};

export function parsePositionLabels(raw: unknown): PositionLabelsConfig {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_POSITION_LABELS };
  const o = raw as Record<string, unknown>;
  const out = { ...DEFAULT_POSITION_LABELS };
  for (const key of Object.keys(DEFAULT_POSITION_LABELS) as Position[]) {
    const entry = o[key];
    if (entry && typeof entry === "object") {
      const e = entry as Record<string, unknown>;
      out[key] = {
        label: typeof e.label === "string" ? e.label : out[key].label,
        abbr: typeof e.abbr === "string" ? e.abbr : out[key].abbr,
        show_on_assignment:
          typeof e.show_on_assignment === "boolean"
            ? e.show_on_assignment
            : out[key].show_on_assignment,
      };
    }
  }
  return out;
}

export function getAssignmentSlotPositions(config: PositionLabelsConfig) {
  const keys: Position[] = ["REF1", "REF2", "LINE1", "LINE2", "SUPERVISOR"];
  return keys
    .filter((k) => config[k].show_on_assignment)
    .map((key) => ({
      key,
      label: config[key].label,
      abbr: config[key].abbr,
      group: key.startsWith("LINE") ? ("line" as const) : ("ref" as const),
    }));
}
