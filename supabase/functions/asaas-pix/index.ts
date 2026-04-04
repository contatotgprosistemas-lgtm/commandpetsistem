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

    const serviceSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

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

    // ─── Determine which Asaas API key to use ───
    const { data: asaasContas } = await serviceSupabase
      .from("asaas_contas")
      .select("*")
      .eq("empresa_id", conta.empresa_id)
      .eq("ativo", true)
      .order("prioridade", { ascending: true });

    let ASAAS_API_KEY: string | null = null;

    if (asaasContas && asaasContas.length > 0) {
      // Calculate monthly received total per account
      const now = new Date();
      const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const monthEnd = nextMonth.toISOString().split("T")[0];

      for (const ac of asaasContas) {
        if (!ac.teto_mensal) {
          // No cap — use this account
          ASAAS_API_KEY = ac.api_key;
          break;
        }

        // Sum payments received this month for this account by checking
        // contas_receber paid this month that were created via this account's API key
        // We track which account was used via the asaas_payment_id prefix pattern
        // Instead, we check total received this month for the empresa via payments API
        const paymentsRes = await fetch(
          `${ASAAS_BASE}/payments?dateCreated[ge]=${monthStart}&dateCreated[le]=${monthEnd}&status=RECEIVED&limit=100`,
          { headers: { access_token: ac.api_key } }
        );

        let totalReceived = 0;
        if (paymentsRes.ok) {
          const paymentsData = await paymentsRes.json();
          totalReceived = (paymentsData.data || []).reduce(
            (sum: number, p: any) => sum + (p.value || 0),
            0
          );
          // Handle pagination if more than 100
          if (paymentsData.totalCount > 100) {
            let offset = 100;
            while (offset < paymentsData.totalCount) {
              const moreRes = await fetch(
                `${ASAAS_BASE}/payments?dateCreated[ge]=${monthStart}&dateCreated[le]=${monthEnd}&status=RECEIVED&limit=100&offset=${offset}`,
                { headers: { access_token: ac.api_key } }
              );
              if (moreRes.ok) {
                const moreData = await moreRes.json();
                totalReceived += (moreData.data || []).reduce(
                  (sum: number, p: any) => sum + (p.value || 0),
                  0
                );
              }
              offset += 100;
            }
          }
        }

        console.log(`Account "${ac.label}" (priority ${ac.prioridade}): received R$${totalReceived.toFixed(2)} / cap R$${ac.teto_mensal}`);

        if (totalReceived + conta.valor <= ac.teto_mensal) {
          ASAAS_API_KEY = ac.api_key;
          break;
        }
        // Cap exceeded, try next account
      }

      // If all accounts exceeded cap, fallback to last one (no cap enforcement)
      if (!ASAAS_API_KEY) {
        ASAAS_API_KEY = asaasContas[asaasContas.length - 1].api_key;
        console.log(`All accounts exceeded cap, using last account: "${asaasContas[asaasContas.length - 1].label}"`);
      }
    } else {
      // Fallback to env var
      ASAAS_API_KEY = Deno.env.get("ASAAS_API_KEY") || null;
    }

    if (!ASAAS_API_KEY) throw new Error("Nenhuma conta Asaas configurada. Configure em Configurações → Integrações.");

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
      const cleanedCpf = cliente.cpf?.replace(/\D/g, "") || "";
      if (cleanedCpf.length !== 11 && cleanedCpf.length !== 14) {
        throw new Error("CPF/CNPJ do cliente não cadastrado ou inválido. Atualize o cadastro do cliente antes de gerar o PIX.");
      }

      const customerRes = await fetch(`${ASAAS_BASE}/customers`, {
        method: "POST",
        headers: {
          access_token: ASAAS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: cliente.nome,
          cpfCnpj: cleanedCpf,
          email: cliente.email || undefined,
          mobilePhone: cliente.whatsapp?.replace(/\D/g, "") || undefined,
        }),
      });
      const customerData = await customerRes.json();
      if (!customerRes.ok) throw new Error(`Asaas customer error: ${JSON.stringify(customerData)}`);

      asaasCustomerId = customerData.id;

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
    await serviceSupabase
      .from("contas_receber")
      .update({ asaas_payment_id: paymentData.id })
      .eq("id", conta.id);

    // Get PIX QR Code
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
