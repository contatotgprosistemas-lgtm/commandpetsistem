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

    // Resolve invoices in 3 layers:
    // 1) by asaas_payment_id (primary, gravado em todas as faturas do lote)
    // 2) by asaas_batch_ref (fallback de lote se externalReference for "batch_xxx")
    // 3) by id (fallback final, quando externalReference é o UUID da fatura única)
    const asaasPaymentId = payment.id;
    const externalRef: string | null = payment.externalReference ?? null;

    let contas: any[] | null = null;

    const { data: byPid } = await supabase
      .from("contas_receber")
      .select("*")
      .eq("asaas_payment_id", asaasPaymentId);
    if (byPid && byPid.length > 0) contas = byPid;

    if (!contas && externalRef) {
      if (externalRef.startsWith("batch_")) {
        const { data: byBatch } = await supabase
          .from("contas_receber")
          .select("*")
          .eq("asaas_batch_ref", externalRef);
        if (byBatch && byBatch.length > 0) contas = byBatch;
      } else {
        // legacy: externalReference may be a single UUID or comma-separated UUIDs
        const refIds = externalRef.split(",").map((s: string) => s.trim()).filter(Boolean);
        if (refIds.length > 0) {
          const { data: byIds } = await supabase
            .from("contas_receber")
            .select("*")
            .in("id", refIds);
          if (byIds && byIds.length > 0) contas = byIds;
        }
      }
    }

    if (!contas || contas.length === 0) {
      console.error("Invoice(s) not found for payment:", asaasPaymentId, "externalRef:", externalRef);
      return new Response(JSON.stringify({ received: true, error: "Invoice not found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    for (const conta of contas) {
      if (conta.status !== "pago") {
        await processPayment(supabase, conta, payment, conta.valor);
      }
    }

    // Aplica a taxa financeira UMA VEZ POR TRANSAÇÃO (não por fatura),
    // somando o valor total do lote. Usa a primeira fatura como referência
    // de empresa/cliente/conta bancária.
    try {
      await applyTransactionFee(supabase, contas, payment);
    } catch (e) {
      console.error("Erro ao aplicar taxa financeira:", e);
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

async function applyTransactionFee(supabase: any, contas: any[], payment: any) {
  if (!contas || contas.length === 0) return;

  const today = new Date().toISOString().split("T")[0];
  const ref = contas[0];
  const empresaId = ref.empresa_id;

  // Evita duplicar taxa caso o webhook seja re-entregue
  const { data: existingFee } = await supabase
    .from("movimentacoes")
    .select("id")
    .eq("empresa_id", empresaId)
    .eq("tipo", "taxa_financeira")
    .ilike("complemento", `%Asaas ID: ${payment.id}%`)
    .limit(1);
  if (existingFee && existingFee.length > 0) {
    console.log(`Fee already applied for payment ${payment.id}, skipping`);
    return;
  }

  // Determina forma de pagamento Asaas → tipo da taxa
  // Asaas billingType: PIX, CREDIT_CARD, BOLETO, DEBIT_CARD, UNDEFINED
  const billingType = String(payment.billingType ?? "").toUpperCase();
  let tipoTaxa: string | null = null;
  if (billingType === "PIX") tipoTaxa = "pix_asaas";
  else if (billingType === "CREDIT_CARD") tipoTaxa = "cartao_credito";
  else if (billingType === "DEBIT_CARD") tipoTaxa = "cartao_debito";
  else if (billingType === "BOLETO") tipoTaxa = "boleto";
  else tipoTaxa = "pix_asaas"; // fallback (fluxo atual é PIX via Asaas)

  // Busca taxa cadastrada — tenta o tipo exato, e para PIX faz fallback "pix_asaas" → "pix"
  let { data: taxa } = await supabase
    .from("taxas_financeiras")
    .select("percentual, valor_fixo")
    .eq("empresa_id", empresaId)
    .eq("ativo", true)
    .eq("tipo", tipoTaxa)
    .limit(1)
    .maybeSingle();
  if (!taxa && tipoTaxa === "pix_asaas") {
    const { data: fallback } = await supabase
      .from("taxas_financeiras")
      .select("percentual, valor_fixo")
      .eq("empresa_id", empresaId)
      .eq("ativo", true)
      .eq("tipo", "pix")
      .limit(1)
      .maybeSingle();
    taxa = fallback;
  }

  if (!taxa) {
    console.log(`No active fee configured for empresa ${empresaId} type ${tipoTaxa}`);
    return;
  }

  // Valor total da transação = soma das faturas do lote
  const valorTotal = contas.reduce(
    (acc: number, c: any) => acc + Number(c.valor || 0),
    0
  );
  const taxaValor = Math.round(
    (Number(valorTotal) * Number(taxa.percentual) / 100 + Number(taxa.valor_fixo)) * 100
  ) / 100;

  if (taxaValor <= 0) return;

  // Conta bancária Asaas (mesma lógica do processPayment)
  let asaasContaLabel: string | null = null;
  if (ref.asaas_conta_id) {
    const { data: ac } = await supabase
      .from("asaas_contas")
      .select("label")
      .eq("id", ref.asaas_conta_id)
      .maybeSingle();
    asaasContaLabel = ac?.label ?? null;
  }
  const bancoLabel = asaasContaLabel ? `PIX - ${asaasContaLabel}` : "PIX - Asaas";

  const { data: bancos } = await supabase
    .from("contas_bancarias")
    .select("id, banco, titular")
    .eq("empresa_id", empresaId);

  let banco: any = null;
  if (asaasContaLabel) {
    banco = bancos?.find(
      (b: any) =>
        b.banco?.toLowerCase() === "asaas" &&
        b.titular?.toLowerCase() === asaasContaLabel!.toLowerCase()
    );
  }
  if (!banco) {
    banco = bancos?.find((b: any) => b.banco?.toLowerCase().includes("asaas")) || bancos?.[0] || null;
  }

  // Nome do cliente (do primeiro registro do lote)
  const { data: cliente } = await supabase
    .from("clientes")
    .select("nome")
    .eq("id", ref.cliente_id)
    .maybeSingle();

  const tipoLabel =
    tipoTaxa === "cartao_credito" ? "Cartão Crédito"
    : tipoTaxa === "cartao_debito" ? "Cartão Débito"
    : tipoTaxa === "pix" ? "PIX"
    : tipoTaxa === "boleto" ? "Boleto"
    : tipoTaxa;

  const descLote = contas.length > 1
    ? `${contas.length} faturas`
    : ref.descricao;

  await supabase.from("movimentacoes").insert({
    empresa_id: empresaId,
    data_movimentacao: today,
    plano_contas: "Despesas Financeiras",
    pessoa: cliente?.nome || "Cliente",
    complemento: `Taxa ${tipoLabel} - ${descLote} (Asaas ID: ${payment.id})`,
    banco: bancoLabel,
    valor: -taxaValor,
    tipo: "taxa_financeira",
    conta_bancaria_id: banco?.id ?? null,
  });

  if (banco?.id) {
    await supabase.rpc("sincronizar_saldo_bancario", { p_conta_bancaria_id: banco.id });
  }

  console.log(`Fee applied: ${tipoLabel} R$ ${taxaValor} for payment ${payment.id}`);
}
