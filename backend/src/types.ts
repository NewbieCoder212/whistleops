/**
 * Shared API contracts for WhistleOps.
 *
 * Single source of truth — imported by both backend and webapp.
 * Defined as Zod schemas so runtime validation and TS types stay in sync.
 */
import { z } from "zod";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const RoleEnum = z.enum(["ADMIN", "ASSIGNOR", "FINANCE", "OFFICIAL", "SUPERVISOR"]);
export type Role = z.infer<typeof RoleEnum>;

export const WorkspaceTypeEnum = z.enum(["province", "association", "league", "tournament"]);
export type WorkspaceType = z.infer<typeof WorkspaceTypeEnum>;

export const OfficialTypeEnum = z.enum(["REFEREE", "LINESMAN"]);
export type OfficialType = z.infer<typeof OfficialTypeEnum>;

/** Assignment slot positions on a game. */
export const PositionEnum = z.enum(["REF1", "REF2", "LINE1", "LINE2", "SUPERVISOR"]);
export type Position = z.infer<typeof PositionEnum>;

export const GameStatusEnum = z.enum(["UNASSIGNED", "ASSIGNED", "COMPLETED", "CANCELLED"]);
export type GameStatus = z.infer<typeof GameStatusEnum>;

export const AssignmentStatusEnum = z.enum([
  "DRAFT",
  "PENDING",
  "CONFIRMED",
  "REJECTED",
  "CANCELLED",
]);
export type AssignmentStatus = z.infer<typeof AssignmentStatusEnum>;

/** Provincial league tier classification. */
export const LeagueTypeEnum = z.enum(["Minor", "Senior", "Adult Rec"]);
export type LeagueType = z.infer<typeof LeagueTypeEnum>;

// ─── Reusable primitives ──────────────────────────────────────────────────────

const uuid = z.string().uuid();
const isoTs = z.string(); // ISO timestamp / date string from Postgres
const nullableText = z.string().nullable().optional();
const nullableNumber = z.number().nullable().optional();

// ─── certification_levels ─────────────────────────────────────────────────────

export const CertificationLevelSchema = z.object({
  id: uuid,
  name: z.string(),
  sort_order: z.number().int(),
  created_at: isoTs,
  updated_at: isoTs,
});
export type CertificationLevel = z.infer<typeof CertificationLevelSchema>;

export const CertificationLevelCreateSchema = z.object({
  name: z.string().min(1),
  sort_order: z.number().int().default(0),
});
export type CertificationLevelCreate = z.infer<typeof CertificationLevelCreateSchema>;

export const CertificationLevelUpdateSchema = CertificationLevelCreateSchema.partial();
export type CertificationLevelUpdate = z.infer<typeof CertificationLevelUpdateSchema>;

// ─── league_qualifications ────────────────────────────────────────────────────

export const LeagueQualificationSchema = z.object({
  id: uuid,
  league_name: z.string(),
  minimum_level_id: uuid,
  workspace_id: uuid.optional(),
  created_at: isoTs,
  updated_at: isoTs,
});
export type LeagueQualification = z.infer<typeof LeagueQualificationSchema>;

/** Joined read shape returned by GET /api/league-qualifications (includes the level row). */
export const LeagueQualificationWithLevelSchema = LeagueQualificationSchema.extend({
  minimum_level: CertificationLevelSchema.nullable(),
});
export type LeagueQualificationWithLevel = z.infer<typeof LeagueQualificationWithLevelSchema>;

export const LeagueQualificationCreateSchema = z.object({
  league_name: z.string().min(1),
  minimum_level_id: uuid,
});
export type LeagueQualificationCreate = z.infer<typeof LeagueQualificationCreateSchema>;

export const LeagueQualificationUpdateSchema = LeagueQualificationCreateSchema.partial();
export type LeagueQualificationUpdate = z.infer<typeof LeagueQualificationUpdateSchema>;

// ─── workspaces ───────────────────────────────────────────────────────────────

export const WorkspaceSchema = z.object({
  id: uuid,
  name: z.string(),
  slug: z.string(),
  type: WorkspaceTypeEnum,
  parent_workspace_id: uuid.nullable().optional(),
  created_at: isoTs,
  updated_at: isoTs,
});
export type Workspace = z.infer<typeof WorkspaceSchema>;

