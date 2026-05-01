import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * Runs on the 1st of each month. Handles automatic adjustments for:
 *  - Weekly (semanal) plans: extra session when the planned weekday occurs 5x in a month.
 *    Charge = final_price / 4 per extra session (added to the month's invoice).
 *  - Bi-weekly (quinzenal) plans: when a 3rd fortnight occurs in the same month.
 *    Behavior depends on extra_session_policy:
 *      - "skip" (default): the 3rd session is NOT scheduled, no charge applied.
 *      - "charge": the 3rd session is scheduled and charged proportionally
 *                  (final_price / 2 per extra session, since base covers 2 sessions).
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Allow manual override: { month_offset: 1 } to process next month
    let monthOffset = 0;
    try {
      if (req.method === "POST") {
        const body = await req.json().catch(() => ({}));
        if (typeof body?.month_offset === "number") monthOffset = body.month_offset;
      }
    } catch { /* noop */ }

    const today = new Date();
    const targetDate = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth(); // 0-indexed
    const monthStart = `${year}-${String(month + 1).padStart(2, "0")}-01`;

    function countWeekdayInMonth(weekday: number, y: number, m: number): number {
      let count = 0;
      const daysInMonth = new Date(y, m + 1, 0).getDate();
      for (let d = 1; d <= daysInMonth; d++) {
        if (new Date(y, m, d).getDay() === weekday) count++;
      }
      return count;
    }

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

    // Fetch all active subscriptions with planned_days (semanal + quinzenal)
    const { data: subscriptions, error: subErr } = await supabase
      .from("customer_pet_subscriptions")
      .select(
        "id, empresa_id, cliente_id, pet_id, plan_id, package_id, price_contracted, discount_amount, final_price, planned_days, start_date, end_date, frequency, extra_session_policy"
      )
      .eq("status", "ativo")
      .in("frequency", ["semanal", "quinzenal", "mensal"])
      .not("planned_days", "is", null);

    if (subErr) {
      console.error("Error fetching subscriptions:", subErr);
      return new Response(JSON.stringify({ error: subErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve plan/package names
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

    let agendamentosCriados = 0;
    let faturasAjustadas = 0;
    let quinzenaisProcessadas = 0;
    let agendamentosRegulares = 0;

    // ===== STEP 0: Generate REGULAR appointments for the current month =====
    // Many subscriptions only had appointments scheduled for the contract month;
    // this loop ensures every active subscription has its regular sessions for
    // the current month (idempotent - skips dates where an agendamento already exists).
    function fmtDate(d: Date): string {
      const y = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      return `${y}-${mm}-${dd}`;
    }

    const monthStartDate = new Date(year, month, 1);
    const monthEndDate = new Date(year, month + 1, 0);
    const todayStart = new Date(year, today.getMonth(), today.getDate());

    // Carrega feriados / períodos fechados do mês para todas as empresas envolvidas
    const empresaIds = [...new Set((subscriptions || []).map((s: any) => s.empresa_id))];
    const feriadosPorEmpresa: Record<string, Set<string>> = {};
    const monthEndStr = fmtDate(monthEndDate);
    if (empresaIds.length > 0) {
      const { data: feriadosAll } = await supabase
        .from("feriados")
        .select("empresa_id, data, data_fim")
        .in("empresa_id", empresaIds)
        .lte("data", monthEndStr);
      for (const f of feriadosAll || []) {
        const empId = (f as any).empresa_id;
        const set = feriadosPorEmpresa[empId] ||= new Set<string>();
        const ini = new Date(((f as any).data || "") + "T00:00:00");
        const fim = (f as any).data_fim
          ? new Date(((f as any).data_fim) + "T00:00:00")
          : ini;
        const cur = new Date(ini);
        while (cur <= fim) {
          const ds = fmtDate(cur);
          if (ds >= monthStart && ds <= monthEndStr) set.add(ds);
          cur.setDate(cur.getDate() + 1);
        }
      }
    }

    for (const sub of subscriptions || []) {
      const plannedDays: number[] = sub.planned_days || [];
      if (plannedDays.length === 0) continue;

      // Skip if subscription is not active during current month
      const subStart = new Date(sub.start_date + "T00:00:00");
      const subEnd = sub.end_date ? new Date(sub.end_date + "T00:00:00") : null;
      if (subEnd && subEnd < monthStartDate) continue;
      if (subStart > monthEndDate) continue;

      // Compute candidate dates for the current month
      const candidates: Date[] = [];
      if (sub.frequency === "mensal" && plannedDays.length === 1) {
        const cursor = new Date(monthStartDate);
        while (cursor <= monthEndDate) {
          if (cursor.getDay() === plannedDays[0]) {
            candidates.push(new Date(cursor));
            break;
          }
          cursor.setDate(cursor.getDate() + 1);
        }
      } else if (sub.frequency === "quinzenal" && plannedDays.length === 1) {
        // Walk in 14-day cadence from start_date, keeping dates within current month
        const cursor = new Date(subStart);
        while (cursor.getDay() !== plannedDays[0]) {
          cursor.setDate(cursor.getDate() + 1);
        }
        while (cursor <= monthEndDate) {
          if (cursor >= monthStartDate) {
            candidates.push(new Date(cursor));
          }
          cursor.setDate(cursor.getDate() + 14);
        }
      } else {
        // Semanal: every matching weekday in month
        const cursor = new Date(monthStartDate);
        while (cursor <= monthEndDate) {
          if (plannedDays.includes(cursor.getDay())) {
            candidates.push(new Date(cursor));
          }
          cursor.setDate(cursor.getDate() + 1);
        }
      }

      if (candidates.length === 0) continue;

      // Fetch existing appointments for this subscription in the month
      const { data: existing } = await supabase
        .from("agendamentos")
        .select("data_hora")
        .eq("subscription_id", sub.id)
        .gte("data_hora", monthStart + "T00:00:00")
        .lte("data_hora", fmtDate(monthEndDate) + "T23:59:59");

      const existingDates = new Set(
        (existing || []).map((a: any) => (a.data_hora as string).split("T")[0])
      );

      const planName = sub.plan_id
        ? plansMap[sub.plan_id] || "Plano"
        : packagesMap[sub.package_id] || "Pacote";

      const feriadosEmp = feriadosPorEmpresa[sub.empresa_id] || new Set<string>();

      const toInsert: any[] = [];
      for (const date of candidates) {
        // Skip past dates and dates already scheduled
        if (date < todayStart) continue;
        const ds = fmtDate(date);
        if (existingDates.has(ds)) continue;
        // Skip feriados (empresa fechada)
        if (feriadosEmp.has(ds)) continue;
        // Skip if outside subscription validity
        if (subEnd && date > subEnd) continue;
        if (date < subStart) continue;

        toInsert.push({
          empresa_id: sub.empresa_id,
          cliente_id: sub.cliente_id,
          pet_id: sub.pet_id,
          tipo_servico: planName,
          data_hora: `${ds}T07:00:00-03:00`,
          status: "agendado",
          subscription_id: sub.id,
          notas: `Gerado automaticamente pelo plano (${sub.frequency})`,
        });
      }

      if (toInsert.length > 0) {
        for (let i = 0; i < toInsert.length; i += 50) {
          const { error: insErr } = await supabase
            .from("agendamentos")
            .insert(toInsert.slice(i, i + 50) as any);
          if (insErr) console.error("Erro inserindo agendamentos regulares:", insErr);
        }
        agendamentosRegulares += toInsert.length;
      }
    }
    console.log(`Agendamentos regulares gerados: ${agendamentosRegulares}`);

    for (const sub of subscriptions || []) {
      const plannedDays: number[] = sub.planned_days || [];
      if (plannedDays.length === 0) continue;

      const isQuinzenal = sub.frequency === "quinzenal";
      // Skip "mensal" subscriptions for the extra-session adjustment logic
      if (sub.frequency === "mensal") continue;
      const baseSessionCount = isQuinzenal ? 2 : 4;
      const noteTag = isQuinzenal ? "3ª sessão quinzenal extra" : "5º banho extra";
      const policy = (sub.extra_session_policy || "skip").toLowerCase();

      // ✋ Extra-session adjustment ONLY applies to BATH/GROOMING plans.
      // Daycare, Escola, TaxiPet/TaxiDog and similar all-day plans must NOT
      // receive a "5º banho extra" charge or appointment.
      const planNameForCheck = (sub.plan_id
        ? plansMap[sub.plan_id]
        : packagesMap[sub.package_id]) || "";
      const lowerName = planNameForCheck.toLowerCase();
      const isBanhoTosa = /(banho|tosa|grooming|hidrata|pelo)/i.test(lowerName);
      if (!isBanhoTosa) continue;

      // Skip past months: never create extras for dates already in the past
      // (e.g. running on the last day of the month should not back-fill).
      const isCurrentOrFutureMonth =
        year > today.getFullYear() ||
        (year === today.getFullYear() && month >= today.getMonth());
      if (!isCurrentOrFutureMonth) continue;

      // ✋ Skip subscriptions that started in the current month (or later).
      // Their first month is just regular consumption — no "extra" is owed
      // because the base price has not yet covered the standard 4 sessions.
      const subStartForExtra = new Date(sub.start_date + "T00:00:00");
      const startedThisMonthOrLater =
        subStartForExtra.getFullYear() > year ||
        (subStartForExtra.getFullYear() === year &&
          subStartForExtra.getMonth() >= month);
      if (startedThisMonthOrLater) continue;

      // Determine extra dates
      const extraDates: string[] = [];

      if (isQuinzenal) {
        // For each planned weekday, the 3rd occurrence (index 2) within
        // a 14-day cadence starting from start_date is the "extra".
        // Simpler heuristic: if the weekday occurs >=5 times this month,
        // there's a 3rd fortnight (since 5 weekdays = 3 fortnights overlap).
        // More precise: compute occurrences from start_date with 14-day step.
        const startDate = new Date(sub.start_date + "T00:00:00");
        const monthEnd = new Date(year, month + 1, 0);

        for (const weekday of plannedDays) {
          // Find first occurrence of this weekday from start_date
          const occurrences: Date[] = [];
          const cursor = new Date(startDate);
          // align to weekday
          while (cursor.getDay() !== weekday) {
            cursor.setDate(cursor.getDate() + 1);
          }
          // walk in 14-day steps until end of current month
          while (cursor <= monthEnd) {
            if (
              cursor.getFullYear() === year &&
              cursor.getMonth() === month
            ) {
              occurrences.push(new Date(cursor));
            }
            cursor.setDate(cursor.getDate() + 14);
          }
          // If 3 or more fortnight occurrences fall in this month, the 3rd+ are "extras"
          if (occurrences.length >= 3) {
            for (let i = 2; i < occurrences.length; i++) {
              const d = occurrences[i];
              const dd = String(d.getDate()).padStart(2, "0");
              const mm = String(d.getMonth() + 1).padStart(2, "0");
              extraDates.push(`${d.getFullYear()}-${mm}-${dd}`);
            }
          }
        }
      } else {
        // Semanal: 5th occurrence of weekday
        for (const weekday of plannedDays) {
          const count = countWeekdayInMonth(weekday, year, month);
          if (count >= 5) {
            const allDates = getWeekdayDates(weekday, year, month);
            extraDates.push(allDates[4]);
          }
        }
      }

      if (extraDates.length === 0) continue;

      // Filtrar datas que caem em feriados
      const feriadosEmp2 = feriadosPorEmpresa[sub.empresa_id] || new Set<string>();
      const extraDatesFiltradas = extraDates.filter((d) => !feriadosEmp2.has(d));
      if (extraDatesFiltradas.length === 0) continue;

      const planName = sub.plan_id
        ? plansMap[sub.plan_id] || "Plano"
        : packagesMap[sub.package_id] || "Pacote";

      // Avoid duplicates
      const { data: existingExtra } = await supabase
        .from("agendamentos")
        .select("id")
        .eq("subscription_id", sub.id)
        .gte("data_hora", monthStart + "T00:00:00")
        .ilike("notas", `%${noteTag}%`)
        .limit(1);

      if (existingExtra && existingExtra.length > 0) continue;

      // For quinzenal with policy "skip", we just notify the client and DO NOT
      // create the appointment or invoice adjustment.
      if (isQuinzenal && policy === "skip") {
        await supabase.from("customer_notifications").insert({
          empresa_id: sub.empresa_id,
          cliente_id: sub.cliente_id,
          title: "Mês com 3ª quinzena",
          message: `Este mês possui uma 3ª quinzena para ${planName}. Conforme contratado, sessões extras não são incluídas. Caso deseje agendar, entre em contato.`,
          type: "informativo",
        });
        quinzenaisProcessadas++;
        continue;
      }

      // Create extra appointments
      for (const extraDate of extraDatesFiltradas) {
        await supabase.from("agendamentos").insert({
          empresa_id: sub.empresa_id,
          cliente_id: sub.cliente_id,
          pet_id: sub.pet_id,
          tipo_servico: planName,
          data_hora: extraDate + "T08:00:00",
          status: "agendado",
          subscription_id: sub.id,
          notas: `${noteTag} - gerado automaticamente`,
        } as any);
        agendamentosCriados++;
      }

      // Calculate proportional adjustment
      const extraCount = extraDatesFiltradas.length;
      const valorPorSessao = Math.ceil((Number(sub.final_price) / baseSessionCount) * 100) / 100;
      const valorExtra = Math.ceil(valorPorSessao * extraCount * 100) / 100;
      const valorTotal = Math.ceil((Number(sub.final_price) + valorExtra) * 100) / 100;

      // Find this month's pending invoice
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
        await supabase
          .from("contas_receber")
          .update({
            valor: valorTotal,
            descricao: `${sub.plan_id ? "Plano" : "Pacote"}: ${planName} (${baseSessionCount + extraCount} sessões)`,
          } as any)
          .eq("id", invoice[0].id);
        faturasAjustadas++;
      } else {
        const { data: cliente } = await supabase
          .from("clientes")
          .select("id, nome, whatsapp, dia_vencimento_fatura")
          .eq("id", sub.cliente_id)
          .single();

        const diaVenc = (cliente as any)?.dia_vencimento_fatura || 10;
        const vencStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(diaVenc).padStart(2, "0")}`;
        const descricaoFatura = `${sub.plan_id ? "Plano" : "Pacote"}: ${planName} - ${noteTag}`;

        const { data: novaFatura } = await supabase.from("contas_receber").insert({
          empresa_id: sub.empresa_id,
          cliente_id: sub.cliente_id,
          descricao: descricaoFatura,
          valor: valorExtra,
          vencimento: vencStr,
          status: "pendente",
          categoria: "Planos e Pacotes",
        }).select("id").single();
        faturasAjustadas++;

        // Notificação WhatsApp (best-effort)
        try {
          const cli: any = cliente;
          if (cli?.whatsapp) {
            const fnUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/notificar-fatura-whatsapp`;
            fetch(fnUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
              },
              body: JSON.stringify({
                empresa_id: sub.empresa_id,
                cliente: { id: sub.cliente_id, nome: cli.nome, whatsapp: cli.whatsapp },
                fatura: { id: novaFatura?.id ?? null, descricao: descricaoFatura, valor: valorExtra, vencimento: vencStr },
              }),
            }).catch(() => {});
          }
        } catch { /* noop */ }
      }

      await supabase.from("customer_notifications").insert({
        empresa_id: sub.empresa_id,
        cliente_id: sub.cliente_id,
        title: "Ajuste mensal - sessão extra",
        message: `Este mês possui ${baseSessionCount + extraCount} sessões de ${planName.toLowerCase()} para seu pet. O valor proporcional de R$ ${valorExtra.toFixed(2)} foi adicionado à sua fatura (total: R$ ${valorTotal.toFixed(2)}).`,
        type: "financeiro",
      });

      if (isQuinzenal) quinzenaisProcessadas++;
    }

    console.log(
      `Ajuste mensal: ${agendamentosCriados} agendamentos extras, ${faturasAjustadas} faturas ajustadas, ${quinzenaisProcessadas} quinzenais processadas.`
    );

    return new Response(
      JSON.stringify({
        success: true,
        agendamentos_criados: agendamentosCriados,
        faturas_ajustadas: faturasAjustadas,
        quinzenais_processadas: quinzenaisProcessadas,
        agendamentos_regulares: agendamentosRegulares,
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
