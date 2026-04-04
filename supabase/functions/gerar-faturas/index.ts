import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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
        "id, empresa_id, cliente_id, pet_id, plan_id, package_id, price_contracted, discount_amount, final_price, planned_days, cliente:clientes(id, nome, dia_vencimento_fatura, dias_gerar_fatura)"
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
          await supabase.from("contas_receber").insert({
            empresa_id: sub.empresa_id,
            cliente_id: sub.cliente_id,
            descricao: `${sub.plan_id ? "Plano" : "Pacote"}: ${planName}`,
            valor: sub.final_price,
            vencimento: vencStr,
            status: "pendente",
            categoria: "Planos e Pacotes",
          });
          faturasCriadas++;

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
