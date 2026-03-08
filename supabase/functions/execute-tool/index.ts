import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Safe math evaluator - no eval()
function evaluateMath(expression: string): string {
  try {
    const sanitized = expression.replace(/\s/g, "");
    if (!/^[\d+\-*/().,%^sqrtpilognabcesifhMx]+$/.test(sanitized) && !/^[0-9+\-*/().^ ]+$/.test(expression)) {
      const safe = expression.replace(/[^0-9+\-*/().^ \n\t]/g, "");
      if (safe !== expression.trim()) {
        return `Expressão não suportada: "${expression}". Use apenas números e operadores básicos (+, -, *, /, ^, ()).`;
      }
    }
    const jsExpr = expression
      .replace(/\^/g, "**")
      .replace(/(\d)(\()/g, "$1*$2");
    const fn = new Function(`"use strict"; return (${jsExpr});`);
    const result = fn();
    if (typeof result !== "number" || !isFinite(result)) {
      return `Resultado inválido para: "${expression}"`;
    }
    return `${expression} = ${result}`;
  } catch (e) {
    return `Erro ao calcular "${expression}": ${e instanceof Error ? e.message : "erro desconhecido"}`;
  }
}

// Web search via secondary AI call
async function webSearch(query: string, apiKey: string): Promise<string> {
  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a web search assistant. When given a search query, provide the most accurate, up-to-date information you can about the topic. Include specific facts, dates, numbers, and sources when possible. Format as a concise research brief. Always respond in the same language as the query.`,
          },
          { role: "user", content: `Search query: "${query}"\n\nProvide comprehensive, factual information about this topic.` },
        ],
        temperature: 0.3,
      }),
    });
    if (!response.ok) {
      const text = await response.text();
      console.error("Web search AI error:", response.status, text);
      return `Erro na busca: ${response.status}`;
    }
    const data = await response.json();
    return data.choices?.[0]?.message?.content || "Sem resultados encontrados.";
  } catch (e) {
    console.error("Web search error:", e);
    return `Erro na busca: ${e instanceof Error ? e.message : "desconhecido"}`;
  }
}

// Image generation via Lovable AI (images/generations endpoint)
async function generateImage(prompt: string, apiKey: string): Promise<string> {
  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        prompt: prompt,
        n: 1,
        size: "1024x1024",
        quality: "hd",
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("Image generation error:", response.status, text);
      return `[Erro ao gerar imagem: ${response.status} - ${text}]`;
    }

    const data = await response.json();
    console.log("Image generation response keys:", Object.keys(data));

    // The response contains data[].url with direct image URLs
    const imageUrl = data.data?.[0]?.url;
    
    if (!imageUrl) {
      console.error("No image URL in response:", JSON.stringify(data).slice(0, 500));
      return `[Não foi possível gerar a imagem]`;
    }

    // If the URL is a direct URL (not base64), return it directly
    if (imageUrl.startsWith("http")) {
      return `IMAGE_URL:${imageUrl}`;
    }

    // If base64, upload to Supabase Storage
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const base64Match = imageUrl.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!base64Match) {
      // Maybe it's raw base64 without prefix
      return `IMAGE_URL:${imageUrl}`;
    }

    const ext = base64Match[1] === "jpeg" ? "jpg" : base64Match[1];
    const base64Content = base64Match[2];
    const binaryStr = atob(base64Content);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    const fileName = `generated/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    
    const { error: uploadError } = await supabase.storage
      .from("chat-images")
      .upload(fileName, bytes, {
        contentType: `image/${base64Match[1]}`,
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return `![Imagem gerada](${imageUrl})`;
    }

    const { data: publicUrlData } = supabase.storage
      .from("chat-images")
      .getPublicUrl(fileName);

    return `IMAGE_URL:${publicUrlData.publicUrl}`;
  } catch (e) {
    console.error("Image generation error:", e);
    return `[Erro ao gerar imagem: ${e instanceof Error ? e.message : "desconhecido"}]`;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tool_name, input } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    let result: string;
    const startTime = Date.now();

    switch (tool_name) {
      case "web_search":
        result = await webSearch(input.query, LOVABLE_API_KEY);
        break;
      case "math":
        result = evaluateMath(input.expression);
        break;
      case "generate_image":
        result = await generateImage(input.prompt, LOVABLE_API_KEY);
        break;
      default:
        result = `Tool "${tool_name}" não encontrada.`;
    }

    const duration_ms = Date.now() - startTime;

    return new Response(
      JSON.stringify({ result, duration_ms }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("execute-tool error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
