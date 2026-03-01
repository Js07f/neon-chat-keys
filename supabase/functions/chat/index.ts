import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GLOBAL_PERSONALITY = `Você é um assistente avançado de alto nível, preciso, elegante e estrategicamente inteligente.
Seu tom é sofisticado, profissional e confiante.
Quando apropriado, pode usar leve espirituosidade sutil.
Explique com clareza, demonstre domínio técnico e evite informalidade excessiva.
Seja objetivo quando necessário e detalhado quando útil.
Priorize precisão, atualidade e raciocínio estruturado.
Use Markdown para formatar suas respostas quando apropriado. Quando o usuário enviar imagens, analise-as detalhadamente.

Evite repetir estruturas idênticas entre respostas consecutivas.
Evite sempre usar listas numeradas — varie entre parágrafos, tópicos, tabelas e texto corrido.
Varie formato, ritmo e construção quando possível.
Não reafirme comportamentos ou preferências previamente demonstrados.`;

const DEFAULT_MODE_INSTRUCTIONS: Record<string, string> = {
  study: "Você está no modo ESTUDO. Explique conceitos de forma pedagógica e estruturada. Use exemplos práticos, analogias e divida informações complexas em partes digestíveis.",
  agent: "Você está no modo AGENTE. Atue de forma proativa e autônoma. Antecipe necessidades, sugira próximos passos, forneça soluções completas e acionáveis. Seja direto e orientado a resultados. Quando necessário, use as ferramentas disponíveis para buscar informações ou resolver cálculos.",
  plan: "Você está no modo PLANEJAMENTO. Ajude a criar planos estruturados, roadmaps e estratégias. Use listas, timelines, marcos e priorização.",
  ask: "Você está no modo PERGUNTAS. Antes de responder, faça perguntas clarificadoras. Explore diferentes ângulos do problema.",
};

const RESPONSE_STYLE_INSTRUCTIONS: Record<string, string> = {
  concise: "Seja extremamente conciso e direto. Respostas curtas e objetivas.",
  balanced: "",
  detailed: "Forneça respostas detalhadas e aprofundadas. Explore nuances, dê exemplos extensos.",
};

const TOOLS_DEFINITION = [
  {
    type: "function",
    function: {
      name: "web_search",
      description: "Busca informações atualizadas na web sobre qualquer tópico.",
      parameters: {
        type: "object",
        properties: { query: { type: "string", description: "A consulta de busca" } },
        required: ["query"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "math",
      description: "Resolve expressões matemáticas com precisão.",
      parameters: {
        type: "object",
        properties: { expression: { type: "string", description: "A expressão matemática" } },
        required: ["expression"],
        additionalProperties: false,
      },
    },
  },
];

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 8192;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    for (let j = 0; j < chunk.length; j++) {
      binary += String.fromCharCode(chunk[j]);
    }
  }
  return btoa(binary);
}

