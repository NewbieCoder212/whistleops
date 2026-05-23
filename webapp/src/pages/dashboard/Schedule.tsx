import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, MapPin, Clock, Check, X, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatGameDateShort, formatGameTime, todayYmd } from "@/lib/atlanticTime";
import { CalendarSubscribeMenu } from "@/features/schedule/CalendarSubscribeMenu";
import { useTranslation } from "@/i18n/I18nProvider";

type GameSnap = {
  id: string;
  date_time: string;
  home_team: string | null;
  away_team: string | null;
  venue: { name: string } | null;
};

type Assignment = {
  id: string;
  position: string;
  status: string;
  cancel_reason: string | null;
  game: GameSnap | null;
};

const POSITION_COLORS: Record<string, string> = {
  REF1: "bg-blue-500/10 text-blue-600 border-blue-200",
  REF2: "bg-blue-500/10 text-blue-600 border-blue-200",
  LINE1: "bg-green-500/10 text-green-600 border-green-200",
  LINE2: "bg-green-500/10 text-green-600 border-green-200",
  SUPERVISOR: "bg-purple-500/10 text-purple-600 border-purple-200",
};

function GameCard({ assignment, onAccept, onDecline, isPending, t }: {
  assignment: Assignment;
  onAccept?: () => void;
  onDecline?: () => void;
  isPending?: boolean;
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  const game = assignment.game;
  if (!game) return null;

  const dateStr = formatGameDateShort(game.date_time);
  const { timeStr } = formatGameTime(game.date_time);
  const posColor = POSITION_COLORS[assignment.position] ?? "bg-muted text-muted-foreground border-border";

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-3.5 space-y-2.5">
        {/* Matchup */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold leading-tight">
              {game.home_team ?? t("common.tbd")}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t("common.vs")} {game.away_team ?? t("common.tbd")}
            </p>
          </div>
          <span className={cn(
            "text-[11px] font-semibold px-2 py-0.5 rounded-full border flex-shrink-0",
            posColor
          )}>
            {assignment.position}
          </span>
        </div>

        {/* Time + venue */}
        <div className="flex flex-col gap-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Clock className="h-3 w-3 flex-shrink-0" />
            {dateStr} · {timeStr}
          </span>
          {game.venue ? (
            <span className="flex items-center gap-1.5">
              <MapPin className="h-3 w-3 flex-shrink-0" />
              {game.venue.name}
            </span>
          ) : null}
        </div>
      </div>

      {/* Accept / Decline action bar */}
      {onAccept && onDecline ? (
        <div className="flex border-t border-border divide-x divide-border">
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 h-11 gap-1.5 text-sm font-medium text-destructive hover:text-destructive hover:bg-destructive/5 rounded-none"
            onClick={onDecline}
            disabled={isPending}
          >
            <X className="h-4 w-4" />
            {t("dashboardSchedule.decline")}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 h-11 gap-1.5 text-sm font-medium text-green-600 hover:text-green-700 hover:bg-green-500/5 rounded-none"
            onClick={onAccept}
            disabled={isPending}
          >
            <Check className="h-4 w-4" />
            {t("dashboardSchedule.accept")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export default function OfficialSchedule() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [showPast, setShowPast] = useState(false);

  const todayStr = todayYmd();

  const { data: assignments = [], isLoading } = useQuery<Assignment[]>({
    queryKey: ["assignments", "mine", "all"],
    queryFn: () => api.get<Assignment[]>("/api/assignments/mine"),
  });

  const mutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.put<Assignment>(`/api/assignments/${id}`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assignments", "mine"] });
      qc.invalidateQueries({ queryKey: ["games"] });
      qc.invalidateQueries({ queryKey: ["assign-board"] });
    },
  });

  const pending = assignments.filter(
    (a) => a.status === "PENDING" && a.game && a.game.date_time >= todayStr
  ).sort((a, b) => (a.game!.date_time < b.game!.date_time ? -1 : 1));

  const confirmed = assignments.filter(
    (a) => a.status === "CONFIRMED" && a.game && a.game.date_time >= todayStr
  ).sort((a, b) => (a.game!.date_time < b.game!.date_time ? -1 : 1));

  const past = assignments.filter(
    (a) => a.game && a.game.date_time < todayStr && a.status === "CONFIRMED"
  ).sort((a, b) => (a.game!.date_time > b.game!.date_time ? -1 : 1));

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">{t("dashboardSchedule.title")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t("dashboardSchedule.subtitle")}</p>
          </div>
          <CalendarSubscribeMenu />
        </div>

        {/* Action required */}
        {pending.length > 0 ? (
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold">{t("dashboardSchedule.actionRequired")}</h2>
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/15 text-[11px] font-bold text-amber-600">
                {pending.length}
              </span>
            </div>
            {pending.map((a) => (
              <GameCard
                key={a.id}
                assignment={a}
                t={t}
                onAccept={() => mutation.mutate({ id: a.id, status: "CONFIRMED" })}
                onDecline={() => mutation.mutate({ id: a.id, status: "REJECTED" })}
                isPending={mutation.isPending}
              />
            ))}
          </section>
        ) : null}

        {/* Upcoming confirmed */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold">{t("dashboardSchedule.upcoming")}</h2>
          {confirmed.length === 0 ? (
            <div className="rounded-xl border border-border bg-muted/30 px-5 py-8 text-center space-y-2">
              <CalendarDays className="h-8 w-8 mx-auto text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">{t("dashboardSchedule.noUpcoming")}</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {confirmed.map((a) => (
                <GameCard key={a.id} assignment={a} t={t} />
              ))}
            </div>
          )}
        </section>

        {/* Past games collapsible */}
        {past.length > 0 ? (
          <section className="space-y-3">
            <button
              onClick={() => setShowPast(!showPast)}
              className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPast ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              {t("dashboardSchedule.pastGames", { count: past.length })}
            </button>
            {showPast ? (
              <div className="space-y-2.5 opacity-60">
                {past.slice(0, 10).map((a) => (
                  <GameCard key={a.id} assignment={a} t={t} />
                ))}
              </div>
            ) : null}
          </section>
        ) : null}
      </div>
    </DashboardLayout>
  );
}
