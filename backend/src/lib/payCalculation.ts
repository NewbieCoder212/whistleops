import type {
  AssigningFee,
  DivisionPayRatesRow,
  LeagueType,
  PayRatesMatrix,
  Position,
  RateSource,
} from "../types";
import { AssigningFeeSchema, DivisionPayRatesRowSchema, LeagueTypeEnum } from "../types";
import { WORKSPACE_TIMEZONE } from "./availabilityMatch";

export const DEFAULT_POSITION_RATES = {
  REF1: 75,
  REF2: 65,
  LINE1: 55,
  LINE2: 55,
  SUPERVISOR: 85,
} as const;

export const DEFAULT_COST_PER_KM = 0.42;

export const DEFAULT_ASSIGNING_FEE: AssigningFee = { amount: 10, mode: "percent" };

export const DEFAULT_PAY_RATES: PayRatesMatrix["default"] = {
  ...DEFAULT_POSITION_RATES,
  cost_per_km: DEFAULT_COST_PER_KM,
};

/** Full matrix returned when settings.pay_rates has not been saved yet. */
export const DEFAULT_PAY_RATES_MATRIX: PayRatesMatrix = {
  default: DEFAULT_PAY_RATES,
};

/** Map external CSV / game-sheet labels to provincial league_type enum. */
const LEAGUE_TYPE_ALIASES: Record<string, LeagueType> = {
  minor: "Minor",
  "minor hockey": "Minor",
  youth: "Minor",
  junior: "Minor",
  senior: "Senior",
  "senior hockey": "Senior",
  "adult rec": "Adult Rec",
  "adult recreational": "Adult Rec",
  recreational: "Adult Rec",
  rec: "Adult Rec",
  adult: "Adult Rec",
};

export function normalizeLeagueType(raw: string | null | undefined): LeagueType | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;

  const exact = LeagueTypeEnum.safeParse(trimmed);
  if (exact.success) return exact.data;

  const key = trimmed.toLowerCase();
  if (LEAGUE_TYPE_ALIASES[key]) return LEAGUE_TYPE_ALIASES[key];

  if (key.includes("minor") || key.includes("youth") || key.includes("midget") || key.includes("bantam")) {
    return "Minor";
  }
  if (key.includes("senior")) return "Senior";
  if (key.includes("rec") || key.includes("adult")) return "Adult Rec";

  return null;
}

function normalizeDivisionRow(raw: unknown): DivisionPayRatesRow {
  const base =
    raw && typeof raw === "object"
      ? (raw as Record<string, unknown>)
      : {};
  const parsed = DivisionPayRatesRowSchema.safeParse({
    REF1: Number(base.REF1) || DEFAULT_POSITION_RATES.REF1,
    REF2: Number(base.REF2) || DEFAULT_POSITION_RATES.REF2,
    LINE1: Number(base.LINE1) || DEFAULT_POSITION_RATES.LINE1,
    LINE2: Number(base.LINE2) || DEFAULT_POSITION_RATES.LINE2,
    SUPERVISOR: Number(base.SUPERVISOR) || DEFAULT_POSITION_RATES.SUPERVISOR,
    TIMEKEEPER: Number(base.TIMEKEEPER) || 0,
    travel_pay_enabled: base.travel_pay_enabled !== false,
    cost_per_km:
      typeof base.cost_per_km === "number" && base.cost_per_km >= 0
        ? base.cost_per_km
        : undefined,
    assigning_fee:
      base.assigning_fee && typeof base.assigning_fee === "object"
        ? AssigningFeeSchema.safeParse(base.assigning_fee).success
          ? AssigningFeeSchema.parse(base.assigning_fee)
          : DEFAULT_ASSIGNING_FEE
        : DEFAULT_ASSIGNING_FEE,
    cash_games_default: Boolean(base.cash_games_default),
  });
  return parsed.success ? parsed.data : DivisionPayRatesRowSchema.parse({});
}

