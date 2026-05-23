import { useQuery } from "@tanstack/react-query";
import { CalendarCheck, ArrowRight, MapPin, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { api } from "@/lib/api";
import { useProfile } from "@/hooks/useProfile";
import { useTranslation } from "@/i18n/I18nProvider";
import { formatGameDateShort, formatGameTime, todayYmd } from "@/lib/atlanticTime";

type AssignmentRow = {
  id: string;
  position: string;
  status: string;
  game: {
    id: string;
    date_time: string;
    home_team: string | null;
    away_team: string | null;
    venue: { name: string } | null;
  } | null;
};

type AvailSlot = { morning: boolean; afternoon: boolean; evening: boolean };

function positionBadge(pos: string) {
  const styles: Record<string, string> = {
    REF1: "bg-blue-500/10 text-blue-600",
    REF2: "bg-blue-500/10 text-blue-600",
    LINE1: "bg-green-500/10 text-green-600",
    LINE2: "bg-green-500/10 text-green-600",
    SUPERVISOR: "bg-purple-500/10 text-purple-600",
  };
  return styles[pos] ?? "bg-muted text-muted-foreground";
}

export default function OfficialHome() {
  const { t } = useTranslation();
  const { data: profile } = useProfile();

  const todayStr = todayYmd();
  const monthKey = todayStr.slice(0, 7);

  const { data: assignments = [] } = useQuery<AssignmentRow[]>({
    queryKey: ["assignments", "mine"],
    queryFn: () => api.get<AssignmentRow[]>("/api/assignments/mine?status=CONFIRMED"),
  });

  const { data: avail = [] } = useQuery<AvailSlot[]>({
    queryKey: ["availability", monthKey],
    queryFn: () => api.get<AvailSlot[]>(`/api/availability?month=${monthKey}`),
  });

  const upcoming = assignments
    .filter((a) => a.game && a.game.date_time >= todayStr)
    .sort((a, b) => (a.game!.date_time < b.game!.date_time ? -1 : 1))
    .slice(0, 5);

  const availDays = avail.filter((s) => s.morning || s.afternoon || s.evening).length;

  const firstName = profile?.full_name?.split(" ")[0] ?? "there";

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold">{t("dashboardHome.greeting", { name: firstName })}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("dashboardHome.subtitle")}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-border bg-card p-4 space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {t("dashboardHome.stats.upcoming")}
            </p>
            <p className="text-3xl font-bold tabular-nums">{upcoming.length}</p>
            <p className="text-xs text-muted-foreground">{t("dashboardHome.stats.upcomingSub")}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {t("dashboardHome.stats.available")}
            </p>
            <p className="text-3xl font-bold tabular-nums">{availDays}</p>
            <p className="text-xs text-muted-foreground">{t("dashboardHome.stats.availableSub")}</p>
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-semibold">{t("dashboardHome.upcomingTitle")}</h2>

          {upcoming.length === 0 ? (
            <div className="rounded-xl border border-border bg-muted/30 px-5 py-8 text-center space-y-2">
              <CalendarCheck className="h-8 w-8 mx-auto text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">{t("dashboardHome.noGames")}</p>
            </div>
          ) : (
            <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
              {upcoming.map((a) => {
                const game = a.game!;
                const { timeStr } = formatGameTime(game.date_time);
                const dateLabel = formatGameDateShort(game.date_time);
                return (
                  <div key={a.id} className="bg-card px-4 py-3.5 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium truncate">
                        {game.home_team ?? t("common.tbd")}{" "}
                        <span className="text-muted-foreground font-normal">{t("common.vs")}</span>{" "}
                        {game.away_team ?? t("common.tbd")}
                      </p>
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${positionBadge(a.position)}`}>
                        {a.position}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {dateLabel} {timeStr}
                      </span>
                      {game.venue ? (
                        <span className="flex items-center gap-1 truncate">
                          <MapPin className="h-3 w-3 flex-shrink-0" />
                          {game.venue.name}
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <Link
          to="/dashboard/availability"
          className="flex items-center justify-between rounded-xl border border-border bg-primary/5 px-5 py-4 hover:bg-primary/10 transition-colors group"
        >
          <div className="space-y-0.5">
            <p className="text-sm font-medium">{t("dashboardHome.availabilityCta.title")}</p>
            <p className="text-xs text-muted-foreground">{t("dashboardHome.availabilityCta.subtitle")}</p>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
        </Link>
      </div>
    </DashboardLayout>
  );
}
