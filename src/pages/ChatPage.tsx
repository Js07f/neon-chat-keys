import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Loader2, Bot, PanelLeftClose, PanelLeft, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { useImageUpload } from "@/modules/chat/hooks/useImageUpload";
import { useChatStream, type ToolEvent } from "@/modules/chat/hooks/useChatStream";
import { useUserSettings } from "@/modules/chat/hooks/useUserSettings";
import { useCustomModes } from "@/modules/chat/hooks/useCustomModes";
import { useIsMobile } from "@/hooks/use-mobile";
import { useWorkspaces } from "@/modules/workspaces/hooks/useWorkspaces";
import { usePersistedConversations } from "@/modules/workspaces/hooks/usePersistedConversations";
import ImageUploader from "@/modules/chat/components/ImageUploader";
import ImagePreviewGrid from "@/modules/chat/components/ImagePreviewGrid";
import MessageBubble from "@/modules/chat/components/MessageBubble";
import ModeSelector from "@/modules/chat/components/ModeSelector";
import SettingsPanel from "@/modules/chat/components/SettingsPanel";
import ChatSidebar from "@/modules/chat/components/ChatSidebar";
import WorkspaceSelector from "@/modules/workspaces/components/WorkspaceSelector";
import ToolIndicator from "@/modules/tools/components/ToolIndicator";
import { DEFAULT_MODES, type ChatMode } from "@/modules/chat/types";
import { useMemory } from "@/modules/chat/hooks/useMemory";
import { useGlobalMemory, shouldInjectMemory, buildMemoryPrompt } from "@/modules/chat/hooks/useGlobalMemory";
import MemoryDashboard from "@/modules/chat/components/MemoryDashboard";
import type { User } from "@supabase/supabase-js";

interface ChatPageProps {
  user: User;
  onLogout: () => void;
}