/** Accept legacy flat pay_rates JSON or new matrix shape from settings. */
export function parsePayRates(raw: unknown): PayRatesMatrix {
  if (!raw || typeof raw !== "object") {
    return { default: { ...DEFAULT_PAY_RATES } };
  }

  const o = raw as Record<string, unknown>;

  if (typeof o.REF1 === "number") {
    return {
      default: {
        REF1: Number(o.REF1) || DEFAULT_POSITION_RATES.REF1,
        REF2: Number(o.REF2) || DEFAULT_POSITION_RATES.REF2,
        LINE1: Number(o.LINE1) || DEFAULT_POSITION_RATES.LINE1,
        LINE2: Number(o.LINE2) || DEFAULT_POSITION_RATES.LINE2,
        SUPERVISOR: Number(o.SUPERVISOR) || DEFAULT_POSITION_RATES.SUPERVISOR,
        cost_per_km: Number(o.cost_per_km) || DEFAULT_COST_PER_KM,
      },
    };
  }

  const def = (o.default as Record<string, unknown>) ?? {};
  const matrix: PayRatesMatrix = {
    default: {
      REF1: Number(def.REF1) || DEFAULT_POSITION_RATES.REF1,
      REF2: Number(def.REF2) || DEFAULT_POSITION_RATES.REF2,
      LINE1: Number(def.LINE1) || DEFAULT_POSITION_RATES.LINE1,
      LINE2: Number(def.LINE2) || DEFAULT_POSITION_RATES.LINE2,
      SUPERVISOR: Number(def.SUPERVISOR) || DEFAULT_POSITION_RATES.SUPERVISOR,
      cost_per_km: Number(def.cost_per_km) || DEFAULT_COST_PER_KM,
    },
  };

  if (o.by_league_type && typeof o.by_league_type === "object") {
    matrix.by_league_type = o.by_league_type as PayRatesMatrix["by_league_type"];
  }
  if (o.by_league_tier && typeof o.by_league_tier === "object") {
    const tiers: Record<string, DivisionPayRatesRow> = {};
    for (const [key, val] of Object.entries(o.by_league_tier as Record<string, unknown>)) {
      if (key.trim()) tiers[key.trim()] = normalizeDivisionRow(val);
    }
    if (Object.keys(tiers).length > 0) matrix.by_league_tier = tiers;
  }

  return matrix;
}

function tierKey(tier: string | null | undefined): string | null {
  const k = tier?.trim();
  return k ? k : null;
}

function findTierRow(
  matrix: PayRatesMatrix,
  tier: string | null | undefined
): DivisionPayRatesRow | null {
  const k = tierKey(tier);
  if (!k || !matrix.by_league_tier) return null;
  const row =
    matrix.by_league_tier[k] ??
    matrix.by_league_tier[k.toLowerCase()] ??
    Object.entries(matrix.by_league_tier).find(
      ([name]) => name.toLowerCase() === k.toLowerCase()
    )?.[1];
  return row ?? null;
}

export type GamePayContext = {
  league_tier?: string | null;
  league_type?: string | null;
  is_cash_game?: boolean | null;
};

export function resolveDivisionRow(
  matrix: PayRatesMatrix,
  game: GamePayContext
): DivisionPayRatesRow | null {
  return findTierRow(matrix, game.league_tier);
}

function positionRateFromRow(
  rates: { REF1: number; REF2: number; LINE1: number; LINE2: number; SUPERVISOR: number } | undefined,
  position: Position
): number | undefined {
  if (!rates) return undefined;
  const v = rates[position];
  return typeof v === "number" ? v : undefined;
}

export function resolveGameFee(
  matrix: PayRatesMatrix,
  game: GamePayContext,
  position: Position
): { fee: number; rate_source: RateSource; rate_label: string | null } {
  const tier = tierKey(game.league_tier);
  const tierRow = findTierRow(matrix, game.league_tier);
  if (tier && tierRow) {
    const fee = positionRateFromRow(tierRow, position);
    if (fee !== undefined) {
      return { fee, rate_source: "tier", rate_label: tier };
    }
  }

  const leagueType = normalizeLeagueType(game.league_type);
  if (leagueType && matrix.by_league_type?.[leagueType]) {
    const fee = positionRateFromRow(matrix.by_league_type[leagueType], position);
    if (fee !== undefined) {
      return { fee, rate_source: "type", rate_label: leagueType };
    }
  }

  const fee = positionRateFromRow(matrix.default, position) ?? 0;
  return { fee, rate_source: "default", rate_label: null };
}

export function resolveAssigningFeeDeduction(
  grossFee: number,
  tierRow: DivisionPayRatesRow | null
): number {
  if (!tierRow) return 0;
  const { amount, mode } = tierRow.assigning_fee;
  if (mode === "percent") return grossFee * (amount / 100);
  return amount;
}

export function resolveCashGameFlag(
  game: GamePayContext,
  tierRow: DivisionPayRatesRow | null
): boolean {
  if (game.is_cash_game === true) return true;
  if (game.is_cash_game === false) return false;
  return tierRow?.cash_games_default ?? false;
}

export function resolveMileage(
  matrix: PayRatesMatrix,
  game: GamePayContext,
  distanceKm: number | null | undefined
): {
  mileage_km: number;
  mileage_payout: number;
  cost_per_km: number;
  travel_pay_enabled: boolean;
} {
  const tierRow = findTierRow(matrix, game.league_tier);
  const travelEnabled = tierRow ? tierRow.travel_pay_enabled !== false : true;
  const dist = distanceKm ?? 0;
  const costPerKm = tierRow?.cost_per_km ?? matrix.default.cost_per_km;
  const mileageKm = dist * 2;

  if (!travelEnabled) {
    return {
      mileage_km: 0,
      mileage_payout: 0,
      cost_per_km: costPerKm,
      travel_pay_enabled: false,
    };
  }

  return {
    mileage_km: mileageKm,
    mileage_payout: mileageKm * costPerKm,
    cost_per_km: costPerKm,
    travel_pay_enabled: true,
  };
}

