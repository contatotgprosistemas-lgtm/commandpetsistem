import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { contract_id } = await req.json();
    if (!contract_id) {
      return new Response(JSON.stringify({ error: "contract_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get contract
    const { data: contract, error: cErr } = await supabase
      .from("contracts")
      .select("*, cliente:clientes(nome, cpf, email, endereco)")
      .eq("id", contract_id)
      .single();

    if (cErr || !contract) {
      return new Response(JSON.stringify({ error: "Contract not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get signature
    const { data: signatures } = await supabase
      .from("contract_signatures")
      .select("*")
      .eq("contract_id", contract_id)
      .order("signed_at", { ascending: false })
      .limit(1);

    const sig = signatures?.[0];

    // Get events
    const { data: events } = await supabase
      .from("contract_events")
      .select("*")
      .eq("contract_id", contract_id)
      .order("created_at", { ascending: true });

    // Build PDF text content (plain text for now, could use a PDF library)
    const lines = [
      "═══════════════════════════════════════════════════",
      "           CONTRATO DIGITAL COM ASSINATURA ELETRÔNICA",
      "═══════════════════════════════════════════════════",
      "",
      `ID do Contrato: ${contract.id}`,
      `Título: ${contract.title}`,
      `Data de Criação: ${new Date(contract.created_at).toLocaleString("pt-BR")}`,
      `Status: ${contract.status.toUpperCase()}`,
      "",
      "───────────────────────────────────────────────────",
      "                    CONTEÚDO DO CONTRATO",
      "───────────────────────────────────────────────────",
      "",
      contract.content,
      "",
    ];

    if (sig) {
      lines.push(
        "───────────────────────────────────────────────────",
        "              EVIDÊNCIAS DA ASSINATURA",
        "───────────────────────────────────────────────────",
        "",
        `Assinante: ${sig.signer_name}`,
        `CPF: ${sig.signer_document || "Não informado"}`,
        `E-mail: ${sig.signer_email || "Não informado"}`,
        `Data/Hora: ${new Date(sig.signed_at).toLocaleString("pt-BR")}`,
        `IP: ${sig.signer_ip || "Não capturado"}`,
        `User Agent: ${sig.signer_user_agent || "—"}`,
        `Dispositivo: ${sig.signer_device || "—"}`,
        `Geolocalização: ${sig.signer_latitude && sig.signer_longitude ? `${sig.signer_latitude}, ${sig.signer_longitude}` : "Não autorizada"}`,
        `Texto de aceite: "${sig.acceptance_text}"`,
        "",
        `Hash SHA-256 do conteúdo: ${sig.content_hash}`,
        "",
      );
    }

    if (events && events.length > 0) {
      lines.push(
        "───────────────────────────────────────────────────",
        "                  TRILHA DE AUDITORIA",
        "───────────────────────────────────────────────────",
        "",
      );
      for (const evt of events) {
        lines.push(
          `[${new Date(evt.created_at).toLocaleString("pt-BR")}] ${evt.event_type.toUpperCase()} - ${evt.description || ""}`,
          evt.ip_address ? `  IP: ${evt.ip_address}` : "",
          evt.user_agent ? `  UA: ${evt.user_agent.slice(0, 80)}` : "",
        );
      }
    }

    lines.push(
      "",
      "═══════════════════════════════════════════════════",
      "Documento gerado automaticamente.",
      "Assinatura eletrônica com validade jurídica conforme MP 2.200-2/2001.",
      `Hash do documento: ${contract.content_hash || "N/A"}`,
      "═══════════════════════════════════════════════════",
    );

    const textContent = lines.filter(l => l !== undefined).join("\n");

    return new Response(textContent, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="contrato-${contract.id.slice(0, 8)}.txt"`,
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
