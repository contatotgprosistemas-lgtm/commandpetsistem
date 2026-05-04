import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function applyVars(template: string, vars: Record<string, string>) {
  return template.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
}

// Compara dia/mês ignorando ano. Trabalha em UTC-3 (Brasília).
function todayBrasilia() {
  const now = new Date();
  const brt = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  return { mes: brt.getUTCMonth() + 1, dia: brt.getUTCDate(), ano: brt.getUTCFullYear() };
}

function sameMonthDay(dataISO: string | null, mes: number, dia: number) {
  if (!dataISO) return false;
  const [, m, d] = dataISO.split("T")[0].split("-").map(Number);
  return m === mes && d === dia;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const cronSecret = Deno.env.get("CRON_SECRET");
  if (!cronSecret) {
    return new Response(JSON.stringify({ error: "Service unavailable: CRON_SECRET not configured" }), {
      status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (req.headers.get("x-cron-secret") !== cronSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { mes, dia, ano } = todayBrasilia();
    const dryRun = new URL(req.url).searchParams.get("dry") === "1";

    // Empresas com config ativa (cria default se não existir)
    const { data: empresas } = await supabase
      .from("empresas")
      .select("id, nome_empresa");

    let totalEnviados = 0;
    const detalhes: any[] = [];

    for (const empresa of empresas ?? []) {
      let { data: config } = await supabase
        .from("birthday_config")
        .select("*")
        .eq("empresa_id", empresa.id)
        .maybeSingle();

      if (!config) {
        const { data: created } = await supabase
          .from("birthday_config")
          .insert({ empresa_id: empresa.id })
          .select("*")
          .single();
        config = created;
      }
      if (!config?.enabled) continue;

      // CLIENTES aniversariantes
      if (config.send_to_cliente) {
        const { data: clientes } = await supabase
          .from("clientes")
          .select("id, nome, data_nascimento")
          .eq("empresa_id", empresa.id)
          .is("deleted_at", null)
          .not("data_nascimento", "is", null);

        for (const c of clientes ?? []) {
          if (!sameMonthDay(c.data_nascimento, mes, dia)) continue;

          // já enviado este ano?
          const { data: existing } = await supabase
            .from("birthday_log")
            .select("id")
            .eq("cliente_id", c.id)
            .eq("tipo", "cliente")
            .eq("ano", ano)
            .maybeSingle();
          if (existing) continue;

          const message = applyVars(config.mensagem_cliente, {
            nome: c.nome ?? "",
            tutor: c.nome ?? "",
          });
          const title = "🎉 Feliz Aniversário!";

          if (!dryRun) {
            const { data: notif, error: notifErr } = await supabase
              .from("customer_notifications")
              .insert({
                empresa_id: empresa.id,
                cliente_id: c.id,
                title,
                message,
                type: "aniversario",
              })
              .select("id")
              .single();

            if (notifErr) { console.error("notif err", notifErr); continue; }

            await supabase.from("birthday_log").insert({
              empresa_id: empresa.id,
              cliente_id: c.id,
              tipo: "cliente",
              ano,
              notificacao_id: notif.id,
            });
          }

          totalEnviados++;
          detalhes.push({ tipo: "cliente", nome: c.nome, empresa: empresa.nome_empresa });
        }
      }

      // PETS aniversariantes
      if (config.send_to_pet) {
        const { data: pets } = await supabase
          .from("pets")
          .select("id, nome, data_nascimento, cliente_id, clientes!inner(id, nome)")
          .eq("empresa_id", empresa.id)
          .not("data_nascimento", "is", null);

        for (const p of pets ?? []) {
          if (!sameMonthDay(p.data_nascimento, mes, dia)) continue;
          const cliente = (p as any).clientes;
          if (!cliente) continue;

          const { data: existing } = await supabase
            .from("birthday_log")
            .select("id")
            .eq("pet_id", p.id)
            .eq("tipo", "pet")
            .eq("ano", ano)
            .maybeSingle();
          if (existing) continue;

          const message = applyVars(config.mensagem_pet, {
            pet: p.nome ?? "",
            nome: p.nome ?? "",
            tutor: cliente.nome ?? "",
          });
          const title = `🐾 Feliz Aniversário, ${p.nome}!`;

          if (!dryRun) {
            const { data: notif, error: notifErr } = await supabase
              .from("customer_notifications")
              .insert({
                empresa_id: empresa.id,
                cliente_id: cliente.id,
                title,
                message,
                type: "aniversario_pet",
              })
              .select("id")
              .single();

            if (notifErr) { console.error("notif err", notifErr); continue; }

            await supabase.from("birthday_log").insert({
              empresa_id: empresa.id,
              cliente_id: cliente.id,
              pet_id: p.id,
              tipo: "pet",
              ano,
              notificacao_id: notif.id,
            });
          }

          totalEnviados++;
          detalhes.push({ tipo: "pet", nome: p.nome, tutor: cliente.nome, empresa: empresa.nome_empresa });
        }
      }
    }

    return new Response(
      JSON.stringify({ ok: true, totalEnviados, dryRun, detalhes, data: `${dia}/${mes}/${ano}` }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("birthday-notifications error", err);
    return new Response(
      JSON.stringify({ ok: false, error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});