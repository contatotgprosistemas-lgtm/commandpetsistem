import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: config } = await service.from("sistema_asaas_config").select("webhook_token").maybeSingle();
    const token = req.headers.get("asaas-access-token") || req.headers.get("x-webhook-token");
    if (config?.webhook_token && token !== config.webhook_token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const body = await req.json();
    const event = body.event;
    const payment = body.payment;
    if (!payment?.id) return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });

    const ref: string = payment.externalReference || "";
    const isSistema = ref.startsWith("fatura_sistema:");
    if (!isSistema) {
      return new Response(JSON.stringify({ ok: true, ignored: true }), { headers: corsHeaders });
    }
    const faturaId = ref.replace("fatura_sistema:", "");

    if (event === "PAYMENT_RECEIVED" || event === "PAYMENT_CONFIRMED") {
      await service.from("faturas_sistema").update({
        status: "pago",
        data_pagamento: payment.paymentDate || payment.confirmedDate || new Date().toISOString().split("T")[0],
        forma_pagamento: payment.billingType,
      }).eq("id", faturaId);
    } else if (event === "PAYMENT_OVERDUE") {
      await service.from("faturas_sistema").update({ status: "vencido" }).eq("id", faturaId);
    } else if (event === "PAYMENT_DELETED" || event === "PAYMENT_REFUNDED") {
      await service.from("faturas_sistema").update({ status: "cancelado" }).eq("id", faturaId);
    }

    return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});