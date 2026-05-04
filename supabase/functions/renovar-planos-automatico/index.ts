import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}
function fmt(d: Date): string {
  // Use local date components to avoid UTC shift (Brazil = UTC-3)
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}
function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
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

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  const today = fmt(new Date());
  const renovadas: any[] = [];
  const erros: any[] = [];

  try {
    // Find subscriptions with auto_renew=true, status=ativo, end_date <= today
    const { data: subs, error: subsErr } = await supabase
      .from("customer_pet_subscriptions")
      .select("*")
      .eq("auto_renew", true)
      .eq("status", "ativo")
      .lte("end_date", today);

    if (subsErr) throw subsErr;

    const planIds = [...new Set((subs ?? []).map((s: any) => s.plan_id).filter(Boolean))];
    const pkgIds = [...new Set((subs ?? []).map((s: any) => s.package_id).filter(Boolean))];

    const [{ data: plans }, { data: pkgs }] = await Promise.all([
      planIds.length
        ? supabase.from("service_plans").select("id, name, validity_days").in("id", planIds)
        : Promise.resolve({ data: [] as any[] }),
      pkgIds.length
        ? supabase.from("service_packages").select("id, name, validity_days").in("id", pkgIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    for (const sub of subs ?? []) {
      try {
        const plan = (plans ?? []).find((p: any) => p.id === sub.plan_id);
        const pkg = (pkgs ?? []).find((p: any) => p.id === sub.package_id);
        const nome = plan?.name || pkg?.name || "Plano/Pacote";

        // Renovação sempre do 1º ao último dia do mês corrente,
        // independentemente da validade do plano (28, 30 ou 31 dias).
        const now = new Date();
        const newStart = startOfMonth(now);
        const newEnd = endOfMonth(now);
        const newStartStr = fmt(newStart);
        const newEndStr = fmt(newEnd);

        // Look up cliente nome (apenas para notificação)
        const { data: cliente } = await supabase
          .from("clientes")
          .select("nome")
          .eq("id", sub.cliente_id)
          .maybeSingle();

        // Update subscription
        const { error: updErr } = await supabase
          .from("customer_pet_subscriptions")
          .update({
            start_date: newStartStr,
            end_date: newEndStr,
            next_renewal_date: newEndStr,
            status: "ativo",
          })
          .eq("id", sub.id);
        if (updErr) throw updErr;

        // Log event
        await supabase.from("subscription_events").insert({
          empresa_id: sub.empresa_id,
          subscription_id: sub.id,
          event_type: "renovacao",
          description: "Renovação automática",
        });

        // Faturas são geradas separadamente pela função `gerar-faturas`
        // (todo dia 1 às 13h BRT) — unificadas por cliente e com vencimento
        // conforme cadastro do cliente.

        // ========== Generate agendamentos for the new period ==========
        try {
          const plannedDays: number[] = sub.planned_days || [];
          const frequency: string = sub.frequency || "semanal";
          const tipoServico = nome;
          const startObj = startOfDay(newStart);
          const monthEnd = endOfMonth(startObj);
          const todayStart = startOfDay(new Date());
          const agendamentos: any[] = [];

          // Carrega feriados / períodos fechados da empresa que tocam o mês corrente
          const { data: feriadosData } = await supabase
            .from("feriados")
            .select("data, data_fim")
            .eq("empresa_id", sub.empresa_id)
            .lte("data", newEndStr);
          const feriadosSet = new Set<string>();
          for (const f of feriadosData || []) {
            const ini = new Date(((f as any).data || "") + "T00:00:00");
            const fim = (f as any).data_fim
              ? new Date(((f as any).data_fim) + "T00:00:00")
              : ini;
            const cur = new Date(ini);
            while (cur <= fim) {
              const ds = fmt(cur);
              if (ds >= newStartStr && ds <= newEndStr) feriadosSet.add(ds);
              cur.setDate(cur.getDate() + 1);
            }
          }

          if (plannedDays.length > 0) {
            if (frequency === "mensal" && plannedDays.length === 1) {
              // First occurrence of weekday in the month from newStart
              const cursor = new Date(startObj);
              while (cursor <= monthEnd) {
                if (cursor.getDay() === plannedDays[0]) {
                  if (cursor >= todayStart && !feriadosSet.has(fmt(cursor))) {
                    agendamentos.push({
                      empresa_id: sub.empresa_id,
                      cliente_id: sub.cliente_id,
                      pet_id: sub.pet_id,
                      tipo_servico: tipoServico,
                      data_hora: `${fmt(cursor)}T07:00:00-03:00`,
                      status: "agendado",
                      subscription_id: sub.id,
                      notas: "Gerado automaticamente pela renovação (mensal)",
                    });
                  }
                  break;
                }
                cursor.setDate(cursor.getDate() + 1);
              }
            } else if (frequency === "quinzenal" && plannedDays.length === 1) {
              // Quinzenal: a cada 14 dias, dentro do mês corrente
              const newEndObj = startOfDay(monthEnd);
              const cursor = new Date(startObj);
              while (cursor.getDay() !== plannedDays[0]) {
                cursor.setDate(cursor.getDate() + 1);
              }
              while (cursor <= newEndObj) {
                if (cursor >= todayStart && !feriadosSet.has(fmt(cursor))) {
                  agendamentos.push({
                    empresa_id: sub.empresa_id,
                    cliente_id: sub.cliente_id,
                    pet_id: sub.pet_id,
                    tipo_servico: tipoServico,
                    data_hora: `${fmt(cursor)}T07:00:00-03:00`,
                    status: "agendado",
                    subscription_id: sub.id,
                    notas: "Gerado automaticamente pela renovação (quinzenal)",
                  });
                }
                cursor.setDate(cursor.getDate() + 14);
              }
            } else {
              // Semanal: all matching weekdays from newStart until end of month
              const cursor = new Date(startObj);
              while (cursor <= monthEnd) {
                if (
                  plannedDays.includes(cursor.getDay()) &&
                  cursor >= todayStart &&
                  !feriadosSet.has(fmt(cursor))
                ) {
                  agendamentos.push({
                    empresa_id: sub.empresa_id,
                    cliente_id: sub.cliente_id,
                    pet_id: sub.pet_id,
                    tipo_servico: tipoServico,
                    data_hora: `${fmt(cursor)}T07:00:00-03:00`,
                    status: "agendado",
                    subscription_id: sub.id,
                    notas: "Gerado automaticamente pela renovação (semanal)",
                  });
                }
                cursor.setDate(cursor.getDate() + 1);
              }
            }
          }

          // Insert in chunks of 50
          for (let i = 0; i < agendamentos.length; i += 50) {
            const chunk = agendamentos.slice(i, i + 50);
            const { error: agErr } = await supabase.from("agendamentos").insert(chunk as any);
            if (agErr) console.error("Erro inserindo agendamentos:", agErr);
          }
          console.log(`Sub ${sub.id}: ${agendamentos.length} agendamentos gerados`);
        } catch (agExc) {
          console.error("Erro gerando agendamentos para sub", sub.id, agExc);
        }

        // Notify tutor (success)
        await supabase.from("customer_notifications").insert({
          empresa_id: sub.empresa_id,
          cliente_id: sub.cliente_id,
          title: "Plano renovado com sucesso",
          message: `Seu plano "${nome}" foi renovado automaticamente. Nova validade: ${newEndStr.split("-").reverse().join("/")}.`,
          type: "plano_renovado",
          is_read: false,
        });

        renovadas.push({ id: sub.id, cliente: cliente?.nome, plano: nome, novo_fim: newEndStr });
      } catch (e) {
        console.error("Erro renovando", sub.id, e);
        erros.push({ id: sub.id, erro: String(e) });

        // Notify tutor (failure)
        try {
          const plan = (plans ?? []).find((p: any) => p.id === sub.plan_id);
          const pkg = (pkgs ?? []).find((p: any) => p.id === sub.package_id);
          const nome = plan?.name || pkg?.name || "Plano/Pacote";
          await supabase.from("customer_notifications").insert({
            empresa_id: sub.empresa_id,
            cliente_id: sub.cliente_id,
            title: "Falha na renovação do plano",
            message: `Não foi possível renovar automaticamente seu plano "${nome}". Por favor, entre em contato com a empresa para regularizar.`,
            type: "plano_falha",
            is_read: false,
          });
        } catch (notifErr) {
          console.error("Erro ao notificar falha:", notifErr);
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, total: subs?.length || 0, renovadas, erros }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("Erro geral:", e);
    return new Response(
      JSON.stringify({ success: false, error: String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
