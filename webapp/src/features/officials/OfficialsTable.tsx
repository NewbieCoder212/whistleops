import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Plus, Pencil, Loader2, AlertCircle, Users } from "lucide-react";
import { profilesApi, certificationLevelsApi } from "@/lib/resources";
import { api } from "@/lib/api";
import { useRosterDisplayFields } from "@/hooks/useRosterDisplayFields";
import type { Zone } from "@shared/types";
import type { Profile, CertificationLevel } from "@shared/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { OfficialDrawer } from "./OfficialDrawer";
import { toast } from "sonner";

// ── Helpers ──────────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Admin",
  FINANCE: "Finance",
  OFFICIAL: "Official",
  SUPERVISOR: "Supervisor",
};

const ROLE_COLORS: Record<string, string> = {
  ADMIN: "bg-primary/10 text-primary border-primary/20",
  FINANCE: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  OFFICIAL: "bg-secondary text-secondary-foreground border-border",
  SUPERVISOR: "bg-accent/10 text-accent border-accent/20",
};

const TYPE_LABELS: Record<string, string> = {
  REFEREE: "Referee",
  LINESMAN: "Linesman",
};

function initials(name?: string | null) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function Avatar({ name, url }: { name?: string | null; url?: string | null }) {
  if (url) {
    return (
      <img
        src={url}
        alt={name ?? ""}
        className="h-8 w-8 rounded-full object-cover flex-shrink-0"
      />
    );
  }
  return (
    <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 text-xs font-semibold text-muted-foreground">
      {initials(name)}
    </div>
  );
}

// ── Inline cert level select ─────────────────────────────────────────────────

