import { Building2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWorkspaces } from "@/hooks/useWorkspaces";
import { useTranslation } from "@/i18n/I18nProvider";
import { useEffect } from "react";

const typeLabels: Record<string, string> = {
  province: "Province",
  association: "Association",
  league: "League",
  tournament: "Tournament",
};

export function WorkspaceSwitcher({ className }: { className?: string }) {
  const { t } = useTranslation();
  const { workspaces, activeId, selectWorkspace, ensureDefault, isLoading } = useWorkspaces();

  useEffect(() => {
    ensureDefault();
  }, [workspaces.length]);

  if (isLoading || workspaces.length === 0) return null;
  if (workspaces.length === 1) {
    const w = workspaces[0]!;
    return (
      <div className={className}>
        <p className="text-[10px] uppercase tracking-wide text-sidebar-foreground/50 mb-1">
          {t("workspace.label")}
        </p>
        <p className="text-xs font-medium truncate flex items-center gap-1.5">
          <Building2 className="h-3 w-3 flex-shrink-0 opacity-70" />
          {w.name}
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      <p className="text-[10px] uppercase tracking-wide text-sidebar-foreground/50 mb-1">
        {t("workspace.label")}
      </p>
      <Select value={activeId ?? undefined} onValueChange={selectWorkspace}>
        <SelectTrigger className="h-8 text-xs bg-sidebar-accent border-sidebar-border">
          <SelectValue placeholder={t("workspace.select")} />
        </SelectTrigger>
        <SelectContent>
          {workspaces.map((w) => (
            <SelectItem key={w.id} value={w.id} className="text-xs">
              {w.name}
              <span className="text-muted-foreground ml-1">
                ({typeLabels[w.type] ?? w.type})
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
