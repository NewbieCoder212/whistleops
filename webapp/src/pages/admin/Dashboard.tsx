import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Users, AlertCircle, CheckCircle2, ArrowRight, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { zonesApi } from "@/lib/resources";
import { useProfile } from "@/hooks/useProfile";
import { canAccessPayroll } from "@/lib/payrollAccess";
import { useTranslation } from "@/i18n/I18nProvider";
import { gameStatusLabel } from "@/i18n/labels";
import {
  addDaysYmd,
  formatGameTime,
  toDateKeyFromIso,
  todayYmd,
} from "@/lib/atlanticTime";
import type { Profile, Zone } from "@shared/types";

type GameRow = {
  id: string;
  date_time: string;
  status: string;
  home_team: string | null;
  away_team: string | null;
  assignments: { status: string }[];
};

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
  href,
}: {
  label: string;
  value: number | string;
  icon: typeof CalendarDays;
  accent: string;
  href?: string;
}) {
  const inner = (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-border bg-card p-5 hover:border-border/80 transition-colors">
      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="mt-1.5 text-3xl font-bold tabular-nums">{value}</p>
      </div>
      <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${accent}`}>
        <Icon className="h-5 w-5" />
      </div>
    </div>
  );
  return href ? <Link to={href}>{inner}</Link> : inner;
}

export default function AdminDashboard() {
  const { t } = useTranslation();
  const { data: profile } = useProfile();

  const today = todayYmd();

  const { data: upcomingGames = [] } = useQuery<GameRow[]>({
    queryKey: ["games", "upcoming-dashboard"],
    queryFn: () => api.get<GameRow[]>(`/api/games?startDate=${today}`),
  });

  const { data: profiles = [] } = useQuery<Profile[]>({
    queryKey: ["profiles"],
    queryFn: () => api.get<Profile[]>("/api/profiles"),
  });

  const { data: zones = [] } = useQuery<Zone[]>({
    queryKey: ["zones"],
    queryFn: () => zonesApi.list(),
    staleTime: 10 * 60 * 1000,
  });

  const unassigned = upcomingGames.filter((g) => g.status === "UNASSIGNED").length;
  const confirmedCount = upcomingGames.reduce(
    (n, g) => n + g.assignments.filter((a) => a.status === "CONFIRMED").length,
    0
  );
  const officialsCount = profiles.filter((p) => p.role === "OFFICIAL").length;

  const todayGames = upcomingGames.filter(
    (g) => toDateKeyFromIso(g.date_time) === today
  );

  const firstName = profile?.full_name?.trim().split(/\s+/)[0];
  const homeZone = profile?.zone_id
    ? zones.find((z) => z.id === profile.zone_id) ?? null
    : null;

  const subtitle = homeZone
    ? t("adminDashboard.subtitleZone", { zone: homeZone.name })
    : profile?.role === "ADMIN"
      ? t("adminDashboard.subtitleAdmin")
      : t("adminDashboard.subtitleDefault");

  const quickLinks = [
    {
      label: t("adminDashboard.quickLinks.schedule.label"),
      desc: t("adminDashboard.quickLinks.schedule.desc"),
      href: "/admin/schedule",
    },
    ...(canAccessPayroll(profile?.role)
      ? [
          {
            label: t("adminDashboard.quickLinks.finance.label"),
            desc: t("adminDashboard.quickLinks.finance.desc"),
            href: "/admin/finance",
          },
        ]
      : []),
    {
      label: t("adminDashboard.quickLinks.import.label"),
      desc: t("adminDashboard.quickLinks.import.desc"),
      href: "/admin/import-games",
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-8 max-w-4xl">
        <div className="rounded-xl border border-border bg-gradient-to-br from-card via-card to-muted/30 px-6 py-5">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1 className="text-2xl font-bold tracking-tight">
              {firstName
                ? t("adminDashboard.welcomeNamed", { name: firstName })
                : t("adminDashboard.welcome")}
            </h1>
            {homeZone ? (
              <Badge variant="secondary" className="gap-1.5 px-2.5 py-1 font-normal text-xs">
                <MapPin className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
                {homeZone.name}
              </Badge>
            ) : null}
          </div>
          <p className="mt-2 text-sm text-muted-foreground max-w-xl">{subtitle}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label={t("adminDashboard.stats.upcomingGames")}
            value={upcomingGames.length}
            icon={CalendarDays}
            accent="bg-blue-500/10 text-blue-500"
            href="/admin/schedule"
          />
          <StatCard
            label={t("adminDashboard.stats.needAssignment")}
            value={unassigned}
            icon={AlertCircle}
            accent={unassigned > 0 ? "bg-amber-500/10 text-amber-500" : "bg-muted text-muted-foreground"}
            href="/admin/schedule"
          />
          <StatCard
            label={t("adminDashboard.stats.confirmedSlots")}
            value={confirmedCount}
            icon={CheckCircle2}
            accent="bg-green-500/10 text-green-500"
          />
          <StatCard
            label={t("adminDashboard.stats.officials")}
            value={officialsCount}
            icon={Users}
            accent="bg-purple-500/10 text-purple-500"
            href="/admin/officials"
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">{t("adminDashboard.todayGames")}</h2>
            <Link
              to="/admin/schedule"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {t("adminDashboard.viewAll")} <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {todayGames.length === 0 ? (
            <div className="rounded-xl border border-border bg-muted/30 px-5 py-8 text-center">
              <p className="text-sm text-muted-foreground">{t("adminDashboard.noGamesToday")}</p>
            </div>
          ) : (
            <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
              {todayGames.slice(0, 6).map((game) => (
                <div key={game.id} className="flex items-center gap-4 px-5 py-3.5 bg-card hover:bg-secondary/40 transition-colors">
                  <div className="text-xs text-muted-foreground w-14 flex-shrink-0 tabular-nums">
                    {formatGameTime(game.date_time).timeStr}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {game.home_team ?? t("common.tbd")}{" "}
                      <span className="text-muted-foreground font-normal">{t("common.vs")}</span>{" "}
                      {game.away_team ?? t("common.tbd")}
                    </p>
                  </div>
                  <span
                    className={`text-[11px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${
                      game.status === "UNASSIGNED"
                        ? "bg-amber-500/10 text-amber-600"
                        : game.status === "ASSIGNED"
                        ? "bg-blue-500/10 text-blue-600"
                        : "bg-green-500/10 text-green-600"
                    }`}
                  >
                    {gameStatusLabel(game.status, t)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {quickLinks.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className="rounded-xl border border-border bg-card p-4 hover:bg-secondary/50 transition-colors group"
            >
              <p className="text-sm font-medium group-hover:text-primary transition-colors">{item.label}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{item.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
