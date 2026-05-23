/**
 * Typed API resource clients.
 *
 * Each resource maps to one Hono route group. Types are imported from the
 * shared backend Zod source of truth (`backend/src/types.ts`).
 */
import { api } from "./api";
import type {
  Profile,
  ProfileCreate,
  ProfileUpdate,
  Game,
  GameCreate,
  GameUpdate,
  GameMessageAssigned,
  GameMessageAssignedResult,
  Venue,
  VenueCreate,
  VenueUpdate,
  Assignment,
  AssignmentCreate,
  AssignmentUpdate,
  AssignBoard,
  AssignBoardPublishResult,
  CertificationLevel,
  CertificationLevelCreate,
  CertificationLevelUpdate,
  LeagueQualification,
  LeagueQualificationWithLevel,
  LeagueQualificationCreate,
  LeagueQualificationUpdate,
  Setting,
  BulkOfficialImportPayload,
  BulkOfficialImportResult,
  OfficialDeclineStats,
  WorkspaceWithRole,
  WorkspaceCreate,
  Workspace,
  CalendarFeedUrlResponse,
} from "@shared/types";

export const workspacesApi = {
  list: () => api.get<WorkspaceWithRole[]>("/api/workspaces"),
  create: (body: WorkspaceCreate) => api.post<Workspace>("/api/workspaces", body),
};

export type DeclineStatsParams = {
  year?: string;
  date_from?: string;
  date_to?: string;
  season_start?: string;
  season_end?: string;
};

export const profilesApi = {
  list: () => api.get<Profile[]>("/api/profiles"),
  declineStats: (params?: DeclineStatsParams) => {
    const qs = params
      ? "?" + new URLSearchParams(
          Object.fromEntries(
            Object.entries(params).filter(([, v]) => v != null && v !== "") as [string, string][]
          )
        ).toString()
      : "";
    return api.get<OfficialDeclineStats>(`/api/profiles/decline-stats${qs}`);
  },
  me: () => api.get<Profile>("/api/profiles/me"),
  get: (id: string) => api.get<Profile>(`/api/profiles/${id}`),
  create: (body: ProfileCreate) => api.post<Profile>("/api/profiles", body),
  update: (id: string, body: ProfileUpdate) =>
    api.put<Profile>(`/api/profiles/${id}`, body),
  delete: (id: string) => api.delete<{ id: string }>(`/api/profiles/${id}`),
  bulkImport: (body: BulkOfficialImportPayload) =>
    api.post<BulkOfficialImportResult>("/api/profiles/bulk", body),
};

export const gamesApi = {
  distinctLeagueTiers: () => api.get<string[]>("/api/games/distinct-league-tiers"),
  list: (params?: { startDate?: string; endDate?: string; status?: string }) => {
    const qs = params
      ? "?" + new URLSearchParams(params as Record<string, string>).toString()
      : "";
    return api.get<Game[]>(`/api/games${qs}`);
  },
  get: (id: string) => api.get<Game>(`/api/games/${id}`),
  create: (body: GameCreate) => api.post<Game>("/api/games", body),
  update: (id: string, body: GameUpdate) => api.put<Game>(`/api/games/${id}`, body),
  delete: (id: string) => api.delete<{ id: string }>(`/api/games/${id}`),
  messageAssigned: (id: string, body: GameMessageAssigned) =>
    api.post<GameMessageAssignedResult>(`/api/games/${id}/message-assigned`, body),
};

export const venuesApi = {
  list: (params?: { assignable?: boolean }) => {
    const qs =
      params?.assignable === true ? "?assignable=true" : "";
    return api.get<Venue[]>(`/api/venues${qs}`);
  },
  get: (id: string) => api.get<Venue>(`/api/venues/${id}`),
  create: (body: VenueCreate) => api.post<Venue>("/api/venues", body),
  update: (id: string, body: VenueUpdate) => api.put<Venue>(`/api/venues/${id}`, body),
  delete: (id: string) => api.delete<{ id: string }>(`/api/venues/${id}`),
};

export const assignmentsApi = {
  list: (params?: { gameId?: string; officialId?: string; status?: string }) => {
    const qs = params
      ? "?" + new URLSearchParams(params as Record<string, string>).toString()
      : "";
    return api.get<Assignment[]>(`/api/assignments${qs}`);
  },
  get: (id: string) => api.get<Assignment>(`/api/assignments/${id}`),
  create: (body: AssignmentCreate) => api.post<Assignment>("/api/assignments", body),
  update: (id: string, body: AssignmentUpdate) =>
    api.put<Assignment>(`/api/assignments/${id}`, body),
  delete: (id: string) => api.delete<{ id: string }>(`/api/assignments/${id}`),
};

export const certificationLevelsApi = {
  list: () => api.get<CertificationLevel[]>("/api/certification-levels"),
  get: (id: string) => api.get<CertificationLevel>(`/api/certification-levels/${id}`),
  create: (body: CertificationLevelCreate) =>
    api.post<CertificationLevel>("/api/certification-levels", body),
  update: (id: string, body: CertificationLevelUpdate) =>
    api.put<CertificationLevel>(`/api/certification-levels/${id}`, body),
  delete: (id: string) =>
    api.delete<{ id: string }>(`/api/certification-levels/${id}`),
};

export const leagueQualificationsApi = {
  list: () => api.get<LeagueQualificationWithLevel[]>("/api/league-qualifications"),
  get: (id: string) =>
    api.get<LeagueQualification>(`/api/league-qualifications/${id}`),
  create: (body: LeagueQualificationCreate) =>
    api.post<LeagueQualification>("/api/league-qualifications", body),
  update: (id: string, body: LeagueQualificationUpdate) =>
    api.put<LeagueQualification>(`/api/league-qualifications/${id}`, body),
  delete: (id: string) =>
    api.delete<{ id: string }>(`/api/league-qualifications/${id}`),
};

export const assignBoardApi = {
  get: (params: { date: string; zoneId: string; leagueType?: string }) => {
    const qs = new URLSearchParams({ date: params.date, zoneId: params.zoneId });
    if (params.leagueType) qs.set("leagueType", params.leagueType);
    return api.get<AssignBoard>(`/api/assign-board?${qs.toString()}`);
  },
  publish: (body: { date: string; zoneId: string; leagueType?: string }) =>
    api.post<AssignBoardPublishResult>("/api/assign-board/publish", body),
};

export const settingsApi = {
  list: () => api.get<Setting[]>("/api/settings"),
  get: (key: string) => api.get<Setting>(`/api/settings/${key}`),
  upsert: (key: string, value: unknown) =>
    api.put<Setting>(`/api/settings/${key}`, { value }),
};

export const calendarApi = {
  getFeedUrl: () => api.get<CalendarFeedUrlResponse>("/api/calendar/feed-url"),
  regenerateToken: () =>
    api.post<CalendarFeedUrlResponse>("/api/calendar/regenerate-token"),
};
