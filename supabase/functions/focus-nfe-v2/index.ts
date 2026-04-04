import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const FOCUS_BASE = {
  homologacao: "https://homologacao.focusnfe.com.br/v2",
  producao: "https://api.focusnfe.com.br/v2",
};

function focusHeaders(token: string) {
  const encoded = btoa(`${token}:`);
  return {
    Authorization: `Basic ${encoded}`,
    "Content-Type": "application/json",
  };
}

function createAuthClient(authHeader: string) {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
}

function createServiceClient() {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
}

async function getFiscalSettings(supabase: any, empresaId: string) {
  const { data, error } = await supabase
    .from("fiscal_settings")
    .select("*")
    .eq("empresa_id", empresaId)
    .maybeSingle();
  if (error) throw new Error("Erro ao buscar configurações fiscais: " + error.message);
  if (!data) throw new Error("Configurações fiscais não encontradas. Configure os dados fiscais primeiro.");
  if (!data.token_focus) throw new Error("Token da Focus NFe não configurado.");
  return data;
}

function getBaseUrl(ambiente: string) {
  return ambiente === "producao" ? FOCUS_BASE.producao : FOCUS_BASE.homologacao;
}

// ---- Actions ----

async function testarConexao(settings: any) {
  const base = getBaseUrl(settings.ambiente);
  
  // Focus NFe doesn't have a health-check endpoint.
  // We query a non-existent ref: 401 = bad token, 404 = token valid (ref not found)
  const testRef = `test-conexao-${Date.now()}`;
  const resp = await fetch(`${base}/v2/nfse/${testRef}`, {
    method: "GET",
    headers: focusHeaders(settings.token_focus),
  });
  const body = await resp.text();
  
  if (resp.status === 401 || resp.status === 403) {
    return { status: resp.status, ok: false, body: "Token inválido ou sem permissão. Verifique o token da Focus NFe." };
  }
  // 404 means the token authenticated but ref doesn't exist — connection works!
  if (resp.status === 404) {
    return { status: 200, ok: true, body: "Conexão OK! Token válido e autenticado." };
  }
  if (resp.status === 200) {
    return { status: 200, ok: true, body: "Conexão OK!" };
  }
  
  return { status: resp.status, ok: false, body: body.substring(0, 500) };
}

