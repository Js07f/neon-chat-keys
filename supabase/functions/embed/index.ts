import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Generate a simple embedding using Lovable AI (text → float array via hashing)
// Since we don't have a dedicated embedding model, we generate a lightweight semantic fingerprint
async function generateEmbedding(text: string, apiKey: string): Promise<number[]> {
  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: `You are an embedding generator. Given text, output ONLY a JSON array of exactly 64 floating-point numbers between -1 and 1 that represent the semantic meaning of the text. The numbers should capture the topic, intent, sentiment, and key concepts. Output ONLY the JSON array, nothing else.`,
          },
          { role: "user", content: text.slice(0, 500) },
        ],
        temperature: 0,
      }),
    });

    if (!response.ok) {
      console.error("Embedding generation failed:", response.status);
      return [];
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    // Extract JSON array from response
    const match = content.match(/\[[\s\S]*?\]/);
    if (!match) return [];
    
    const parsed = JSON.parse(match[0]);
    if (!Array.isArray(parsed) || parsed.length < 10) return [];
    
    return parsed.map((n: any) => typeof n === "number" ? Math.max(-1, Math.min(1, n)) : 0);
  } catch (e) {
    console.error("Embedding error:", e);
    return [];
  }
}

// Cosine similarity between two arrays
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, text, user_id, workspace_id, top_k } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (action === "generate") {
      const embedding = await generateEmbedding(text, LOVABLE_API_KEY);
      return new Response(
        JSON.stringify({ embedding }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "search") {
      // Generate query embedding
      const queryEmbedding = await generateEmbedding(text, LOVABLE_API_KEY);
      if (queryEmbedding.length === 0) {
        return new Response(
          JSON.stringify({ results: [] }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Fetch messages with embeddings for this workspace
      const { data: messages } = await supabase
        .from("messages")
        .select("id, content, role, embedding, created_at")
        .eq("user_id", user_id)
        .eq("workspace_id", workspace_id)
        .not("embedding", "is", null)
        .order("created_at", { ascending: false })
        .limit(200);

      // Also fetch long-term memory
      const { data: ltMemories } = await supabase
        .from("long_term_memory")
        .select("id, content, embedding, relevance_score, category")
        .eq("user_id", user_id)
        .not("embedding", "is", null);

      // Score all items
      type ScoredItem = { content: string; score: number; source: string };
      const scored: ScoredItem[] = [];

      for (const msg of messages || []) {
        if (!msg.embedding) continue;
        const emb = typeof msg.embedding === "string" ? JSON.parse(msg.embedding) : msg.embedding;
        const score = cosineSimilarity(queryEmbedding, emb);
        if (score > 0.3) {
          scored.push({ content: `[${msg.role}] ${msg.content}`, score, source: "message" });
        }
      }

      for (const mem of ltMemories || []) {
        if (!mem.embedding) continue;
        const emb = typeof mem.embedding === "string" ? JSON.parse(mem.embedding) : mem.embedding;
        const score = cosineSimilarity(queryEmbedding, emb) * (1 + (mem.relevance_score || 0.5) * 0.3);
        if (score > 0.3) {
          scored.push({ content: `[${mem.category}] ${mem.content}`, score, source: "long_term" });
        }
      }

      // Sort by score and return top-k
      scored.sort((a, b) => b.score - a.score);
      const results = scored.slice(0, top_k || 5);

      return new Response(
        JSON.stringify({ results }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action. Use 'generate' or 'search'." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("embed error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
