import { supabase } from "@/integrations/supabase/client";

export async function resolveEmpresaId(preferredEmpresaId?: string | null) {
  if (preferredEmpresaId) return preferredEmpresaId;

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user?.id) return null;

  const userId = session.user.id;

  const [
    { data: empresaIdFromProfileRpc },
    { data: profile },
    { data: empresaIdFromOperationalRpc },
    { data: operationalUser },
  ] = await Promise.all([
    supabase.rpc("get_user_empresa_id"),
    supabase.from("profiles").select("empresa_id").eq("user_id", userId).maybeSingle(),
    supabase.rpc("get_operational_empresa_id"),
    supabase
      .from("operational_users")
      .select("empresa_id")
      .eq("user_id", userId)
      .eq("ativo", true)
      .maybeSingle(),
  ]);

  return (
    empresaIdFromProfileRpc ??
    profile?.empresa_id ??
    empresaIdFromOperationalRpc ??
    operationalUser?.empresa_id ??
    null
  );
}