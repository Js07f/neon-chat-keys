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
Use Markdown para formatar suas respostas quando apropriado. Quando o usuário enviar imagens, analise-as detalhadamente.`;

const DEFAULT_MODE_INSTRUCTIONS: Record<string, string> = {
  study:
    "Você está no modo ESTUDO. Explique conceitos de forma pedagógica e estruturada. Use exemplos práticos, analogias e divida informações complexas em partes digestíveis. Sugira recursos adicionais e exercícios quando relevante.",
  agent:
    "Você está no modo AGENTE. Atue de forma proativa e autônoma. Antecipe necessidades, sugira próximos passos, forneça soluções completas e acionáveis. Seja direto e orientado a resultados.",
  plan:
    "Você está no modo PLANEJAMENTO. Ajude a criar planos estruturados, roadmaps e estratégias. Use listas, timelines, marcos e priorização. Considere riscos, dependências e recursos.",
  ask:
    "Você está no modo PERGUNTAS. Antes de responder, faça perguntas clarificadoras para entender melhor o contexto. Explore diferentes ângulos do problema. Use o método socrático quando apropriado.",
};

const RESPONSE_STYLE_INSTRUCTIONS: Record<string, string> = {
  concise: "Seja extremamente conciso e direto. Respostas curtas e objetivas.",
  balanced: "",
  detailed: "Forneça respostas detalhadas e aprofundadas. Explore nuances, dê exemplos extensos e cubra todos os aspectos relevantes.",
};

async function urlToBase64DataUri(url: string): Promise<string> {
  try {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`Failed to fetch image: ${resp.status}`);
    const buf = await resp.arrayBuffer();
    const contentType = resp.headers.get("content-type") || "image/jpeg";
    const base64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
    return `data:${contentType};base64,${base64}`;
  } catch (e) {
    console.error("Failed to convert image URL to base64:", url, e);
    throw e;
  }
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

async function buildSystemPrompt(
  supabaseClient: any,
  userId: string | null,
  mode?: string,
  customModeId?: string
): Promise<{ systemPrompt: string; temperature: number }> {
  let layers = [GLOBAL_PERSONALITY];
  let temperature = 0.7;

  // Layer 2: User custom personality + settings
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
  }

  // Layer 3: Mode instructions
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

  return { systemPrompt: layers.join("\n\n"), temperature };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, mode, custom_mode_id } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Extract user from auth header
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

    const { systemPrompt, temperature } = await buildSystemPrompt(
      supabaseClient, userId, mode, custom_mode_id
    );

    const apiMessages: any[] = [{ role: "system", content: systemPrompt }];

    for (const m of messages) {
      apiMessages.push({
        role: m.role,
        content: await buildContent(m.content, m.images),
      });
    }

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
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
      }
    );

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
