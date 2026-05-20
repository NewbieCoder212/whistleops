import type { Context } from "hono";
import { serviceDb } from "../db";

export const DEFAULT_WORKSPACE_ID = "00000000-0000-4000-8000-000000000001";

const STAFF_ROLES = ["ADMIN", "ASSIGNOR", "FINANCE", "SUPERVISOR"] as const;

export function workspaceIdFromRequest(c: Context): string | null {
  const header =
    c.req.header("x-workspace-id") ??
    c.req.header("X-Workspace-Id") ??
    c.req.query("workspaceId");
  if (!header || typeof header !== "string") return null;
  const trimmed = header.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function resolveProfileId(userId: string): Promise<string | null> {
  const { data } = await serviceDb()
    .from("profiles")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  return data?.id ?? null;
}

export async function getWorkspaceMembership(
  workspaceId: string,
  profileId: string
): Promise<{ role: string } | null> {
  const { data } = await serviceDb()
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("profile_id", profileId)
    .maybeSingle();
  return data ?? null;
}

export function isStaffRole(role: string): boolean {
  return (STAFF_ROLES as readonly string[]).includes(role);
}

export async function addWorkspaceMember(
  workspaceId: string,
  profileId: string,
  role: string
): Promise<void> {
  await serviceDb()
    .from("workspace_members")
    .upsert(
      { workspace_id: workspaceId, profile_id: profileId, role },
      { onConflict: "workspace_id,profile_id" }
    );
}
