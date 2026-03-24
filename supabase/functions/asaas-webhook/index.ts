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

    // Find the invoice by asaas_payment_id
    const asaasPaymentId = payment.id;
    const { data: conta, error: contaErr } = await supabase
      .from("contas_receber")
      .select("*")
      .eq("asaas_payment_id", asaasPaymentId)
      .single();

    if (contaErr || !conta) {
      // Try by externalReference (conta.id)
      if (payment.externalReference) {
        const { data: contaByRef } = await supabase
          .from("contas_receber")
          .select("*")
          .eq("id", payment.externalReference)
          .single();
        if (!contaByRef) {
          console.error("Invoice not found for payment:", asaasPaymentId);
          return new Response(JSON.stringify({ received: true, error: "Invoice not found" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        // Process this one
        await processPayment(supabase, contaByRef, payment);
      } else {
        console.error("Invoice not found for payment:", asaasPaymentId);
        return new Response(JSON.stringify({ received: true, error: "Invoice not found" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      await processPayment(supabase, conta, payment);
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

async function processPayment(supabase: any, conta: any, payment: any) {
  const today = new Date().toISOString().split("T")[0];
  const valorPago = payment.value || conta.valor;

  // Update invoice as paid
  await supabase
    .from("contas_receber")
    .update({
      status: "pago",
      data_baixa: today,
      valor_pago: valorPago,
      banco: "PIX - Asaas",
      observacao_baixa: `Pagamento PIX confirmado. ID: ${payment.id}`,
    })
    .eq("id", conta.id);

  // Find the first bank account of the company to credit
  const { data: banco } = await supabase
    .from("contas_bancarias")
    .select("id, saldo_atual")
    .eq("empresa_id", conta.empresa_id)
    .limit(1)
    .single();

  if (banco) {
    // Update bank balance
    await supabase
      .from("contas_bancarias")
      .update({ saldo_atual: banco.saldo_atual + valorPago })
      .eq("id", banco.id);

    // Get client name for movimentacao
    const { data: cliente } = await supabase
      .from("clientes")
      .select("nome")
      .eq("id", conta.cliente_id)
      .single();

    // Insert movimentacao
    await supabase.from("movimentacoes").insert({
      empresa_id: conta.empresa_id,
      data_movimentacao: today,
      plano_contas: conta.categoria || conta.descricao,
      pessoa: cliente?.nome || "Cliente",
      complemento: `${conta.descricao} (PIX Asaas)`,
      banco: "PIX - Asaas",
      valor: valorPago,
      tipo: "contas_a_receber",
      conta_receber_id: conta.id,
    });
  }

  console.log(`Payment processed: Invoice ${conta.id}, Value: ${valorPago}`);
}
