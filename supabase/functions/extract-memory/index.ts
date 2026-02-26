import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const EXTRACTION_PROMPT = `Você é um extrator de memória estratégica. Analise a conversa abaixo e extraia APENAS fatos persistentes relevantes sobre o usuário que devam ser lembrados no futuro.

Categorias válidas: projeto, stack_tecnologica, objetivo, estilo_aprendizado, preferencia_resposta, perfil_tecnico, geral

Regras:
- Extraia APENAS informações factuais e úteis sobre o USUÁRIO (não sobre a IA)
- Ignore saudações, perguntas genéricas, ou conteúdo efêmero
- Cada memória deve ser uma frase concisa e autocontida
- Atribua importance_score de 1 a 5 (5 = muito importante)
- Se não houver nada relevante para extrair, retorne array vazio
- Máximo 3 memórias por extração

Responda APENAS com JSON válido no formato:
[{"category": "...", "content": "...", "importance_score": N}]`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Get user from auth
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ memories: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey);
    const token = authHeader.replace("Bearer ", "");
    const { data: authData } = await userClient.auth.getUser(token);
    const userId = authData.user?.id;
    if (!userId) {
      return new Response(JSON.stringify({ memories: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build conversation text (last 6 messages only for efficiency)
    const recentMessages = messages.slice(-6);
    const convoText = recentMessages
      .map((m: any) => `${m.role === "user" ? "Usuário" : "Assistente"}: ${m.content}`)
      .join("\n\n");

    // Call AI to extract memories
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: EXTRACTION_PROMPT },
          { role: "user", content: convoText },
        ],
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      console.error("Memory extraction AI error:", response.status);
      return new Response(JSON.stringify({ memories: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResult = await response.json();
    let rawContent = aiResult.choices?.[0]?.message?.content || "[]";

    // Clean markdown code fences if present
    rawContent = rawContent.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

    let extracted: Array<{ category: string; content: string; importance_score: number }> = [];
    try {
      extracted = JSON.parse(rawContent);
    } catch {
      console.error("Failed to parse memory extraction:", rawContent);
      return new Response(JSON.stringify({ memories: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!Array.isArray(extracted) || extracted.length === 0) {
      return new Response(JSON.stringify({ memories: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Store memories using service role client
    const adminClient = createClient(supabaseUrl, serviceKey);

    // Get existing memories for dedup
    const { data: existingMemories } = await adminClient
      .from("user_memory")
      .select("id, content, importance_score, category")
      .eq("user_id", userId);

    const saved: any[] = [];

    for (const mem of extracted.slice(0, 3)) {
      if (!mem.content || !mem.category) continue;

      // Simple dedup: check if similar content exists
      const existing = existingMemories?.find(
        (e) => e.category === mem.category && e.content.toLowerCase().includes(mem.content.toLowerCase().slice(0, 30))
      );

      if (existing) {
        // Update importance if higher
        if (mem.importance_score > existing.importance_score) {
          await adminClient
            .from("user_memory")
            .update({
              importance_score: mem.importance_score,
              last_updated: new Date().toISOString(),
            })
            .eq("id", existing.id);
        }
        continue;
      }

      // Enforce max 100 memories per user
      const count = (existingMemories?.length || 0) + saved.length;
      if (count >= 100) {
        // Delete oldest low-importance non-pinned memory
        const { data: oldest } = await adminClient
          .from("user_memory")
          .select("id")
          .eq("user_id", userId)
          .eq("pinned", false)
          .order("importance_score", { ascending: true })
          .order("last_updated", { ascending: true })
          .limit(1);

        if (oldest?.[0]) {
          await adminClient.from("user_memory").delete().eq("id", oldest[0].id);
        }
      }

      const { data: inserted } = await adminClient
        .from("user_memory")
        .insert({
          user_id: userId,
          category: mem.category,
          content: mem.content,
          importance_score: Math.min(5, Math.max(1, mem.importance_score)),
        })
        .select()
        .single();

      if (inserted) saved.push(inserted);
    }

    return new Response(JSON.stringify({ memories: saved }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("extract-memory error:", e);
    return new Response(JSON.stringify({ memories: [], error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
