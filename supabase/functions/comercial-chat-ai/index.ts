// AI assistant for Comercial conversations: suggest replies, summarize, sentiment
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type Mode = "suggest" | "summarize" | "sentiment";
type Msg = { from: "me" | "them"; text: string };

const SYSTEM: Record<Mode, string> = {
  suggest:
    "Você é um assistente comercial brasileiro especialista em vendas via WhatsApp. Gere 3 sugestões de resposta curtas, profissionais e adequadas ao tom da conversa para o ATENDENTE enviar ao CLIENTE. As sugestões devem ser variadas (uma empática, uma direta, uma com call-to-action).",
  summarize:
    "Você é um analista de atendimento. Resuma a conversa em 2-3 frases curtas em português, destacando: o que o cliente quer, estágio atual e próximo passo recomendado.",
  sentiment:
    "Você é um analisador de sentimento. Classifique sentimento (positive/neutral/negative), intent (pricing/support/demo/complaint/info/other), urgency (low/medium/high) e dê uma justificativa breve em PT-BR.",
};

const TOOLS: Record<Mode, any> = {
  suggest: {
    type: "function",
    function: {
      name: "reply_suggestions",
      description: "3 sugestões de resposta para o atendente.",
      parameters: {
        type: "object",
        properties: {
          suggestions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                tone: { type: "string", enum: ["empático", "direto", "cta"] },
                text: { type: "string" },
              },
              required: ["tone", "text"],
              additionalProperties: false,
            },
            minItems: 3,
            maxItems: 3,
          },
        },
        required: ["suggestions"],
        additionalProperties: false,
      },
    },
  },
  summarize: {
    type: "function",
    function: {
      name: "conversation_summary",
      parameters: {
        type: "object",
        properties: {
          summary: { type: "string" },
          next_step: { type: "string" },
        },
        required: ["summary", "next_step"],
        additionalProperties: false,
      },
    },
  },
  sentiment: {
    type: "function",
    function: {
      name: "sentiment_analysis",
      parameters: {
        type: "object",
        properties: {
          sentiment: { type: "string", enum: ["positive", "neutral", "negative"] },
          intent: { type: "string", enum: ["pricing", "support", "demo", "complaint", "info", "other"] },
          urgency: { type: "string", enum: ["low", "medium", "high"] },
          rationale: { type: "string" },
        },
        required: ["sentiment", "intent", "urgency", "rationale"],
        additionalProperties: false,
      },
    },
  },
};

function transcript(messages: Msg[]) {
  return messages
    .map((m) => `${m.from === "me" ? "ATENDENTE" : "CLIENTE"}: ${m.text}`)
    .join("\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { mode, messages } = (await req.json()) as { mode: Mode; messages: Msg[] };
    if (!mode || !TOOLS[mode]) {
      return new Response(JSON.stringify({ error: "Invalid mode" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const userPrompt = `Conversa até o momento:\n${transcript(messages ?? [])}`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM[mode] },
          { role: "user", content: userPrompt },
        ],
        tools: [TOOLS[mode]],
        tool_choice: { type: "function", function: { name: TOOLS[mode].function.name } },
      }),
    });

    if (!resp.ok) {
      if (resp.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições atingido. Tente novamente em instantes." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (resp.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos esgotados. Adicione créditos em Configurações." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("AI gateway error:", resp.status, await resp.text());
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const call = data.choices?.[0]?.message?.tool_calls?.[0];
    const args = call?.function?.arguments ? JSON.parse(call.function.arguments) : null;

    return new Response(JSON.stringify({ mode, result: args }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("comercial-chat-ai error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});