interface LocalMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  images?: string[];
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export default function ChatPage({ user, onLogout }: ChatPageProps) {
  // Workspaces
  const { workspaces, activeWorkspaceId, setActiveWorkspaceId, createWorkspace, renameWorkspace, deleteWorkspace } =
    useWorkspaces(user.id);

  // Persisted conversations from DB
  const {
    conversations: dbConversations,
    createConversation: dbCreateConversation,
    updateConversation: dbUpdateConversation,
    deleteConversation: dbDeleteConversation,
    saveMessage: dbSaveMessage,
    getMessages: dbGetMessages,
    refreshConversations,
  } = usePersistedConversations(user.id, activeWorkspaceId);

  // Local message state for active conversation
  const [localMessages, setLocalMessages] = useState<LocalMessage[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamPhase, setStreamPhase] = useState<"analyzing" | "generating" | "streaming" | "tool_calling" | null>(null);
  const [toolEvents, setToolEvents] = useState<ToolEvent[]>([]);
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [currentMode, setCurrentMode] = useState<ChatMode>("default");
  const scrollRef = useRef<HTMLDivElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { images, addFiles, addFromClipboard, removeImage, clearImages, getImageUrls, isUploading } = useImageUpload();
  const { stream, abort } = useChatStream();
  const { settings, update: updateSettings } = useUserSettings(user.id);
  const { modes: customModes, create: createMode, update: updateMode, remove: deleteMode } = useCustomModes(user.id);
  const { memories, loading: memoriesLoading, updateMemory, deleteMemory, clearAll: clearMemories, extractMemories } = useMemory(user.id);
  const { memory: globalMemory, updateStyle, addGoal, removeGoal, reset } = useGlobalMemory();

  useEffect(() => {
    if (settings?.default_mode) setCurrentMode(settings.default_mode);
  }, [settings?.default_mode]);

  // Load messages when active conversation changes
  useEffect(() => {
    if (!activeId) {
      setLocalMessages([]);
      return;
    }
    dbGetMessages(activeId).then((msgs) => {
      setLocalMessages(
        msgs.map((m) => ({
          id: m.id,
          role: m.role as "user" | "assistant",
          content: m.content,
          timestamp: m.created_at,
          images: m.images?.length > 0 ? m.images : undefined,
        }))
      );
    });
  }, [activeId, dbGetMessages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [localMessages]);

  useEffect(() => {
    const handler = (e: ClipboardEvent) => addFromClipboard(e);
    document.addEventListener("paste", handler);
    return () => document.removeEventListener("paste", handler);
  }, [addFromClipboard]);

  // Set first conversation as active when workspace loads
  useEffect(() => {
    if (dbConversations.length > 0 && !activeId) {
      setActiveId(dbConversations[0].id);
    }
  }, [dbConversations, activeId]);

  // Reset activeId when workspace changes
  useEffect(() => {
    setActiveId(null);
    setLocalMessages([]);
  }, [activeWorkspaceId]);

  const createConversation = useCallback(async () => {
    const id = await dbCreateConversation("Nova conversa");
    if (id) {
      setActiveId(id);
      setLocalMessages([]);
      setInput("");
    }
  }, [dbCreateConversation]);

  const deleteConversation = useCallback(async (id: string) => {
    await dbDeleteConversation(id);
    if (activeId === id) {
      setActiveId(null);
      setLocalMessages([]);
    }
  }, [dbDeleteConversation, activeId]);

  const togglePin = useCallback(async (id: string) => {
    const conv = dbConversations.find((c) => c.id === id);
    if (conv) await dbUpdateConversation(id, { pinned: !conv.pinned });
  }, [dbConversations, dbUpdateConversation]);

  const getResolvedMode = (): string | undefined => {
    if (currentMode === "default") return undefined;
    return currentMode;
  };

  const getCustomModeId = (): string | undefined => {
    if (DEFAULT_MODES[currentMode]) return undefined;
    return currentMode;
  };

  const sendMessage = async () => {
    if ((!input.trim() && images.length === 0) || streaming || isUploading) return;

    const imageUrls = getImageUrls();
    let currentId = activeId;

    // Create conversation if none active
    if (!currentId) {
      const title = input.trim().slice(0, 40) || "Imagem";
      currentId = await dbCreateConversation(title);
      if (!currentId) return;
      setActiveId(currentId);
    } else if (localMessages.length === 0) {
      await dbUpdateConversation(currentId, { title: input.trim().slice(0, 40) || "Imagem" });
    }

    const userMsg: LocalMessage = {
      id: generateId(),
      role: "user",
      content: input.trim(),
      timestamp: new Date().toISOString(),
      images: imageUrls.length > 0 ? imageUrls : undefined,
    };

    const assistantMsg: LocalMessage = {
      id: generateId(),
      role: "assistant",
      content: "",
      timestamp: new Date().toISOString(),
    };

    // Save user message to DB
    if (activeWorkspaceId) {
      dbSaveMessage({
        user_id: user.id,
        workspace_id: activeWorkspaceId,
        conversation_id: currentId,
        role: "user",
        content: userMsg.content,
        images: imageUrls,
        tool_calls: null,
        tool_results: null,
      });
    }

    const updatedMessages = [...localMessages, userMsg, assistantMsg];
    setLocalMessages(updatedMessages);
    setInput("");
    clearImages();
    setStreaming(true);
    setToolEvents([]);

    const messagesForApi = updatedMessages.slice(0, -1);
    let fullContent = "";

    const userText = input.trim();
    const memoryPrompt = shouldInjectMemory(userText) ? buildMemoryPrompt(globalMemory) : undefined;

    const finalConvoId = currentId;

    await stream({
      messages: messagesForApi.map((m) => ({
        role: m.role,
        content: m.content,
        images: m.images,
      })),
      mode: getResolvedMode(),
      customModeId: getCustomModeId(),
      globalMemoryPrompt: memoryPrompt,
      workspaceId: activeWorkspaceId || undefined,
      enableTools: true,
      accessToken: (await (await import("@/integrations/supabase/client")).supabase.auth.getSession()).data.session?.access_token,
      onPhase: setStreamPhase,
      onToolEvent: (event) => {
        setToolEvents((prev) => [...prev, event]);
      },
      onDelta: (text) => {
        fullContent += text;
        setLocalMessages((prev) => {
          const msgs = [...prev];
          msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], content: fullContent };
          return msgs;
        });
      },
      onDone: () => {
        setStreaming(false);
        setStreamPhase(null);

        // Save assistant message to DB
        if (activeWorkspaceId && finalConvoId) {
          dbSaveMessage({
            user_id: user.id,
            workspace_id: activeWorkspaceId,
            conversation_id: finalConvoId,
            role: "assistant",
            content: fullContent,
            images: [],
            tool_calls: null,
            tool_results: null,
          });
          dbUpdateConversation(finalConvoId, {});
        }

        // Extract memories
        if (localMessages.length >= 2) {
          const lastMsgs = [...localMessages.slice(-5), { role: "user" as const, content: userText }, { role: "assistant" as const, content: fullContent }]
            .slice(-6)
            .map((m) => ({ role: m.role, content: m.content }));
          extractMemories(lastMsgs);
        }
      },
      onError: (error) => {
        setLocalMessages((prev) => {
          const msgs = [...prev];
          msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], content: `❌ Erro: ${error}` };
          return msgs;
        });
        setStreaming(false);
        setStreamPhase(null);
      },
    });
  };

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustTextareaHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, []);

  useEffect(() => {
    adjustTextareaHeight();
  }, [input, adjustTextareaHeight]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
    },
    [addFiles]
  );

  const exportHistory = () => {
    const json = JSON.stringify(dbConversations, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `neonchat-history-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Histórico exportado!" });
  };

  const clearHistory = async () => {
    for (const c of dbConversations) {
      await dbDeleteConversation(c.id);
    }
    setActiveId(null);
    setLocalMessages([]);
    toast({ title: "Histórico limpo" });
  };

  // Adapt persisted conversations to sidebar format
  const sidebarConversations = dbConversations.map((c) => ({
    id: c.id,
    title: c.title,
    messages: [] as any[],
    pinned: c.pinned,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
  }));

  const sidebarContent = (
    <ChatSidebar
      conversations={sidebarConversations}
      activeId={activeId}
      onSelect={(id) => {
        setActiveId(id);
        if (isMobile) setMobileSidebarOpen(false);
      }}
      onCreate={() => {
        createConversation();
        if (isMobile) setMobileSidebarOpen(false);
      }}
      onDelete={deleteConversation}
      onTogglePin={togglePin}
      onExport={exportHistory}
      onClearAll={clearHistory}
      onLogout={onLogout}
    />
  );

  return (
    <div className="flex flex-col min-h-[100dvh] h-[100dvh] overflow-hidden bg-background sm:flex-row">
      {isMobile ? (
        <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
          <SheetContent side="left" className="w-[280px] p-0 bg-sidebar border-border">
            {sidebarContent}
          </SheetContent>
        </Sheet>
      ) : (
        <div
          className={`${sidebarOpen ? "w-72" : "w-0"} transition-all duration-300 overflow-hidden border-r border-border bg-sidebar shrink-0`}
        >
          {sidebarContent}
        </div>
      )}

      <div
        ref={dropRef}
        className="flex-1 flex flex-col min-w-0"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        {/* Header */}
        <div className="min-h-[52px] border-b border-border flex items-center px-3 gap-2 py-2 shrink-0">
          {isMobile ? (
            <Button variant="ghost" size="icon" className="min-h-12 min-w-12" onClick={() => setMobileSidebarOpen(true)}>
              <Menu className="w-5 h-5" />
            </Button>
          ) : (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSidebarOpen(!sidebarOpen)}>
              {sidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
            </Button>
          )}

          <WorkspaceSelector
            workspaces={workspaces}
            activeId={activeWorkspaceId}
            onSelect={setActiveWorkspaceId}
            onCreate={(name) => createWorkspace(name)}
            onRename={renameWorkspace}
            onDelete={deleteWorkspace}
          />

          <div className="flex-1 min-w-0 overflow-x-auto scrollbar-thin">
            <ModeSelector value={currentMode} onChange={setCurrentMode} customModes={customModes} />
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <MemoryDashboard
              memories={memories}
              loading={memoriesLoading}
              onUpdate={updateMemory}
              onDelete={deleteMemory}
              onClearAll={clearMemories}
            />
            <SettingsPanel
              settings={settings}
              customModes={customModes}
              globalMemory={globalMemory}
              onUpdateSettings={updateSettings}
              onCreateMode={createMode}
              onUpdateMode={updateMode}
              onDeleteMode={deleteMode}
              onUpdateStyle={updateStyle}
              onAddGoal={addGoal}
              onRemoveGoal={removeGoal}
              onResetMemory={reset}
            />
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin overscroll-contain">
          <div className="w-full max-w-full md:max-w-3xl md:mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-3 sm:space-y-4">
            {localMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4 text-muted-foreground px-4">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-primary/10 flex items-center justify-center neon-border">
                  <Bot className="w-7 h-7 sm:w-8 sm:h-8 text-primary opacity-60" />
                </div>
                <div className="space-y-2">
                  <p className="text-base sm:text-lg font-medium text-foreground">Como posso ajudar?</p>
                  <p className="text-xs sm:text-sm">Envie uma mensagem ou imagem para começar</p>
                </div>
              </div>
            ) : (
              localMessages.map((msg, idx) => {
                const isLast = idx === localMessages.length - 1;
                return (
                  <div
                    key={msg.id}
                    className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
                    style={{ animationDelay: `${Math.min(idx * 30, 150)}ms` }}
                  >
                    {isLast && msg.role === "assistant" && toolEvents.length > 0 && (
                      <ToolIndicator events={toolEvents} />
                    )}
                    <MessageBubble
                      message={msg}
                      streamPhase={streamPhase}
                      isLast={isLast}
                    />
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Input */}
        <div className="sticky bottom-0 border-t border-border p-2 sm:p-4 bg-background/80 backdrop-blur-lg safe-bottom shrink-0">
          <div className="w-full max-w-full md:max-w-3xl md:mx-auto space-y-2">
            <ImagePreviewGrid images={images} onRemove={removeImage} />
            <div className="flex gap-2 items-end">
              <ImageUploader onFiles={addFiles} disabled={streaming} />
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Digite sua mensagem..."
                className="min-h-[44px] max-h-[200px] resize-none bg-secondary/50 border-border focus:neon-border text-base overflow-y-auto transition-[height] duration-100 scrollbar-thin"
                rows={1}
              />
              <Button
                onClick={sendMessage}
                disabled={(!input.trim() && images.length === 0) || streaming || isUploading}
                size="icon"
                className="min-h-12 min-w-12 shrink-0 neon-glow"
              >
                {streaming ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
