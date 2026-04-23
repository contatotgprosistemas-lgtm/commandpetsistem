import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);

    // Confirm caller is admin and resolve empresa_id
    const { data: callerProfile } = await admin
      .from("profiles")
      .select("empresa_id, cargo")
      .eq("user_id", caller.id)
      .maybeSingle();

    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: caller.id, _role: "admin" });

    if (!callerProfile?.empresa_id || !isAdmin) {
      return new Response(JSON.stringify({ error: "Apenas administradores podem executar esta ação" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const empresaId = callerProfile.empresa_id;
    const body = await req.json().catch(() => ({}));
    const senhaPadrao: string = body.senha ?? "123456@nlr";
    const dryRun: boolean = body.dry_run === true;

    // Get eligible clients
    const { data: clientes, error: clientesErr } = await admin
      .from("clientes")
      .select("id, nome, email")
      .eq("empresa_id", empresaId)
      .is("deleted_at", null)
      .is("user_id", null)
      .not("email", "is", null);

    if (clientesErr) {
      return new Response(JSON.stringify({ error: clientesErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const eligibles = (clientes ?? []).filter(c => (c.email ?? "").trim() !== "");

    if (dryRun) {
      return new Response(JSON.stringify({ total_eligible: eligibles.length, dry_run: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let created = 0;
    const skipped: { cliente_id: string; nome: string; email: string; reason: string }[] = [];

    // Sequential to be gentle with the auth API
    for (const c of eligibles) {
      const email = (c.email as string).trim().toLowerCase();
      try {
        const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
          email,
          password: senhaPadrao,
          email_confirm: true,
          user_metadata: { nome: c.nome },
        });

        if (createErr || !newUser?.user) {
          skipped.push({ cliente_id: c.id, nome: c.nome, email, reason: createErr?.message ?? "unknown" });
          continue;
        }

        const userId = newUser.user.id;

        await admin.from("user_roles").insert({ user_id: userId, role: "cliente" });
        await admin.from("clientes").update({ user_id: userId }).eq("id", c.id);
        await admin.from("profiles").upsert({
          user_id: userId,
          nome: c.nome,
          email,
          empresa_id: empresaId,
          cargo: "cliente",
          aprovado: true,
        }, { onConflict: "user_id" });

        created++;
      } catch (e: any) {
        skipped.push({ cliente_id: c.id, nome: c.nome, email, reason: e?.message ?? String(e) });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      total_eligible: eligibles.length,
      created,
      skipped_count: skipped.length,
      skipped,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message ?? String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});