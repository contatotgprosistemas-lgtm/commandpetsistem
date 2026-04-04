import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FOCUS_BASE_URL = "https://homologacao.focusnfe.com.br";

const onlyDigits = (value: unknown) => typeof value === "string" ? value.replace(/\D/g, "") : "";

const normalizeServiceItem = (value: unknown) => {
  if (typeof value !== "string") return "";

  const trimmed = value.trim();
  const digits = onlyDigits(trimmed);

  if (!digits) return trimmed;
  if (trimmed.includes(".")) return trimmed;
  if (digits.length === 4) return `${digits.slice(0, 2)}.${digits.slice(2)}`;

  return trimmed;
};

const normalizeNfsePayload = (rawDados: Record<string, any>) => {
  const dados = JSON.parse(JSON.stringify(rawDados ?? {}));
  const servico = dados?.servico && typeof dados.servico === "object" ? { ...dados.servico } : {};
  const prestador = dados?.prestador && typeof dados.prestador === "object" ? { ...dados.prestador } : {};

  const itemListaServico = normalizeServiceItem(servico.item_lista_servico);
  const itemListaServicoDigits = onlyDigits(itemListaServico);
  const codigoMunicipioPrestacao = onlyDigits(dados?.codigo_municipio_prestacao ?? servico.codigo_municipio ?? prestador.codigo_municipio);
  const codigoTributacaoNacional = onlyDigits(
    servico.codigo_tributacao_nacional_iss ?? dados?.codigo_tributacao_nacional_iss ?? servico.codigo_tributacao_nacional,
  ) || (itemListaServicoDigits === "0508" ? "050801" : "");
  const codigoTributarioMunicipio = onlyDigits(servico.codigo_tributario_municipio ?? servico.codigo_servico_municipio);
  const shouldSendMunicipalTaxCode = Boolean(codigoTributarioMunicipio && codigoTributarioMunicipio !== itemListaServicoDigits);

  if (itemListaServico) servico.item_lista_servico = itemListaServico;
  if (codigoMunicipioPrestacao) servico.codigo_municipio = codigoMunicipioPrestacao;
  if (codigoTributacaoNacional) servico.codigo_tributacao_nacional_iss = codigoTributacaoNacional;
  if (shouldSendMunicipalTaxCode) servico.codigo_tributario_municipio = codigoTributarioMunicipio;
  else delete servico.codigo_tributario_municipio;

  if (codigoMunicipioPrestacao) prestador.codigo_municipio = codigoMunicipioPrestacao;

  delete servico.codigo_tributacao_nacional;
  delete servico.codigo_servico_municipio;

  const normalized = {
    ...dados,
    prestador,
    servico,
  };

  if (codigoMunicipioPrestacao) normalized.codigo_municipio_prestacao = codigoMunicipioPrestacao;
  if (codigoTributacaoNacional) normalized.codigo_tributacao_nacional_iss = codigoTributacaoNacional;
  if (servico.discriminacao) normalized.descricao_servico = servico.discriminacao;
  if (servico.valor_servicos !== undefined) normalized.valor_servico = servico.valor_servicos;

  return normalized;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const FOCUS_TOKEN = Deno.env.get("FOCUS_NFE_API_TOKEN");
    if (!FOCUS_TOKEN) {
      throw new Error("FOCUS_NFE_API_TOKEN not configured");
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify user auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action, ...params } = body;

    const authBase64 = btoa(`${FOCUS_TOKEN}:`);
    const focusHeaders: Record<string, string> = {
      Authorization: `Basic ${authBase64}`,
      "Content-Type": "application/json",
    };

    let result: unknown;

    switch (action) {
      // ===== NFS-e =====
      case "emitir_nfse": {
        const { ref, dados } = params;
        const normalizedDados = normalizeNfsePayload(dados as Record<string, any>);
        console.log("Emitindo NFS-e ref:", ref, "dados:", JSON.stringify(normalizedDados));
        const resp = await fetch(`${FOCUS_BASE_URL}/v2/nfse?ref=${ref}`, {
          method: "POST",
          headers: focusHeaders,
          body: JSON.stringify(normalizedDados),
        });
        const respText = await resp.text();
        console.log("Focus NFS-e response status:", resp.status, "body:", respText);
        try {
          result = JSON.parse(respText);
        } catch {
          result = { error: respText, status_code: resp.status };
        }
        if (!resp.ok) {
          (result as any)._http_status = resp.status;
        }
        break;
      }

      case "consultar_nfse": {
        const { ref } = params;
        const resp = await fetch(`${FOCUS_BASE_URL}/v2/nfse/${ref}`, {
          method: "GET",
          headers: focusHeaders,
        });
        const respText = await resp.text();
        console.log("Focus consulta NFS-e response status:", resp.status, "body:", respText);
        try {
          result = JSON.parse(respText);
        } catch {
          result = { error: respText, status_code: resp.status };
        }
        if (!resp.ok) {
          (result as any)._http_status = resp.status;
        }
        break;
      }

      case "cancelar_nfse": {
        const { ref, justificativa } = params;
        const resp = await fetch(`${FOCUS_BASE_URL}/v2/nfse/${ref}`, {
          method: "DELETE",
          headers: focusHeaders,
          body: JSON.stringify({ justificativa }),
        });
        result = await resp.json();
        break;
      }

      // ===== NF-e =====
      case "emitir_nfe": {
        const { ref, dados } = params;
        console.log("Emitindo NF-e ref:", ref, "dados:", JSON.stringify(dados));
        const resp = await fetch(`${FOCUS_BASE_URL}/v2/nfe?ref=${ref}`, {
          method: "POST",
          headers: focusHeaders,
          body: JSON.stringify(dados),
        });
        const nfeRespText = await resp.text();
        console.log("Focus NF-e response status:", resp.status, "body:", nfeRespText);
        try {
          result = JSON.parse(nfeRespText);
        } catch {
          result = { error: nfeRespText, status_code: resp.status };
        }
        if (!resp.ok) {
          (result as any)._http_status = resp.status;
        }
        break;
      }

      case "consultar_nfe": {
        const { ref } = params;
        const resp = await fetch(`${FOCUS_BASE_URL}/v2/nfe/${ref}`, {
          method: "GET",
          headers: focusHeaders,
        });
        result = await resp.json();
        break;
      }

      case "cancelar_nfe": {
        const { ref, justificativa } = params;
        const resp = await fetch(`${FOCUS_BASE_URL}/v2/nfe/${ref}`, {
          method: "DELETE",
          headers: focusHeaders,
          body: JSON.stringify({ justificativa }),
        });
        result = await resp.json();
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: `Ação desconhecida: ${action}` }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Focus NFe error:", error);
    const msg = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
