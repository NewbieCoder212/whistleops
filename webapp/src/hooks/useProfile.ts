import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "./useAuth";
import type { Profile } from "@shared/types";

export function useProfile() {
  const { session } = useAuth();
  const userId = session?.user?.id;
  return useQuery<Profile>({
    queryKey: ["profile", "me", userId],
    queryFn: () => api.get<Profile>("/api/profiles/me"),
    enabled: !!session,
    staleTime: 5 * 60 * 1000,
  });
}