function CertLevelSelect({
  profileId,
  currentLevelId,
  levels,
}: {
  profileId: string;
  currentLevelId?: string | null;
  levels: CertificationLevel[];
}) {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: (levelId: string) =>
      profilesApi.update(profileId, {
        official_level_id: levelId === "__none__" ? undefined : levelId,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profiles"] }),
    onError: (e: Error) =>
      toast.error(
        e.message.includes("401") ? "Admin sign-in required." : e.message
      ),
  });

  return (
    <div className="flex items-center gap-1.5">
      <Select
        value={currentLevelId ?? "__none__"}
        onValueChange={(v) => mutation.mutate(v)}
        disabled={mutation.isPending}
      >
        <SelectTrigger className="h-7 text-xs w-36 border-transparent bg-transparent hover:border-border hover:bg-secondary transition-colors">
          <SelectValue placeholder="— unset —" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__" className="text-xs text-muted-foreground">
            — unset —
          </SelectItem>
          {levels.map((lv) => (
            <SelectItem key={lv.id} value={lv.id} className="text-xs">
              {lv.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {mutation.isPending && (
        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
      )}
    </div>
  );
}

// ── Filter bar ───────────────────────────────────────────────────────────────

interface Filters {
  search: string;
  role: string;
  levelId: string;
}

function FilterBar({
  filters,
  onChange,
  levels,
  total,
  onAdd,
}: {
  filters: Filters;
  onChange: (f: Partial<Filters>) => void;
  levels: CertificationLevel[];
  total: number;
  onAdd: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-2 items-center">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Search name or email…"
          value={filters.search}
          onChange={(e) => onChange({ search: e.target.value })}
          className="pl-8 h-8 text-sm"
        />
      </div>

      {/* Role filter */}
      <Select value={filters.role} onValueChange={(v) => onChange({ role: v })}>
        <SelectTrigger className="h-8 text-sm w-36">
          <SelectValue placeholder="All roles" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">All roles</SelectItem>
          <SelectItem value="OFFICIAL">Official</SelectItem>
          <SelectItem value="SUPERVISOR">Supervisor</SelectItem>
          <SelectItem value="ADMIN">Admin</SelectItem>
          <SelectItem value="FINANCE">Finance</SelectItem>
        </SelectContent>
      </Select>

      {/* Level filter */}
      <Select value={filters.levelId} onValueChange={(v) => onChange({ levelId: v })}>
        <SelectTrigger className="h-8 text-sm w-40">
          <SelectValue placeholder="All levels" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">All levels</SelectItem>
          <SelectItem value="__none__">No level set</SelectItem>
          {levels.map((lv) => (
            <SelectItem key={lv.id} value={lv.id}>
              {lv.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Spacer + count + add */}
      <div className="ml-auto flex items-center gap-2">
        <span className="text-xs text-muted-foreground hidden sm:block">
          {total} official{total !== 1 ? "s" : ""}
        </span>
        <Button size="sm" onClick={onAdd} className="h-8 gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          Add Official
        </Button>
      </div>
    </div>
  );
}

// ── Main table ────────────────────────────────────────────────────────────────

export function OfficialsTable() {
  const displayFields = useRosterDisplayFields();
  const show = (f: string) => displayFields.includes(f as (typeof displayFields)[number]);

  const [filters, setFilters] = useState<Filters>({
    search: "",
    role: "__all__",
    levelId: "__all__",
  });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Profile | null>(null);

  const { data: profiles = [], isLoading, isError } = useQuery<Profile[]>({
    queryKey: ["profiles"],
    queryFn: profilesApi.list,
  });

  const { data: levels = [] } = useQuery<CertificationLevel[]>({
    queryKey: ["certification-levels"],
    queryFn: certificationLevelsApi.list,
  });

  const { data: zones = [] } = useQuery<Zone[]>({
    queryKey: ["zones"],
    queryFn: () => api.get<Zone[]>("/api/zones"),
  });

  const zoneMap = useMemo(
    () => Object.fromEntries(zones.map((z) => [z.id, z.name])),
    [zones]
  );

  const levelMap = useMemo(
    () => Object.fromEntries(levels.map((l) => [l.id, l])),
    [levels]
  );

  const filtered = useMemo(() => {
    const q = filters.search.toLowerCase();
    return profiles.filter((p) => {
      if (q && !p.full_name?.toLowerCase().includes(q) && !p.email.toLowerCase().includes(q))
        return false;
      if (filters.role !== "__all__" && p.role !== filters.role) return false;
      if (filters.levelId === "__none__" && p.official_level_id) return false;
      if (filters.levelId !== "__all__" && filters.levelId !== "__none__" && p.official_level_id !== filters.levelId)
        return false;
      return true;
    });
  }, [profiles, filters]);

  const openAdd = () => {
    setEditTarget(null);
    setDrawerOpen(true);
  };

  const openEdit = (p: Profile) => {
    setEditTarget(p);
    setDrawerOpen(true);
  };

  return (
    <div className="space-y-4">
      <FilterBar
        filters={filters}
        onChange={(f) => setFilters((prev) => ({ ...prev, ...f }))}
        levels={levels}
        total={filtered.length}
        onAdd={openAdd}
      />

      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-border">
              {show("full_name") ? <TableHead className="w-[220px]">Name</TableHead> : null}
              {show("email") ? <TableHead className="hidden md:table-cell">Email</TableHead> : null}
              {show("cell_phone") ? (
                <TableHead className="hidden lg:table-cell w-[130px]">Phone</TableHead>
              ) : null}
              {show("role") ? <TableHead className="w-[110px]">Role</TableHead> : null}
              {show("official_type") ? (
                <TableHead className="hidden sm:table-cell w-[100px]">Type</TableHead>
              ) : null}
              {show("certification_level") ? (
                <TableHead className="w-[160px]">Cert Level</TableHead>
              ) : null}
              {show("zone") ? <TableHead className="hidden md:table-cell">Zone</TableHead> : null}
              {show("distance_km") ? (
                <TableHead className="hidden lg:table-cell w-[80px]">km</TableHead>
              ) : null}
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>

          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i} className="border-border">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <Skeleton className="h-4 w-28" />
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Skeleton className="h-4 w-40" />
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Skeleton className="h-4 w-16" />
                  </TableCell>
                  <TableCell><Skeleton className="h-7 w-36" /></TableCell>
                  <TableCell />
                </TableRow>
              ))
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <AlertCircle className="h-6 w-6 text-destructive" />
                    <p className="text-sm">Failed to load profiles.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-3 text-muted-foreground">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                      <Users className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {profiles.length === 0 ? "No officials yet" : "No results"}
                      </p>
                      <p className="text-xs mt-0.5">
                        {profiles.length === 0
                          ? "Add your first official using the button above."
                          : "Try adjusting your filters."}
                      </p>
                    </div>
                    {profiles.length === 0 && (
                      <Button size="sm" onClick={openAdd} variant="outline" className="gap-1.5">
                        <Plus className="h-3.5 w-3.5" />
                        Add Official
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((profile) => (
                <TableRow
                  key={profile.id}
                  className="group border-border hover:bg-secondary/30 transition-colors"
                >
                  {show("full_name") ? (
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar name={profile.full_name} url={profile.avatar_url} />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {profile.full_name ?? "—"}
                          </p>
                          {show("jersey_number") && profile.jersey_number ? (
                            <p className="text-[11px] text-muted-foreground">
                              #{profile.jersey_number}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </TableCell>
                  ) : null}

                  {show("email") ? (
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {profile.email}
                    </TableCell>
                  ) : null}

                  {show("cell_phone") ? (
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                      {profile.cell_phone ?? "—"}
                    </TableCell>
                  ) : null}

                  {show("role") ? (
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                          ROLE_COLORS[profile.role] ?? "bg-secondary text-secondary-foreground"
                        }`}
                      >
                        {ROLE_LABELS[profile.role] ?? profile.role}
                      </span>
                    </TableCell>
                  ) : null}

                  {show("official_type") ? (
                    <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                      {profile.official_type ? TYPE_LABELS[profile.official_type] : "—"}
                    </TableCell>
                  ) : null}

                  {show("certification_level") ? (
                    <TableCell>
                      {profile.role === "OFFICIAL" || profile.role === "SUPERVISOR" ? (
                        <CertLevelSelect
                          profileId={profile.id}
                          currentLevelId={profile.official_level_id}
                          levels={levels}
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground px-1">—</span>
                      )}
                    </TableCell>
                  ) : null}

                  {show("zone") ? (
                    <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                      {profile.zone_id ? zoneMap[profile.zone_id] ?? "—" : "—"}
                    </TableCell>
                  ) : null}

                  {show("distance_km") ? (
                    <TableCell className="hidden lg:table-cell text-xs tabular-nums text-muted-foreground">
                      {profile.distance_km != null ? profile.distance_km : "—"}
                    </TableCell>
                  ) : null}

                  {/* Edit */}
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                      onClick={() => openEdit(profile)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <OfficialDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        profile={editTarget}
      />
    </div>
  );
}
