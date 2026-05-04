import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// One-shot: reenvia notificações de "geração" para faturas recentes
// que ainda não tenham log enviado. Usa a edge function notificar-fatura-whatsapp.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPA_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Require authenticated caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const authClient = createClient(SUPA_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await authClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    const supabase = createClient(SUPA_URL, SERVICE_KEY);

    // Resolve caller's empresa_id and role
    const { data: profile } = await supabase
      .from("profiles")
      .select("empresa_id, cargo")
      .eq("user_id", userId)
      .maybeSingle();
    const callerEmpresaId = profile?.empresa_id ?? null;
    const cargo = (profile?.cargo ?? "").toLowerCase();
    const isPrivileged = ["admin", "gerente", "super_admin"].includes(cargo);
    if (!callerEmpresaId || !isPrivileged) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const empresa_id: string = body.empresa_id;
    const horas: number = Number(body.horas ?? 3);
    if (!empresa_id) {
      return new Response(JSON.stringify({ error: "empresa_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Tenant isolation
    if (empresa_id !== callerEmpresaId) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const since = new Date(Date.now() - horas * 60 * 60 * 1000).toISOString();

    const { data: faturas, error } = await supabase
      .from("contas_receber")
      .select("id, cliente_id, descricao, valor, vencimento, clientes!inner(id, nome, whatsapp, telefone)")
      .eq("empresa_id", empresa_id)
      .gte("created_at", since)
      .order("created_at");
    if (error) throw error;

    let enviados = 0, pulados = 0, falhas = 0;
    const detalhes: any[] = [];

    const lista = faturas ?? [];

    const work = async () => {
      for (const f of lista) {
      const { data: existsLog } = await supabase
        .from("invoice_notification_log")
        .select("id")
        .eq("conta_receber_id", f.id)
        .eq("status", "enviado")
        .eq("tipo", "geracao")
        .limit(1);
      if (existsLog && existsLog.length > 0) { pulados++; continue; }

      const cliente = (f as any).clientes;
      if (!cliente?.whatsapp && !cliente?.telefone) { pulados++; continue; }

      try {
        const res = await fetch(`${SUPA_URL.replace(/\/$/, "")}/functions/v1/notificar-fatura-whatsapp`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SERVICE_KEY}`,
            apikey: SERVICE_KEY,
          },
          body: JSON.stringify({
            empresa_id,
            cliente: {
              id: cliente.id,
              nome: cliente.nome,
              whatsapp: cliente.whatsapp,
              telefone: cliente.telefone,
            },
            fatura: {
              id: f.id,
              descricao: f.descricao,
              valor: Number(f.valor),
              vencimento: f.vencimento,
            },
            tipo: "geracao",
          }),
        });
        const txt = await res.text();
        if (res.ok) {
          enviados++;
          detalhes.push({ fatura: f.id, cliente: cliente.nome, status: "ok", body: txt.slice(0, 100) });
        } else {
          falhas++;
          detalhes.push({ fatura: f.id, cliente: cliente.nome, status: res.status, body: txt.slice(0, 200) });
        }
      } catch (err) {
        falhas++;
        detalhes.push({ fatura: f.id, cliente: cliente.nome, error: String(err) });
      }

      // Cadência conservadora: o notificar-fatura-whatsapp já aplica
      // jitter 30-60s internamente, então aqui basta um espaçamento mínimo
      // para não criar locks concorrentes.
      await new Promise((r) => setTimeout(r, 2000));
      }
      console.log("reenviar-notif-geracao concluído", { total: lista.length, enviados, pulados, falhas });
    };

    // @ts-ignore EdgeRuntime is available in Supabase Edge Runtime
    if (typeof EdgeRuntime !== "undefined" && EdgeRuntime.waitUntil) {
      // @ts-ignore
      EdgeRuntime.waitUntil(work());
    } else {
      work();
    }

    return new Response(
      JSON.stringify({ scheduled: true, total: lista.length, message: "Reenvio iniciado em background com cadência conservadora." }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 202 },
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});