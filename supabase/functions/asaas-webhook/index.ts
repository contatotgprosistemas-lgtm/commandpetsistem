import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log("Asaas webhook received:", JSON.stringify(body));

    const event = body.event;
    const payment = body.payment;

    if (!payment || !event) {
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only process confirmed/received payments
    if (event !== "PAYMENT_CONFIRMED" && event !== "PAYMENT_RECEIVED") {
      console.log("Ignoring event:", event);
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find invoices by asaas_payment_id (may be multiple for grouped payments)
    const asaasPaymentId = payment.id;
    const { data: contas } = await supabase
      .from("contas_receber")
      .select("*")
      .eq("asaas_payment_id", asaasPaymentId);

    if (contas && contas.length > 0) {
      // Process each invoice individually
      for (const conta of contas) {
        if (conta.status !== "pago") {
          await processPayment(supabase, conta, payment, conta.valor);
        }
      }
    } else if (payment.externalReference) {
      // Fallback: externalReference may contain comma-separated IDs
      const refIds = payment.externalReference.split(",").map((s: string) => s.trim()).filter(Boolean);
      const { data: contasByRef } = await supabase
        .from("contas_receber")
        .select("*")
        .in("id", refIds);

      if (contasByRef && contasByRef.length > 0) {
        for (const conta of contasByRef) {
          if (conta.status !== "pago") {
            await processPayment(supabase, conta, payment, conta.valor);
          }
        }
      } else {
        console.error("Invoice(s) not found for payment:", asaasPaymentId);
        return new Response(JSON.stringify({ received: true, error: "Invoice not found" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      console.error("Invoice not found for payment:", asaasPaymentId);
      return new Response(JSON.stringify({ received: true, error: "Invoice not found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ received: true, processed: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function processPayment(supabase: any, conta: any, payment: any, valorIndividual?: number) {
  const today = new Date().toISOString().split("T")[0];
  const valorPago = valorIndividual ?? payment.value ?? conta.valor;

  // Resolve which Asaas account processed this payment
  let asaasContaLabel: string | null = null;
  if (conta.asaas_conta_id) {
    const { data: ac } = await supabase
      .from("asaas_contas")
      .select("label")
      .eq("id", conta.asaas_conta_id)
      .maybeSingle();
    asaasContaLabel = ac?.label ?? null;
  }

  const bancoLabel = asaasContaLabel ? `PIX - ${asaasContaLabel}` : "PIX - Asaas";

  // Update invoice as paid
  await supabase
    .from("contas_receber")
    .update({
      status: "pago",
      data_baixa: today,
      valor_pago: valorPago,
      banco: bancoLabel,
      observacao_baixa: `Pagamento PIX confirmado. ID: ${payment.id}`,
    })
    .eq("id", conta.id);

  // Find the matching bank account: prefer exact match by titular = label da conta Asaas
  const { data: bancos } = await supabase
    .from("contas_bancarias")
    .select("id, saldo_atual, banco, titular")
    .eq("empresa_id", conta.empresa_id);

  let banco: any = null;
  if (asaasContaLabel) {
    banco = bancos?.find(
      (b: any) =>
        b.banco?.toLowerCase() === "asaas" &&
        b.titular?.toLowerCase() === asaasContaLabel!.toLowerCase()
    );
  }
  // Fallback: any Asaas bank account, then first
  if (!banco) {
    banco = bancos?.find((b: any) => b.banco?.toLowerCase().includes("asaas")) || bancos?.[0] || null;
  }

  if (banco) {
    // Get client name for movimentacao
    const { data: cliente } = await supabase
      .from("clientes")
      .select("nome")
      .eq("id", conta.cliente_id)
      .single();

    // Insert movimentacao with conta_bancaria_id
    await supabase.from("movimentacoes").insert({
      empresa_id: conta.empresa_id,
      data_movimentacao: today,
      plano_contas: conta.categoria || conta.descricao,
      pessoa: cliente?.nome || "Cliente",
      complemento: `${conta.descricao} (${bancoLabel})`,
      banco: bancoLabel,
      valor: valorPago,
      tipo: "contas_a_receber",
      conta_receber_id: conta.id,
      conta_bancaria_id: banco.id,
    });

    // Sync bank balance from movements (single source of truth)
    await supabase.rpc("sincronizar_saldo_bancario", { p_conta_bancaria_id: banco.id });
  }

  console.log(`Payment processed: Invoice ${conta.id}, Value: ${valorPago}, Account: ${asaasContaLabel ?? "default"}`);
}
