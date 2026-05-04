import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function asaasBase(ambiente: string) {
  return ambiente === "production"
    ? "https://api.asaas.com/v3"
    : "https://sandbox.asaas.com/api/v3";
}

function lastDayOfMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function computeVencimento(competencia: Date, dia: number): string {
  const y = competencia.getFullYear();
  const m = competencia.getMonth();
  const d = Math.min(dia, lastDayOfMonth(y, m));
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

async function ensureCustomer(apiKey: string, base: string, empresa: any): Promise<string> {
  // Try by cpfCnpj
  if (empresa.cnpj) {
    const r = await fetch(`${base}/customers?cpfCnpj=${empresa.cnpj.replace(/\D/g, "")}`, {
      headers: { access_token: apiKey },
    });
    if (r.ok) {
      const j = await r.json();
      if (j.data && j.data.length > 0) return j.data[0].id;
    }
  }
  const create = await fetch(`${base}/customers`, {
    method: "POST",
    headers: { access_token: apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      name: empresa.nome_empresa || "Empresa",
      cpfCnpj: (empresa.cnpj || "").replace(/\D/g, "") || undefined,
      email: empresa.email || undefined,
      mobilePhone: (empresa.telefone || "").replace(/\D/g, "") || undefined,
    }),
  });
  const j = await create.json();
  if (!create.ok) throw new Error(`Asaas customer error: ${JSON.stringify(j)}`);
  return j.id;
}

async function processFatura(
  service: any,
  config: any,
  empresa: any,
  modulos: any,
  competencia: Date,
) {
  const valor = Number(modulos.valor_mensal || 0);
  if (!valor || valor <= 0) return { skipped: true, reason: "sem_valor_mensal" };

  const competenciaStr = `${competencia.getFullYear()}-${String(competencia.getMonth() + 1).padStart(2, "0")}-01`;
  const vencimento = computeVencimento(competencia, modulos.dia_vencimento_fatura || 10);

  // Idempotency
  const { data: existing } = await service
    .from("faturas_sistema")
    .select("*")
    .eq("empresa_id", empresa.id)
    .eq("competencia", competenciaStr)
    .maybeSingle();
  if (existing) return { skipped: true, fatura_id: existing.id, reason: "ja_existe" };

  // Insert pending
  const { data: fatura, error: insErr } = await service
    .from("faturas_sistema")
    .insert({
      empresa_id: empresa.id,
      competencia: competenciaStr,
      vencimento,
      valor,
      status: "pendente",
    })
    .select()
    .single();
  if (insErr) throw insErr;

  // Asaas charge
  if (config?.api_key) {
    try {
      const base = asaasBase(config.ambiente || "sandbox");
      const customerId = await ensureCustomer(config.api_key, base, empresa);
      const billingType = config.pix_habilitado && config.boleto_habilitado
        ? "UNDEFINED"
        : config.pix_habilitado
        ? "PIX"
        : "BOLETO";

      const payRes = await fetch(`${base}/payments`, {
        method: "POST",
        headers: { access_token: config.api_key, "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: customerId,
          billingType,
          value: valor,
          dueDate: vencimento,
          description: `Mensalidade ${competenciaStr.slice(0, 7)} - PetControl System`,
          externalReference: `fatura_sistema:${fatura.id}`,
        }),
      });
      const pay = await payRes.json();
      if (!payRes.ok) throw new Error(`Asaas payment error: ${JSON.stringify(pay)}`);

      const updates: any = {
        asaas_charge_id: pay.id,
        asaas_invoice_url: pay.invoiceUrl,
        boleto_url: pay.bankSlipUrl,
      };

      // Get PIX QR code
      if (config.pix_habilitado) {
        const qrRes = await fetch(`${base}/payments/${pay.id}/pixQrCode`, {
          headers: { access_token: config.api_key },
        });
        if (qrRes.ok) {
          const qr = await qrRes.json();
          updates.pix_qr_code = qr.encodedImage ? `data:image/png;base64,${qr.encodedImage}` : null;
          updates.pix_copia_cola = qr.payload || null;
        }
      }

      // Get boleto identification
      if (config.boleto_habilitado) {
        const idRes = await fetch(`${base}/payments/${pay.id}/identificationField`, {
          headers: { access_token: config.api_key },
        });
        if (idRes.ok) {
          const j = await idRes.json();
          updates.linha_digitavel_boleto = j.identificationField || null;
        }
      }

      await service.from("faturas_sistema").update(updates).eq("id", fatura.id);
    } catch (e) {
      console.error("Asaas charge error", e);
      await service
        .from("faturas_sistema")
        .update({ observacao: "Falha ao gerar cobrança Asaas. Tente novamente." })
        .eq("id", fatura.id);
    }
  }

  return { fatura_id: fatura.id, ok: true };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // --- Authentication: either CRON_SECRET (server-to-server) or super_admin JWT ---
    const cronSecret = Deno.env.get("CRON_SECRET");
    const provided = req.headers.get("x-cron-secret");
    const authHeader = req.headers.get("Authorization");
    let isAuthorized = false;

    if (cronSecret && provided && provided === cronSecret) {
      isAuthorized = true;
    } else if (authHeader?.startsWith("Bearer ")) {
      const anonClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } },
      );
      const jwt = authHeader.replace("Bearer ", "");
      const { data: claimsData, error: claimsErr } = await anonClient.auth.getClaims(jwt);
      if (!claimsErr && claimsData?.claims?.sub) {
        const callerId = claimsData.claims.sub as string;
        const { data: roles } = await service
          .from("user_roles")
          .select("role")
          .eq("user_id", callerId);
        if ((roles || []).some((r: any) => r.role === "super_admin")) {
          isAuthorized = true;
        }
      }
    }

    if (!isAuthorized) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: config } = await service.from("sistema_asaas_config").select("*").maybeSingle();

    let empresaIds: string[] | null = null;
    let competencia = new Date();
    competencia.setDate(1);

    let body: any = {};
    try { body = await req.json(); } catch {}

    if (body.empresa_id) {
      empresaIds = [body.empresa_id];
    }
    if (body.competencia) {
      competencia = new Date(body.competencia);
      competencia.setDate(1);
    }

    const empresasQuery = service
      .from("empresas")
      .select("id, nome_empresa, cnpj, email, telefone");
    const { data: empresas, error: empErr } = empresaIds
      ? await empresasQuery.in("id", empresaIds)
      : await empresasQuery;
    if (empErr) throw empErr;

    const results: any[] = [];
    for (const e of empresas || []) {
      const { data: mod } = await service
        .from("empresa_modulos")
        .select("valor_mensal, dia_vencimento_fatura, data_fim")
        .eq("empresa_id", e.id)
        .maybeSingle();
      if (!mod) { results.push({ empresa_id: e.id, skipped: true, reason: "sem_modulos" }); continue; }
      if (mod.data_fim && new Date(mod.data_fim) < competencia) {
        results.push({ empresa_id: e.id, skipped: true, reason: "contrato_encerrado" });
        continue;
      }
      try {
        const r = await processFatura(service, config, e, mod, competencia);
        results.push({ empresa_id: e.id, ...r });
      } catch (err) {
        console.error("Erro empresa", e.id, err);
        results.push({ empresa_id: e.id, error: true });
      }
    }

    return new Response(JSON.stringify({ ok: true, processed: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("gerar-fatura-sistema error:", e);
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});