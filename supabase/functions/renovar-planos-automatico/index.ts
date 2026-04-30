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
  return d.toISOString().split("T")[0];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

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
        const validityDays = plan?.validity_days || pkg?.validity_days || 30;
        const nome = plan?.name || pkg?.name || "Plano/Pacote";

        const newStart = new Date();
        const newEnd = addDays(newStart, validityDays);
        const newStartStr = fmt(newStart);
        const newEndStr = fmt(newEnd);

        // Look up cliente due-date day
        const { data: cliente } = await supabase
          .from("clientes")
          .select("dia_vencimento_fatura, nome")
          .eq("id", sub.cliente_id)
          .maybeSingle();

        // Compute invoice due date (similar logic to handleFaturar)
        const hoje = new Date();
        let vencimento = newStartStr;
        const diaVenc = cliente?.dia_vencimento_fatura;
        if (diaVenc && diaVenc >= 1 && diaVenc <= 31) {
          const ano = hoje.getFullYear();
          const mes = hoje.getMonth();
          const ultimoDiaMesAtual = new Date(ano, mes + 1, 0).getDate();
          const diaEsteMes = Math.min(diaVenc, ultimoDiaMesAtual);
          const dataEsteMes = new Date(ano, mes, diaEsteMes);
          if (dataEsteMes >= new Date(ano, mes, hoje.getDate())) {
            vencimento = fmt(dataEsteMes);
          } else {
            const ultimoDiaProxMes = new Date(ano, mes + 2, 0).getDate();
            const diaProxMes = Math.min(diaVenc, ultimoDiaProxMes);
            vencimento = fmt(new Date(ano, mes + 1, diaProxMes));
          }
        }

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

        // Generate invoice
        await supabase.from("contas_receber").insert({
          empresa_id: sub.empresa_id,
          cliente_id: sub.cliente_id,
          descricao: `Renovação automática: ${nome}`,
          valor: sub.final_price,
          vencimento,
          status: "pendente",
          categoria: "Planos e Pacotes",
        });

        // Notify tutor (success)
        await supabase.from("customer_notifications").insert({
          empresa_id: sub.empresa_id,
          cliente_id: sub.cliente_id,
          title: "Plano renovado com sucesso",
          message: `Seu plano "${nome}" foi renovado automaticamente. Nova validade: ${newEndStr.split("-").reverse().join("/")}. Uma nova fatura foi gerada com vencimento em ${vencimento.split("-").reverse().join("/")}.`,
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
