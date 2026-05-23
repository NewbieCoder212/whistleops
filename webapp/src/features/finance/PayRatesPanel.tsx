import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DollarSign, Loader2, RefreshCw, Save, Sparkles } from "lucide-react";
import { ApiError } from "@/lib/api";
import { gamesApi, settingsApi, zonesApi } from "@/lib/resources";
import type { PayRatesMatrix, Setting, Zone, ZonePayRatesResponse } from "@shared/types";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useProfile } from "@/hooks/useProfile";
import { HNB_SENIOR_PAY_RATES_TEMPLATE } from "./hnbSeniorPayRatesTemplate";
import {
  DEFAULT_MATRIX,
  mergeTiersFromSchedule,
  parseMatrix,
} from "./payRatesMatrixUtils";
import { DefaultRatesStrip, PayRatesMatrixTable } from "./PayRatesMatrixTable";
import {
  resolveDefaultZoneId,
} from "@/features/filters/scheduleFilterUtils";
import { useTranslation } from "@/i18n/I18nProvider";
import { zoneSelectLabel } from "@/i18n/labels";
import { useAuth } from "@/hooks/useAuth";

type RateTarget = "provincial" | "zone";

export function PayRatesPanel() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const zoneInitialized = useRef(false);
  const [matrix, setMatrix] = useState<PayRatesMatrix>(DEFAULT_MATRIX);
  const [rateTarget, setRateTarget] = useState<RateTarget>("zone");
  const [zoneId, setZoneId] = useState<string | null>(null);
  const [rateSource, setRateSource] = useState<ZonePayRatesResponse["source"] | "provincial">(
    "zone"
  );

  const isProvincialAdmin = profile?.role === "ADMIN";
  const zoneLocked =
    !isProvincialAdmin &&
    (profile?.role === "ASSIGNOR" || profile?.role === "FINANCE");

  const { data: zones = [] } = useQuery<Zone[]>({
    queryKey: ["zones"],
    queryFn: () => zonesApi.list(),
    staleTime: 10 * 60 * 1000,
  });

  useEffect(() => {
    if (!profile || zoneInitialized.current || zones.length === 0) return;
    zoneInitialized.current = true;
    if (zoneLocked && profile.zone_id) {
      setZoneId(profile.zone_id);
      setRateTarget("zone");
      return;
    }
    const id = resolveDefaultZoneId({
      userId: user?.id,
      profileZoneId: profile.zone_id,
      role: profile.role,
      zoneIds: zones.map((z) => z.id),
    });
    setZoneId(id ?? zones[0]?.id ?? null);
  }, [profile, user?.id, zones, zoneLocked]);

  const editingProvincial = isProvincialAdmin && rateTarget === "provincial";
  const effectiveZoneId = zoneLocked ? profile?.zone_id ?? null : zoneId;

  const { data: provincialSetting, isLoading: provincialLoading, isError: provincialError, isFetched: provincialFetched } = useQuery({
    queryKey: ["settings", "pay_rates"],
    queryFn: async (): Promise<Setting | null> => {
      try {
        return await settingsApi.get("pay_rates");
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) return null;
        throw e;
      }
    },
    enabled: isProvincialAdmin && editingProvincial,
  });

  const {
    data: zoneRates,
    isLoading: zoneLoading,
    isError: zoneError,
    isFetched: zoneFetched,
  } = useQuery({
    queryKey: ["zone-pay-rates", effectiveZoneId],
    queryFn: () => zonesApi.payRates.get(effectiveZoneId!),
    enabled: !editingProvincial && !!effectiveZoneId,
  });

  useEffect(() => {
    if (editingProvincial) {
      if (provincialSetting?.value) {
        setMatrix(parseMatrix(provincialSetting.value));
        setRateSource("provincial");
      } else if (provincialFetched) {
        setMatrix(DEFAULT_MATRIX);
        setRateSource("provincial");
      }
      return;
    }
    if (zoneRates) {
      setMatrix(parseMatrix(zoneRates.pay_rates));
      setRateSource(zoneRates.source);
    } else if (zoneFetched && effectiveZoneId) {
      setMatrix(DEFAULT_MATRIX);
      setRateSource("workspace_default");
    }
  }, [editingProvincial, provincialSetting, provincialFetched, zoneRates, zoneFetched, effectiveZoneId]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editingProvincial) {
        return settingsApi.upsert("pay_rates", matrix);
      }
      if (!effectiveZoneId) throw new Error("Select a zone");
      return zonesApi.payRates.upsert(effectiveZoneId, matrix);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings", "pay_rates"] });
      qc.invalidateQueries({ queryKey: ["zone-pay-rates"] });
      qc.invalidateQueries({ queryKey: ["pay-report"] });
      toast.success("Pay rates saved");
      if (!editingProvincial) setRateSource("zone");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const copyDefaultMutation = useMutation({
    mutationFn: () => zonesApi.payRates.copyDefault(effectiveZoneId!),
    onSuccess: (data) => {
      setMatrix(parseMatrix(data.pay_rates));
      setRateSource("zone");
      qc.invalidateQueries({ queryKey: ["zone-pay-rates"] });
      qc.invalidateQueries({ queryKey: ["pay-report"] });
      toast.success("Copied provincial default rates to this zone");
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

  const isLoading = editingProvincial ? provincialLoading : zoneLoading;
  const isError = editingProvincial ? provincialError : zoneError;
  const usingDefaults =
    editingProvincial
      ? provincialFetched && !provincialSetting
      : zoneFetched && rateSource === "workspace_default";

  const zoneLabel =
    effectiveZoneId != null
      ? zones.find((z) => z.id === effectiveZoneId)?.name ?? "Zone"
      : "—";

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
            Per-division fees keyed by game division (<code className="text-[10px]">league_tier</code>
            ). Game fees use the rate matrix for the rink&apos;s zone. Provincial default applies when
            a zone has no custom rates.
          </p>
          {usingDefaults ? (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
              {editingProvincial
                ? "Using built-in defaults — click Save to store provincial template."
                : "This zone inherits the provincial default — save or copy default to customize."}
            </p>
          ) : rateSource === "zone" ? (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
              Zone-specific rates active for {zoneLabel}.
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
          {!editingProvincial && effectiveZoneId ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={copyDefaultMutation.isPending}
              onClick={() => copyDefaultMutation.mutate()}
            >
              Copy provincial default
            </Button>
          ) : null}
          <Button
            size="sm"
            className="gap-1.5"
            disabled={saveMutation.isPending || (!editingProvincial && !effectiveZoneId)}
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

      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
        {isProvincialAdmin ? (
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
              Edit rates for
            </label>
            <Select
              value={rateTarget}
              onValueChange={(v) => setRateTarget(v as RateTarget)}
            >
              <SelectTrigger className="h-8 min-w-[200px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="provincial">Provincial default (fallback)</SelectItem>
                <SelectItem value="zone">Specific zone</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ) : null}
        {!editingProvincial ? (
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
              Zone
            </label>
            {zoneLocked ? (
              <p className="h-8 flex items-center text-xs font-medium">{zoneLabel}</p>
            ) : (
              <Select value={zoneId ?? ""} onValueChange={setZoneId}>
                <SelectTrigger className="h-8 min-w-[200px] text-xs">
                  <SelectValue placeholder="Select zone" />
                </SelectTrigger>
                <SelectContent>
                  {zones.map((z) => (
                    <SelectItem key={z.id} value={z.id}>
                      {zoneSelectLabel(z.name, z.id, profile?.zone_id, t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        ) : null}
      </div>

      <DefaultRatesStrip matrix={matrix} onChange={setMatrix} />
      <PayRatesMatrixTable matrix={matrix} onChange={setMatrix} />
    </section>
  );
}