export const WorkspaceMemberSchema = z.object({
  id: uuid,
  workspace_id: uuid,
  profile_id: uuid,
  role: RoleEnum,
  created_at: isoTs,
  updated_at: isoTs,
});
export type WorkspaceMember = z.infer<typeof WorkspaceMemberSchema>;

export const WorkspaceWithRoleSchema = WorkspaceSchema.extend({
  member_role: RoleEnum,
});
export type WorkspaceWithRole = z.infer<typeof WorkspaceWithRoleSchema>;

export const WorkspaceCreateSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  type: WorkspaceTypeEnum,
  parent_workspace_id: uuid.optional(),
});
export type WorkspaceCreate = z.infer<typeof WorkspaceCreateSchema>;

// ─── zones ────────────────────────────────────────────────────────────────────

export const ZoneSchema = z.object({
  id: uuid,
  name: z.string(),
  slug: z.string().nullable().optional(),
  sort_order: z.number().int(),
  created_at: isoTs,
  updated_at: isoTs,
});
export type Zone = z.infer<typeof ZoneSchema>;

export const ZoneCreateSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/).optional(),
  sort_order: z.number().int().default(0),
});
export type ZoneCreate = z.infer<typeof ZoneCreateSchema>;

export const ZoneUpdateSchema = ZoneCreateSchema.partial();
export type ZoneUpdate = z.infer<typeof ZoneUpdateSchema>;

// ─── venues ───────────────────────────────────────────────────────────────────

export const VenueSchema = z.object({
  id: uuid,
  name: z.string(),
  address: nullableText,
  lat: nullableNumber,
  lng: nullableNumber,
  timezone: z.string(),
  zone_id: uuid.nullable().optional(),
  workspace_id: uuid.optional(),
  assignable: z.boolean().default(true),
  created_at: isoTs,
  updated_at: isoTs,
});
export type Venue = z.infer<typeof VenueSchema>;

export const VenueCreateSchema = z.object({
  name: z.string().min(1),
  address: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  timezone: z.string().default("America/Halifax"),
  zone_id: uuid.optional(),
  assignable: z.boolean().default(true),
});
export type VenueCreate = z.infer<typeof VenueCreateSchema>;

export const VenueUpdateSchema = VenueCreateSchema.partial();
export type VenueUpdate = z.infer<typeof VenueUpdateSchema>;

// ─── profiles ─────────────────────────────────────────────────────────────────

export const ProfileSchema = z.object({
  id: uuid,
  user_id: uuid.nullable(),
  email: z.string().email(),
  full_name: nullableText,
  jersey_number: nullableText,
  date_of_birth: nullableText,
  cell_phone: nullableText,
  role: RoleEnum,
  official_type: OfficialTypeEnum.nullable().optional(),
  official_level_id: uuid.nullable().optional(),
  home_address: nullableText,
  home_lat: nullableNumber,
  home_lng: nullableNumber,
  avatar_url: nullableText,
  distance_km: nullableNumber,
  zone_id: uuid.nullable().optional(),
  created_at: isoTs,
  updated_at: isoTs,
});
export type Profile = z.infer<typeof ProfileSchema>;

export const ProfileCreateSchema = z.object({
  user_id: uuid.optional(),
  send_invite: z.boolean().optional(),
  email: z.string().email(),
  full_name: z.string().optional(),
  jersey_number: z.string().optional(),
  date_of_birth: z.string().nullable().optional(),
  cell_phone: z.string().optional(),
  role: RoleEnum.default("OFFICIAL"),
  official_type: OfficialTypeEnum.optional(),
  official_level_id: uuid.optional(),
  home_address: z.string().optional(),
  home_lat: z.number().optional(),
  home_lng: z.number().optional(),
  avatar_url: z.string().url().optional(),
  distance_km: z.number().optional(),
  zone_id: uuid.optional(),
});
export type ProfileCreate = z.infer<typeof ProfileCreateSchema>;

export const ProfileUpdateSchema = ProfileCreateSchema.partial();
export type ProfileUpdate = z.infer<typeof ProfileUpdateSchema>;

export const BulkOfficialRowSchema = z.object({
  full_name: z.string().min(1),
  email: z.string().email(),
  cell_phone: z.string().optional(),
  jersey_number: z.string().optional(),
  official_type: OfficialTypeEnum.optional(),
  certification_level: z.string().optional(),
  zone_name: z.string().optional(),
  distance_km: z.number().optional(),
  role: RoleEnum.default("OFFICIAL"),
});
export type BulkOfficialRow = z.infer<typeof BulkOfficialRowSchema>;

