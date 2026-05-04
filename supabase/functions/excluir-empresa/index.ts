import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Não autorizado" }, 401);

    const callerClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await callerClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) return json({ error: "Não autorizado" }, 401);

    const callerId = claimsData.claims.sub as string;
    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", callerId);
    const isSuperAdmin = (roles || []).some((r: any) => r.role === "super_admin");
    if (!isSuperAdmin) return json({ error: "Apenas super admin pode excluir empresas" }, 403);

    const { empresa_id } = await req.json();
    if (!empresa_id) return json({ error: "empresa_id obrigatório" }, 400);

    // 1) Find auth users tied to this empresa (profiles + operational_users) and delete them
    const { data: profs } = await admin.from("profiles").select("user_id").eq("empresa_id", empresa_id);
    const { data: ops } = await admin.from("operational_users").select("user_id").eq("empresa_id", empresa_id);
    const { data: clients } = await admin.from("clientes").select("user_id").eq("empresa_id", empresa_id).not("user_id", "is", null);

    const userIds = new Set<string>();
    (profs || []).forEach((p: any) => p.user_id && userIds.add(p.user_id));
    (ops || []).forEach((p: any) => p.user_id && userIds.add(p.user_id));
    (clients || []).forEach((p: any) => p.user_id && userIds.add(p.user_id));
    userIds.delete(callerId); // never delete self

    // 2) Delete tables that have NO CASCADE FK to empresas (must clean manually)
    const noActionTables = [
      "movimentacoes", "manejo_registros", "checklist_registros", "historico_servicos",
      "pet_media", "contact_tasks", "contas_bancarias", "produtos", "servicos",
      "plano_contas_items", "plano_contas_categorias",
    ];
    for (const t of noActionTables) {
      const { error } = await admin.from(t).delete().eq("empresa_id", empresa_id);
      if (error) {
        console.error(`excluir-empresa: falha ao limpar ${t}`, error);
        return json({ error: "Falha ao limpar dados da empresa." }, 400);
      }
    }

    // 3) Delete empresa (cascades the rest)
    const { error: delErr } = await admin.from("empresas").delete().eq("id", empresa_id);
    if (delErr) {
      console.error("excluir-empresa delete error", delErr);
      return json({ error: "Falha ao excluir a empresa." }, 400);
    }

    // 4) Delete the auth users (profiles already cascaded)
    for (const uid of userIds) {
      try { await admin.auth.admin.deleteUser(uid); } catch (_) {}
    }

    return json({ success: true, usuarios_excluidos: userIds.size });
  } catch (err: any) {
    console.error("excluir-empresa error", err);
    return json({ error: "Erro interno ao processar a solicitação." }, 500);
  }
});

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
