import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const EVOLUTION_URL = Deno.env.get("EVOLUTION_API_URL") ?? "";
const EVOLUTION_KEY = Deno.env.get("EVOLUTION_API_KEY") ?? "";

async function enviarNotifFaturaWhats(
  supabase: any,
  empresa_id: string,
  cliente: { id: string; nome: string; whatsapp?: string | null; telefone?: string | null },
  fatura: { id?: string | null; descricao: string; valor: number; vencimento: string },
) {
  try {
    // Already sent for this invoice?
    if (fatura.id) {
      const { data: existsLog } = await supabase
        .from("invoice_notification_log")
        .select("id")
        .eq("conta_receber_id", fatura.id)
        .eq("status", "enviado")
        .limit(1);
      if (existsLog && existsLog.length > 0) return;
    }

    // Config (default enabled)
    const { data: cfg } = await supabase
      .from("invoice_notification_config")
      .select("enabled, mensagem")
      .eq("empresa_id", empresa_id)
      .maybeSingle();
    if (cfg && cfg.enabled === false) return;

    const numero = (cliente.whatsapp ?? cliente.telefone ?? "").replace(/\D/g, "");
    if (!numero) return;

    // Active WhatsApp channel
    const { data: canais } = await supabase
      .from("crm_canais")
      .select("id, identificador, status")
      .eq("empresa_id", empresa_id)
      .eq("tipo", "whatsapp")
      .eq("ativo", true)
      .order("updated_at", { ascending: false });
    const canal = (canais ?? []).find((c: any) => c.status === "conectado") ?? (canais ?? [])[0];
    if (!canal?.identificador) return;
    if (!EVOLUTION_URL || !EVOLUTION_KEY) return;

    const template = (cfg?.mensagem ?? "Olá {nome}! Sua fatura *{descricao}* no valor de *R$ {valor}* foi gerada com vencimento em *{vencimento}*.") as string;
    const conteudo = template
      .replace(/\{nome\}/g, cliente.nome ?? "")
      .replace(/\{primeiro_nome\}/g, (cliente.nome ?? "").split(" ")[0])
      .replace(/\{descricao\}/g, fatura.descricao)
      .replace(/\{valor\}/g, Number(fatura.valor).toFixed(2).replace(".", ","))
      .replace(/\{vencimento\}/g, formatDateBR(fatura.vencimento));

    // Send via Evolution
    const evoRes = await fetch(`${EVOLUTION_URL.replace(/\/$/, "")}/message/sendText/${canal.identificador}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: EVOLUTION_KEY },
      body: JSON.stringify({ number: numero, text: conteudo }),
    });
    if (!evoRes.ok) {
      const txt = await evoRes.text();
      await supabase.from("invoice_notification_log").insert({
        empresa_id, cliente_id: cliente.id, conta_receber_id: fatura.id ?? null,
        status: "falha", erro: `Evolution ${evoRes.status}: ${txt.slice(0, 300)}`,
      });
      return;
    }
    const evoData = await evoRes.json().catch(() => ({}));
    const externalId = evoData?.key?.id ?? evoData?.messageId ?? null;
    const now = new Date().toISOString();

    // Find/create CRM contact + conversation
    let { data: contato } = await supabase
      .from("crm_contatos")
      .select("id")
      .eq("empresa_id", empresa_id)
      .or(`whatsapp.eq.${numero},telefone.eq.${numero}`)
      .limit(1)
      .maybeSingle();
    if (!contato) {
      const { data: novo } = await supabase
        .from("crm_contatos")
        .insert({ empresa_id, nome: cliente.nome, whatsapp: numero, telefone: numero, origem: "faturamento" })
        .select("id")
        .single();
      contato = novo;
    }

    let { data: conversa } = await supabase
      .from("crm_conversas")
      .select("id")
      .eq("empresa_id", empresa_id)
      .eq("contato_id", contato!.id)
      .eq("canal_id", canal.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!conversa) {
      const { data: nova } = await supabase
        .from("crm_conversas")
        .insert({ empresa_id, contato_id: contato!.id, canal_id: canal.id, status: "aberta", ultima_mensagem: conteudo, ultima_mensagem_em: now })
        .select("id")
        .single();
      conversa = nova;
    }

    await supabase.from("crm_mensagens").insert({
      empresa_id, conversa_id: conversa!.id, tipo: "texto", direcao: "saida",
      conteudo, status: "enviado", remetente_nome: "💰 Faturamento",
      identificador_externo: externalId, enviada_em: now,
    });
    await supabase.from("crm_conversas").update({
      ultima_mensagem: conteudo, ultima_mensagem_em: now,
    }).eq("id", conversa!.id);

    await supabase.from("invoice_notification_log").insert({
      empresa_id, cliente_id: cliente.id, conta_receber_id: fatura.id ?? null,
      conversa_id: conversa!.id, status: "enviado",
    });
  } catch (err) {
    console.error("enviarNotifFaturaWhats error", err);
    try {
      await supabase.from("invoice_notification_log").insert({
        empresa_id, cliente_id: cliente.id, conta_receber_id: fatura.id ?? null,
        status: "falha", erro: String((err as Error).message ?? err).slice(0, 500),
      });
    } catch { /* noop */ }
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const today = new Date();
    const todayDay = today.getDate();
    const todayStr = today.toISOString().split("T")[0];

    // 1. Fetch all active subscriptions with client billing config
    const { data: subscriptions, error: subErr } = await supabase
      .from("customer_pet_subscriptions")
      .select(
        "id, empresa_id, cliente_id, pet_id, plan_id, package_id, price_contracted, discount_amount, final_price, planned_days, cliente:clientes(id, nome, whatsapp, telefone, dia_vencimento_fatura, dias_gerar_fatura)"
      )
      .eq("status", "ativo");

    if (subErr) {
      console.error("Error fetching subscriptions:", subErr);
      return new Response(JSON.stringify({ error: subErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Fetch plan/package names for descriptions
    const planIds = [
      ...new Set(
        (subscriptions || []).filter((s: any) => s.plan_id).map((s: any) => s.plan_id)
      ),
    ];
    const packageIds = [
      ...new Set(
        (subscriptions || []).filter((s: any) => s.package_id).map((s: any) => s.package_id)
      ),
    ];

    let plansMap: Record<string, string> = {};
    let packagesMap: Record<string, string> = {};

    if (planIds.length > 0) {
      const { data: plans } = await supabase
        .from("service_plans")
        .select("id, name")
        .in("id", planIds);
      (plans || []).forEach((p: any) => (plansMap[p.id] = p.name));
    }
    if (packageIds.length > 0) {
      const { data: pkgs } = await supabase
        .from("service_packages")
        .select("id, name")
        .in("id", packageIds);
      (pkgs || []).forEach((p: any) => (packagesMap[p.id] = p.name));
    }

    let faturasCriadas = 0;
    let notificacoesCriadas = 0;

    for (const sub of subscriptions || []) {
      const cliente = sub.cliente as any;
      if (!cliente) continue;

      const diaVencimento = cliente.dia_vencimento_fatura || 10;
      const diasAntes = cliente.dias_gerar_fatura || 5;

      // Calculate next due date (this month or next)
      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();

      let vencDate = new Date(currentYear, currentMonth, diaVencimento);
      // If we already passed this month's due date, target next month
      if (todayDay > diaVencimento) {
        vencDate = new Date(currentYear, currentMonth + 1, diaVencimento);
      }
      const vencStr = vencDate.toISOString().split("T")[0];

      // Calculate days until due date
      const diffMs = vencDate.getTime() - today.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

      const planName = sub.plan_id
        ? plansMap[sub.plan_id] || "Plano"
        : packagesMap[sub.package_id] || "Pacote";

      // --- GENERATE INVOICE if today = diasAntes before vencimento ---
      if (diffDays === diasAntes) {
        // Check if invoice already exists for this subscription + due date
        const { data: existing } = await supabase
          .from("contas_receber")
          .select("id")
          .eq("cliente_id", sub.cliente_id)
          .eq("vencimento", vencStr)
          .ilike("descricao", `%${planName}%`)
          .limit(1);

        if (!existing || existing.length === 0) {
          const descricao = `${sub.plan_id ? "Plano" : "Pacote"}: ${planName}`;
          const { data: novaFatura } = await supabase.from("contas_receber").insert({
            empresa_id: sub.empresa_id,
            cliente_id: sub.cliente_id,
            descricao,
            valor: sub.final_price,
            vencimento: vencStr,
            status: "pendente",
            categoria: "Planos e Pacotes",
          }).select("id").single();
          faturasCriadas++;

          // Send WhatsApp/CRM notification
          await enviarNotifFaturaWhats(supabase, sub.empresa_id, {
            id: cliente.id, nome: cliente.nome,
            whatsapp: cliente.whatsapp ?? null, telefone: cliente.telefone ?? null,
          }, {
            id: novaFatura?.id ?? null,
            descricao,
            valor: Number(sub.final_price),
            vencimento: vencStr,
          });

          // Notify client: invoice generated
          await supabase.from("customer_notifications").insert({
            empresa_id: sub.empresa_id,
            cliente_id: sub.cliente_id,
            title: "Nova fatura emitida",
            message: `Sua fatura de ${planName} no valor de R$ ${Number(
              sub.final_price
            ).toFixed(2)} foi gerada com vencimento em ${formatDateBR(vencStr)}.`,
            type: "financeiro",
          });
          notificacoesCriadas++;
        }
      }

      // --- NOTIFY 3 days before due date ---
      if (diffDays === 3) {
        // Check if there's a pending invoice for this due date
        const { data: pendingInvoice } = await supabase
          .from("contas_receber")
          .select("id")
          .eq("cliente_id", sub.cliente_id)
          .eq("vencimento", vencStr)
          .eq("status", "pendente")
          .ilike("descricao", `%${planName}%`)
          .limit(1);

        if (pendingInvoice && pendingInvoice.length > 0) {
          await supabase.from("customer_notifications").insert({
            empresa_id: sub.empresa_id,
            cliente_id: sub.cliente_id,
            title: "Fatura vence em 3 dias",
            message: `Sua fatura de ${planName} no valor de R$ ${Number(
              sub.final_price
            ).toFixed(2)} vence em ${formatDateBR(vencStr)}. Evite juros, pague em dia!`,
            type: "financeiro",
          });
          notificacoesCriadas++;
        }
      }

      // --- NOTIFY on the due date ---
      if (diffDays === 0) {
        const { data: pendingInvoice } = await supabase
          .from("contas_receber")
          .select("id")
          .eq("cliente_id", sub.cliente_id)
          .eq("vencimento", vencStr)
          .eq("status", "pendente")
          .ilike("descricao", `%${planName}%`)
          .limit(1);

        if (pendingInvoice && pendingInvoice.length > 0) {
          await supabase.from("customer_notifications").insert({
            empresa_id: sub.empresa_id,
            cliente_id: sub.cliente_id,
            title: "Fatura vence hoje!",
            message: `Sua fatura de ${planName} no valor de R$ ${Number(
              sub.final_price
            ).toFixed(2)} vence hoje (${formatDateBR(vencStr)}). Efetue o pagamento para evitar pendências.`,
            type: "financeiro",
          });
          notificacoesCriadas++;
        }
      }

      // --- OVERDUE ALERTS: check current month's due date if already passed ---
      if (todayDay > diaVencimento) {
        const overdueDate = new Date(currentYear, currentMonth, diaVencimento);
        const overdueStr = overdueDate.toISOString().split("T")[0];
        const daysOverdue = todayDay - diaVencimento;

        if (daysOverdue === 2 || daysOverdue === 4) {
          const { data: overdueInvoice } = await supabase
            .from("contas_receber")
            .select("id")
            .eq("cliente_id", sub.cliente_id)
            .eq("vencimento", overdueStr)
            .eq("status", "pendente")
            .ilike("descricao", `%${planName}%`)
            .limit(1);

          if (overdueInvoice && overdueInvoice.length > 0) {
            const titulo = daysOverdue === 2
              ? "Fatura atrasada há 2 dias"
              : "Fatura atrasada há 4 dias";
            const msg = daysOverdue === 2
              ? `Sua fatura de ${planName} (R$ ${Number(sub.final_price).toFixed(2)}) venceu em ${formatDateBR(overdueStr)} e está pendente. Regularize o pagamento o quanto antes.`
              : `Sua fatura de ${planName} (R$ ${Number(sub.final_price).toFixed(2)}) está atrasada há 4 dias (vencimento ${formatDateBR(overdueStr)}). Entre em contato para regularizar.`;

            await supabase.from("customer_notifications").insert({
              empresa_id: sub.empresa_id,
              cliente_id: sub.cliente_id,
              title: titulo,
              message: msg,
              type: "financeiro",
            });
            notificacoesCriadas++;
          }
        }
      }
    }

    console.log(
      `Processamento concluído: ${faturasCriadas} faturas criadas, ${notificacoesCriadas} notificações enviadas.`
    );

    return new Response(
      JSON.stringify({
        success: true,
        faturas_criadas: faturasCriadas,
        notificacoes_criadas: notificacoesCriadas,
        date: todayStr,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function formatDateBR(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}