export const BulkOfficialImportPayloadSchema = z.object({
  rows: z.array(BulkOfficialRowSchema),
  send_invites: z.boolean().default(false),
});
export type BulkOfficialImportPayload = z.infer<typeof BulkOfficialImportPayloadSchema>;

export const BulkOfficialImportResultSchema = z.object({
  inserted: z.number(),
  skipped: z.number(),
  invited: z.number(),
  errors: z.array(
    z.object({ row: z.number(), field: z.string(), message: z.string() })
  ),
});
export type BulkOfficialImportResult = z.infer<typeof BulkOfficialImportResultSchema>;

// ─── games ────────────────────────────────────────────────────────────────────

export const GameSchema = z.object({
  id: uuid,
  date_time: isoTs,
  venue_id: uuid.nullable(),
  workspace_id: uuid.optional(),
  status: GameStatusEnum,
  home_team: nullableText,
  away_team: nullableText,
  league_tier: nullableText,
  league_type: LeagueTypeEnum.nullable().optional(),
  is_cash_game: z.boolean().default(false),
  notes: nullableText,
  game_number: z.number().int().nullable().optional(),
  gamesheet_external_id: nullableText,
  home_score: z.number().int().nullable().optional(),
  away_score: z.number().int().nullable().optional(),
  gamesheet_synced_at: isoTs.nullable().optional(),
  gamesheet_status: nullableText,
  created_at: isoTs,
  updated_at: isoTs,
});
export type Game = z.infer<typeof GameSchema>;

export const GameCreateSchema = z.object({
  date_time: z.string(),
  venue_id: uuid.nullable().optional(),
  status: GameStatusEnum.default("UNASSIGNED"),
  home_team: z.string().optional(),
  away_team: z.string().optional(),
  league_tier: nullableText,
  league_type: LeagueTypeEnum.nullable().optional(),
  is_cash_game: z.boolean().optional(),
  notes: nullableText,
  game_number: z.number().int().nullable().optional(),
  gamesheet_external_id: nullableText,
  home_score: z.number().int().nullable().optional(),
  away_score: z.number().int().nullable().optional(),
});
export type GameCreate = z.infer<typeof GameCreateSchema>;

export const GameUpdateSchema = GameCreateSchema.partial();
export type GameUpdate = z.infer<typeof GameUpdateSchema>;

// ─── gamesheet webhooks ───────────────────────────────────────────────────────

const gamesheetGameFields = z
  .object({
    id: z.union([z.string(), z.number()]).optional(),
    game_id: z.union([z.string(), z.number()]).optional(),
    external_id: z.string().optional(),
    status: z.string().optional(),
    home_score: z.number().optional(),
    away_score: z.number().optional(),
    home_team: z.string().optional(),
    away_team: z.string().optional(),
    game_number: z.number().int().optional(),
    scheduled_at: z.string().optional(),
    date_time: z.string().optional(),
  })
  .passthrough();

/** Permissive envelope until Gamesheet provides official webhook docs. */
export const GamesheetWebhookPayloadSchema = z
  .object({
    event: z.string().optional(),
    type: z.string().optional(),
    game_id: z.union([z.string(), z.number()]).optional(),
    external_id: z.string().optional(),
    id: z.union([z.string(), z.number()]).optional(),
    status: z.string().optional(),
    home_score: z.number().optional(),
    away_score: z.number().optional(),
    home_team: z.string().optional(),
    away_team: z.string().optional(),
    game_number: z.number().int().optional(),
    scheduled_at: z.string().optional(),
    date_time: z.string().optional(),
    game: gamesheetGameFields.optional(),
    data: gamesheetGameFields.optional(),
  })
  .passthrough();
export type GamesheetWebhookPayload = z.infer<typeof GamesheetWebhookPayloadSchema>;

export const GamesheetWebhookResultSchema = z.object({
  ok: z.literal(true),
  matched: z.boolean(),
  game_id: uuid.optional(),
  reason: z.string().optional(),
});
export type GamesheetWebhookResult = z.infer<typeof GamesheetWebhookResultSchema>;

// ─── assignments ──────────────────────────────────────────────────────────────

export const AssignmentSchema = z.object({
  id: uuid,
  game_id: uuid,
  official_id: uuid,
  position: PositionEnum,
  status: AssignmentStatusEnum,
  cancel_reason: nullableText,
  payout_approved: z.boolean(),
  created_at: isoTs,
  updated_at: isoTs,
});
export type Assignment = z.infer<typeof AssignmentSchema>;

