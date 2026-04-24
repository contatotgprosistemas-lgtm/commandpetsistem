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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Validate the user token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;

    // Get user's empresa_id
    const { data: profile } = await supabase
      .from("profiles")
      .select("empresa_id")
      .eq("user_id", userId)
      .single();

    if (!profile?.empresa_id) {
      return new Response(JSON.stringify({ error: "Empresa não encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const empresaId = profile.empresa_id;
    const url = new URL(req.url);
    const telefone = url.searchParams.get("telefone");

    if (!telefone) {
      return new Response(JSON.stringify({ error: "Parâmetro 'telefone' obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Clean phone number (keep only digits)
    const cleanPhone = telefone.replace(/\D/g, "");

    // Search client by phone/whatsapp
    const { data: cliente } = await supabase
      .from("clientes")
      .select("*")
      .eq("empresa_id", empresaId)
      .or(`telefone.ilike.%${cleanPhone}%,whatsapp.ilike.%${cleanPhone}%`)
      .maybeSingle();

    if (!cliente) {
      return new Response(JSON.stringify({ found: false, contato: null }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch related data in parallel
    const [funilRes, notasRes, historicoRes] = await Promise.all([
      supabase
        .from("funil_vendas")
        .select("*")
        .eq("empresa_id", empresaId)
        .eq("cliente_id", cliente.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("notas_contato")
        .select("*")
        .eq("empresa_id", empresaId)
        .eq("cliente_id", cliente.id)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("historico_interacoes")
        .select("*")
        .eq("empresa_id", empresaId)
        .eq("cliente_id", cliente.id)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    return new Response(
      JSON.stringify({
        found: true,
        contato: cliente,
        funil: funilRes.data,
        notas: notasRes.data || [],
        historico: historicoRes.data || [],
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
