import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, signing_token, signer_name, signer_email, signer_document, signer_user_agent, signer_device, signer_latitude, signer_longitude, signature_image, content_hash, acceptance_text } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    if (!signing_token) {
      return new Response(JSON.stringify({ error: "Token obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch contract by exact token match
    const { data: contract, error: fetchErr } = await supabase
      .from("contracts")
      .select("id, title, content, content_hash, status, empresa_id, token_expires_at, signed_at")
      .eq("signing_token", signing_token)
      .single();

    if (fetchErr || !contract) {
      return new Response(JSON.stringify({ error: "Contrato não encontrado ou link inválido" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (contract.token_expires_at && new Date(contract.token_expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "Link de assinatura expirado" }), {
        status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: load contract data
    if (action === "load") {
      // Log view event
      await supabase.from("contract_events").insert({
        contract_id: contract.id,
        empresa_id: contract.empresa_id,
        event_type: "visualizado",
        description: "Contrato visualizado pelo assinante",
        user_agent: signer_user_agent || null,
      });

      return new Response(JSON.stringify({ contract }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: sign
    if (action === "sign") {
      if (contract.status === "assinado") {
        return new Response(JSON.stringify({ error: "Contrato já assinado" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!signer_name?.trim()) {
        return new Response(JSON.stringify({ error: "Nome do assinante obrigatório" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Insert signature
      const { error: sigError } = await supabase.from("contract_signatures").insert({
        contract_id: contract.id,
        empresa_id: contract.empresa_id,
        signer_name: signer_name.trim(),
        signer_email: signer_email?.trim() || null,
        signer_document: signer_document?.trim() || null,
        signer_user_agent: signer_user_agent || null,
        signer_device: signer_device || null,
        signer_latitude: signer_latitude || null,
        signer_longitude: signer_longitude || null,
        signature_image: signature_image || null,
        content_hash: content_hash || "",
        acceptance_text: acceptance_text || "Li e aceito os termos deste contrato",
      });

      if (sigError) {
        return new Response(JSON.stringify({ error: "Erro ao registrar assinatura" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update contract
      await supabase.from("contracts").update({
        status: "assinado",
        signed_at: new Date().toISOString(),
      }).eq("id", contract.id);

      // Log event
      await supabase.from("contract_events").insert({
        contract_id: contract.id,
        empresa_id: contract.empresa_id,
        event_type: "assinado",
        description: `Contrato assinado por ${signer_name.trim()}`,
        user_agent: signer_user_agent || null,
        metadata: {
          signer_name: signer_name.trim(),
          signer_email: signer_email?.trim(),
          device: signer_device,
          content_hash,
        },
      });

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Ação inválida" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
