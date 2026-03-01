import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Workspace {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

export function useWorkspaces(userId: string) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchWorkspaces = useCallback(async () => {
    const { data, error } = await supabase
      .from("workspaces")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching workspaces:", error);
      return;
    }

    if (data && data.length > 0) {
      setWorkspaces(data as Workspace[]);
      if (!activeWorkspaceId) setActiveWorkspaceId(data[0].id);
    } else {
      // Auto-create default workspace
      const { data: newWs, error: createError } = await supabase
        .from("workspaces")
        .insert({ user_id: userId, name: "Workspace Padrão" })
        .select()
        .single();

      if (!createError && newWs) {
        setWorkspaces([newWs as Workspace]);
        setActiveWorkspaceId(newWs.id);
      }
    }
    setLoading(false);
  }, [userId, activeWorkspaceId]);

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  const createWorkspace = useCallback(async (name: string) => {
    const { data, error } = await supabase
      .from("workspaces")
      .insert({ user_id: userId, name })
      .select()
      .single();

    if (!error && data) {
      setWorkspaces((prev) => [...prev, data as Workspace]);
      setActiveWorkspaceId(data.id);
    }
    return data;
  }, [userId]);

  const renameWorkspace = useCallback(async (id: string, name: string) => {
    await supabase.from("workspaces").update({ name }).eq("id", id);
    setWorkspaces((prev) => prev.map((w) => (w.id === id ? { ...w, name } : w)));
  }, []);

  const deleteWorkspace = useCallback(async (id: string) => {
    if (workspaces.length <= 1) return; // Don't delete last workspace
    await supabase.from("workspaces").delete().eq("id", id);
    setWorkspaces((prev) => {
      const filtered = prev.filter((w) => w.id !== id);
      if (activeWorkspaceId === id && filtered.length > 0) {
        setActiveWorkspaceId(filtered[0].id);
      }
      return filtered;
    });
  }, [workspaces.length, activeWorkspaceId]);

  return {
    workspaces,
    activeWorkspaceId,
    setActiveWorkspaceId,
    loading,
    createWorkspace,
    renameWorkspace,
    deleteWorkspace,
  };
}