export const AssignmentCreateSchema = z.object({
  game_id: uuid,
  official_id: uuid,
  position: PositionEnum,
  status: AssignmentStatusEnum.default("DRAFT"),
});
export type AssignmentCreate = z.infer<typeof AssignmentCreateSchema>;

// ─── assign board ─────────────────────────────────────────────────────────────

export const AvailabilityStatusEnum = z.enum([
  "available",
  "unavailable",
  "busy",
  "no_submission",
]);
export type AvailabilityStatus = z.infer<typeof AvailabilityStatusEnum>;

export const AssignBoardSlotHintEnum = z.enum(["open_green", "open_amber", "open_red", "filled"]);
export type AssignBoardSlotHint = z.infer<typeof AssignBoardSlotHintEnum>;

const assignBoardOfficialSnap = z.object({
  id: uuid,
  full_name: nullableText,
  official_type: OfficialTypeEnum.nullable().optional(),
  email: z.string().optional(),
});

export const AssignBoardAssignmentSchema = AssignmentSchema.extend({
  official: assignBoardOfficialSnap.nullable().optional(),
});

export const AssignBoardSlotSchema = z.object({
  position: PositionEnum,
  assignment: AssignBoardAssignmentSchema.nullable().optional(),
  available_qualified_count: z.number().int(),
  slot_hint: AssignBoardSlotHintEnum,
});

export const AssignBoardGameSchema = GameSchema.extend({
  venue: z
    .object({
      id: uuid,
      name: z.string(),
      timezone: z.string().optional(),
      zone_id: uuid.nullable().optional(),
    })
    .nullable()
    .optional(),
  assignments: z.array(AssignBoardAssignmentSchema).default([]),
  game_hour: z.number().int(),
  slots: z.array(AssignBoardSlotSchema),
});

export const AssignBoardOfficialAssignmentSchema = z.object({
  game_id: uuid,
  position: PositionEnum,
  game_hour: z.number().int(),
});

export const AssignBoardOfficialSchema = z.object({
  official_id: uuid,
  full_name: nullableText,
  email: z.string(),
  official_type: OfficialTypeEnum.nullable().optional(),
  official_level_id: uuid.nullable().optional(),
  official_level_name: z.string().nullable().optional(),
  time_slots: z.array(z.number().int()),
  busy_hours: z.array(z.number().int()),
  assignments_today: z.array(AssignBoardOfficialAssignmentSchema),
});

export const AssignBoardSummarySchema = z.object({
  games_count: z.number().int(),
  open_slots_count: z.number().int(),
  officials_count: z.number().int(),
  officials_with_submission_count: z.number().int(),
  /** ISO date_time of earliest game with at least one open slot, or null */
  next_unassigned_game_at: z.string().nullable().optional(),
  draft_assignments_count: z.number().int().default(0),
  pending_assignments_count: z.number().int().default(0),
  confirmed_assignments_count: z.number().int().default(0),
  declined_assignments_count: z.number().int().default(0),
  games_awaiting_confirmation_count: z.number().int().default(0),
});
export type AssignBoardSummary = z.infer<typeof AssignBoardSummarySchema>;

export const AssignBoardPublishSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  zoneId: uuid,
  leagueType: z.string().optional(),
});
export type AssignBoardPublish = z.infer<typeof AssignBoardPublishSchema>;

export const AssignBoardPublishResultSchema = z.object({
  published_count: z.number().int(),
  officials_notified: z.number().int(),
  emails_sent: z.number().int(),
  emails_failed: z.array(
    z.object({
      email: z.string(),
      error: z.string(),
    })
  ),
  email_skipped: z.boolean().optional(),
});
export type AssignBoardPublishResult = z.infer<typeof AssignBoardPublishResultSchema>;

export const AssignBoardHintsSchema = z.object({
  games_on_date: z.number().int(),
  games_in_zone: z.number().int(),
  games_without_rink: z.number().int(),
  /** Rink names for games on this date that have no zone assigned */
  rinks_missing_zone: z.array(z.string()),
  games_other_zone: z.number().int(),
});
export type AssignBoardHints = z.infer<typeof AssignBoardHintsSchema>;

