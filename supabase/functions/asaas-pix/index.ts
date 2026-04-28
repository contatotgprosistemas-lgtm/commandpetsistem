import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
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

    const body = await req.json();
    const { conta_id, conta_ids } = body;

    // Resolve list of invoice IDs
    const ids: string[] = conta_ids && conta_ids.length > 0 ? conta_ids : conta_id ? [conta_id] : [];
    if (ids.length === 0) throw new Error("conta_id or conta_ids is required");

    // Get invoices
    const { data: contas, error: contasErr } = await supabase
      .from("contas_receber")
      .select("*")
      .in("id", ids);
    if (contasErr || !contas || contas.length === 0) throw new Error("Invoice(s) not found");

    const paidInvoices = contas.filter((c: any) => c.status === "pago");
    if (paidInvoices.length === contas.length) throw new Error("All invoices already paid");

    const unpaidContas = contas.filter((c: any) => c.status !== "pago");
    const totalValue = unpaidContas.reduce((s: number, c: any) => s + c.valor, 0);
    const empresaId = unpaidContas[0].empresa_id;
    const clienteId = unpaidContas[0].cliente_id;

    // ─── Determine which Asaas API key to use ───
    const { data: asaasContas } = await serviceSupabase
      .from("asaas_contas")
      .select("*")
      .eq("empresa_id", empresaId)
      .eq("ativo", true)
      .order("prioridade", { ascending: true });

    let ASAAS_API_KEY: string | null = null;
    let ASAAS_CONTA_ID: string | null = null;
    let ASAAS_CONTA_LABEL: string | null = null;

    if (asaasContas && asaasContas.length > 0) {
      const now = new Date();
      const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const monthEnd = nextMonth.toISOString().split("T")[0];

      for (const ac of asaasContas) {
        if (!ac.teto_mensal) {
          ASAAS_API_KEY = ac.api_key;
          ASAAS_CONTA_ID = ac.id;
          ASAAS_CONTA_LABEL = ac.label;
          break;
        }

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

        if (totalReceived + totalValue <= ac.teto_mensal) {
          ASAAS_API_KEY = ac.api_key;
          ASAAS_CONTA_ID = ac.id;
          ASAAS_CONTA_LABEL = ac.label;
          break;
        }
      }

      if (!ASAAS_API_KEY) {
        const last = asaasContas[asaasContas.length - 1];
        ASAAS_API_KEY = last.api_key;
        ASAAS_CONTA_ID = last.id;
        ASAAS_CONTA_LABEL = last.label;
        console.log(`All accounts exceeded cap, using last account: "${last.label}"`);
      }
    } else {
      ASAAS_API_KEY = Deno.env.get("ASAAS_API_KEY") || null;
    }

    if (!ASAAS_API_KEY) throw new Error("Nenhuma conta Asaas configurada. Configure em Configurações → Integrações.");

    // For single invoice with existing asaas_payment_id, return existing QR code
    if (unpaidContas.length === 1 && unpaidContas[0].asaas_payment_id) {
      const pixRes = await fetch(`${ASAAS_BASE}/payments/${unpaidContas[0].asaas_payment_id}/pixQrCode`, {
        headers: { access_token: ASAAS_API_KEY },
      });
      if (pixRes.ok) {
        const pixData = await pixRes.json();
        return new Response(JSON.stringify({
          payment_id: unpaidContas[0].asaas_payment_id,
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
      .eq("id", clienteId)
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

    // Create a single PIX payment with the total value
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 1);

    const description = unpaidContas.length === 1
      ? unpaidContas[0].descricao
      : `${unpaidContas.length} faturas - Venc. ${unpaidContas[0].vencimento}`;

    // Store all invoice IDs in externalReference so the webhook can settle each one
    const externalReference = unpaidContas.map((c: any) => c.id).join(",");

    const paymentRes = await fetch(`${ASAAS_BASE}/payments`, {
      method: "POST",
      headers: {
        access_token: ASAAS_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        customer: asaasCustomerId,
        billingType: "PIX",
        value: totalValue,
        dueDate: dueDate.toISOString().split("T")[0],
        description,
        externalReference,
      }),
    });
    const paymentData = await paymentRes.json();
    if (!paymentRes.ok) throw new Error(`Asaas payment error: ${JSON.stringify(paymentData)}`);

    // Save asaas_payment_id and asaas_conta_id on all invoices
    for (const c of unpaidContas) {
      await serviceSupabase
        .from("contas_receber")
        .update({ asaas_payment_id: paymentData.id, asaas_conta_id: ASAAS_CONTA_ID })
        .eq("id", c.id);
    }

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
