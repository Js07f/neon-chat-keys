import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PersistedConversation {
  id: string;
  user_id: string;
  workspace_id: string;
  title: string;
  pinned: boolean;
  created_at: string;
  updated_at: string;
}

export interface PersistedMessage {
  id: string;
  user_id: string;
  workspace_id: string;
  conversation_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  images: string[];
  tool_calls: any;
  tool_results: any;
  created_at: string;
}

export function usePersistedConversations(userId: string, workspaceId: string | null) {
  const [conversations, setConversations] = useState<PersistedConversation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    const { data } = await supabase
      .from("conversations")
      .select("*")
      .eq("user_id", userId)
      .eq("workspace_id", workspaceId)
      .order("updated_at", { ascending: false });

    setConversations((data as PersistedConversation[]) || []);
    setLoading(false);
  }, [userId, workspaceId]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const createConversation = useCallback(async (title: string): Promise<string | null> => {
    if (!workspaceId) return null;
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2);
    const { error } = await supabase.from("conversations").insert({
      id,
      user_id: userId,
      workspace_id: workspaceId,
      title,
    });
    if (error) {
      console.error("Error creating conversation:", error);
      return null;
    }
    await fetchConversations();
    return id;
  }, [userId, workspaceId, fetchConversations]);

  const updateConversation = useCallback(async (id: string, updates: Partial<Pick<PersistedConversation, "title" | "pinned">>) => {
    await supabase
      .from("conversations")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id);
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates, updated_at: new Date().toISOString() } : c))
    );
  }, []);

  const deleteConversation = useCallback(async (id: string) => {
    await supabase.from("messages").delete().eq("conversation_id", id);
    await supabase.from("conversations").delete().eq("id", id);
    setConversations((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const saveMessage = useCallback(async (msg: Omit<PersistedMessage, "id" | "created_at">) => {
    const { data, error } = await supabase.from("messages").insert(msg).select().single();
    if (error) console.error("Error saving message:", error);
    return data;
  }, []);

  const getMessages = useCallback(async (conversationId: string): Promise<PersistedMessage[]> => {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    return (data as PersistedMessage[]) || [];
  }, []);

  return {
    conversations,
    loading,
    createConversation,
    updateConversation,
    deleteConversation,
    saveMessage,
    getMessages,
    refreshConversations: fetchConversations,
  };
}
