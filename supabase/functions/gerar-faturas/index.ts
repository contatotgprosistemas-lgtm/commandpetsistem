import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const EVOLUTION_URL = Deno.env.get("EVOLUTION_API_URL") ?? "";
const EVOLUTION_KEY = Deno.env.get("EVOLUTION_API_KEY") ?? "";

function formatDateBR(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

function fmtLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Calcula próximo vencimento conforme dia_vencimento_fatura
// Roda no dia 1: se diaVenc >= hoje (=1), vence neste mês; senão, próximo mês.
function calcularVencimento(diaVenc: number, hoje: Date): string {
  const ano = hoje.getFullYear();
  const mes = hoje.getMonth();
  const dia = hoje.getDate();
  const ultimoDiaEsteMes = new Date(ano, mes + 1, 0).getDate();
  const diaEsteMes = Math.min(diaVenc, ultimoDiaEsteMes);
  if (diaEsteMes >= dia) {
    return fmtLocal(new Date(ano, mes, diaEsteMes));
  }
  const ultimoDiaProx = new Date(ano, mes + 2, 0).getDate();
  const diaProxMes = Math.min(diaVenc, ultimoDiaProx);
  return fmtLocal(new Date(ano, mes + 1, diaProxMes));
}

function normalizeWhatsappNumber(raw?: string | null) {
  const digits = (raw ?? "").replace(/\D/g, "");
  if (!digits) return { primary: "", variants: [] as string[] };
  const primary = digits.startsWith("55")
    ? digits
    : digits.length >= 10 && digits.length <= 11
      ? `55${digits}`
      : digits;
  const local = primary.startsWith("55") ? primary.slice(2) : primary;
  const variants = Array.from(new Set([primary, local, digits]));
  return { primary, variants };
}

async function enviarNotifFaturaWhats(
  supabase: any,
  empresa_id: string,
  cliente: { id: string; nome: string; whatsapp?: string | null; telefone?: string | null },
  fatura: { id?: string | null; descricao: string; valor: number; vencimento: string },
) {
  try {
    // Delega para a edge function unificada (que já trata conexoes_whatsapp,
    // crm_canais, dedup, tipos, multa, e logging em invoice_notification_log).
    // IMPORTANTE: aguardamos a resposta para garantir que o envio foi de fato
    // processado e não fique preso em status intermediário.
    const SUPA_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!SUPA_URL || !SERVICE_KEY) return;
    const res = await fetch(`${SUPA_URL.replace(/\/$/, "")}/functions/v1/notificar-fatura-whatsapp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SERVICE_KEY}`,
        apikey: SERVICE_KEY,
      },
      body: JSON.stringify({
        empresa_id,
        cliente,
        fatura,
        tipo: "geracao",
      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      console.error("notificar-fatura-whatsapp falhou:", res.status, txt.slice(0, 300));
      return;
    }

    await res.text();
  } catch (err) {
    console.error("enviarNotifFaturaWhats error", err);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

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

    // Hoje em horário de Brasília
    const now = new Date();
    const brtNow = new Date(now.getTime() - 3 * 60 * 60 * 1000);
    const todayStr = fmtLocal(brtNow);

    // Buscar TODAS as assinaturas ativas
    const { data: subscriptions, error: subErr } = await supabase
      .from("customer_pet_subscriptions")
      .select(
        "id, empresa_id, cliente_id, pet_id, plan_id, package_id, final_price, frequency, planned_days, start_date, cliente:clientes(id, nome, whatsapp, telefone, dia_vencimento_fatura)",
      )
      .eq("status", "ativo");

    if (subErr) {
      return new Response(JSON.stringify({ error: subErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const planIds = [...new Set((subscriptions || []).filter((s: any) => s.plan_id).map((s: any) => s.plan_id))];
    const packageIds = [...new Set((subscriptions || []).filter((s: any) => s.package_id).map((s: any) => s.package_id))];

    const plansMap: Record<string, string> = {};
    const packagesMap: Record<string, string> = {};

    if (planIds.length > 0) {
      const { data: plans } = await supabase.from("service_plans").select("id, name").in("id", planIds);
      (plans || []).forEach((p: any) => (plansMap[p.id] = p.name));
    }
    if (packageIds.length > 0) {
      const { data: pkgs } = await supabase.from("service_packages").select("id, name").in("id", packageIds);
      (pkgs || []).forEach((p: any) => (packagesMap[p.id] = p.name));
    }

    // Agrupar UMA fatura por cliente
    const groups = new Map<
      string,
      {
        empresa_id: string;
        cliente_id: string;
        cliente: any;
        vencimento: string;
        items: { descricao: string; valor: number; subscription_id: string }[];
        total: number;
      }
    >();

    for (const sub of subscriptions || []) {
      const cliente = sub.cliente as any;
      if (!cliente) continue;

      const diaVenc = cliente.dia_vencimento_fatura || 10;
      const vencStr = calcularVencimento(diaVenc, brtNow);

      const planName = sub.plan_id
        ? plansMap[sub.plan_id] || "Plano"
        : packagesMap[sub.package_id] || "Pacote";
      const planLabel = `${sub.plan_id ? "Plano" : "Pacote"}: ${planName}`;

      // Evitar duplicação: se já existe fatura para este cliente neste vencimento
      // contendo este item, pula.
      const { data: existingItems } = await supabase
        .from("contas_receber")
        .select("id, contas_receber_itens(descricao)")
        .eq("cliente_id", sub.cliente_id)
        .eq("vencimento", vencStr)
        .eq("categoria", "Planos e Pacotes");

      const alreadyHas = (existingItems || []).some((f: any) =>
        (f.contas_receber_itens || []).some((it: any) => (it.descricao || "").includes(planName)),
      );
      if (alreadyHas) continue;

      const key = `${sub.cliente_id}|${vencStr}`;
      const g =
        groups.get(key) ?? {
          empresa_id: sub.empresa_id,
          cliente_id: sub.cliente_id,
          cliente,
          vencimento: vencStr,
          items: [] as { descricao: string; valor: number; subscription_id: string }[],
          total: 0,
        };
      g.items.push({ descricao: planLabel, valor: Number(sub.final_price), subscription_id: sub.id });
      g.total += Number(sub.final_price);

      // ===== 5º banho do mês =====
      // Aplica somente para planos de banho/tosa, frequência semanal,
      // e quando o dia planejado tem 5 ocorrências no mês corrente.
      // Pula se a assinatura começou neste mês ou depois (primeiro ciclo de consumo).
      try {
        const isBanhoTosa = /(banho|tosa|grooming|hidrata|pelo)/i.test(planName);
        const freq = (sub as any).frequency || "semanal";
        const plannedDays: number[] = (sub as any).planned_days || [];
        if (isBanhoTosa && freq === "semanal" && plannedDays.length > 0) {
          const year = brtNow.getFullYear();
          const month = brtNow.getMonth();
          const subStart = new Date(((sub as any).start_date || "") + "T00:00:00");
          const startedThisMonthOrLater =
            isNaN(subStart.getTime())
              ? false
              : subStart.getFullYear() > year ||
                (subStart.getFullYear() === year && subStart.getMonth() >= month);

          if (!startedThisMonthOrLater) {
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            // Carrega feriados / períodos fechados do mês para esta empresa
            const monthIni = `${year}-${String(month + 1).padStart(2, "0")}-01`;
            const monthFim = `${year}-${String(month + 1).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;
            const { data: feriadosData } = await supabase
              .from("feriados")
              .select("data, data_fim")
              .eq("empresa_id", sub.empresa_id)
              .lte("data", monthFim);
            const feriadosSet = new Set<string>();
            for (const f of feriadosData || []) {
              const ini = new Date(((f as any).data || "") + "T00:00:00");
              const fim = (f as any).data_fim
                ? new Date(((f as any).data_fim) + "T00:00:00")
                : ini;
              const cur = new Date(ini);
              while (cur <= fim) {
                const ds = fmtLocal(cur);
                if (ds >= monthIni && ds <= monthFim) feriadosSet.add(ds);
                cur.setDate(cur.getDate() + 1);
              }
            }
            // Conta ocorrências de cada planned_day no mês e coleta a 5ª data
            const extraDates: string[] = [];
            for (const wd of plannedDays) {
              const datesOfWd: Date[] = [];
              for (let d = 1; d <= daysInMonth; d++) {
                const dt = new Date(year, month, d);
                if (dt.getDay() === wd) datesOfWd.push(dt);
              }
              if (datesOfWd.length >= 5) {
                extraDates.push(fmtLocal(datesOfWd[4]));
              }
            }

            if (extraDates.length > 0) {
              const valorExtraUnit =
                Math.round((Number(sub.final_price) / 4) * 100) / 100;

              for (const extraDate of extraDates) {
                g.items.push({
                  descricao: `${planLabel} - 5º banho do mês (${formatDateBR(extraDate)})`,
                  valor: valorExtraUnit,
                  subscription_id: sub.id,
                });
                g.total += valorExtraUnit;

                // Se cair em feriado, fatura mantém mas o agendamento NÃO é criado
                if (feriadosSet.has(extraDate)) continue;

                // Cria agendamento extra (idempotente)
                const { data: jaExiste } = await supabase
                  .from("agendamentos")
                  .select("id")
                  .eq("subscription_id", sub.id)
                  .gte("data_hora", extraDate + "T00:00:00")
                  .lte("data_hora", extraDate + "T23:59:59")
                  .ilike("notas", "%5º banho%")
                  .limit(1);
                if (!jaExiste || jaExiste.length === 0) {
                  await supabase.from("agendamentos").insert({
                    empresa_id: sub.empresa_id,
                    cliente_id: sub.cliente_id,
                    pet_id: sub.pet_id,
                    tipo_servico: planName,
                    data_hora: `${extraDate}T07:00:00-03:00`,
                    status: "agendado",
                    subscription_id: sub.id,
                    notas: "5º banho do mês - gerado automaticamente",
                  } as any);
                }
              }
            }
          }
        }
      } catch (extraErr) {
        console.error("Erro processando 5º banho para sub", sub.id, extraErr);
      }

      groups.set(key, g);
    }

    let faturasCriadas = 0;
    let faturasAtualizadas = 0;
    let notificacoesCriadas = 0;
    // Garante 1 mensagem WhatsApp por cliente nesta execução,
    // mesmo que o cliente tenha mais de um grupo de fatura.
    const clientesNotificados = new Set<string>();

    for (const [, g] of groups) {
      // Tenta achar fatura pendente já existente para mesclar
      const { data: existingFat } = await supabase
        .from("contas_receber")
        .select("id, valor")
        .eq("cliente_id", g.cliente_id)
        .eq("vencimento", g.vencimento)
        .eq("status", "pendente")
        .eq("categoria", "Planos e Pacotes")
        .limit(1);

      const descricaoFatura =
        g.items.length === 1 ? g.items[0].descricao : `Faturamento mensal (${g.items.length} itens)`;

      let faturaId: string | null = null;
      let totalFatura = g.total;

      if (existingFat && existingFat.length > 0) {
        faturaId = existingFat[0].id;
        totalFatura = Number(existingFat[0].valor) + g.total;
        await supabase
          .from("contas_receber")
          .update({
            valor: totalFatura,
            descricao: descricaoFatura,
            updated_at: new Date().toISOString(),
          })
          .eq("id", faturaId);
        faturasAtualizadas++;
      } else {
        const { data: novaFatura } = await supabase
          .from("contas_receber")
          .insert({
            empresa_id: g.empresa_id,
            cliente_id: g.cliente_id,
            descricao: descricaoFatura,
            valor: totalFatura,
            vencimento: g.vencimento,
            status: "pendente",
            categoria: "Planos e Pacotes",
          })
          .select("id")
          .single();
        faturaId = novaFatura?.id ?? null;
        faturasCriadas++;
      }

      if (faturaId) {
        await supabase.from("contas_receber_itens").insert(
          g.items.map((it) => ({
            conta_receber_id: faturaId,
            empresa_id: g.empresa_id,
            descricao: it.descricao,
            valor: it.valor,
            tipo: /5º banho/i.test(it.descricao) ? "extra" : "principal",
          })),
        );
      }

      // Apenas 1 disparo de WhatsApp por cliente nesta execução.
      // O notificar-fatura-whatsapp também tem trava única por (cliente, tipo, dia).
      if (!clientesNotificados.has(g.cliente_id)) {
        clientesNotificados.add(g.cliente_id);
        await enviarNotifFaturaWhats(
          supabase,
          g.empresa_id,
          {
            id: g.cliente.id,
            nome: g.cliente.nome,
            whatsapp: g.cliente.whatsapp ?? null,
            telefone: g.cliente.telefone ?? null,
          },
          { id: faturaId, descricao: descricaoFatura, valor: totalFatura, vencimento: g.vencimento },
        );
      }

      await supabase.from("customer_notifications").insert({
        empresa_id: g.empresa_id,
        cliente_id: g.cliente_id,
        title: "Nova fatura emitida",
        message: `Sua fatura no valor de R$ ${totalFatura.toFixed(2)} foi gerada com vencimento em ${formatDateBR(g.vencimento)}.`,
        type: "financeiro",
      });
      notificacoesCriadas++;
    }

    console.log(
      `gerar-faturas: ${faturasCriadas} novas, ${faturasAtualizadas} atualizadas, ${notificacoesCriadas} notificações.`,
    );

    return new Response(
      JSON.stringify({
        success: true,
        faturas_criadas: faturasCriadas,
        faturas_atualizadas: faturasAtualizadas,
        notificacoes_criadas: notificacoesCriadas,
        date: todayStr,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
