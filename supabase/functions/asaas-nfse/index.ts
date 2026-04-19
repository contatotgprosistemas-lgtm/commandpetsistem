import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function jsonRes(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getAsaasBaseUrl(ambiente: string | undefined) {
  return ambiente === "producao"
    ? "https://api.asaas.com/v3"
    : "https://api-sandbox.asaas.com/v3";
}

async function asaasFetch(
  apiKey: string,
  ambiente: string,
  path: string,
  init: RequestInit = {},
) {
  const url = `${getAsaasBaseUrl(ambiente)}${path}`;
  const resp = await fetch(url, {
    ...init,
    headers: {
      ...(init.headers || {}),
      "access_token": apiKey,
      "Content-Type": "application/json",
      "User-Agent": "PetControl-NFSe",
    },
  });
  const text = await resp.text();
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = { raw: text }; }
  return { ok: resp.ok, status: resp.status, json };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return jsonRes({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims) return jsonRes({ error: "Unauthorized" }, 401);

    const userId = claims.claims.sub;
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: profile } = await admin
      .from("profiles")
      .select("empresa_id")
      .eq("user_id", userId)
      .maybeSingle();
    const empresaId = profile?.empresa_id;
    if (!empresaId) return jsonRes({ error: "Empresa não encontrada" }, 400);

    const body = await req.json().catch(() => ({}));
    const action: string = body.action || "";

    // Load empresa NFS-e config + asaas key
    async function loadConfig() {
      const { data: cfg } = await admin
        .from("asaas_nfse_config")
        .select("*")
        .eq("empresa_id", empresaId)
        .maybeSingle();
      if (!cfg) return { error: "Configuração de NFS-e não encontrada" };
      let apiKey: string | null = null;
      let ambiente = "producao";
      if (cfg.asaas_conta_id) {
        const { data: conta } = await admin
          .from("asaas_contas")
          .select("api_key, ativo")
          .eq("id", cfg.asaas_conta_id)
          .maybeSingle();
        if (conta?.ativo) apiKey = conta.api_key;
      }
      if (!apiKey) {
        const { data: contas } = await admin
          .from("asaas_contas")
          .select("api_key")
          .eq("empresa_id", empresaId)
          .eq("ativo", true)
          .order("prioridade")
          .limit(1);
        apiKey = contas?.[0]?.api_key ?? null;
      }
      if (!apiKey) apiKey = Deno.env.get("ASAAS_API_KEY") ?? null;
      if (!apiKey) return { error: "Chave Asaas não configurada" };
      return { cfg, apiKey, ambiente };
    }

    if (action === "testar_conexao") {
      const c = await loadConfig();
      if ("error" in c) return jsonRes({ ok: false, error: c.error });
      const r = await asaasFetch(c.apiKey, c.ambiente, "/myAccount");
      return jsonRes({ ok: r.ok, status: r.status, conta: r.json });
    }

    if (action === "listar_municipios") {
      const c = await loadConfig();
      if ("error" in c) return jsonRes({ error: c.error }, 400);
      const uf = body.uf || "";
      const nome = body.nome || "";
      const r = await asaasFetch(
        c.apiKey,
        c.ambiente,
        `/cities?state=${encodeURIComponent(uf)}&name=${encodeURIComponent(nome)}`,
      );
      return jsonRes(r.json);
    }

    if (action === "listar_servicos_municipais") {
      const c = await loadConfig();
      if ("error" in c) return jsonRes({ error: c.error }, 400);
      const codigoIbge = body.codigo_ibge || c.cfg.municipio_codigo_ibge;
      const r = await asaasFetch(
        c.apiKey,
        c.ambiente,
        `/invoices/municipalServices?cityCode=${encodeURIComponent(codigoIbge)}`,
      );
      return jsonRes(r.json);
    }

    if (action === "emitir") {
      const contaReceberId: string = body.conta_receber_id;
      if (!contaReceberId) return jsonRes({ error: "conta_receber_id obrigatório" }, 400);

      const c = await loadConfig();
      if ("error" in c) return jsonRes({ error: c.error }, 400);
      const cfg = c.cfg;

      const { data: conta } = await admin
        .from("contas_receber")
        .select("*, clientes:cliente_id(nome, cpf, email, telefone, endereco, cep)")
        .eq("id", contaReceberId)
        .eq("empresa_id", empresaId)
        .maybeSingle();
      if (!conta) return jsonRes({ error: "Fatura não encontrada" }, 404);
      if (conta.status !== "pago") return jsonRes({ error: "Fatura precisa estar paga" }, 400);

      const cliente = conta.clientes;
      if (!cliente) return jsonRes({ error: "Cliente não vinculado à fatura" }, 400);

      // Build payload — Asaas NFS-e
      const valor = Number(conta.valor_pago ?? conta.valor);
      const aliquota = Number(cfg.aliquota_iss || 0);
      const valorIss = +(valor * aliquota / 100).toFixed(2);
      const descricao = body.descricao || cfg.descricao_servico_padrao || conta.descricao;

      const payload: Record<string, unknown> = {
        serviceDescription: descricao,
        observations: cfg.observacoes || undefined,
        value: valor,
        deductions: 0,
        effectiveDate: new Date().toISOString().split("T")[0],
        municipalServiceCode: cfg.codigo_servico_municipio || undefined,
        municipalServiceName: cfg.item_lista_servico || undefined,
        municipalServiceId: cfg.item_lista_servico || undefined,
        taxes: {
          retainedIss: !!cfg.iss_retido,
          iss: aliquota,
          cofins: 0,
          csll: 0,
          inss: 0,
          ir: 0,
          pis: 0,
        },
      };
      if (conta.asaas_payment_id) {
        payload.payment = conta.asaas_payment_id;
      } else {
        // emit standalone using customer-like data via 'customer' field requires asaas customer id
        // Fallback: include 'externalReference' for tracking
        payload.externalReference = contaReceberId;
      }

      // Insert pending row first
      const { data: doc, error: insErr } = await admin
        .from("asaas_nfse_documents")
        .insert({
          empresa_id: empresaId,
          conta_receber_id: contaReceberId,
          cliente_id: conta.cliente_id,
          asaas_payment_id: conta.asaas_payment_id,
          valor_servico: valor,
          aliquota_iss: aliquota,
          valor_iss: valorIss,
          descricao,
          tomador_nome: cliente.nome,
          tomador_cpf_cnpj: cliente.cpf,
          tomador_email: cliente.email,
          status: "enviando",
          payload_envio: payload,
          created_by: userId,
        })
        .select()
        .single();
      if (insErr || !doc) return jsonRes({ error: insErr?.message || "Erro ao criar documento" }, 500);

      const r = await asaasFetch(c.apiKey, c.ambiente, "/invoices", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const update: Record<string, unknown> = { payload_resposta: r.json, updated_at: new Date().toISOString() };
      if (r.ok && r.json) {
        update.asaas_nfse_id = r.json.id;
        update.numero = r.json.number ?? null;
        update.status = (r.json.status || "scheduled").toLowerCase();
        update.pdf_url = r.json.pdfUrl ?? null;
        update.xml_url = r.json.xmlUrl ?? null;
        update.link_visualizacao = r.json.url ?? null;
        update.data_emissao = new Date().toISOString();
      } else {
        update.status = "erro";
        update.erro_mensagem = r.json?.errors?.[0]?.description || JSON.stringify(r.json);
      }
      await admin.from("asaas_nfse_documents").update(update).eq("id", doc.id);

      return jsonRes({ ok: r.ok, status: r.status, document_id: doc.id, response: r.json });
    }

    if (action === "consultar") {
      const docId: string = body.document_id;
      if (!docId) return jsonRes({ error: "document_id obrigatório" }, 400);
      const { data: doc } = await admin
        .from("asaas_nfse_documents")
        .select("*")
        .eq("id", docId)
        .eq("empresa_id", empresaId)
        .maybeSingle();
      if (!doc?.asaas_nfse_id) return jsonRes({ error: "NF não enviada ainda" }, 400);

      const c = await loadConfig();
      if ("error" in c) return jsonRes({ error: c.error }, 400);

      const r = await asaasFetch(c.apiKey, c.ambiente, `/invoices/${doc.asaas_nfse_id}`);
      if (r.ok && r.json) {
        await admin.from("asaas_nfse_documents").update({
          status: (r.json.status || doc.status).toLowerCase(),
          numero: r.json.number ?? doc.numero,
          pdf_url: r.json.pdfUrl ?? doc.pdf_url,
          xml_url: r.json.xmlUrl ?? doc.xml_url,
          link_visualizacao: r.json.url ?? doc.link_visualizacao,
          payload_resposta: r.json,
        }).eq("id", docId);
      }
      return jsonRes({ ok: r.ok, response: r.json });
    }

    if (action === "cancelar") {
      const docId: string = body.document_id;
      const motivo: string = body.motivo || "Cancelamento solicitado";
      if (!docId) return jsonRes({ error: "document_id obrigatório" }, 400);
      const { data: doc } = await admin
        .from("asaas_nfse_documents")
        .select("*")
        .eq("id", docId)
        .eq("empresa_id", empresaId)
        .maybeSingle();
      if (!doc?.asaas_nfse_id) return jsonRes({ error: "NF não enviada" }, 400);

      const c = await loadConfig();
      if ("error" in c) return jsonRes({ error: c.error }, 400);

      const r = await asaasFetch(c.apiKey, c.ambiente, `/invoices/${doc.asaas_nfse_id}/cancel`, {
        method: "POST",
        body: JSON.stringify({ reason: motivo }),
      });
      if (r.ok) {
        await admin.from("asaas_nfse_documents").update({
          status: "cancelada",
          data_cancelamento: new Date().toISOString(),
          motivo_cancelamento: motivo,
          payload_resposta: r.json,
        }).eq("id", docId);
      }
      return jsonRes({ ok: r.ok, response: r.json });
    }

    return jsonRes({ error: "Ação inválida" }, 400);
  } catch (e) {
    console.error("asaas-nfse error", e);
    return jsonRes({ error: e instanceof Error ? e.message : "Erro interno" }, 500);
  }
});
