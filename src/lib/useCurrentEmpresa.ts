import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useCurrentEmpresa() {
  return useQuery({
    queryKey: ["current-empresa-id"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase
        .from("profiles")
        .select("empresa_id")
        .eq("user_id", user.id)
        .maybeSingle();
      return data?.empresa_id ?? null;
    },
    staleTime: 5 * 60 * 1000,
  });
}