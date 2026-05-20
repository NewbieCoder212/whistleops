import { useQuery } from "@tanstack/react-query";
import { ApiError } from "@/lib/api";
import { settingsApi } from "@/lib/resources";
import type { Position, PositionLabelsConfig } from "@shared/types";
import { SLOT_POSITIONS } from "@/features/schedule/scheduleTypes";

const DEFAULT_LABELS: PositionLabelsConfig = {
  REF1: { label: "Referee 1", abbr: "R1", show_on_assignment: true },
  REF2: { label: "Referee 2", abbr: "R2", show_on_assignment: true },
  LINE1: { label: "Linesman 1", abbr: "L1", show_on_assignment: true },
  LINE2: { label: "Linesman 2", abbr: "L2", show_on_assignment: true },
  SUPERVISOR: { label: "Supervisor", abbr: "SV", show_on_assignment: true },
};

export type SlotPosition = {
  key: Position;
  label: string;
  abbr: string;
  group: "ref" | "line";
};

function toSlotPositions(config: PositionLabelsConfig): SlotPosition[] {
  const keys: Position[] = ["REF1", "REF2", "LINE1", "LINE2", "SUPERVISOR"];
  return keys
    .filter((k) => config[k]?.show_on_assignment !== false)
    .map((key) => ({
      key,
      label: config[key].label,
      abbr: config[key].abbr,
      group: key.startsWith("LINE") ? "line" : "ref",
    }));
}

export function usePositionSlots() {
  const { data, isLoading } = useQuery({
    queryKey: ["settings", "position_labels"],
    queryFn: async () => {
      try {
        const s = await settingsApi.get("position_labels");
        return (s.value as PositionLabelsConfig) ?? DEFAULT_LABELS;
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) return DEFAULT_LABELS;
        throw e;
      }
    },
    staleTime: 60_000,
  });

  const config = data ?? DEFAULT_LABELS;
  const slots = toSlotPositions(config);
  return {
    slots: slots.length > 0 ? slots : SLOT_POSITIONS,
    config,
    isLoading,
  };
}