export const AssignBoardSchema = z.object({
  date: z.string(),
  zone_id: uuid,
  zone_name: z.string(),
  games: z.array(AssignBoardGameSchema),
  officials: z.array(AssignBoardOfficialSchema),
  summary: AssignBoardSummarySchema,
  hints: AssignBoardHintsSchema.optional(),
});
export type AssignBoard = z.infer<typeof AssignBoardSchema>;

export const AssignmentUpdateSchema = z.object({
  official_id: uuid.optional(),
  status: AssignmentStatusEnum.optional(),
  position: PositionEnum.optional(),
  cancel_reason: z.string().optional(),
});
export type AssignmentUpdate = z.infer<typeof AssignmentUpdateSchema>;

// ─── settings ─────────────────────────────────────────────────────────────────

export const SettingSchema = z.object({
  key: z.string(),
  workspace_id: uuid.optional(),
  value: z.unknown(),
  updated_at: isoTs,
});
export type Setting = z.infer<typeof SettingSchema>;

export const SettingUpsertSchema = z.object({
  value: z.unknown(),
});
export type SettingUpsert = z.infer<typeof SettingUpsertSchema>;

// ─── bulk game import ─────────────────────────────────────────────────────────

export const BulkGameRowSchema = z.object({
  date: z.string(),             // YYYY-MM-DD
  time: z.string(),             // HH:MM (24-hr)
  venue_name: z.string(),
  home_team: z.string(),
  away_team: z.string(),
  league_tier: z.string().optional().default(""),
  league_type: LeagueTypeEnum.optional(),
  game_number: z.number().int().positive().optional(),
});
export type BulkGameRow = z.infer<typeof BulkGameRowSchema>;

export const BulkImportPayloadSchema = z.object({
  rows: z.array(BulkGameRowSchema),
});
export type BulkImportPayload = z.infer<typeof BulkImportPayloadSchema>;

export const BulkImportResultSchema = z.object({
  inserted: z.number(),
  skipped: z.number(),
  errors: z.array(
    z.object({ row: z.number(), field: z.string(), message: z.string() })
  ),
});
export type BulkImportResult = z.infer<typeof BulkImportResultSchema>;

// ─── pay rates & report ───────────────────────────────────────────────────────

export const RateSourceEnum = z.enum(["tier", "type", "default"]);
export type RateSource = z.infer<typeof RateSourceEnum>;

/** Per-position game fees (no mileage). */
export const PositionRatesSchema = z.object({
  REF1: z.number(),
  REF2: z.number(),
  LINE1: z.number(),
  LINE2: z.number(),
  SUPERVISOR: z.number(),
});
export type PositionRates = z.infer<typeof PositionRatesSchema>;

export const AssigningFeeModeEnum = z.enum(["flat", "percent"]);
export type AssigningFeeMode = z.infer<typeof AssigningFeeModeEnum>;

export const AssigningFeeSchema = z.object({
  amount: z.number().min(0),
  mode: AssigningFeeModeEnum,
});
export type AssigningFee = z.infer<typeof AssigningFeeSchema>;

/** Per-division row in settings.pay_rates.by_league_tier */
export const DivisionPayRatesRowSchema = PositionRatesSchema.extend({
  TIMEKEEPER: z.number().min(0).optional().default(0),
  travel_pay_enabled: z.boolean().default(true),
  cost_per_km: z.number().min(0).optional(),
  assigning_fee: AssigningFeeSchema.default({ amount: 10, mode: "percent" }),
  cash_games_default: z.boolean().default(false),
});
export type DivisionPayRatesRow = z.infer<typeof DivisionPayRatesRowSchema>;

/** Default row: position fees + global mileage rate. */
export const PayRatePositionSchema = PositionRatesSchema.extend({
  cost_per_km: z.number(),
});
export type PayRatePosition = z.infer<typeof PayRatePositionSchema>;

/** League-aware pay matrix in settings.pay_rates (legacy flat object still accepted). */
export const PayRatesMatrixSchema = z.object({
  default: PayRatePositionSchema,
  by_league_type: z
    .object({
      Minor: PositionRatesSchema.optional(),
      Senior: PositionRatesSchema.optional(),
      "Adult Rec": PositionRatesSchema.optional(),
    })
    .optional(),
  by_league_tier: z.record(z.string(), DivisionPayRatesRowSchema).optional(),
});
export type PayRatesMatrix = z.infer<typeof PayRatesMatrixSchema>;

