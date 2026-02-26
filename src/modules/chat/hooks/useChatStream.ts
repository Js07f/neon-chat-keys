import { useRef, useCallback } from "react";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

interface StreamMessage {
  role: "user" | "assistant";
  content: string;
  images?: string[];
}

interface StreamOptions {
  messages: StreamMessage[];
  mode?: string;
  customModeId?: string;
  accessToken?: string;
  onDelta: (text: string) => void;
  onPhase: (phase: "analyzing" | "generating" | "streaming") => void;
  onDone: () => void;
  onError: (error: string) => void;
  signal?: AbortSignal;
}

export function useChatStream() {
  const abortRef = useRef<AbortController | null>(null);

  const abort = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  const stream = useCallback(async (opts: StreamOptions) => {
    abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const hasImages = opts.messages.some((m) => m.images && m.images.length > 0);
    if (hasImages) opts.onPhase("analyzing");
    else opts.onPhase("generating");

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      };
      if (opts.accessToken) {
        headers["Authorization"] = `Bearer ${opts.accessToken}`;
      }

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers,
        body: JSON.stringify({
          messages: opts.messages.map((m) => ({
            role: m.role,
            content: m.content,
            images: m.images,
          })),
          mode: opts.mode,
          custom_mode_id: opts.customModeId,
        }),
        signal: controller.signal,
      });

      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data.error || `Erro ${resp.status}`);
      }

      if (!resp.body) throw new Error("Sem corpo na resposta");

      opts.onPhase("streaming");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) opts.onDelta(content);
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      opts.onDone();
    } catch (err: any) {
      if (err.name === "AbortError") return;
      opts.onError(err.message || "Erro desconhecido");
    }
  }, [abort]);

  return { stream, abort };
}
