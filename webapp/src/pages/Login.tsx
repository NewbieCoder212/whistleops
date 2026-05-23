import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Shield, Loader2, AlertCircle, CalendarCheck, Users, DollarSign } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/i18n/I18nProvider";
import { LanguageToggle } from "@/components/LanguageToggle";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Profile } from "@shared/types";

const ADMIN_ROLES = ["ADMIN", "ASSIGNOR", "SUPERVISOR", "FINANCE"];

export default function Login() {
  const { signIn } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string })?.from;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const features = [
    { icon: CalendarCheck, textKey: "login.featureSchedule" as const },
    { icon: Users, textKey: "login.featureAssignments" as const },
    { icon: DollarSign, textKey: "login.featurePay" as const },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: authError } = await signIn(email, password);
    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    // Requires /api/profiles/me on server (Vercel path restore — docs/VERCEL_DEPLOY.md)
    try {
      const profile = await api.get<Profile>("/api/profiles/me");
      const isStaff = ADMIN_ROLES.includes(profile.role);
      const dest = isStaff ? "/admin/dashboard" : "/dashboard/schedule";
      // Staff always land on admin portal; don't send admins back to /dashboard from `from`.
      const useFrom =
        from &&
        from !== "/login" &&
        !(isStaff && from.startsWith("/dashboard"));
      navigate(useFrom ? from : dest, { replace: true });
    } catch (err) {
      let msg = "Signed in, but your profile could not be loaded. Please try again.";
      if (err instanceof ApiError) {
        if (err.status === 404) {
          msg =
            "Your account signed in, but no profile was found. Ask an admin to add you in Officials.";
        } else if (err.status === 401) {
          msg =
            "Signed in, but the server could not verify your session. On Vercel, set SUPABASE_ANON_KEY to the same value as VITE_SUPABASE_ANON_KEY, then redeploy.";
        } else {
          msg = err.message || msg;
        }
      } else if (import.meta.env.DEV) {
        msg =
          "Signed in, but the API could not load your profile. Make sure the backend is running on port 3000 (bun run dev in the backend folder).";
      }
      setError(msg);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left panel — NB branding (desktop) */}
      <div className="hidden lg:flex w-[460px] flex-shrink-0 flex-col justify-between text-white p-10 relative overflow-hidden nb-ice-gradient">
        <div className="absolute inset-0 nb-ice-pattern" />
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background:
              "radial-gradient(ellipse 80% 50% at 50% 0%, hsl(207 100% 45% / 0.35), transparent 70%)",
          }}
        />

        <div className="relative flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/25">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="text-base font-heading font-semibold tracking-tight block">
                {t("brand.name")}
              </span>
              <span className="text-[11px] text-white/70">{t("brand.province")}</span>
            </div>
          </div>
          <LanguageToggle variant="onPrimary" className="border-white/20" />
        </div>

        <div className="relative space-y-8">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-nb-gold">
              {t("brand.province")}
            </p>
            <h2 className="text-3xl font-heading font-bold leading-tight max-w-sm">
              {t("brand.tagline")}
            </h2>
            <p className="text-sm text-white/75 leading-relaxed max-w-sm">{t("login.heroBody")}</p>
          </div>

          <ul className="space-y-4">
            {features.map(({ icon: Icon, textKey }) => (
              <li key={textKey} className="flex items-center gap-3">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/15">
                  <Icon className="h-4 w-4 text-white/90" />
                </div>
                <span className="text-sm text-white/85">{t(textKey)}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-white/50">
          © {new Date().getFullYear()} {t("brand.name")}. {t("login.rights")}
        </p>
      </div>

      {/* Right panel — sign in */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 bg-gradient-to-b from-nb-ice/40 to-background">
        <div className="w-full max-w-sm space-y-8">
          <div className="flex flex-col items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Shield className="h-5 w-5" />
            </div>
            <div className="text-center">
              <span className="text-base font-heading font-semibold block">{t("brand.name")}</span>
              <span className="text-xs text-muted-foreground">{t("brand.tagline")}</span>
            </div>
            <LanguageToggle />
          </div>

          <div className="hidden lg:flex justify-end">
            <LanguageToggle />
          </div>

          <div className="space-y-1">
            <h1 className="text-xl font-heading font-semibold tracking-tight">{t("login.signIn")}</h1>
            <p className="text-sm text-muted-foreground">{t("login.subtitle")}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium">
                {t("login.email")}
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                autoFocus
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="h-10 bg-card"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium">
                {t("login.password")}
              </Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-10 bg-card"
              />
            </div>

            {error ? (
              <div className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/5 px-3.5 py-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                {error}
              </div>
            ) : null}

            <Button type="submit" className="w-full h-10 gap-2 font-medium" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {loading ? t("login.signingIn") : t("login.signIn")}
            </Button>
          </form>

          <div className="rounded-lg border border-border bg-accent/60 px-4 py-3.5">
            <p className="text-xs font-medium text-foreground mb-0.5">{t("login.officialsTitle")}</p>
            <p className="text-xs text-muted-foreground">{t("login.officialsHint")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
