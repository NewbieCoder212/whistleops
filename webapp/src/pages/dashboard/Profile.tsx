import { useQuery } from "@tanstack/react-query";
import { User, Phone, Mail, Hash, MapPin, Award, DollarSign, TrendingUp } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { api } from "@/lib/api";
import { useProfile } from "@/hooks/useProfile";
import { useTranslation } from "@/i18n/I18nProvider";
import type { EarningsSummary } from "@shared/types";

type CertLevel = { id: string; name: string };

function InfoRow({ icon: Icon, label, value }: {
  icon: typeof User;
  label: string;
  value: string | null | undefined;
}) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-3 border-b border-border last:border-0">
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-muted">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="text-sm text-foreground mt-0.5 break-words">{value}</p>
      </div>
    </div>
  );
}

function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-0.5">
      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      {sub ? <p className="text-xs text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

export default function OfficialProfile() {
  const { t } = useTranslation();
  const { data: profile, isLoading } = useProfile();

  const { data: earnings } = useQuery<EarningsSummary>({
    queryKey: ["earnings", "mine"],
    queryFn: () => api.get<EarningsSummary>("/api/earnings/mine"),
    enabled: !!profile,
  });

  const { data: certLevels = [] } = useQuery<CertLevel[]>({
    queryKey: ["certification-levels"],
    queryFn: () => api.get<CertLevel[]>("/api/certification-levels"),
  });

  const certLevel = certLevels.find((l) => l.id === profile?.official_level_id);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <div className="h-24 rounded-xl bg-muted animate-pulse" />
          <div className="h-40 rounded-xl bg-muted animate-pulse" />
          <div className="h-40 rounded-xl bg-muted animate-pulse" />
        </div>
      </DashboardLayout>
    );
  }

  const fmt = (n: number) =>
    n.toLocaleString("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 2 });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Avatar + name */}
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 ring-2 ring-primary/20">
            <User className="h-7 w-7 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold truncate">{profile?.full_name ?? "—"}</h1>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {profile?.official_type ? (
                <span className="text-xs font-medium bg-blue-500/10 text-blue-600 px-2 py-0.5 rounded-full">
                  {profile.official_type === "REFEREE"
                    ? t("profile.officialType.referee")
                    : t("profile.officialType.linesman")}
                </span>
              ) : null}
              {certLevel ? (
                <span className="text-xs font-medium bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Award className="h-3 w-3" />
                  {certLevel.name}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {/* Contact info */}
        <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
          <div className="px-4 py-3 bg-muted/30">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("profile.contactSection")}
            </p>
          </div>
          <div className="px-4">
            <InfoRow icon={Mail} label={t("profile.fields.email")} value={profile?.email} />
            <InfoRow icon={Phone} label={t("profile.fields.phone")} value={profile?.cell_phone} />
            <InfoRow icon={Hash} label={t("profile.fields.jersey")} value={profile?.jersey_number} />
            <InfoRow icon={MapPin} label={t("profile.fields.homeAddress")} value={profile?.home_address} />
          </div>
        </div>

        {/* Earnings */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">
              {t("profile.earnings.title")}
              {earnings?.season ? (
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  {earnings.season.label}
                </span>
              ) : null}
            </h2>
          </div>

          {earnings ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <StatTile
                  label={t("profile.earnings.stats.games")}
                  value={String(earnings.assignment_count)}
                  sub={t("profile.earnings.stats.confirmedTotal")}
                />
                <StatTile
                  label={t("profile.earnings.stats.gameFees")}
                  value={fmt(earnings.game_fees)}
                  sub={t("profile.earnings.stats.beforeMileage")}
                />
                <StatTile
                  label={t("profile.earnings.stats.mileage")}
                  value={fmt(earnings.mileage_payout)}
                  sub={t("profile.earnings.stats.kmTotal", {
                    count: Math.round(earnings.mileage_km),
                  })}
                />
                <StatTile
                  label={t("profile.earnings.stats.totalDue")}
                  value={fmt(earnings.total_due)}
                  sub={
                    earnings.approved_count > 0
                      ? t("profile.earnings.approvalStatus.approved", {
                          count: earnings.approved_count,
                        })
                      : t("profile.earnings.approvalStatus.pending")
                  }
                />
              </div>

              {earnings.distance_km > 0 ? (
                <p className="text-xs text-muted-foreground text-center">
                  {t("profile.earnings.distanceNote", {
                    km: earnings.distance_km,
                    rate: fmt(earnings.cost_per_km),
                  })}
                </p>
              ) : null}
            </>
          ) : (
            <div className="rounded-xl border border-border bg-muted/30 px-5 py-6 text-center">
              <DollarSign className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">{t("profile.earnings.empty")}</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
