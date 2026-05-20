import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DollarSign, AlertCircle, RefreshCw } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { OfficialPayRow } from "@/features/finance/OfficialPayRow";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";
import { toast } from "sonner";
import type { PayReport } from "@shared/types";

function fmt(amount: number): string {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(amount);
}

function fmtRate(amount: number): string {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", minimumFractionDigits: 2 }).format(amount);
}

function fmtTs(isoStr: string): string {
  return new Date(isoStr).toLocaleString("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export default function Finance() {
  const qc = useQueryClient();

  const { data: report, isLoading, isError, dataUpdatedAt } = useQuery<PayReport>({
    queryKey: ["pay-report"],
    queryFn: () => api.get<PayReport>("/api/pay-report"),
  });

  const { mutate: approve, isPending: approving, variables: approvingId } = useMutation({
    mutationFn: (officialId: string) =>
      api.post<{ approved_count: number }>("/api/pay-report/approve", { official_id: officialId }),
    onSuccess: (result, officialId) => {
      qc.invalidateQueries({ queryKey: ["pay-report"] });
      toast.success(`${result.approved_count} assignment${result.approved_count !== 1 ? "s" : ""} approved for payout.`);
    },
    onError: (e: Error) => {
      toast.error(e.message.includes("401") ? "Admin sign-in required." : e.message);
    },
  });

  const pendingTotal = report?.officials
    .filter((o) => !o.all_approved)
    .reduce((sum, o) => sum + o.total_due, 0) ?? 0;

  const approvedTotal = report?.officials
    .filter((o) => o.all_approved)
    .reduce((sum, o) => sum + o.total_due, 0) ?? 0;

  const pendingCount = report?.officials.filter((o) => !o.all_approved).length ?? 0;
  const approvedCount = report?.officials.filter((o) => o.all_approved).length ?? 0;

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-6xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Finance & Payroll</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Confirmed assignments ready for payout review.
              {report?.season ? (
                <span className="ml-2 font-medium text-foreground/80">
                  Season {report.season.label}
                </span>
              ) : null}
              {dataUpdatedAt > 0 ? (
                <span className="ml-2 text-muted-foreground/60">
                  · Refreshed {fmtTs(new Date(dataUpdatedAt).toISOString())}
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
            Refresh
          </Button>
        </div>

        {/* Pay rates banner */}
        {report && (
          <div className="rounded-lg border border-border bg-secondary/20 px-4 py-3">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
              <span className="font-medium text-muted-foreground uppercase tracking-wider">Default Rates</span>
              {(["REF1", "REF2", "LINE1", "LINE2", "SUPERVISOR"] as const).map((pos) => (
                <span key={pos} className="text-foreground">
                  <span className="font-semibold">{pos}</span>
                  <span className="text-muted-foreground">
                    {" "}
                    {fmtRate(report.pay_rates.default[pos])}/game
                  </span>
                </span>
              ))}
              <span className="text-foreground">
                <span className="font-semibold">Mileage</span>
                <span className="text-muted-foreground">
                  {" "}
                  {fmtRate(report.pay_rates.default.cost_per_km)}/km
                </span>
              </span>
              {(report.pay_rates.by_league_type || report.pay_rates.by_league_tier) && (
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                  League overrides active
                </span>
              )}
              <span className="ml-auto text-muted-foreground/60 hidden sm:block">
                Edit in Admin → Configuration
              </span>
            </div>
          </div>
        )}

        {/* Summary stats */}
        {report && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Officials Pending", value: String(pendingCount), sub: "awaiting approval" },
              { label: "Outstanding", value: fmt(pendingTotal), sub: "not yet approved" },
              { label: "Officials Approved", value: String(approvedCount), sub: "locked for payout" },
              { label: "Approved Total", value: fmt(approvedTotal), sub: "ready for export" },
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

        {/* Officials table */}
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
            <AlertCircle className="h-6 w-6 text-destructive" />
            <p className="text-sm">Failed to load pay report.</p>
            <p className="text-xs">Run migration 0004 in Supabase if you haven't yet.</p>
          </div>
        ) : !report || report.officials.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-muted-foreground">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
              <DollarSign className="h-6 w-6" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium">No confirmed assignments</p>
              <p className="text-xs mt-0.5">
                Assignments appear here once their status is set to Confirmed on the Schedule board.
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-border">
                  <TableHead className="w-[220px]">Official</TableHead>
                  <TableHead className="w-[70px] text-center">Games</TableHead>
                  <TableHead className="w-[110px]">Game Fees</TableHead>
                  <TableHead>Distance / Mileage</TableHead>
                  <TableHead className="w-[120px]">Total Due</TableHead>
                  <TableHead className="w-[110px]">Status</TableHead>
                  <TableHead className="w-[160px]">Action</TableHead>
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