async function urlToBase64DataUri(url: string): Promise<string> {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Failed to fetch image: ${resp.status}`);
  const buf = await resp.arrayBuffer();
  const contentType = resp.headers.get("content-type") || "image/jpeg";
  return `data:${contentType};base64,${arrayBufferToBase64(buf)}`;
}

async function buildContent(text: string, images?: string[]) {
  if (!images || images.length === 0) return text;
  const parts: any[] = [{ type: "text", text }];
  for (const url of images) {
    const dataUri = url.startsWith("data:") ? url : await urlToBase64DataUri(url);
    parts.push({ type: "image_url", image_url: { url: dataUri } });
  }
  return parts;
}

async function fetchUserMemories(supabaseClient: any, userId: string): Promise<string> {
  try {
    const { data: memories } = await supabaseClient
      .from("user_memory")
      .select("content, category, importance_score, pinned")
      .eq("user_id", userId)
      .order("pinned", { ascending: false })
      .order("importance_score", { ascending: false })
      .limit(10);
    if (!memories || memories.length === 0) return "";
    const lines = memories.map((m: any) => `- [${m.category}] ${m.content}`);
    return `Contexto estratégico do usuário (memória de longo prazo):\n${lines.join("\n")}`;
  } catch (e) {
    console.error("Error fetching user memories:", e);
    return "";
  }
}

async function fetchSemanticContext(
  supabaseUrl: string,
  userId: string,
  workspaceId: string | undefined,
  query: string,
  apiKey: string
): Promise<string> {
  if (!workspaceId || !query || query.length < 10) return "";
  try {
    const resp = await fetch(`${supabaseUrl}/functions/v1/embed`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        action: "search",
        text: query,
        user_id: userId,
        workspace_id: workspaceId,
        top_k: 5,
      }),
    });
    if (!resp.ok) return "";
    const data = await resp.json();
    if (!data.results || data.results.length === 0) return "";
    const items = data.results.map((r: any) => `- ${r.content} (score: ${r.score.toFixed(2)})`);
    return `Contexto semântico relevante (memória vetorial):\n${items.join("\n")}`;
  } catch (e) {
    console.error("Semantic search error:", e);
    return "";
  }
}

async function buildSystemPrompt(
  supabaseClient: any,
  userId: string | null,
  mode?: string,
  customModeId?: string
): Promise<{ systemPrompt: string; temperature: number }> {
  let layers = [GLOBAL_PERSONALITY];
  let temperature = 0.7;

  if (userId) {
    try {
      const { data: settings } = await supabaseClient
        .from("user_settings")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (settings) {
        if (settings.personality_prompt) {
          layers.push(`Personalidade adicional do usuário:\n${settings.personality_prompt}`);
        }
        temperature = settings.temperature_preference || 0.7;
        const styleInstr = RESPONSE_STYLE_INSTRUCTIONS[settings.response_style || "balanced"];
        if (styleInstr) layers.push(styleInstr);
      }
    } catch (e) {
      console.error("Error fetching user settings:", e);
    }
    const memoryContext = await fetchUserMemories(supabaseClient, userId);
    if (memoryContext) layers.push(memoryContext);
  }

  if (mode && DEFAULT_MODE_INSTRUCTIONS[mode]) {
    layers.push(DEFAULT_MODE_INSTRUCTIONS[mode]);
  } else if (customModeId && userId) {
    try {
      const { data: customMode } = await supabaseClient
        .from("custom_modes")
        .select("instructions")
        .eq("id", customModeId)
        .eq("user_id", userId)
        .maybeSingle();
      if (customMode?.instructions) {
        layers.push(`Modo personalizado ativo:\n${customMode.instructions}`);
      }
    } catch (e) {
      console.error("Error fetching custom mode:", e);
    }
  }

  // Tool awareness
  layers.push(
    `Você tem acesso a ferramentas que pode usar quando necessário:
- web_search: para buscar informações atualizadas
- math: para resolver expressões matemáticas com precisão
Use as ferramentas quando a pergunta do usuário se beneficiaria de informações externas ou cálculos precisos.`
  );

  return { systemPrompt: layers.join("\n\n"), temperature };
}

async function executeTool(toolName: string, input: any, apiKey: string, supabaseUrl: string): Promise<string> {
  try {
    const resp = await fetch(`${supabaseUrl}/functions/v1/execute-tool`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ tool_name: toolName, input }),
    });
    const data = await resp.json();
    return data.result || data.error || "Sem resultado";
  } catch (e) {
    return `Erro executando tool: ${e instanceof Error ? e.message : "desconhecido"}`;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, mode, custom_mode_id, global_memory_prompt, workspace_id, enable_tools } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let userId: string | null = null;
    const authHeader = req.headers.get("authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      try {
        const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
        const userClient = createClient(supabaseUrl, anonKey);
        const { data } = await userClient.auth.getUser(token);
        userId = data.user?.id || null;
      } catch {}
    }

    const { systemPrompt, temperature } = await buildSystemPrompt(supabaseClient, userId, mode, custom_mode_id);
    const apiMessages: any[] = [{ role: "system", content: systemPrompt }];

    // Semantic context injection
    if (userId && workspace_id && messages.length > 0) {
      const lastUserMsg = [...messages].reverse().find((m: any) => m.role === "user");
      if (lastUserMsg) {
        const semanticCtx = await fetchSemanticContext(supabaseUrl, userId, workspace_id, lastUserMsg.content, LOVABLE_API_KEY);
        if (semanticCtx) apiMessages.push({ role: "system", content: semanticCtx });
      }
    }

    if (global_memory_prompt && typeof global_memory_prompt === "string") {
      apiMessages.push({ role: "system", content: global_memory_prompt });
    }

    for (const m of messages) {
      apiMessages.push({
        role: m.role,
        content: await buildContent(m.content, m.images),
      });
    }

    // First call: check if model wants to use tools (non-streaming)
    if (enable_tools !== false) {
      const toolCheckBody: any = {
        model: "google/gemini-3-flash-preview",
        messages: apiMessages,
        tools: TOOLS_DEFINITION,
        temperature,
      };

      const toolCheckResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(toolCheckBody),
      });

      if (toolCheckResp.ok) {
        const toolCheckData = await toolCheckResp.json();
        const choice = toolCheckData.choices?.[0];
        const toolCalls = choice?.message?.tool_calls;

        if (toolCalls && toolCalls.length > 0) {
          // Execute tools and create follow-up
          const toolResults: any[] = [];
          const sseToolEvents: string[] = [];

          for (const tc of toolCalls) {
            const fnName = tc.function?.name;
            const fnArgs = JSON.parse(tc.function?.arguments || "{}");

            // Send tool execution event
            sseToolEvents.push(
              `data: ${JSON.stringify({ type: "tool_start", tool: fnName, input: fnArgs })}\n\n`
            );

            const result = await executeTool(fnName, fnArgs, LOVABLE_API_KEY, supabaseUrl);
            toolResults.push({ tool_call_id: tc.id, role: "tool", content: result });

            sseToolEvents.push(
              `data: ${JSON.stringify({ type: "tool_end", tool: fnName, output: result.slice(0, 200) })}\n\n`
            );

            // Log tool execution
            if (userId) {
              supabaseClient.from("tool_logs").insert({
                user_id: userId,
                workspace_id: workspace_id || null,
                tool_name: fnName,
                input: fnArgs,
                output: { result: result.slice(0, 1000) },
              }).then(() => {});
            }
          }

          // Second call: stream final response with tool results
          apiMessages.push(choice.message);
          apiMessages.push(...toolResults);

          const finalResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-3-flash-preview",
              messages: apiMessages,
              stream: true,
              temperature,
            }),
          });

          if (!finalResp.ok) {
            const t = await finalResp.text();
            console.error("Final response error:", finalResp.status, t);
            return new Response(
              JSON.stringify({ error: "Erro no gateway de IA" }),
              { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          // Create a combined stream: tool events + AI response
          const toolPrefix = new TextEncoder().encode(sseToolEvents.join(""));
          const aiStream = finalResp.body!;

          const combinedStream = new ReadableStream({
            async start(controller) {
              controller.enqueue(toolPrefix);
              const reader = aiStream.getReader();
              try {
                while (true) {
                  const { done, value } = await reader.read();
                  if (done) break;
                  controller.enqueue(value);
                }
              } finally {
                controller.close();
              }
            },
          });

          return new Response(combinedStream, {
            headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
          });
        }
      }
    }

    // Standard streaming (no tools needed)
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: apiMessages,
        stream: true,
        temperature,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em instantes." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao seu workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "Erro no gateway de IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
