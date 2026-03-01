import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Loader2, Bot, PanelLeftClose, PanelLeft, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { storage, type Conversation, type ChatMessage } from "@/lib/storage";
import { useToast } from "@/hooks/use-toast";
import { useImageUpload } from "@/modules/chat/hooks/useImageUpload";
import { useChatStream } from "@/modules/chat/hooks/useChatStream";
import { useUserSettings } from "@/modules/chat/hooks/useUserSettings";
import { useCustomModes } from "@/modules/chat/hooks/useCustomModes";
import { useIsMobile } from "@/hooks/use-mobile";
import ImageUploader from "@/modules/chat/components/ImageUploader";
import ImagePreviewGrid from "@/modules/chat/components/ImagePreviewGrid";
import MessageBubble from "@/modules/chat/components/MessageBubble";
import ModeSelector from "@/modules/chat/components/ModeSelector";
import SettingsPanel from "@/modules/chat/components/SettingsPanel";
import ChatSidebar from "@/modules/chat/components/ChatSidebar";
import { DEFAULT_MODES, type ChatMode } from "@/modules/chat/types";
import { useMemory } from "@/modules/chat/hooks/useMemory";
import { useGlobalMemory, shouldInjectMemory, buildMemoryPrompt } from "@/modules/chat/hooks/useGlobalMemory";
import MemoryDashboard from "@/modules/chat/components/MemoryDashboard";
import type { User } from "@supabase/supabase-js";

interface ChatPageProps {
  user: User;
  onLogout: () => void;
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export default function ChatPage({ user, onLogout }: ChatPageProps) {
  const [conversations, setConversations] = useState<Conversation[]>(storage.getConversations());
  const [activeId, setActiveId] = useState<string | null>(conversations[0]?.id || null);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamPhase, setStreamPhase] = useState<"analyzing" | "generating" | "streaming" | null>(null);
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

  const activeConvo = conversations.find((c) => c.id === activeId) || null;

  useEffect(() => {
    if (settings?.default_mode) setCurrentMode(settings.default_mode);
  }, [settings?.default_mode]);

  useEffect(() => {
    storage.saveConversations(conversations);
  }, [conversations]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [activeConvo?.messages]);

  useEffect(() => {
    const handler = (e: ClipboardEvent) => addFromClipboard(e);
    document.addEventListener("paste", handler);
    return () => document.removeEventListener("paste", handler);
  }, [addFromClipboard]);

