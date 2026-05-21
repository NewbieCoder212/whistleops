import type { AssigningFee, DivisionPayRatesRow, PayRatesMatrix } from "@shared/types";

export const DEFAULT_MATRIX: PayRatesMatrix = {
  default: {
    REF1: 75,
    REF2: 65,
    LINE1: 55,
    LINE2: 55,
    SUPERVISOR: 85,
    cost_per_km: 0.42,
  },
};

export function emptyDivisionRow(fallback?: Partial<DivisionPayRatesRow>): DivisionPayRatesRow {
  return {
    REF1: fallback?.REF1 ?? DEFAULT_MATRIX.default.REF1,
    REF2: fallback?.REF2 ?? DEFAULT_MATRIX.default.REF2,
    LINE1: fallback?.LINE1 ?? DEFAULT_MATRIX.default.LINE1,
    LINE2: fallback?.LINE2 ?? DEFAULT_MATRIX.default.LINE2,
    SUPERVISOR: fallback?.SUPERVISOR ?? DEFAULT_MATRIX.default.SUPERVISOR,
    TIMEKEEPER: fallback?.TIMEKEEPER ?? 0,
    travel_pay_enabled: fallback?.travel_pay_enabled ?? true,
    cost_per_km: fallback?.cost_per_km,
    assigning_fee: fallback?.assigning_fee ?? { amount: 10, mode: "percent" },
    cash_games_default: fallback?.cash_games_default ?? false,
  };
}

function normalizeDivisionRow(raw: unknown): DivisionPayRatesRow {
  if (!raw || typeof raw !== "object") return emptyDivisionRow();
  const o = raw as Record<string, unknown>;
  const assigning =
    o.assigning_fee && typeof o.assigning_fee === "object"
      ? (o.assigning_fee as AssigningFee)
      : { amount: 10, mode: "percent" as const };
  return {
    REF1: Number(o.REF1) || 0,
    REF2: Number(o.REF2) || 0,
    LINE1: Number(o.LINE1) || 0,
    LINE2: Number(o.LINE2) || 0,
    SUPERVISOR: Number(o.SUPERVISOR) || 0,
    TIMEKEEPER: Number(o.TIMEKEEPER) || 0,
    travel_pay_enabled: o.travel_pay_enabled !== false,
    cost_per_km:
      typeof o.cost_per_km === "number" && o.cost_per_km >= 0 ? o.cost_per_km : undefined,
    assigning_fee: {
      amount: Number((assigning as AssigningFee).amount) || 0,
      mode: (assigning as AssigningFee).mode === "flat" ? "flat" : "percent",
    },
    cash_games_default: Boolean(o.cash_games_default),
  };
}

export function parseMatrix(value: unknown): PayRatesMatrix {
  if (!value || typeof value !== "object") return DEFAULT_MATRIX;
  const o = value as Record<string, unknown>;
  if (typeof o.REF1 === "number") {
    return {
      default: {
        REF1: Number(o.REF1) || 75,
        REF2: Number(o.REF2) || 65,
        LINE1: Number(o.LINE1) || 55,
        LINE2: Number(o.LINE2) || 55,
        SUPERVISOR: Number(o.SUPERVISOR) || 85,
        cost_per_km: Number(o.cost_per_km) || 0.42,
      },
      by_league_type: o.by_league_type as PayRatesMatrix["by_league_type"],
      by_league_tier: normalizeTierMap(o.by_league_tier),
    };
  }
  const def = (o.default as PayRatesMatrix["default"]) ?? DEFAULT_MATRIX.default;
  return {
    default: { ...DEFAULT_MATRIX.default, ...def },
    by_league_type: o.by_league_type as PayRatesMatrix["by_league_type"],
    by_league_tier: normalizeTierMap(o.by_league_tier),
  };
}

function normalizeTierMap(raw: unknown): PayRatesMatrix["by_league_tier"] {
  if (!raw || typeof raw !== "object") return undefined;
  const out: Record<string, DivisionPayRatesRow> = {};
  for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
    const k = key.trim();
    if (k) out[k] = normalizeDivisionRow(val);
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

export function tierEntries(matrix: PayRatesMatrix): Array<{ name: string; row: DivisionPayRatesRow }> {
  const tiers = matrix.by_league_tier ?? {};
  return Object.entries(tiers)
    .map(([name, row]) => ({ name, row }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function setTierRow(
  matrix: PayRatesMatrix,
  name: string,
  row: DivisionPayRatesRow
): PayRatesMatrix {
  const trimmed = name.trim();
  if (!trimmed) return matrix;
  return {
    ...matrix,
    by_league_tier: { ...matrix.by_league_tier, [trimmed]: row },
  };
}

export function removeTierRow(matrix: PayRatesMatrix, name: string): PayRatesMatrix {
  const tiers = { ...matrix.by_league_tier };
  delete tiers[name];
  return {
    ...matrix,
    by_league_tier: Object.keys(tiers).length > 0 ? tiers : undefined,
  };
}

export function mergeTiersFromSchedule(
  matrix: PayRatesMatrix,
  tierNames: string[]
): PayRatesMatrix {
  let next = { ...matrix, by_league_tier: { ...matrix.by_league_tier } };
  for (const name of tierNames) {
    const trimmed = name.trim();
    if (!trimmed || next.by_league_tier?.[trimmed]) continue;
    next = setTierRow(next, trimmed, emptyDivisionRow(matrix.default));
  }
  return next;
}
