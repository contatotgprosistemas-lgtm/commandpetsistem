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
    const supabase = createClient(SUPA_URL, SERVICE_KEY);

    const body = await req.json().catch(() => ({}));
    const empresa_id: string = body.empresa_id;
    const horas: number = Number(body.horas ?? 3);
    if (!empresa_id) {
      return new Response(JSON.stringify({ error: "empresa_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
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

    for (const f of faturas ?? []) {
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

      // Pequeno delay para não saturar a Evolution API
      await new Promise((r) => setTimeout(r, 500));
    }

    return new Response(
      JSON.stringify({ total: faturas?.length ?? 0, enviados, pulados, falhas, detalhes: detalhes.slice(0, 20) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});