async function emitirNfe(supabase: any, settings: any, nfeId: string) {
  // Get NF-e document
  const { data: nfe, error: nfeErr } = await supabase
    .from("nfe_documents")
    .select("*")
    .eq("id", nfeId)
    .single();
  if (nfeErr || !nfe) throw new Error("NF-e não encontrada: " + nfeErr?.message);

  // Get items
  const { data: items, error: itemsErr } = await supabase
    .from("nfe_items")
    .select("*")
    .eq("nfe_id", nfeId)
    .order("numero_item");
  if (itemsErr) throw new Error("Erro ao buscar itens: " + itemsErr.message);
  if (!items || items.length === 0) throw new Error("A NF-e não possui itens.");

  // Build Focus payload
  const payload: any = {
    natureza_operacao: nfe.natureza_operacao || settings.natureza_operacao_padrao,
    data_emissao: nfe.data_emissao ? new Date(nfe.data_emissao).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
    tipo_documento: nfe.tipo_operacao === "0" ? 0 : 1,
    finalidade_emissao: nfe.finalidade_emissao || "1",
    consumidor_final: 1,
    presenca_comprador: 1,
    cnpj_emitente: settings.cnpj?.replace(/\D/g, ""),
    nome_emitente: settings.razao_social,
    nome_fantasia_emitente: settings.nome_fantasia,
    inscricao_estadual_emitente: settings.inscricao_estadual?.replace(/\D/g, ""),
    logradouro_emitente: settings.endereco_logradouro,
    numero_emitente: settings.endereco_numero,
    bairro_emitente: settings.endereco_bairro,
    municipio_emitente: settings.endereco_municipio,
    uf_emitente: settings.endereco_uf,
    cep_emitente: settings.endereco_cep?.replace(/\D/g, ""),
    regime_tributario_emitente: settings.regime_tributario === "simples_nacional" ? 1 : settings.regime_tributario === "lucro_presumido" ? 2 : 3,
  };

  // Destinatário
  if (nfe.dest_cpf_cnpj) {
    const cpfCnpj = nfe.dest_cpf_cnpj.replace(/\D/g, "");
    if (cpfCnpj.length <= 11) {
      payload.cpf_destinatario = cpfCnpj;
    } else {
      payload.cnpj_destinatario = cpfCnpj;
    }
    payload.nome_destinatario = nfe.dest_nome;
    payload.inscricao_estadual_destinatario = nfe.dest_inscricao_estadual?.replace(/\D/g, "") || "";
    payload.telefone_destinatario = nfe.dest_telefone?.replace(/\D/g, "");
    payload.email_destinatario = nfe.dest_email;
    payload.logradouro_destinatario = nfe.dest_logradouro;
    payload.numero_destinatario = nfe.dest_numero;
    payload.complemento_destinatario = nfe.dest_complemento;
    payload.bairro_destinatario = nfe.dest_bairro;
    payload.municipio_destinatario = nfe.dest_municipio;
    payload.uf_destinatario = nfe.dest_uf;
    payload.cep_destinatario = nfe.dest_cep?.replace(/\D/g, "");
    payload.indicador_inscricao_estadual_destinatario = nfe.dest_inscricao_estadual ? 1 : 9;
  }

  // Items
  payload.items = items.map((item: any, idx: number) => ({
    numero_item: idx + 1,
    codigo_produto: item.codigo_produto || String(idx + 1),
    descricao: item.descricao,
    codigo_ncm: item.ncm?.replace(/\D/g, ""),
    cfop: item.cfop?.replace(/\D/g, ""),
    unidade_comercial: item.unidade,
    quantidade_comercial: Number(item.quantidade),
    valor_unitario_comercial: Number(item.valor_unitario),
    valor_bruto: Number(item.valor_total),
    unidade_tributavel: item.unidade,
    quantidade_tributavel: Number(item.quantidade),
    valor_unitario_tributavel: Number(item.valor_unitario),
    origem: item.origem || "0",
    icms_situacao_tributaria: item.cst_csosn,
    icms_aliquota: Number(item.icms_aliquota) || undefined,
    icms_base_calculo: Number(item.icms_base_calculo) || undefined,
    icms_valor: Number(item.icms_valor) || undefined,
    pis_situacao_tributaria: item.pis_cst,
    pis_aliquota_porcentual: Number(item.pis_aliquota) || undefined,
    pis_valor: Number(item.pis_valor) || undefined,
    cofins_situacao_tributaria: item.cofins_cst,
    cofins_aliquota_porcentual: Number(item.cofins_aliquota) || undefined,
    cofins_valor: Number(item.cofins_valor) || undefined,
  }));

  // Informações complementares
  if (nfe.informacoes_complementares) {
    payload.informacoes_adicionais_contribuinte = nfe.informacoes_complementares;
  }

  const base = getBaseUrl(settings.ambiente);
  const ref = nfe.reference;

  console.log("Emitindo NF-e ref:", ref);

  const resp = await fetch(`${base}/nfe?ref=${ref}`, {
    method: "POST",
    headers: focusHeaders(settings.token_focus),
    body: JSON.stringify(payload),
  });

  const result = await resp.json();
  console.log("Focus response:", resp.status, JSON.stringify(result));

  // Update document
  const newStatus = resp.ok ? "processando" : "erro";
  await supabase.from("nfe_documents").update({
    status: newStatus,
    focus_status: result.status || result.status_sefaz,
    focus_code: result.status_sefaz?.toString(),
    focus_message: result.mensagem_sefaz || result.mensagem || JSON.stringify(result),
    payload_sent: payload,
    payload_response: result,
  }).eq("id", nfeId);

  // Register event
  await supabase.from("nfe_events").insert({
    empresa_id: nfe.empresa_id,
    nfe_id: nfeId,
    event_type: "emissao_enviada",
    description: `NF-e enviada para processamento. Status: ${newStatus}`,
    event_code: result.status_sefaz?.toString(),
    event_message: result.mensagem_sefaz || result.mensagem,
    payload: result,
  });

  if (!resp.ok) {
    // Register rejection
    await supabase.from("nfe_rejections").insert({
      empresa_id: nfe.empresa_id,
      nfe_id: nfeId,
      rejection_code: result.erros?.[0]?.codigo || result.status_sefaz?.toString() || "ERRO",
      rejection_message: result.erros?.[0]?.mensagem || result.mensagem_sefaz || result.mensagem || JSON.stringify(result),
    });
  }

  return { status: newStatus, focus: result };
}

