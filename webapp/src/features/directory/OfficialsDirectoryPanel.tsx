import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { useTranslation } from "@/i18n/I18nProvider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { OfficialDirectoryResponse, Zone } from "@shared/types";

function displayPhone(value: string | null | undefined): string {
  return value?.trim() ? value : "—";
}

function directoryUrl(zone?: string, search?: string): string {
  const qs = new URLSearchParams();
  if (zone) qs.set("zone", zone);
  if (search) qs.set("search", search);
  const query = qs.toString();
  return `/api/profiles/directory${query ? `?${query}` : ""}`;
}

type Props = {
  /** Wider table layout for admin sidebar pages. */
  variant?: "admin" | "dashboard";
};

export function OfficialsDirectoryPanel({ variant = "dashboard" }: Props) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [zoneSlug, setZoneSlug] = useState<string>("all");

  const { data: zones = [] } = useQuery<Zone[]>({
    queryKey: ["zones"],
    queryFn: () => api.get<Zone[]>("/api/zones"),
    staleTime: 10 * 60 * 1000,
  });

  const querySearch = search.trim();
  const queryZone = zoneSlug === "all" ? undefined : zoneSlug;

  const { data, isLoading, isError, refetch, isFetching } = useQuery<OfficialDirectoryResponse>({
    queryKey: ["officials-directory", queryZone, querySearch],
    queryFn: () =>
      api.get<OfficialDirectoryResponse>(
        directoryUrl(queryZone, querySearch || undefined)
      ),
    staleTime: 60 * 1000,
  });

  const officials = data?.officials ?? [];

  const zoneLabel = useMemo(() => {
    if (zoneSlug === "all") return null;
    return zones.find((z) => z.slug === zoneSlug)?.name ?? null;
  }, [zoneSlug, zones]);

  const wide = variant === "admin";

  return (
    <div className="space-y-4">
      <div className={wide ? "max-w-3xl" : undefined}>
        <h1 className="text-xl font-bold tracking-tight">{t("directory.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("directory.subtitle")}</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("directory.searchPlaceholder")}
            className="pl-9"
            aria-label={t("directory.searchPlaceholder")}
          />
        </div>
        <Select value={zoneSlug} onValueChange={setZoneSlug}>
          <SelectTrigger className="w-full sm:w-52">
            <SelectValue placeholder={t("filters.allZones")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filters.allZones")}</SelectItem>
            {zones.map((zone) => (
              <SelectItem key={zone.id} value={zone.slug}>
                {zone.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          {isLoading
            ? t("directory.loading")
            : t("directory.count", { count: data?.count ?? 0 })}
          {zoneLabel ? ` · ${zoneLabel}` : null}
        </span>
        {isFetching && !isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : isError ? (
          <div className="space-y-3 px-6 py-12 text-center">
            <p className="text-sm text-destructive">{t("directory.loadError")}</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              {t("common.refresh")}
            </Button>
          </div>
        ) : officials.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-muted-foreground">
            {t("directory.empty")}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="whitespace-nowrap">{t("directory.columns.lastName")}</TableHead>
                  <TableHead className="whitespace-nowrap">{t("directory.columns.firstName")}</TableHead>
                  <TableHead className="whitespace-nowrap">{t("directory.columns.cellNumber")}</TableHead>
                  <TableHead className="whitespace-nowrap">{t("directory.columns.homePhone")}</TableHead>
                  <TableHead className="whitespace-nowrap min-w-[180px]">{t("directory.columns.email")}</TableHead>
                  <TableHead className="whitespace-nowrap">{t("directory.columns.zone")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {officials.map((official, index) => {
                  const rowKey = `${official.email}-${official.last_name}-${index}`;
                  return (
                    <TableRow key={rowKey}>
                      <TableCell className="font-medium whitespace-nowrap">
                        {official.last_name || "—"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{official.first_name || "—"}</TableCell>
                      <TableCell className="whitespace-nowrap tabular-nums">
                        {displayPhone(official.cell_phone)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap tabular-nums">
                        {displayPhone(official.home_phone)}
                      </TableCell>
                      <TableCell>
                        <a
                          href={`mailto:${official.email}`}
                          className="text-primary hover:underline break-all"
                        >
                          {official.email}
                        </a>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{official.zone_name || "—"}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
