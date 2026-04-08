import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * Runs on the 1st of each month.
 * For every active weekly (mensal) bath subscription that has planned_days,
 * checks how many times that weekday falls in the current month.
 * If it's 5 instead of the usual 4, creates an extra appointment
 * and adjusts the invoice with the proportional extra charge.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth(); // 0-indexed

    // Count how many times each weekday (0-6) occurs in this month
    function countWeekdayInMonth(weekday: number, y: number, m: number): number {
      let count = 0;
      const daysInMonth = new Date(y, m + 1, 0).getDate();
      for (let d = 1; d <= daysInMonth; d++) {
        if (new Date(y, m, d).getDay() === weekday) count++;
      }
      return count;
    }

    // Get all dates of a given weekday in the month
    function getWeekdayDates(weekday: number, y: number, m: number): string[] {
      const dates: string[] = [];
      const daysInMonth = new Date(y, m + 1, 0).getDate();
      for (let d = 1; d <= daysInMonth; d++) {
        if (new Date(y, m, d).getDay() === weekday) {
          const dd = String(d).padStart(2, "0");
          const mm = String(m + 1).padStart(2, "0");
          dates.push(`${y}-${mm}-${dd}`);
        }
      }
      return dates;
    }

    // Fetch active monthly subscriptions with planned_days
    const { data: subscriptions, error: subErr } = await supabase
      .from("customer_pet_subscriptions")
      .select(
        "id, empresa_id, cliente_id, pet_id, plan_id, package_id, price_contracted, discount_amount, final_price, planned_days, start_date, end_date, frequency"
      )
      .eq("status", "ativo")
      .eq("frequency", "mensal")
      .not("planned_days", "is", null);

    if (subErr) {
      console.error("Error fetching subscriptions:", subErr);
      return new Response(JSON.stringify({ error: subErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch plan/package names
    const planIds = [...new Set((subscriptions || []).filter((s: any) => s.plan_id).map((s: any) => s.plan_id))];
    const packageIds = [...new Set((subscriptions || []).filter((s: any) => s.package_id).map((s: any) => s.package_id))];

    let plansMap: Record<string, string> = {};
    let packagesMap: Record<string, string> = {};

    if (planIds.length > 0) {
      const { data: plans } = await supabase.from("service_plans").select("id, name").in("id", planIds);
      (plans || []).forEach((p: any) => (plansMap[p.id] = p.name));
    }
    if (packageIds.length > 0) {
      const { data: pkgs } = await supabase.from("service_packages").select("id, name").in("id", packageIds);
      (pkgs || []).forEach((p: any) => (packagesMap[p.id] = p.name));
    }

    let agendamentosCriados = 0;
    let faturasAjustadas = 0;

    for (const sub of subscriptions || []) {
      const plannedDays: number[] = sub.planned_days || [];
      if (plannedDays.length === 0) continue;

      // Check if any planned weekday occurs 5 times this month
      let has5thWeek = false;
      let extraDates: string[] = [];

      for (const weekday of plannedDays) {
        const count = countWeekdayInMonth(weekday, year, month);
        if (count >= 5) {
          has5thWeek = true;
          // The 5th occurrence is the last date
          const allDates = getWeekdayDates(weekday, year, month);
          extraDates.push(allDates[4]); // 5th date (0-indexed)
        }
      }

      if (!has5thWeek) continue;

      const planName = sub.plan_id
        ? plansMap[sub.plan_id] || "Plano"
        : packagesMap[sub.package_id] || "Pacote";

      // Check if we already processed this month (avoid duplicates)
      const monthStart = `${year}-${String(month + 1).padStart(2, "0")}-01`;
      const { data: existingExtra } = await supabase
        .from("agendamentos")
        .select("id")
        .eq("subscription_id", sub.id)
        .gte("data_hora", monthStart + "T00:00:00")
        .ilike("notas", "%5º banho extra%")
        .limit(1);

      if (existingExtra && existingExtra.length > 0) continue;

      // Create extra appointments for each 5th occurrence
      for (const extraDate of extraDates) {
        await supabase.from("agendamentos").insert({
          empresa_id: sub.empresa_id,
          cliente_id: sub.cliente_id,
          pet_id: sub.pet_id,
          tipo_servico: planName,
          data_hora: extraDate + "T08:00:00",
          status: "agendado",
          subscription_id: sub.id,
          notas: "5º banho extra - gerado automaticamente",
        } as any);
        agendamentosCriados++;
      }

      // Calculate proportional adjustment
      // base price covers 4 sessions, extra sessions = final_price / 4 per extra
      const baseSessionCount = 4;
      const extraCount = extraDates.length;
      const valorPorSessao = Number(sub.final_price) / baseSessionCount;
      const valorExtra = valorPorSessao * extraCount;
      const valorTotal = Number(sub.final_price) + valorExtra;

      // Find and update this month's pending invoice for this subscription
      const { data: invoice } = await supabase
        .from("contas_receber")
        .select("id, valor")
        .eq("cliente_id", sub.cliente_id)
        .eq("status", "pendente")
        .ilike("descricao", `%${planName}%`)
        .gte("vencimento", monthStart)
        .order("vencimento", { ascending: true })
        .limit(1);

      if (invoice && invoice.length > 0) {
        // Update existing invoice with adjusted value
        await supabase
          .from("contas_receber")
          .update({
            valor: valorTotal,
            descricao: `${sub.plan_id ? "Plano" : "Pacote"}: ${planName} (${baseSessionCount + extraCount} sessões)`,
          } as any)
          .eq("id", invoice[0].id);
        faturasAjustadas++;
      } else {
        // No invoice found yet - create one with the extra value only
        // The regular invoice will be created by gerar-faturas
        // So we create a separate charge for the extra session
        const { data: cliente } = await supabase
          .from("clientes")
          .select("dia_vencimento_fatura")
          .eq("id", sub.cliente_id)
          .single();

        const diaVenc = (cliente as any)?.dia_vencimento_fatura || 10;
        const vencStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(diaVenc).padStart(2, "0")}`;

        await supabase.from("contas_receber").insert({
          empresa_id: sub.empresa_id,
          cliente_id: sub.cliente_id,
          descricao: `${sub.plan_id ? "Plano" : "Pacote"}: ${planName} - 5º banho extra`,
          valor: valorExtra,
          vencimento: vencStr,
          status: "pendente",
          categoria: "Planos e Pacotes",
        });
        faturasAjustadas++;
      }

      // Notify client
      await supabase.from("customer_notifications").insert({
        empresa_id: sub.empresa_id,
        cliente_id: sub.cliente_id,
        title: "Ajuste mensal - sessão extra",
        message: `Este mês possui ${baseSessionCount + extraCount} ${planName.toLowerCase()} para seu pet. O valor proporcional de R$ ${valorExtra.toFixed(2)} foi adicionado à sua fatura (total: R$ ${valorTotal.toFixed(2)}).`,
        type: "financeiro",
      });
    }

    console.log(`Ajuste mensal concluído: ${agendamentosCriados} agendamentos extras, ${faturasAjustadas} faturas ajustadas.`);

    return new Response(
      JSON.stringify({
        success: true,
        agendamentos_criados: agendamentosCriados,
        faturas_ajustadas: faturasAjustadas,
        month: `${year}-${String(month + 1).padStart(2, "0")}`,
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
