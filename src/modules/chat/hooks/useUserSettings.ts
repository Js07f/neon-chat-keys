import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { UserSettings, ResponseStyle } from "../types";

const DEFAULT_SETTINGS: Omit<UserSettings, "user_id"> = {
  personality_prompt: null,
  default_mode: "default",
  temperature_preference: 0.7,
  response_style: "balanced",
};

export function useUserSettings(userId: string | undefined) {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }

    const load = async () => {
      const { data } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (data) {
        setSettings(data as UserSettings);
      } else {
        // Create default settings
        const newSettings = { user_id: userId, ...DEFAULT_SETTINGS };
        await supabase.from("user_settings").insert(newSettings);
        setSettings(newSettings as UserSettings);
      }
      setLoading(false);
    };
    load();
  }, [userId]);

  const update = useCallback(async (updates: Partial<Omit<UserSettings, "user_id">>) => {
    if (!userId) return;
    const updated = { ...settings!, ...updates, updated_at: new Date().toISOString() };
    setSettings(updated);
    await supabase
      .from("user_settings")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("user_id", userId);
  }, [userId, settings]);

  return { settings, loading, update };
}
