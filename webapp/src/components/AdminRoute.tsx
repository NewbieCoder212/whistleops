import { Navigate, Outlet } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { canAccessAdminPortal } from "@/lib/adminPortalAccess";

export function AdminRoute() {
  const { session, loading: authLoading } = useAuth();
  const { data: profile, isLoading: profileLoading, isError: profileError } = useProfile();

  if (authLoading || (session && profileLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session) return <Navigate to="/login" replace />;

  if (profileError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-6 text-center">
        <p className="text-sm font-medium">Could not load your profile.</p>
        <p className="text-xs text-muted-foreground max-w-sm">
          The backend API may be offline or the wrong app is using port 3000. Restart with{" "}
          <code className="rounded bg-muted px-1">cd backend && bun run dev</code>.
        </p>
      </div>
    );
  }

  if (profile && !canAccessAdminPortal(profile.role)) {
    return <Navigate to="/dashboard/schedule" replace />;
  }

  return <Outlet />;
}
