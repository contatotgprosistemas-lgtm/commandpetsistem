import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ASAAS_BASE = "https://api.asaas.com/v3";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ASAAS_API_KEY = Deno.env.get("ASAAS_API_KEY");
    if (!ASAAS_API_KEY) throw new Error("ASAAS_API_KEY not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { conta_id } = await req.json();
    if (!conta_id) throw new Error("conta_id is required");

    // Get the invoice
    const { data: conta, error: contaErr } = await supabase
      .from("contas_receber")
      .select("*")
      .eq("id", conta_id)
      .single();
    if (contaErr || !conta) throw new Error("Invoice not found");
    if (conta.status === "pago") throw new Error("Invoice already paid");

    // If already has asaas payment, return existing QR code
    if (conta.asaas_payment_id) {
      const pixRes = await fetch(`${ASAAS_BASE}/payments/${conta.asaas_payment_id}/pixQrCode`, {
        headers: { access_token: ASAAS_API_KEY },
      });
      if (pixRes.ok) {
        const pixData = await pixRes.json();
        return new Response(JSON.stringify({
          payment_id: conta.asaas_payment_id,
          qr_code_image: pixData.encodedImage,
          qr_code_payload: pixData.payload,
          expiration_date: pixData.expirationDate,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Get client info
    const { data: cliente } = await supabase
      .from("clientes")
      .select("id, nome, cpf, email, whatsapp, asaas_customer_id")
      .eq("id", conta.cliente_id)
      .single();
    if (!cliente) throw new Error("Client not found");

    // Create or reuse Asaas customer
    let asaasCustomerId = cliente.asaas_customer_id;
    if (!asaasCustomerId) {
      const customerRes = await fetch(`${ASAAS_BASE}/customers`, {
        method: "POST",
        headers: {
          access_token: ASAAS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: cliente.nome,
          cpfCnpj: cliente.cpf?.replace(/\D/g, "") || "00000000000",
          email: cliente.email || undefined,
          mobilePhone: cliente.whatsapp?.replace(/\D/g, "") || undefined,
        }),
      });
      const customerData = await customerRes.json();
      if (!customerRes.ok) throw new Error(`Asaas customer error: ${JSON.stringify(customerData)}`);

      asaasCustomerId = customerData.id;

      // Save asaas_customer_id using service role to bypass RLS
      const serviceSupabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      await serviceSupabase
        .from("clientes")
        .update({ asaas_customer_id: asaasCustomerId })
        .eq("id", cliente.id);
    }

    // Create PIX payment
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 1);

    const paymentRes = await fetch(`${ASAAS_BASE}/payments`, {
      method: "POST",
      headers: {
        access_token: ASAAS_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        customer: asaasCustomerId,
        billingType: "PIX",
        value: conta.valor,
        dueDate: dueDate.toISOString().split("T")[0],
        description: conta.descricao,
        externalReference: conta.id,
      }),
    });
    const paymentData = await paymentRes.json();
    if (!paymentRes.ok) throw new Error(`Asaas payment error: ${JSON.stringify(paymentData)}`);

    // Save asaas_payment_id
    const serviceSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    await serviceSupabase
      .from("contas_receber")
      .update({ asaas_payment_id: paymentData.id })
      .eq("id", conta.id);

    // Get PIX QR Code
    // Wait a moment for Asaas to generate the QR code
    await new Promise((r) => setTimeout(r, 2000));

    const pixRes = await fetch(`${ASAAS_BASE}/payments/${paymentData.id}/pixQrCode`, {
      headers: { access_token: ASAAS_API_KEY },
    });
    const pixData = await pixRes.json();

    return new Response(JSON.stringify({
      payment_id: paymentData.id,
      qr_code_image: pixData.encodedImage,
      qr_code_payload: pixData.payload,
      expiration_date: pixData.expirationDate,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
