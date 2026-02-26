import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
    // Convert URL to base64 data URI for the AI gateway
    const dataUri = url.startsWith("data:") ? url : await urlToBase64DataUri(url);
    parts.push({ type: "image_url", image_url: { url: dataUri } });
  }
  return parts;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const apiMessages = [
      {
        role: "system",
        content:
          "Você é um assistente de IA útil e amigável. Responda de forma clara e concisa. Use Markdown para formatar suas respostas quando apropriado. Quando o usuário enviar imagens, analise-as detalhadamente.",
      },
    ];

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
