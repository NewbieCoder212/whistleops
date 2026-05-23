import type { Context } from "hono";
import { canAccessPayroll } from "./workspace";

export type FinanceZoneScope = { mode: "all" } | { mode: "zone"; zoneId: string };

export function resolveFinanceZoneScope(
  profileRole: string | undefined,
  workspaceRole: string | undefined,
  profileZoneId: string | null | undefined
): FinanceZoneScope | null {
  if (!canAccessPayroll(profileRole, workspaceRole)) return null;
  if (profileRole === "ADMIN") return { mode: "all" };

  const role = workspaceRole ?? profileRole ?? "";
  if (role === "ASSIGNOR" || role === "FINANCE") {
    if (!profileZoneId) return null;
    return { mode: "zone", zoneId: profileZoneId };
  }

  return null;
}

export type FinanceZoneAccessResult =
  | { ok: true; effectiveZoneId: string | null }
  | { ok: false; status: 403; message: string; code: string };

/** Resolve which zone filter applies for payroll APIs. Zone staff are locked to home zone. */
export function assertFinanceZoneAccess(
  scope: FinanceZoneScope | null,
  requestedZoneId?: string | null
): FinanceZoneAccessResult {
  if (!scope) {
    return {
      ok: false,
      status: 403,
      message: "Payroll access required",
      code: "FORBIDDEN",
    };
  }

  if (scope.mode === "all") {
    return { ok: true, effectiveZoneId: requestedZoneId?.trim() || null };
  }

  const requested = requestedZoneId?.trim();
  if (requested && requested !== scope.zoneId) {
    return {
      ok: false,
      status: 403,
      message: "You may only access finance data for your home zone",
      code: "ZONE_FORBIDDEN",
    };
  }

  return { ok: true, effectiveZoneId: scope.zoneId };
}

export function financeScopeMode(scope: FinanceZoneScope | null): "all" | "zone" | null {
  if (!scope) return null;
  return scope.mode;
}

export function jsonForbidden(c: Context, message: string, code: string) {
  return c.json({ error: { message, code } }, 403);
}
