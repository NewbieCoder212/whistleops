import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Navigate } from "react-router-dom";
import { DollarSign, AlertCircle, RefreshCw } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { OfficialPayRow } from "@/features/finance/OfficialPayRow";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { canAccessPayroll } from "@/lib/payrollAccess";
import {
  resolveDefaultZoneId,
  saveZonePreference,
} from "@/features/filters/scheduleFilterUtils";
import { formatGameDateTime } from "@/lib/atlanticTime";
import { useTranslation } from "@/i18n/I18nProvider";
import { zoneSelectLabel } from "@/i18n/labels";
import type { PayReport, Zone } from "@shared/types";

function fmt(amount: number): string {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(amount);
}

function fmtRate(amount: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 2,
  }).format(amount);
}

function fmtTs(isoStr: string): string {
  return formatGameDateTime(isoStr);
}

export default function Finance() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const qc = useQueryClient();
  const zoneInitialized = useRef(false);
  const [zoneId, setZoneId] = useState<string | null>(null);

  const { data: zones = [] } = useQuery<Zone[]>({
    queryKey: ["zones"],
    queryFn: () => api.get<Zone[]>("/api/zones"),
    staleTime: 10 * 60 * 1000,
  });

  const isProvincialAdmin = profile?.role === "ADMIN";
  const zoneLocked =
    !isProvincialAdmin &&
    (profile?.role === "ASSIGNOR" || profile?.role === "FINANCE");

  useEffect(() => {
    if (!profile || zoneInitialized.current || zones.length === 0) return;
    zoneInitialized.current = true;
    if (zoneLocked && profile.zone_id) {
      setZoneId(profile.zone_id);
      return;
    }
    const id = resolveDefaultZoneId({
      userId: user?.id,
      profileZoneId: profile.zone_id,
      role: profile.role,
      zoneIds: zones.map((z) => z.id),
    });
    setZoneId(id);
  }, [profile, user?.id, zones, zoneLocked]);

  const effectiveZoneId = zoneLocked ? profile?.zone_id ?? null : zoneId;

  const payReportUrl = effectiveZoneId
    ? `/api/pay-report?zoneId=${encodeURIComponent(effectiveZoneId)}`
    : "/api/pay-report";

  const { data: report, isLoading, isError, dataUpdatedAt } = useQuery<PayReport>({
    queryKey: ["pay-report", effectiveZoneId ?? "all"],
    queryFn: () => api.get<PayReport>(payReportUrl),
    enabled: !!profile && canAccessPayroll(profile.role) && (!zoneLocked || !!profile.zone_id),
  });

  const { mutate: approve, isPending: approving, variables: approvingId } = useMutation({
    mutationFn: (officialId: string) =>
      api.post<{ approved_count: number }>("/api/pay-report/approve", {
        official_id: officialId,
        ...(effectiveZoneId ? { zone_id: effectiveZoneId } : {}),
      }),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["pay-report"] });
      toast.success(t("finance.approveSuccess", { count: result.approved_count }));
    },
    onError: (e: Error) => {
      toast.error(e.message.includes("401") ? t("common.signInRequired") : e.message);
    },
  });

  const handleZoneChange = (value: string) => {
    if (zoneLocked) return;
    const next = value === "all" ? null : value;
    setZoneId(next);
    saveZonePreference(user?.id, next);
  };

  const zoneLabel =
    effectiveZoneId != null
      ? zones.find((z) => z.id === effectiveZoneId)?.name ?? report?.zone_name ?? t("filters.zone")
      : t("filters.allZonesLower");

  const pendingTotal =
    report?.officials.filter((o) => !o.all_approved).reduce((sum, o) => sum + o.total_due, 0) ?? 0;

  const approvedTotal =
    report?.officials.filter((o) => o.all_approved).reduce((sum, o) => sum + o.total_due, 0) ?? 0;

  const pendingCount = report?.officials.filter((o) => !o.all_approved).length ?? 0;
  const approvedCount = report?.officials.filter((o) => o.all_approved).length ?? 0;

  if (profile && !canAccessPayroll(profile.role)) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-6xl">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{t("finance.title")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("finance.description")}
              {zoneLocked ? t("finance.zoneLockedHint") : t("finance.zoneFilterHint")}
              {report?.season ? (
                <span className="ml-2 font-medium text-foreground/80">
                  {t("finance.season", { label: report.season.label })}
                </span>
              ) : null}
              {dataUpdatedAt > 0 ? (
                <span className="ml-2 text-muted-foreground/60">
                  {t("finance.refreshedAt", {
                    time: fmtTs(new Date(dataUpdatedAt).toISOString()),
                  })}
                </span>
              ) : null}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5"
            onClick={() => qc.invalidateQueries({ queryKey: ["pay-report"] })}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {t("finance.refresh")}
          </Button>
        </div>

        <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
              {t("filters.zone")}
            </label>
            {zoneLocked ? (
              <p className="h-8 flex items-center text-xs font-medium">{zoneLabel}</p>
            ) : (
              <Select value={zoneId ?? "all"} onValueChange={handleZoneChange}>
                <SelectTrigger className="h-8 min-w-[180px] text-xs">
                  <SelectValue placeholder={t("filters.allZonesLower")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("filters.allZonesLower")}</SelectItem>
                  {zones.map((z) => (
                    <SelectItem key={z.id} value={z.id}>
                      {zoneSelectLabel(z.name, z.id, profile?.zone_id, t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <p className="text-xs text-muted-foreground pb-1">
            {t("finance.showingFor")}{" "}
            <span className="font-medium text-foreground">{zoneLabel}</span>
          </p>
        </div>

        {report && (
          <div className="rounded-lg border border-border bg-secondary/20 px-4 py-3">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
              <span className="font-medium text-muted-foreground uppercase tracking-wider">
                {t("finance.defaultRates")}
              </span>
              {(["REF1", "REF2", "LINE1", "LINE2", "SUPERVISOR"] as const).map((pos) => (
                <span key={pos} className="text-foreground">
                  <span className="font-semibold">{pos}</span>
                  <span className="text-muted-foreground">
                    {" "}
                    {fmtRate(report.pay_rates.default[pos])}{t("finance.perGame")}
                  </span>
                </span>
              ))}
              <span className="text-foreground">
                <span className="font-semibold">{t("finance.mileage")}</span>
                <span className="text-muted-foreground">
                  {" "}
                  {fmtRate(report.pay_rates.default.cost_per_km)}{t("finance.perKm")}
                </span>
              </span>
              {(report.pay_rates.by_league_type || report.pay_rates.by_league_tier) && (
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                  {t("finance.leagueOverridesActive")}
                </span>
              )}
              <span className="ml-auto text-muted-foreground/60 hidden sm:block">
                {t("finance.editInConfig")}
              </span>
            </div>
          </div>
        )}

        {report && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              {
                label: t("finance.stats.officialsPending"),
                value: String(pendingCount),
                sub: t("finance.stats.sub.awaitingApproval"),
              },
              {
                label: t("finance.stats.outstanding"),
                value: fmt(pendingTotal),
                sub: t("finance.stats.sub.notYetApproved"),
              },
              {
                label: t("finance.stats.officialsApproved"),
                value: String(approvedCount),
                sub: t("finance.stats.sub.lockedForPayout"),
              },
              {
                label: t("finance.stats.approvedTotal"),
                value: fmt(approvedTotal),
                sub: t("finance.stats.sub.readyForExport"),
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-lg border border-border bg-card px-4 py-3 space-y-0.5"
              >
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className="text-lg font-semibold tabular-nums">{stat.value}</p>
                <p className="text-[11px] text-muted-foreground/70">{stat.sub}</p>
              </div>
            ))}
          </div>
        )}

        <Separator />

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
            <AlertCircle className="h-6 w-6 text-destructive" />
            <p className="text-sm">{t("finance.loadError")}</p>
          </div>
        ) : !report || report.officials.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-muted-foreground">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
              <DollarSign className="h-6 w-6" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium">{t("finance.empty.title")}</p>
              <p className="text-xs mt-0.5 max-w-sm">
                {effectiveZoneId
                  ? t("finance.empty.zone", { zone: zoneLabel })
                  : t("finance.empty.default")}
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-border">
                  <TableHead className="w-[220px]">{t("finance.table.official")}</TableHead>
                  <TableHead className="w-[70px] text-center">{t("finance.table.games")}</TableHead>
                  <TableHead className="w-[110px]">{t("finance.table.gameFees")}</TableHead>
                  <TableHead>{t("finance.table.distanceMileage")}</TableHead>
                  <TableHead className="w-[120px]">{t("finance.table.totalDue")}</TableHead>
                  <TableHead className="w-[110px]">{t("finance.table.status")}</TableHead>
                  <TableHead className="w-[160px]">{t("finance.table.action")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.officials.map((summary) => (
                  <OfficialPayRow
                    key={summary.official_id}
                    summary={summary}
                    onApprove={() => approve(summary.official_id)}
                    isPending={approving && approvingId === summary.official_id}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
