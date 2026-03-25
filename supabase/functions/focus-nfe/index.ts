import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FOCUS_BASE_URL = "https://homologacao.focusnfe.com.br";

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
        const resp = await fetch(`${FOCUS_BASE_URL}/v2/nfse?ref=${ref}`, {
          method: "POST",
          headers: focusHeaders,
          body: JSON.stringify(dados),
        });
        result = await resp.json();
        break;
      }

      case "consultar_nfse": {
        const { ref } = params;
        const resp = await fetch(`${FOCUS_BASE_URL}/v2/nfse/${ref}`, {
          method: "GET",
          headers: focusHeaders,
        });
        result = await resp.json();
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
        const resp = await fetch(`${FOCUS_BASE_URL}/v2/nfe?ref=${ref}`, {
          method: "POST",
          headers: focusHeaders,
          body: JSON.stringify(dados),
        });
        result = await resp.json();
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
