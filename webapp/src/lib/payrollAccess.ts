/** Roles that may open Finance & Payroll (supervisors excluded). */
export function canAccessPayroll(role: string | undefined): boolean {
  return role === "ADMIN" || role === "ASSIGNOR" || role === "FINANCE";
}
