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

export const AssignmentStatusEnum = z.enum(["PENDING", "CONFIRMED", "REJECTED", "CANCELLED"]);
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
  sort_order: z.number().int(),
  created_at: isoTs,
  updated_at: isoTs,
});
export type Zone = z.infer<typeof ZoneSchema>;

export const ZoneCreateSchema = z.object({
  name: z.string().min(1),
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
  date_of_birth: z.string().optional(),
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
  venue_id: uuid.optional(),
  status: GameStatusEnum.default("UNASSIGNED"),
  home_team: z.string().optional(),
  away_team: z.string().optional(),
  league_tier: z.string().optional(),
  league_type: LeagueTypeEnum.optional(),
  notes: z.string().optional(),
  game_number: z.number().int().optional(),
  gamesheet_external_id: z.string().optional(),
  home_score: z.number().int().optional(),
  away_score: z.number().int().optional(),
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
  status: AssignmentStatusEnum.default("PENDING"),
});
export type AssignmentCreate = z.infer<typeof AssignmentCreateSchema>;

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
  by_league_tier: z.record(z.string(), PositionRatesSchema).optional(),
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
  game_fee: z.number(),
  mileage_km: z.number(),
  mileage_payout: z.number(),
  payout_approved: z.boolean(),
  rate_source: RateSourceEnum.optional(),
  rate_label: nullableText,
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

export const PayReportSchema = z.object({
  officials: z.array(OfficialPaySummarySchema),
  pay_rates: PayRatesMatrixSchema,
  season: SeasonBoundsSchema,
  generated_at: isoTs,
});
export type PayReport = z.infer<typeof PayReportSchema>;

/** POST /api/pay-report/approve request body. */
export const PayApproveRequestSchema = z.object({
  official_id: uuid,
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
