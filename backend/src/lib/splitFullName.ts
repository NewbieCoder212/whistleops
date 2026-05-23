/** Split stored full_name into first / last for directory display. */
export function splitFullName(fullName: string | null | undefined): {
  first_name: string;
  last_name: string;
} {
  const trimmed = fullName?.trim() ?? "";
  if (!trimmed) return { first_name: "", last_name: "" };
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return { first_name: parts[0]!, last_name: "" };
  return { first_name: parts[0]!, last_name: parts.slice(1).join(" ") };
}
