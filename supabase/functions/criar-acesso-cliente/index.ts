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

    // Verify caller is authenticated admin
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
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { cliente_id, email, senha } = await req.json();
    if (!cliente_id || !email || !senha) {
      return new Response(
        JSON.stringify({ error: "cliente_id, email e senha são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Get cliente data
    const { data: cliente, error: clienteErr } = await adminClient
      .from("clientes")
      .select("*")
      .eq("id", cliente_id)
      .single();

    if (clienteErr || !cliente) {
      return new Response(
        JSON.stringify({ error: "Cliente não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (cliente.user_id) {
      return new Response(
        JSON.stringify({ error: "Este cliente já possui acesso ao portal" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create auth user
    const { data: newUser, error: createErr } = await adminClient.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
      user_metadata: { nome: cliente.nome },
    });

    let userId: string;

    if (createErr) {
      const msg = (createErr.message || "").toLowerCase();
      const isDuplicate =
        msg.includes("already") ||
        msg.includes("registered") ||
        msg.includes("exists") ||
        (createErr as any).code === "email_exists";

      if (!isDuplicate) {
        return new Response(
          JSON.stringify({ error: createErr.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Find the existing auth user by email
      let existingUserId: string | null = null;
      let page = 1;
      while (page <= 20 && !existingUserId) {
        const { data: list, error: listErr } = await adminClient.auth.admin.listUsers({ page, perPage: 200 });
        if (listErr) break;
        const found = list.users.find((u) => (u.email ?? "").toLowerCase() === email.toLowerCase());
        if (found) { existingUserId = found.id; break; }
        if (!list.users.length || list.users.length < 200) break;
        page++;
      }

      if (!existingUserId) {
        return new Response(
          JSON.stringify({ error: "Email já registrado, mas o usuário não pôde ser localizado." }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Ensure this auth user isn't already linked to a different cliente
      const { data: jaVinculado } = await adminClient
        .from("clientes")
        .select("id")
        .eq("user_id", existingUserId)
        .maybeSingle();

      if (jaVinculado && jaVinculado.id !== cliente_id) {
        return new Response(
          JSON.stringify({ error: "Este email já está vinculado a outro cliente." }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Update password so the admin's chosen senha works
      await adminClient.auth.admin.updateUserById(existingUserId, {
        password: senha,
        email_confirm: true,
      });

      userId = existingUserId;
    } else {
      userId = newUser.user.id;
    }

    // Assign "cliente" role
    await adminClient
      .from("user_roles")
      .upsert({ user_id: userId, role: "cliente" }, { onConflict: "user_id,role" });

    // Link user_id to clientes table
    await adminClient
      .from("clientes")
      .update({ user_id: userId })
      .eq("id", cliente_id);

    // Create/update profile for the client user (linked to same empresa, pre-approved)
    // The handle_new_user trigger may have already created a profile, so we upsert
    await adminClient.from("profiles").upsert({
      user_id: userId,
      nome: cliente.nome,
      email,
      empresa_id: cliente.empresa_id,
      cargo: "cliente",
      aprovado: true,
    }, { onConflict: "user_id" });

    return new Response(
      JSON.stringify({ success: true, user_id: userId, email }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