async function consultarNfe(supabase: any, settings: any, nfeId: string) {
  const { data: nfe, error } = await supabase
    .from("nfe_documents")
    .select("*")
    .eq("id", nfeId)
    .single();
  if (error || !nfe) throw new Error("NF-e não encontrada");

  // Don't query Focus for drafts - they haven't been sent yet
  if (nfe.status === "rascunho") {
    return { status: "rascunho", focus: { mensagem: "Nota ainda não foi enviada para processamento." } };
  }

  const base = getBaseUrl(settings.ambiente);
  const resp = await fetch(`${base}/v2/nfse/${nfe.reference}`, {
    method: "GET",
    headers: focusHeaders(settings.token_focus),
  });

  const result = await resp.json();
  console.log("Consulta NF-e:", resp.status, JSON.stringify(result));

  let newStatus = nfe.status;
  if (result.status === "autorizado") newStatus = "autorizada";
  else if (result.status === "cancelado") newStatus = "cancelada";
  else if (result.status === "erro_autorizacao") newStatus = "rejeitada";
  else if (result.status === "processando_autorizacao") newStatus = "processando";

  const updateData: any = {
    status: newStatus,
    focus_status: result.status,
    focus_code: result.status_sefaz?.toString(),
    focus_message: result.mensagem_sefaz || result.mensagem,
    payload_response: result,
  };

  if (result.chave_nfe) updateData.chave_nfe = result.chave_nfe;
  if (result.protocolo) updateData.protocolo_autorizacao = result.protocolo;
  if (result.numero) updateData.numero = result.numero?.toString();
  if (result.serie) updateData.serie = result.serie?.toString();
  if (result.caminho_xml_nota_fiscal) updateData.xml_url = result.caminho_xml_nota_fiscal;
  if (result.caminho_danfe) updateData.pdf_url = result.caminho_danfe;

  await supabase.from("nfe_documents").update(updateData).eq("id", nfeId);

  // Event
  await supabase.from("nfe_events").insert({
    empresa_id: nfe.empresa_id,
    nfe_id: nfeId,
    event_type: "consulta_status",
    description: `Status consultado: ${newStatus}`,
    event_code: result.status_sefaz?.toString(),
    event_message: result.mensagem_sefaz || result.mensagem,
    payload: result,
  });

  if (newStatus === "rejeitada") {
    await supabase.from("nfe_rejections").insert({
      empresa_id: nfe.empresa_id,
      nfe_id: nfeId,
      rejection_code: result.status_sefaz?.toString() || "REJEICAO",
      rejection_message: result.mensagem_sefaz || result.mensagem,
    });
  }

  return { status: newStatus, focus: result };
}

async function cancelarNfe(supabase: any, settings: any, nfeId: string, justificativa: string) {
  const { data: nfe, error } = await supabase
    .from("nfe_documents")
    .select("*")
    .eq("id", nfeId)
    .single();
  if (error || !nfe) throw new Error("NF-e não encontrada");
  if (nfe.status !== "autorizada") throw new Error("Só é possível cancelar notas autorizadas");

  const base = getBaseUrl(settings.ambiente);
  const resp = await fetch(`${base}/nfe/${nfe.reference}`, {
    method: "DELETE",
    headers: focusHeaders(settings.token_focus),
    body: JSON.stringify({ justificativa }),
  });

  const result = await resp.json();

  if (resp.ok || result.status === "cancelado") {
    await supabase.from("nfe_documents").update({
      status: "cancelada",
      focus_status: "cancelado",
      focus_message: result.mensagem_sefaz || "Cancelada com sucesso",
      payload_response: result,
    }).eq("id", nfeId);
  }

  await supabase.from("nfe_events").insert({
    empresa_id: nfe.empresa_id,
    nfe_id: nfeId,
    event_type: "cancelamento",
    description: `Cancelamento ${resp.ok ? "realizado" : "falhou"}: ${justificativa}`,
    event_message: result.mensagem_sefaz || result.mensagem,
    payload: result,
  });

  return { success: resp.ok, focus: result };
}

// ---- Webhook handler ----

