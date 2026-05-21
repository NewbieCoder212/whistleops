import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DollarSign, Loader2, RefreshCw, Save, Sparkles } from "lucide-react";
import { ApiError } from "@/lib/api";
import { gamesApi, settingsApi } from "@/lib/resources";
import type { Setting } from "@shared/types";
import type { PayRatesMatrix } from "@shared/types";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { HNB_SENIOR_PAY_RATES_TEMPLATE } from "./hnbSeniorPayRatesTemplate";
import {
  DEFAULT_MATRIX,
  mergeTiersFromSchedule,
  parseMatrix,
} from "./payRatesMatrixUtils";
import { DefaultRatesStrip, PayRatesMatrixTable } from "./PayRatesMatrixTable";

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
    mutationFn: () => settingsApi.upsert("pay_rates", matrix),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings", "pay_rates"] });
      qc.invalidateQueries({ queryKey: ["pay-report"] });
      toast.success("Pay rates saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const syncMutation = useMutation({
    mutationFn: () => gamesApi.distinctLeagueTiers(),
    onSuccess: (tiers) => {
      setMatrix((m) => mergeTiersFromSchedule(m, tiers));
      toast.success(`Added ${tiers.length} division(s) from schedule (existing rows unchanged).`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const loadTemplate = () => {
    setMatrix((m) => ({
      ...m,
      by_league_tier: {
        ...m.by_league_tier,
        ...HNB_SENIOR_PAY_RATES_TEMPLATE,
      },
    }));
    toast.success("HNB Senior template loaded — review and save.");
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
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary" />
            Pay Rates Matrix
          </h2>
          <p className="text-xs text-muted-foreground mt-1 max-w-xl">
            Per-division fees keyed by game division (<code className="text-[10px]">league_tier</code>).
            Assigning fees are deducted from each official&apos;s game fee on the pay report.
          </p>
          {usingDefaults ? (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
              Using built-in defaults — click Save to store your rates.
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-1.5"
            disabled={syncMutation.isPending}
            onClick={() => syncMutation.mutate()}
          >
            {syncMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Sync from schedule
          </Button>
          <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={loadTemplate}>
            <Sparkles className="h-3.5 w-3.5" />
            Load HNB Senior template
          </Button>
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
      </div>

      <DefaultRatesStrip matrix={matrix} onChange={setMatrix} />
      <PayRatesMatrixTable matrix={matrix} onChange={setMatrix} />
    </section>
  );
}
