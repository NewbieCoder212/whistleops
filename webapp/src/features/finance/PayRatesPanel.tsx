import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DollarSign, Loader2, Save } from "lucide-react";
import { ApiError } from "@/lib/api";
import { settingsApi } from "@/lib/resources";
import type { Setting } from "@shared/types";
import type { LeagueType, PayRatesMatrix, PositionRates } from "@shared/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

const POSITIONS = ["REF1", "REF2", "LINE1", "LINE2", "SUPERVISOR"] as const;
const LEAGUE_TYPES: LeagueType[] = ["Minor", "Senior", "Adult Rec"];

const DEFAULT_MATRIX: PayRatesMatrix = {
  default: {
    REF1: 75,
    REF2: 65,
    LINE1: 55,
    LINE2: 55,
    SUPERVISOR: 85,
    cost_per_km: 0.42,
  },
};

function parseMatrix(value: unknown): PayRatesMatrix {
  if (!value || typeof value !== "object") return DEFAULT_MATRIX;
  const o = value as Record<string, unknown>;
  if (typeof o.REF1 === "number") {
    return {
      default: {
        REF1: Number(o.REF1) || 75,
        REF2: Number(o.REF2) || 65,
        LINE1: Number(o.LINE1) || 55,
        LINE2: Number(o.LINE2) || 55,
        SUPERVISOR: Number(o.SUPERVISOR) || 85,
        cost_per_km: Number(o.cost_per_km) || 0.42,
      },
      by_league_type: o.by_league_type as PayRatesMatrix["by_league_type"],
      by_league_tier: o.by_league_tier as PayRatesMatrix["by_league_tier"],
    };
  }
  const def = (o.default as PayRatesMatrix["default"]) ?? DEFAULT_MATRIX.default;
  return {
    default: { ...DEFAULT_MATRIX.default, ...def },
    by_league_type: o.by_league_type as PayRatesMatrix["by_league_type"],
    by_league_tier: o.by_league_tier as PayRatesMatrix["by_league_tier"],
  };
}

function RateInputs({
  label,
  rates,
  onChange,
  showMileage,
}: {
  label: string;
  rates: PositionRates & { cost_per_km?: number };
  onChange: (next: PositionRates & { cost_per_km?: number }) => void;
  showMileage?: boolean;
}) {
  return (
    <div className="space-y-2 rounded-lg border border-border p-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {POSITIONS.map((pos) => (
          <div key={pos} className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">{pos}</Label>
            <Input
              type="number"
              min={0}
              step={1}
              className="h-8 text-sm"
              value={rates[pos] ?? ""}
              onChange={(e) =>
                onChange({ ...rates, [pos]: Number(e.target.value) || 0 })
              }
            />
          </div>
        ))}
        {showMileage ? (
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">$/km</Label>
            <Input
              type="number"
              min={0}
              step={0.01}
              className="h-8 text-sm"
              value={rates.cost_per_km ?? ""}
              onChange={(e) =>
                onChange({ ...rates, cost_per_km: Number(e.target.value) || 0 })
              }
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function PayRatesPanel() {
  const qc = useQueryClient();
  const [matrix, setMatrix] = useState<PayRatesMatrix>(DEFAULT_MATRIX);

  const { data: setting, isLoading, isError, isFetched } = useQuery({
    queryKey: ["settings", "pay_rates"],
    queryFn: async (): Promise<Setting | null> => {
      try {
        return await settingsApi.get("pay_rates");
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) return null;
        throw e;
      }
    },
  });

  const usingDefaults = isFetched && !setting;

  useEffect(() => {
    if (setting?.value) setMatrix(parseMatrix(setting.value));
  }, [setting?.value]);

  const saveMutation = useMutation({
    mutationFn: () => settingsApi.put("pay_rates", matrix),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings", "pay_rates"] });
      qc.invalidateQueries({ queryKey: ["pay-report"] });
      toast.success("Pay rates saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateLeagueType = (league: LeagueType, rates: PositionRates) => {
    setMatrix((m) => ({
      ...m,
      by_league_type: { ...m.by_league_type, [league]: rates },
    }));
  };

  const getLeagueRates = (league: LeagueType): PositionRates => {
    return (
      matrix.by_league_type?.[league] ?? {
        REF1: matrix.default.REF1,
        REF2: matrix.default.REF2,
        LINE1: matrix.default.LINE1,
        LINE2: matrix.default.LINE2,
        SUPERVISOR: matrix.default.SUPERVISOR,
      }
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <p className="text-sm text-destructive">Could not load pay rates. Check admin access.</p>
    );
  }

  return (
    <section className="space-y-4 rounded-xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary" />
            Pay Rates Matrix
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Default fees apply when no league override matches. Tier overrides (Goalline divisions) can be added in settings JSON.
          </p>
          {usingDefaults ? (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
              Using built-in defaults — click Save to store your rates.
            </p>
          ) : null}
        </div>
        <Button
          size="sm"
          className="gap-1.5"
          disabled={saveMutation.isPending}
          onClick={() => saveMutation.mutate()}
        >
          {saveMutation.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          Save
        </Button>
      </div>

      <RateInputs
        label="Default (all leagues)"
        rates={matrix.default}
        showMileage
        onChange={(next) => setMatrix((m) => ({ ...m, default: next as PayRatesMatrix["default"] }))}
      />

      {LEAGUE_TYPES.map((league) => (
        <RateInputs
          key={league}
          label={`${league} override`}
          rates={getLeagueRates(league)}
          onChange={(next) => updateLeagueType(league, next)}
        />
      ))}
    </section>
  );
}