  const createConversation = useCallback(() => {
    const newConvo: Conversation = {
      id: generateId(),
      title: "Nova conversa",
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setConversations((prev) => [newConvo, ...prev]);
    setActiveId(newConvo.id);
    setInput("");
  }, []);

  const deleteConversation = useCallback((id: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== id));
    setActiveId((current) => (current === id ? null : current));
  }, []);

  const togglePin = useCallback((id: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, pinned: !c.pinned } : c))
    );
  }, []);

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
    let updatedConversations = [...conversations];

    if (!currentId) {
      const newConvo: Conversation = {
        id: generateId(),
        title: input.trim().slice(0, 40) || "Imagem",
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      updatedConversations = [newConvo, ...updatedConversations];
      currentId = newConvo.id;
    }

    const userMsg: ChatMessage = {
      id: generateId(),
      role: "user",
      content: input.trim(),
      timestamp: new Date().toISOString(),
      images: imageUrls.length > 0 ? imageUrls : undefined,
    };

    const assistantMsg: ChatMessage = {
      id: generateId(),
      role: "assistant",
      content: "",
      timestamp: new Date().toISOString(),
    };

    updatedConversations = updatedConversations.map((c) => {
      if (c.id !== currentId) return c;
      const isFirst = c.messages.length === 0;
      return {
        ...c,
        title: isFirst ? (input.trim().slice(0, 40) || "Imagem") : c.title,
        messages: [...c.messages, userMsg, assistantMsg],
        updatedAt: new Date().toISOString(),
      };
    });

    setConversations(updatedConversations);
    setActiveId(currentId);
    setInput("");
    clearImages();
    setStreaming(true);

    const convo = updatedConversations.find((c) => c.id === currentId)!;
    const messagesForApi = convo.messages.slice(0, -1);

    let fullContent = "";

    const userText = input.trim();
    const memoryPrompt = shouldInjectMemory(userText) ? buildMemoryPrompt(globalMemory) : undefined;

    await stream({
      messages: messagesForApi.map((m) => ({
        role: m.role,
        content: m.content,
        images: m.images,
      })),
      mode: getResolvedMode(),
      customModeId: getCustomModeId(),
      globalMemoryPrompt: memoryPrompt,
      accessToken: (await (await import("@/integrations/supabase/client")).supabase.auth.getSession()).data.session?.access_token,
      onPhase: setStreamPhase,
      onDelta: (text) => {
        fullContent += text;
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id !== currentId) return c;
            const msgs = [...c.messages];
            msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], content: fullContent };
            return { ...c, messages: msgs };
          })
        );
      },
      onDone: () => {
        setStreaming(false);
        setStreamPhase(null);
        const finalConvo = conversations.find((c) => c.id === currentId);
        if (finalConvo && finalConvo.messages.length >= 2) {
          const lastMsgs = finalConvo.messages.slice(-6).map((m) => ({
            role: m.role,
            content: m.content,
          }));
          extractMemories(lastMsgs);
        }
      },
      onError: (error) => {
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id !== currentId) return c;
            const msgs = [...c.messages];
            msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], content: `❌ Erro: ${error}` };
            return { ...c, messages: msgs };
          })
        );
        setStreaming(false);
        setStreamPhase(null);
      },
    });
  };

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
    const json = storage.exportJSON();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `neonchat-history-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Histórico exportado!" });
  };

  const clearHistory = () => {
    storage.clearAll();
    setConversations([]);
    setActiveId(null);
    toast({ title: "Histórico limpo" });
  };

  const sidebarContent = (
    <ChatSidebar
      conversations={conversations}
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
    <div className="flex h-[100dvh] overflow-hidden bg-background">
      {/* Mobile Sidebar as Sheet */}
      {isMobile ? (
        <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
          <SheetContent side="left" className="w-[280px] p-0 bg-sidebar border-border">
            {sidebarContent}
          </SheetContent>
        </Sheet>
      ) : (
        /* Desktop Sidebar */
        <div
          className={`${
            sidebarOpen ? "w-72" : "w-0"
          } transition-all duration-300 overflow-hidden border-r border-border bg-sidebar shrink-0`}
        >
          {sidebarContent}
        </div>
      )}

      {/* Main area */}
      <div
        ref={dropRef}
        className="flex-1 flex flex-col min-w-0"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        {/* Header */}
        <div className="h-auto min-h-[48px] border-b border-border flex items-center px-3 sm:px-4 gap-2 sm:gap-3 py-2 shrink-0">
          {isMobile ? (
            <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => setMobileSidebarOpen(true)}>
              <Menu className="w-5 h-5" />
            </Button>
          ) : (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSidebarOpen(!sidebarOpen)}>
              {sidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
            </Button>
          )}
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
        <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="max-w-3xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-3 sm:space-y-4">
            {!activeConvo || activeConvo.messages.length === 0 ? (
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
              activeConvo.messages.map((msg, idx) => (
                <div
                  key={msg.id}
                  className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
                  style={{ animationDelay: `${Math.min(idx * 30, 150)}ms` }}
                >
                  <MessageBubble
                    message={msg}
                    streamPhase={streamPhase}
                    isLast={idx === activeConvo.messages.length - 1}
                  />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Input */}
        <div className="border-t border-border p-2 sm:p-4">
          <div className="max-w-3xl mx-auto space-y-2">
            <ImagePreviewGrid images={images} onRemove={removeImage} />
            <div className="flex gap-2 items-end">
              <ImageUploader onFiles={addFiles} disabled={streaming} />
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Digite sua mensagem..."
                className="min-h-[44px] max-h-32 resize-none bg-secondary/50 border-border focus:neon-border text-base sm:text-sm"
                rows={1}
              />
              <Button
                onClick={sendMessage}
                disabled={(!input.trim() && images.length === 0) || streaming || isUploading}
                size="icon"
                className="h-11 w-11 shrink-0 neon-glow"
              >
                {streaming ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
