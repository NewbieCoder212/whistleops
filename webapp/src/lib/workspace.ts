import type { WorkspaceWithRole } from "@shared/types";

export const DEFAULT_WORKSPACE_ID = "00000000-0000-4000-8000-000000000001";
const STORAGE_KEY = "whistleops_active_workspace_id";

export function getActiveWorkspaceId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_KEY);
}

export function setActiveWorkspaceId(id: string): void {
  localStorage.setItem(STORAGE_KEY, id);
}

export function pickDefaultWorkspace(workspaces: WorkspaceWithRole[]): string | null {
  if (workspaces.length === 0) return null;
  const saved = getActiveWorkspaceId();
  if (saved && workspaces.some((w) => w.id === saved)) return saved;
  const province = workspaces.find((w) => w.type === "province");
  return province?.id ?? workspaces[0]!.id;
}
