import { useQuery } from "@tanstack/react-query";
import { CalendarCheck, ArrowRight, MapPin, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { api } from "@/lib/api";
import { useProfile } from "@/hooks/useProfile";

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
  const { data: profile } = useProfile();

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
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
        {/* Greeting */}
        <div>
          <h1 className="text-2xl font-bold">Hey, {firstName}.</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Here's your officiating snapshot for this month.
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-border bg-card p-4 space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Upcoming</p>
            <p className="text-3xl font-bold tabular-nums">{upcoming.length}</p>
            <p className="text-xs text-muted-foreground">confirmed games</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Available</p>
            <p className="text-3xl font-bold tabular-nums">{availDays}</p>
            <p className="text-xs text-muted-foreground">days set this month</p>
          </div>
        </div>

        {/* Upcoming games */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Upcoming Games</h2>
          </div>

          {upcoming.length === 0 ? (
            <div className="rounded-xl border border-border bg-muted/30 px-5 py-8 text-center space-y-2">
              <CalendarCheck className="h-8 w-8 mx-auto text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No confirmed games yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
              {upcoming.map((a) => {
                const game = a.game!;
                const gameDate = new Date(game.date_time);
                return (
                  <div key={a.id} className="bg-card px-4 py-3.5 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium truncate">
                        {game.home_team ?? "TBD"} <span className="text-muted-foreground font-normal">vs</span> {game.away_team ?? "TBD"}
                      </p>
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${positionBadge(a.position)}`}>
                        {a.position}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {gameDate.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}{" "}
                        {gameDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
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

        {/* CTA */}
        <Link
          to="/dashboard/availability"
          className="flex items-center justify-between rounded-xl border border-border bg-primary/5 px-5 py-4 hover:bg-primary/10 transition-colors group"
        >
          <div className="space-y-0.5">
            <p className="text-sm font-medium">Set Your Availability</p>
            <p className="text-xs text-muted-foreground">Let your assignor know when you're free.</p>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
        </Link>
      </div>
    </DashboardLayout>
  );
}
