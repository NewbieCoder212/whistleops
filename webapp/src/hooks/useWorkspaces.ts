import { useQuery, useQueryClient } from "@tanstack/react-query";
import { workspacesApi } from "@/lib/resources";
import { pickDefaultWorkspace, setActiveWorkspaceId, getActiveWorkspaceId } from "@/lib/workspace";

export const WORKSPACES_QUERY_KEY = ["workspaces"] as const;

export function useWorkspaces() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: WORKSPACES_QUERY_KEY,
    queryFn: () => workspacesApi.list(),
    staleTime: 60_000,
  });

  const activeId = getActiveWorkspaceId();
  const active =
    query.data?.find((w) => w.id === activeId) ??
    (query.data?.length === 1 ? query.data[0] : undefined);

  const selectWorkspace = (id: string) => {
    setActiveWorkspaceId(id);
    void queryClient.invalidateQueries();
  };

  const ensureDefault = () => {
    if (!query.data?.length) return;
    const current = getActiveWorkspaceId();
    if (current && query.data.some((w) => w.id === current)) return;
    const picked = pickDefaultWorkspace(query.data);
    if (picked) setActiveWorkspaceId(picked);
  };

  return {
    workspaces: query.data ?? [],
    active,
    activeId: active?.id ?? activeId,
    isLoading: query.isLoading,
    error: query.error,
    selectWorkspace,
    ensureDefault,
    refetch: query.refetch,
  };
}
