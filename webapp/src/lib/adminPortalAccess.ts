/** Roles that land on Admin Command Center after login and may open /admin routes. */
export const ADMIN_PORTAL_ROLES = ["ADMIN", "ASSIGNOR", "FINANCE"] as const;

export function canAccessAdminPortal(role: string | undefined): boolean {
  return role !== undefined && (ADMIN_PORTAL_ROLES as readonly string[]).includes(role);
}