async function handleWebhook(req: Request) {
  const body = await req.json();
  console.log("Webhook received:", JSON.stringify(body));

  const serviceClient = createServiceClient();

  const ref = body.ref || body.referencia;
  if (!ref) {
    // Log anyway
    await serviceClient.from("nfe_webhook_logs").insert({
      payload: body,
      processed: false,
      error_message: "Referência não encontrada no payload",
    });
    return { ok: true, message: "Referência não encontrada" };
  }

  // Find the document
  const { data: nfe } = await serviceClient
    .from("nfe_documents")
    .select("*")
    .eq("reference", ref)
    .maybeSingle();

  const empresaId = nfe?.empresa_id || null;

  // Log
  await serviceClient.from("nfe_webhook_logs").insert({
    empresa_id: empresaId,
    reference: ref,
    payload: body,
    processed: !!nfe,
    error_message: nfe ? null : "NF-e não encontrada para esta referência",
  });

  if (!nfe) return { ok: true, message: "NF-e não encontrada" };

  // Update status
  let newStatus = nfe.status;
  if (body.status === "autorizado") newStatus = "autorizada";
  else if (body.status === "cancelado") newStatus = "cancelada";
  else if (body.status === "erro_autorizacao") newStatus = "rejeitada";

  const updateData: any = {
    status: newStatus,
    focus_status: body.status,
    focus_code: body.status_sefaz?.toString(),
    focus_message: body.mensagem_sefaz || body.mensagem,
    payload_response: body,
  };

  if (body.chave_nfe) updateData.chave_nfe = body.chave_nfe;
  if (body.protocolo) updateData.protocolo_autorizacao = body.protocolo;
  if (body.numero) updateData.numero = body.numero?.toString();
  if (body.caminho_xml_nota_fiscal) updateData.xml_url = body.caminho_xml_nota_fiscal;
  if (body.caminho_danfe) updateData.pdf_url = body.caminho_danfe;

  await serviceClient.from("nfe_documents").update(updateData).eq("id", nfe.id);

  // Event
  await serviceClient.from("nfe_events").insert({
    empresa_id: nfe.empresa_id,
    nfe_id: nfe.id,
    event_type: "webhook_recebido",
    description: `Webhook: status atualizado para ${newStatus}`,
    event_code: body.status_sefaz?.toString(),
    event_message: body.mensagem_sefaz || body.mensagem,
    payload: body,
  });

  if (newStatus === "rejeitada") {
    await serviceClient.from("nfe_rejections").insert({
      empresa_id: nfe.empresa_id,
      nfe_id: nfe.id,
      rejection_code: body.status_sefaz?.toString(),
      rejection_message: body.mensagem_sefaz || body.mensagem,
    });
  }

  return { ok: true, status: newStatus };
}

// ---- Main handler ----

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname.split("/").pop() || "";

    // Webhook endpoint - no auth required
    if (path === "webhook" || url.searchParams.get("action") === "webhook") {
      const result = await handleWebhook(req);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // All other actions require auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createAuthClient(authHeader);

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = req.method !== "GET" ? await req.json() : {};
    const action = body.action || url.searchParams.get("action");
    const empresaId = body.empresa_id;

    if (!empresaId && action !== "webhook") {
      return new Response(JSON.stringify({ error: "empresa_id obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let result;

    switch (action) {
      case "testar_conexao": {
        const settings = await getFiscalSettings(supabase, empresaId);
        result = await testarConexao(settings);
        break;
      }
      case "emitir": {
        const settings = await getFiscalSettings(supabase, empresaId);
        result = await emitirNfe(supabase, settings, body.nfe_id);
        break;
      }
      case "consultar": {
        const settings = await getFiscalSettings(supabase, empresaId);
        result = await consultarNfe(supabase, settings, body.nfe_id);
        break;
      }
      case "consultar_lote": {
        const settings = await getFiscalSettings(supabase, empresaId);
        const results = [];
        for (const nfeId of (body.nfe_ids || [])) {
          try {
            const r = await consultarNfe(supabase, settings, nfeId);
            results.push({ nfe_id: nfeId, ...r });
          } catch (e: any) {
            results.push({ nfe_id: nfeId, error: e.message });
          }
        }
        result = { results };
        break;
      }
      case "cancelar": {
        const settings = await getFiscalSettings(supabase, empresaId);
        if (!body.justificativa || body.justificativa.length < 15) {
          throw new Error("Justificativa deve ter no mínimo 15 caracteres");
        }
        result = await cancelarNfe(supabase, settings, body.nfe_id, body.justificativa);
        break;
      }
      default:
        return new Response(JSON.stringify({ error: "Ação inválida: " + action }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
