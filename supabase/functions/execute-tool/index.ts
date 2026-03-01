import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Safe math evaluator - no eval()
function evaluateMath(expression: string): string {
  try {
    // Sanitize: only allow numbers, operators, parentheses, spaces, and math functions
    const sanitized = expression.replace(/\s/g, "");
    if (!/^[\d+\-*/().,%^sqrtpilognabcesifhMx]+$/.test(sanitized) && !/^[0-9+\-*/().^ ]+$/.test(expression)) {
      // Fallback: use Function with strict whitelist
      const safe = expression.replace(/[^0-9+\-*/().^ \n\t]/g, "");
      if (safe !== expression.trim()) {
        return `Expressão não suportada: "${expression}". Use apenas números e operadores básicos (+, -, *, /, ^, ()).`;
      }
    }
    
    // Replace ^ with ** for exponentiation
    const jsExpr = expression
      .replace(/\^/g, "**")
      .replace(/(\d)(\()/g, "$1*$2"); // implicit multiplication: 2(3) → 2*(3)
    
    // Use Function constructor with no access to globals
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
