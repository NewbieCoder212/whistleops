import { Link, useLocation, useNavigate } from "react-router-dom";
import { Shield, LogOut, CalendarDays, CalendarCheck, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useTranslation } from "@/i18n/I18nProvider";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Button } from "@/components/ui/button";

const bottomNavKeys = [
  { labelKey: "nav.schedule", href: "/dashboard/schedule", icon: CalendarDays },
  { labelKey: "nav.availability", href: "/dashboard/availability", icon: CalendarCheck },
  { labelKey: "nav.profile", href: "/dashboard/profile", icon: User },
] as const;

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const { user, signOut } = useAuth();
  const { data: profile } = useProfile();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  const displayName = profile?.full_name ?? user?.email ?? "";

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="flex items-center gap-2 px-3 h-14 border-b border-border bg-primary text-primary-foreground sticky top-0 z-10 flex-shrink-0">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-white/10 flex-shrink-0">
          <Shield className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="font-heading font-semibold text-sm block truncate">{t("brand.name")}</span>
          {displayName ? (
            <span className="text-[11px] text-primary-foreground/70 truncate block hidden sm:block">
              {displayName}
            </span>
          ) : null}
        </div>
        <LanguageToggle variant="onPrimary" className="border-white/20 flex-shrink-0" />
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/10 flex-shrink-0"
          onClick={handleSignOut}
          title={t("nav.signOut")}
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </header>

      <main className="flex-1 overflow-auto pb-24">
        <div className="max-w-xl mx-auto px-4 py-6">{children}</div>
      </main>

      <nav className="fixed bottom-0 inset-x-0 z-20 flex border-t border-border bg-card/95 backdrop-blur">
        {bottomNavKeys.map(({ labelKey, href, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              to={href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 py-3 text-[11px] font-medium transition-colors min-h-[56px]",
                active ? "text-secondary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className={cn("h-5 w-5", active ? "text-secondary" : "")} />
              {t(labelKey)}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
