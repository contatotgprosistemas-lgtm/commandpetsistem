import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { campanha_id } = await req.json();
    if (!campanha_id) {
      return new Response(JSON.stringify({ error: "campanha_id obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: campanha, error: campErr } = await supabase
      .from("crm_campanhas").select("*").eq("id", campanha_id).single();
    if (campErr || !campanha) throw new Error("Campanha não encontrada");

    if (!campanha.canal_id) throw new Error("Canal não definido");

    const { data: canal, error: canErr } = await supabase
      .from("crm_canais").select("*").eq("id", campanha.canal_id).single();
    if (canErr || !canal) throw new Error("Canal inválido");

    const { data: dests } = await supabase
      .from("crm_campanha_destinatarios")
      .select("*")
      .eq("campanha_id", campanha_id)
      .eq("status", "pendente");

    if (!dests || dests.length === 0) {
      await supabase.from("crm_campanhas").update({
        status: "concluida", finalizado_em: new Date().toISOString(),
      }).eq("id", campanha_id);
      return new Response(JSON.stringify({ ok: true, total: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase.from("crm_campanhas").update({
      status: "enviando", iniciado_em: new Date().toISOString(),
    }).eq("id", campanha_id);

    const evolutionUrl = Deno.env.get("EVOLUTION_API_URL")!;
    const evolutionKey = Deno.env.get("EVOLUTION_API_KEY")!;
    const instanceName = (canal.config as any)?.instance_name || canal.identificador;

    let enviados = 0, falhas = 0;
    const intervalo = (campanha.intervalo_segundos || 5) * 1000;

    // Background processing
    const process = async () => {
      for (const dest of dests) {
        try {
          const numero = String(dest.numero).replace(/\D/g, "");
          const mensagem = (campanha.mensagem || "")
            .replace(/\{\{nome\}\}/g, dest.nome || "");

          const resp = await fetch(`${evolutionUrl}/message/sendText/${instanceName}`, {
            method: "POST",
            headers: { "Content-Type": "application/json", apikey: evolutionKey },
            body: JSON.stringify({ number: numero, text: mensagem }),
          });

          if (resp.ok) {
            enviados++;
            await supabase.from("crm_campanha_destinatarios").update({
              status: "enviado", enviado_em: new Date().toISOString(),
            }).eq("id", dest.id);
          } else {
            falhas++;
            const errTxt = await resp.text();
            await supabase.from("crm_campanha_destinatarios").update({
              status: "falhou", erro: errTxt.slice(0, 500),
            }).eq("id", dest.id);
          }
        } catch (e) {
          falhas++;
          await supabase.from("crm_campanha_destinatarios").update({
            status: "falhou", erro: String(e).slice(0, 500),
          }).eq("id", dest.id);
        }

        await supabase.from("crm_campanhas").update({
          total_enviados: enviados, total_falhas: falhas,
        }).eq("id", campanha_id);

        await new Promise((r) => setTimeout(r, intervalo));
      }

      await supabase.from("crm_campanhas").update({
        status: "concluida",
        finalizado_em: new Date().toISOString(),
        total_enviados: enviados,
        total_falhas: falhas,
      }).eq("id", campanha_id);
    };

    // @ts-ignore EdgeRuntime
    EdgeRuntime.waitUntil(process());

    return new Response(JSON.stringify({ ok: true, total: dests.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