/** Gross fee, assigning deduction, and net fee for one assignment. */
export function resolveAssignmentPay(
  matrix: PayRatesMatrix,
  game: GamePayContext,
  position: Position,
  distanceKm: number | null | undefined
): {
  gross_game_fee: number;
  assigning_fee_deduction: number;
  game_fee: number;
  mileage_km: number;
  mileage_payout: number;
  cost_per_km: number;
  rate_source: RateSource;
  rate_label: string | null;
  cash_game: boolean;
  travel_pay_enabled: boolean;
} {
  const tierRow = findTierRow(matrix, game.league_tier);
  const { fee: gross, rate_source, rate_label } = resolveGameFee(matrix, game, position);
  const assigning_fee_deduction = resolveAssigningFeeDeduction(gross, tierRow);
  const game_fee = Math.max(0, gross - assigning_fee_deduction);
  const mileage = resolveMileage(matrix, game, distanceKm);

  return {
    gross_game_fee: gross,
    assigning_fee_deduction,
    game_fee,
    mileage_km: mileage.mileage_km,
    mileage_payout: mileage.mileage_payout,
    cost_per_km: mileage.cost_per_km,
    rate_source,
    rate_label,
    cash_game: resolveCashGameFlag(game, tierRow),
    travel_pay_enabled: mileage.travel_pay_enabled,
  };
}

/** NB hockey season: Sept 1 through Aug 31 (by Atlantic calendar). */
export function getNBSeasonForDate(
  date: Date,
  timeZone = WORKSPACE_TIMEZONE
): { start: string; end: string; label: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "numeric",
  }).formatToParts(date);
  const y = parseInt(parts.find((p) => p.type === "year")?.value ?? "2000", 10);
  const m = parseInt(parts.find((p) => p.type === "month")?.value ?? "1", 10) - 1;
  const startYear = m >= 8 ? y : y - 1;
  const endYear = startYear + 1;
  return {
    start: `${startYear}-09-01T00:00:00.000Z`,
    end: `${endYear}-08-31T23:59:59.999Z`,
    label: `${startYear}-${String(endYear).slice(2)}`,
  };
}

export function getCurrentNBSeason(): { start: string; end: string; label: string } {
  return getNBSeasonForDate(new Date());
}

export type SeasonBounds = { start: string; end: string; label: string };

/** Parse ?season_start=&season_end= or ?year=2025 (Sept 2025 – Aug 2026). */
export function resolveSeasonBounds(query: {
  season_start?: string;
  season_end?: string;
  year?: string;
}): SeasonBounds {
  const yearNum = query.year ? parseInt(query.year, 10) : NaN;
  if (!Number.isNaN(yearNum) && yearNum >= 2000 && yearNum <= 2100) {
    return {
      start: `${yearNum}-09-01T00:00:00.000Z`,
      end: `${yearNum + 1}-08-31T23:59:59.999Z`,
      label: `${yearNum}-${String(yearNum + 1).slice(2)}`,
    };
  }

  if (query.season_start && query.season_end) {
    const start = query.season_start.includes("T")
      ? query.season_start
      : `${query.season_start}T00:00:00.000Z`;
    const end = query.season_end.includes("T")
      ? query.season_end
      : `${query.season_end}T23:59:59.999Z`;
    return { start, end, label: `${query.season_start} – ${query.season_end}` };
  }

  return getCurrentNBSeason();
}

export function isGameInSeason(gameDateIso: string, bounds: SeasonBounds): boolean {
  const t = Date.parse(gameDateIso);
  if (Number.isNaN(t)) return false;
  return t >= Date.parse(bounds.start) && t <= Date.parse(bounds.end);
}

/** Season bounds, or an explicit date_from / date_to range (YYYY-MM-DD). */
export function resolveStatsDateBounds(query: {
  date_from?: string;
  date_to?: string;
  season_start?: string;
  season_end?: string;
  year?: string;
}): SeasonBounds {
  const from = query.date_from?.trim();
  const to = query.date_to?.trim();
  if (
    from &&
    to &&
    /^\d{4}-\d{2}-\d{2}$/.test(from) &&
    /^\d{4}-\d{2}-\d{2}$/.test(to)
  ) {
    return {
      start: `${from}T00:00:00.000Z`,
      end: `${to}T23:59:59.999Z`,
      label: `${from} – ${to}`,
    };
  }
  return resolveSeasonBounds(query);
}
