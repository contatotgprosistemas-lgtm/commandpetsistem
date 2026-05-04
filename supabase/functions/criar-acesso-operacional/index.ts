import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await callerClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerId = claimsData.claims.sub as string;

    const { nome, email, senha, empresa_id, cargo } = await req.json();
    if (!nome || !email || !senha || !empresa_id) {
      return new Response(
        JSON.stringify({ error: "nome, email, senha e empresa_id são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const finalCargo = cargo || "operacional";
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Caller must belong to the target empresa, OR be a super_admin
    const { data: callerProfile } = await adminClient
      .from("profiles")
      .select("empresa_id")
      .eq("user_id", callerId)
      .maybeSingle();

    const { data: callerRoles } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId);
    const roles = (callerRoles ?? []).map((r: any) => r.role);
    const isSuperAdmin = roles.includes("super_admin");
    const isAdminOrManager = roles.includes("admin") || roles.includes("gerente");

    if (!isSuperAdmin) {
      if (!isAdminOrManager) {
        return new Response(
          JSON.stringify({ error: "Apenas administradores podem criar acessos." }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (callerProfile?.empresa_id !== empresa_id) {
        return new Response(
          JSON.stringify({ error: "Empresa inválida." }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      // Non-super-admins cannot create admin or super_admin accounts
      if (finalCargo === "admin" || finalCargo === "super_admin") {
        return new Response(
          JSON.stringify({ error: "Você não pode criar contas com este nível de acesso." }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Create auth user with email pre-confirmed
    const { data: newUser, error: createErr } = await adminClient.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
      user_metadata: { nome },
    });

    if (createErr) {
      return new Response(
        JSON.stringify({ error: createErr.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = newUser.user.id;

    // Upsert profile with aprovado=true and the correct cargo
    await adminClient.from("profiles").upsert({
      user_id: userId,
      nome,
      email,
      empresa_id,
      cargo: finalCargo,
      aprovado: true,
    }, { onConflict: "user_id" });

    // Insert user role
    const roleMap: Record<string, string> = {
      admin: "admin",
      gerente: "gerente",
      atendente: "atendente",
      financeiro: "financeiro",
      operacional: "operacional",
      banhista: "operacional",
    };
    const dbRole = roleMap[finalCargo] || "operacional";
    await adminClient.from("user_roles").insert({
      user_id: userId,
      role: dbRole,
    });

    // Only create operational_users record if acesso_operacional is relevant
    if (finalCargo === "operacional" || finalCargo === "banhista") {
      await adminClient.from("operational_users").insert({
        nome,
        email,
        empresa_id,
        user_id: userId,
        ativo: true,
      });
    }

    return new Response(
      JSON.stringify({ success: true, user_id: userId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
