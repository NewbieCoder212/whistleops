import { useTranslation, type Locale } from "@/i18n/I18nProvider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface LanguageToggleProps {
  className?: string;
  /** Light text on dark headers (login / admin sidebar) */
  variant?: "default" | "onPrimary";
}

export function LanguageToggle({ className, variant = "default" }: LanguageToggleProps) {
  const { locale, setLocale, t } = useTranslation();

  const set = (next: Locale) => setLocale(next);

  const base =
    variant === "onPrimary"
      ? "text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/10"
      : "text-muted-foreground hover:text-foreground hover:bg-muted";

  return (
    <div
      className={cn("flex items-center rounded-md border border-border/60 p-0.5", className)}
      role="group"
      aria-label={t("lang.toggle")}
    >
      {(["en", "fr"] as const).map((code) => (
        <Button
          key={code}
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            "h-7 px-2.5 text-[11px] font-semibold uppercase tracking-wide",
            base,
            locale === code &&
              (variant === "onPrimary"
                ? "bg-white/15 text-primary-foreground"
                : "bg-background text-foreground shadow-sm")
          )}
          onClick={() => set(code)}
        >
          {code}
        </Button>
      ))}
    </div>
  );
}
