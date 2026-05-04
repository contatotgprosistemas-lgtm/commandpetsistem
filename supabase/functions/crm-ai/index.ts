import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

async function callAI(messages: any[]) {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${LOVABLE_API_KEY}` },
    body: JSON.stringify({ model: "google/gemini-2.5-flash", messages }),
  });
  if (res.status === 429) throw new Error("Limite de uso da IA atingido. Tente novamente em alguns minutos.");
  if (res.status === 402) throw new Error("Créditos da IA esgotados. Adicione créditos no workspace.");
  if (!res.ok) throw new Error(`AI error ${res.status}: ${await res.text()}`);
  const j = await res.json();
  return j.choices?.[0]?.message?.content ?? "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: auth } } });
    const { data: claims } = await userClient.auth.getClaims(auth.replace("Bearer ", ""));
    if (!claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { action, conversa_id } = await req.json();
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Multi-tenant guard: ensure caller belongs to the same empresa as the conversation
    const userId = claims.claims.sub;
    const { data: profile } = await admin.from("profiles").select("empresa_id").eq("user_id", userId).maybeSingle();
    const empresaId = profile?.empresa_id;
    if (!empresaId) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { data: conv } = await admin.from("crm_conversas").select("empresa_id").eq("id", conversa_id).maybeSingle();
    if (!conv || conv.empresa_id !== empresaId) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: msgs } = await admin.from("crm_mensagens")
      .select("direcao, conteudo, enviada_em")
      .eq("conversa_id", conversa_id)
      .order("enviada_em", { ascending: true })
      .limit(50);
    const transcript = (msgs ?? []).map((m: any) => `${m.direcao === "entrada" ? "Cliente" : "Atendente"}: ${m.conteudo}`).join("\n");

    if (action === "suggest") {
      const reply = await callAI([
        { role: "system", content: "Você é um atendente comercial cordial e objetivo. Sugira UMA resposta curta (max 2 frases) em português, no tom da conversa, sem emojis exagerados. Responda apenas com o texto da resposta." },
        { role: "user", content: `Conversa:\n${transcript}\n\nSua sugestão de resposta:` },
      ]);
      return new Response(JSON.stringify({ suggestion: reply.trim() }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "summary") {
      const reply = await callAI([
        { role: "system", content: "Resuma a conversa em 3 bullets curtos em português: (1) o que o cliente quer, (2) status atual, (3) próximo passo sugerido." },
        { role: "user", content: transcript },
      ]);
      await admin.from("crm_conversas").update({ resumo_ia: reply }).eq("id", conversa_id);
      return new Response(JSON.stringify({ summary: reply }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Ação inválida" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("crm-ai error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});