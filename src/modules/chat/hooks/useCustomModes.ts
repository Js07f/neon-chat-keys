import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { CustomMode } from "../types";

export function useCustomModes(userId: string | undefined) {
  const [modes, setModes] = useState<CustomMode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    supabase
      .from("custom_modes")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setModes((data as CustomMode[]) || []);
        setLoading(false);
      });
  }, [userId]);

  const create = useCallback(async (name: string, instructions: string) => {
    if (!userId) return;
    const { data } = await supabase
      .from("custom_modes")
      .insert({ user_id: userId, name, instructions })
      .select()
      .single();
    if (data) setModes((prev) => [data as CustomMode, ...prev]);
  }, [userId]);

  const update = useCallback(async (id: string, name: string, instructions: string) => {
    await supabase.from("custom_modes").update({ name, instructions }).eq("id", id);
    setModes((prev) => prev.map((m) => (m.id === id ? { ...m, name, instructions } : m)));
  }, []);

  const remove = useCallback(async (id: string) => {
    await supabase.from("custom_modes").delete().eq("id", id);
    setModes((prev) => prev.filter((m) => m.id !== id));
  }, []);

  return { modes, loading, create, update, remove };
}
