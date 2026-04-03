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
    const {
      action, signing_token, signer_name, signer_email, signer_document,
      signer_user_agent, signer_device, signer_latitude, signer_longitude,
      signature_image, content_hash, acceptance_text, signer_type,
    } = await req.json();

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

    // Action: load contract data - also return existing signatures info
    if (action === "load") {
      // Check existing signatures
      const { data: existingSigs } = await supabase
        .from("contract_signatures")
        .select("signer_type, signer_name, signed_at")
        .eq("contract_id", contract.id);

      const signatures = {
        cliente: existingSigs?.find((s: any) => s.signer_type === "cliente") || null,
        empresa: existingSigs?.find((s: any) => s.signer_type === "empresa") || null,
      };

      // Log view event
      await supabase.from("contract_events").insert({
        contract_id: contract.id,
        empresa_id: contract.empresa_id,
        event_type: "visualizado",
        description: "Contrato visualizado pelo assinante",
        user_agent: signer_user_agent || null,
      });

      return new Response(JSON.stringify({ contract, signatures }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: sign
    if (action === "sign") {
      const type = signer_type === "empresa" ? "empresa" : "cliente";

      // Check if this type already signed
      const { data: existingSig } = await supabase
        .from("contract_signatures")
        .select("id")
        .eq("contract_id", contract.id)
        .eq("signer_type", type)
        .maybeSingle();

      if (existingSig) {
        return new Response(JSON.stringify({ error: `Este contrato já foi assinado pela parte ${type === "empresa" ? "da empresa" : "do cliente"}` }), {
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
        signer_type: type,
      });

      if (sigError) {
        return new Response(JSON.stringify({ error: "Erro ao registrar assinatura" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if both parties have now signed
      const { data: allSigs } = await supabase
        .from("contract_signatures")
        .select("signer_type")
        .eq("contract_id", contract.id);

      const types = allSigs?.map((s: any) => s.signer_type) || [];
      const hasCliente = types.includes("cliente");
      const hasEmpresa = types.includes("empresa");
      const bothSigned = hasCliente && hasEmpresa;

      // Update contract status
      const newStatus = bothSigned ? "assinado" : "assinado_parcial";
      await supabase.from("contracts").update({
        status: newStatus,
        signed_at: bothSigned ? new Date().toISOString() : null,
      }).eq("id", contract.id);

      // Log event
      const signerLabel = type === "empresa" ? "empresa" : "cliente";
      await supabase.from("contract_events").insert({
        contract_id: contract.id,
        empresa_id: contract.empresa_id,
        event_type: bothSigned ? "assinado" : "assinado_parcial",
        description: bothSigned
          ? `Contrato concluído — ambas as partes assinaram. Última assinatura: ${signer_name.trim()} (${signerLabel})`
          : `Contrato assinado parcialmente por ${signer_name.trim()} (${signerLabel})`,
        user_agent: signer_user_agent || null,
        metadata: {
          signer_name: signer_name.trim(),
          signer_email: signer_email?.trim(),
          signer_type: type,
          device: signer_device,
          content_hash,
          both_signed: bothSigned,
        },
      });

      return new Response(JSON.stringify({ success: true, both_signed: bothSigned }), {
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
