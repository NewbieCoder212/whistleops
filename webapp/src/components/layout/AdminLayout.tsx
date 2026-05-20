import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Settings, Shield, ChevronRight, Users, Upload,
  CalendarDays, DollarSign, LogOut, LayoutDashboard, Menu, X, CalendarRange,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useTranslation } from "@/i18n/I18nProvider";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";

const navKeys = [
  { labelKey: "nav.dashboard", descKey: "navDesc.dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { labelKey: "nav.schedule", descKey: "navDesc.schedule", href: "/admin/schedule", icon: CalendarDays },
  { labelKey: "nav.availability", descKey: "navDesc.availability", href: "/admin/availability", icon: CalendarRange },
  { labelKey: "nav.officials", descKey: "navDesc.officials", href: "/admin/officials", icon: Users },
  { labelKey: "nav.finance", descKey: "navDesc.finance", href: "/admin/finance", icon: DollarSign },
  { labelKey: "nav.importGames", descKey: "navDesc.importGames", href: "/admin/import-games", icon: Upload },
  { labelKey: "nav.config", descKey: "navDesc.config", href: "/admin/config", icon: Settings },
] as const;

function NavList({ onNav }: { onNav?: () => void }) {
  const { pathname } = useLocation();
  const { t } = useTranslation();

  return (
    <nav className="flex-1 px-2 py-4 space-y-0.5">
      {navKeys.map((item) => {
        const active = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            to={item.href}
            onClick={onNav}
            className={cn(
              "group flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
              active
                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground"
            )}
          >
            <item.icon className="h-4 w-4 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{t(item.labelKey)}</p>
              <p className="text-[11px] truncate opacity-70">{t(item.descKey)}</p>
            </div>
            {active ? <ChevronRight className="h-3 w-3 opacity-50" /> : null}
          </Link>
        );
      })}
    </nav>
  );
}

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  const { data: profile } = useProfile();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  const displayName = profile?.full_name ?? user?.email ?? "";

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="hidden md:flex w-56 flex-shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
        <div className="flex items-center gap-2 px-4 py-5 border-b border-sidebar-border">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-sidebar-primary">
            <Shield className="h-4 w-4 text-sidebar-primary-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-sm font-heading font-semibold tracking-tight block truncate">
              {t("brand.name")}
            </span>
            <span className="text-[10px] text-sidebar-foreground/60 truncate block">
              {t("brand.province")}
            </span>
          </div>
          <span className="text-[10px] font-medium uppercase tracking-widest text-sidebar-foreground/70 border border-sidebar-border rounded px-1.5 py-0.5">
            {t("nav.admin")}
          </span>
        </div>

        <NavList />

        <div className="px-4 py-3 border-t border-sidebar-border space-y-2">
          {displayName ? (
            <p className="text-xs text-sidebar-foreground/70 truncate" title={displayName}>
              {displayName}
            </p>
          ) : null}
          <LanguageToggle variant="onPrimary" className="border-sidebar-border w-full justify-center" />
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 h-8 text-xs text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent px-2"
            onClick={handleSignOut}
          >
            <LogOut className="h-3.5 w-3.5" />
            {t("nav.signOut")}
          </Button>
        </div>
      </aside>

      <div className="md:hidden fixed top-0 inset-x-0 z-30 flex items-center gap-2 px-3 h-14 border-b border-border bg-primary text-primary-foreground">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 -ml-1 text-primary-foreground hover:bg-white/10"
          onClick={() => setMobileOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Shield className="h-4 w-4 flex-shrink-0" />
          <span className="font-heading font-semibold text-sm truncate">{t("brand.name")}</span>
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
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-64 p-0 flex flex-col bg-sidebar text-sidebar-foreground border-sidebar-border">
          <div className="flex items-center justify-between px-4 py-4 border-b border-sidebar-border">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-sidebar-primary">
                <Shield className="h-4 w-4 text-sidebar-primary-foreground" />
              </div>
              <span className="text-sm font-heading font-semibold">{t("brand.name")}</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-sidebar-foreground hover:bg-sidebar-accent"
              onClick={() => setMobileOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <NavList onNav={() => setMobileOpen(false)} />

          <div className="px-4 py-3 border-t border-sidebar-border space-y-2">
            {displayName ? (
              <p className="text-xs text-sidebar-foreground/70 truncate">{displayName}</p>
            ) : null}
            <LanguageToggle variant="onPrimary" className="border-sidebar-border w-full justify-center" />
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 h-8 text-xs text-sidebar-foreground/70 hover:bg-sidebar-accent px-2"
              onClick={handleSignOut}
            >
              <LogOut className="h-3.5 w-3.5" />
              {t("nav.signOut")}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 px-4 md:px-8 py-6 mt-14 md:mt-0 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
