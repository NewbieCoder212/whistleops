import { useQuery } from "@tanstack/react-query";
import { ApiError } from "@/lib/api";
import { settingsApi } from "@/lib/resources";
import {
  DEFAULT_ROSTER_DISPLAY_FIELDS,
  type RosterDisplayField,
} from "@shared/types";

export function useRosterDisplayFields(): RosterDisplayField[] {
  const { data } = useQuery({
    queryKey: ["settings", "roster_display_fields"],
    queryFn: async () => {
      try {
        const s = await settingsApi.get("roster_display_fields");
        return Array.isArray(s.value) ? (s.value as RosterDisplayField[]) : DEFAULT_ROSTER_DISPLAY_FIELDS;
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) return DEFAULT_ROSTER_DISPLAY_FIELDS;
        return DEFAULT_ROSTER_DISPLAY_FIELDS;
      }
    },
    staleTime: 60_000,
  });
  const fields = data ?? DEFAULT_ROSTER_DISPLAY_FIELDS;
  return fields.length > 0 ? fields : DEFAULT_ROSTER_DISPLAY_FIELDS;
}
