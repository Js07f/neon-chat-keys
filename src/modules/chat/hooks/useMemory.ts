import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface UserMemory {
  id: string;
  user_id: string;
  category: string;
  content: string;
  importance_score: number;
  pinned: boolean;
  last_updated: string;
  created_at: string;
}

export function useMemory(userId: string | undefined) {
  const [memories, setMemories] = useState<UserMemory[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from("user_memory")
      .select("*")
      .eq("user_id", userId)
      .order("importance_score", { ascending: false })
      .order("last_updated", { ascending: false });
    if (data) setMemories(data as unknown as UserMemory[]);
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetch(); }, [fetch]);

  const updateMemory = useCallback(async (id: string, updates: Partial<Pick<UserMemory, "content" | "category" | "importance_score" | "pinned">>) => {
    await supabase
      .from("user_memory")
      .update({ ...updates, last_updated: new Date().toISOString() })
      .eq("id", id);
    await fetch();
  }, [fetch]);

  const deleteMemory = useCallback(async (id: string) => {
    await supabase.from("user_memory").delete().eq("id", id);
    setMemories((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const clearAll = useCallback(async () => {
    if (!userId) return;
    await supabase.from("user_memory").delete().eq("user_id", userId);
    setMemories([]);
  }, [userId]);

  const extractMemories = useCallback(async (messages: Array<{ role: string; content: string }>) => {
    try {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session) return;

      await window.fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-memory`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ messages }),
      });

      // Refresh memories after extraction
      await fetch();
    } catch (e) {
      console.error("Memory extraction failed:", e);
    }
  }, [fetch]);

  return { memories, loading, updateMemory, deleteMemory, clearAll, extractMemories, refetch: fetch };
}