/** @deprecated Use PayRatesMatrix — kept for backward-compatible imports. */
export const PayRateConfigSchema = PayRatePositionSchema;
export type PayRateConfig = PayRatePosition;

export const AssignmentPayLineSchema = z.object({
  assignment_id: uuid,
  game_id: uuid,
  game_date: isoTs,
  home_team: nullableText,
  away_team: nullableText,
  venue_name: nullableText,
  position: PositionEnum,
  gross_game_fee: z.number(),
  assigning_fee_deduction: z.number(),
  game_fee: z.number(),
  mileage_km: z.number(),
  mileage_payout: z.number(),
  payout_approved: z.boolean(),
  rate_source: RateSourceEnum.optional(),
  rate_label: nullableText,
  cash_game: z.boolean().optional(),
  travel_pay_enabled: z.boolean().optional(),
});
export type AssignmentPayLine = z.infer<typeof AssignmentPayLineSchema>;

export const OfficialPaySummarySchema = z.object({
  official_id: uuid,
  official_name: nullableText,
  official_email: z.string(),
  official_type: nullableText,
  assignment_count: z.number().int(),
  game_fees: z.number(),
  mileage_km: z.number(),
  mileage_payout: z.number(),
  total_due: z.number(),
  all_approved: z.boolean(),
  assignments: z.array(AssignmentPayLineSchema),
});
export type OfficialPaySummary = z.infer<typeof OfficialPaySummarySchema>;

export const SeasonBoundsSchema = z.object({
  start: isoTs,
  end: isoTs,
  label: z.string(),
});
export type SeasonBounds = z.infer<typeof SeasonBoundsSchema>;

export const DeclinedAssignmentGameSchema = z.object({
  assignment_id: uuid,
  game_id: uuid,
  position: PositionEnum,
  date_time: isoTs,
  home_team: nullableText,
  away_team: nullableText,
  venue_name: z.string().nullable().optional(),
  league_tier: nullableText,
});
export type DeclinedAssignmentGame = z.infer<typeof DeclinedAssignmentGameSchema>;

export const OfficialDeclineStatRowSchema = z.object({
  official_id: uuid,
  declined_count: z.number().int(),
  games: z.array(DeclinedAssignmentGameSchema).default([]),
});
export type OfficialDeclineStatRow = z.infer<typeof OfficialDeclineStatRowSchema>;

export const OfficialDeclineStatsSchema = z.object({
  period: SeasonBoundsSchema,
  by_official: z.array(OfficialDeclineStatRowSchema),
  total_declined: z.number().int(),
});
export type OfficialDeclineStats = z.infer<typeof OfficialDeclineStatsSchema>;

export const PayReportSchema = z.object({
  officials: z.array(OfficialPaySummarySchema),
  pay_rates: PayRatesMatrixSchema,
  season: SeasonBoundsSchema,
  zone_id: uuid.nullable().optional(),
  zone_name: z.string().nullable().optional(),
  generated_at: isoTs,
});
export type PayReport = z.infer<typeof PayReportSchema>;

/** POST /api/pay-report/approve request body. */
export const PayApproveRequestSchema = z.object({
  official_id: uuid,
  /** When set, only assignments for games in this zone are approved. */
  zone_id: uuid.optional(),
});
export type PayApproveRequest = z.infer<typeof PayApproveRequestSchema>;

export const PayApproveResultSchema = z.object({
  approved_count: z.number().int(),
});
export type PayApproveResult = z.infer<typeof PayApproveResultSchema>;

// ─── availability ─────────────────────────────────────────────────────────────

export const AvailabilitySlotSchema = z.object({
  id: uuid,
  official_id: uuid,
  workspace_id: uuid.optional(),
  date: z.string(), // YYYY-MM-DD
  morning: z.boolean(),
  afternoon: z.boolean(),
  evening: z.boolean(),
  time_slots: z.array(z.number().int().min(0).max(23)).nullable().optional(),
  created_at: isoTs,
  updated_at: isoTs,
});
export type AvailabilitySlot = z.infer<typeof AvailabilitySlotSchema>;

/** PUT /api/availability/:date request body. Backend derives period flags automatically. */
export const AvailabilityUpsertSchema = z.object({
  time_slots: z.array(z.number().int().min(0).max(23)),
});
export type AvailabilityUpsert = z.infer<typeof AvailabilityUpsertSchema>;

