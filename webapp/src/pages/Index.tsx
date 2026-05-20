import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { api } from "@/lib/api";
import { isSupabaseConfigured } from "@/lib/supabase";
import { Button } from "@/components/ui/button";

type Health = { status: string; supabase: "ready" | "missing-env-vars" };

const StatusDot = ({ ok }: { ok: boolean }) => (
  <span
    className={`inline-block h-2 w-2 rounded-full flex-shrink-0 ${
      ok ? "bg-emerald-500" : "bg-amber-500"
    }`}
  />
);

const Index = () => {
  const health = useQuery({
    queryKey: ["health"],
    queryFn: () => api.raw("/health").then((r) => r.json() as Promise<Health>),
    staleTime: 30_000,
  });

  const frontendReady = isSupabaseConfigured();
  const backendReady = health.data?.supabase === "ready";

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-md space-y-8">
        {/* Brand */}
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            WhistleOps
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Officials Scheduling
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Foundation ready. Configure your certification levels and leagues to get started.
          </p>
        </div>

        {/* Status */}
        <div className="rounded-lg border border-border p-4 space-y-3">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            System status
          </p>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <StatusDot ok={!health.isError} />
                Backend
              </span>
              <span className="text-muted-foreground text-xs">
                {health.isLoading ? "checking…" : health.isError ? "unreachable" : "ok"}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <StatusDot ok={backendReady} />
                Supabase (backend)
              </span>
              <span className="text-muted-foreground text-xs">
                {backendReady ? "ready" : "missing env vars"}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <StatusDot ok={frontendReady} />
                Supabase (frontend)
              </span>
              <span className="text-muted-foreground text-xs">
                {frontendReady ? "ready" : "missing env vars"}
              </span>
            </div>
          </div>
        </div>

        {/* CTA */}
        <Button asChild className="w-full gap-2">
          <Link to="/admin/config">
            Open Admin Configuration
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default Index;