/** GET /api/availability?start=&end= — slots plus hours blocked by game assignments. */
export const AvailabilityWeekBundleSchema = z.object({
  slots: z.array(AvailabilitySlotSchema),
  booked_hours: z.record(z.string(), z.array(z.number().int().min(0).max(23))),
});
export type AvailabilityWeekBundle = z.infer<typeof AvailabilityWeekBundleSchema>;

// ─── earnings summary ─────────────────────────────────────────────────────────

/** Response shape from GET /api/earnings/mine. */
export const EarningsSummarySchema = z.object({
  assignment_count: z.number().int(),
  approved_count: z.number().int(),
  game_fees: z.number(),
  mileage_km: z.number(),
  mileage_payout: z.number(),
  total_due: z.number(),
  distance_km: z.number(),
  cost_per_km: z.number(),
  season: SeasonBoundsSchema,
});
export type EarningsSummary = z.infer<typeof EarningsSummarySchema>;

// ─── game messaging ───────────────────────────────────────────────────────────

/** POST /api/games/:id/message-assigned request body. */
export const GameMessageAssignedSchema = z.object({
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(5000),
});
export type GameMessageAssigned = z.infer<typeof GameMessageAssignedSchema>;

export const GameMessageAssignedResultSchema = z.object({
  sent_count: z.number().int(),
  recipients: z.array(z.string().email()),
});
export type GameMessageAssignedResult = z.infer<typeof GameMessageAssignedResultSchema>;

// ─── legacy parity settings shapes ───────────────────────────────────────────

export const RosterDisplayFieldEnum = z.enum([
  "full_name",
  "email",
  "cell_phone",
  "official_type",
  "certification_level",
  "zone",
  "distance_km",
  "jersey_number",
  "role",
]);
export type RosterDisplayField = z.infer<typeof RosterDisplayFieldEnum>;

export const DEFAULT_ROSTER_DISPLAY_FIELDS: RosterDisplayField[] = [
  "full_name",
  "email",
  "official_type",
  "certification_level",
  "zone",
  "role",
];

export const PositionLabelEntrySchema = z.object({
  label: z.string(),
  abbr: z.string(),
  show_on_assignment: z.boolean().default(true),
});
export type PositionLabelEntry = z.infer<typeof PositionLabelEntrySchema>;

export const PositionLabelsConfigSchema = z.object({
  REF1: PositionLabelEntrySchema,
  REF2: PositionLabelEntrySchema,
  LINE1: PositionLabelEntrySchema,
  LINE2: PositionLabelEntrySchema,
  SUPERVISOR: PositionLabelEntrySchema,
});
export type PositionLabelsConfig = z.infer<typeof PositionLabelsConfigSchema>;

export const AvailabilityWindowSchema = z.object({
  open_date: z.string().nullable().optional(),
  close_date: z.string().nullable().optional(),
});
export type AvailabilityWindow = z.infer<typeof AvailabilityWindowSchema>;

export const AvailabilityOverviewRowSchema = z.object({
  official_id: uuid,
  full_name: nullableText,
  email: z.string(),
  zone_id: uuid.nullable().optional(),
  slots: z.array(AvailabilitySlotSchema),
});
export type AvailabilityOverviewRow = z.infer<typeof AvailabilityOverviewRowSchema>;

export const IncidentReportSchema = z.object({
  id: uuid,
  game_id: uuid,
  submitted_by: uuid.nullable().optional(),
  body: z.string(),
  league_type: nullableText,
  league_tier: nullableText,
  created_at: isoTs,
});
export type IncidentReport = z.infer<typeof IncidentReportSchema>;

export const IncidentReportCreateSchema = z.object({
  game_id: uuid,
  body: z.string().min(1).max(10000),
});
export type IncidentReportCreate = z.infer<typeof IncidentReportCreateSchema>;

export const IncidentNotifyEmailsSchema = z.object({
  Minor: z.array(z.string().email()).default([]),
  Senior: z.array(z.string().email()).default([]),
  "Adult Rec": z.array(z.string().email()).default([]),
  default: z.array(z.string().email()).default([]),
});
export type IncidentNotifyEmails = z.infer<typeof IncidentNotifyEmailsSchema>;

// ─── API envelope ─────────────────────────────────────────────────────────────

export const ApiErrorSchema = z.object({
  error: z.object({
    message: z.string(),
    code: z.string().optional(),
  }),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;

export const apiOk = <T extends z.ZodTypeAny>(inner: T) =>
  z.object({ data: inner });
