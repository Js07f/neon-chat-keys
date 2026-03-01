import { Plus, Trash2, Download, LogOut, MessageSquare, Pin, PinOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { Conversation } from "@/lib/storage";

interface ChatSidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
  onTogglePin: (id: string) => void;
  onExport: () => void;
  onClearAll: () => void;
  onLogout: () => void;
}

function sortConversations(convos: Conversation[]): Conversation[] {
  return [...convos].sort((a, b) => {
    const aPinned = a.pinned ? 1 : 0;
    const bPinned = b.pinned ? 1 : 0;
    if (aPinned !== bPinned) return bPinned - aPinned;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}

export default function ChatSidebar({
  conversations,
  activeId,
  onSelect,
  onCreate,
  onDelete,
  onTogglePin,
  onExport,
  onClearAll,
  onLogout,
}: ChatSidebarProps) {
  const sorted = sortConversations(conversations);
  const pinned = sorted.filter((c) => c.pinned);
  const unpinned = sorted.filter((c) => !c.pinned);

  const renderItem = (c: Conversation) => (
    <div
      key={c.id}
      className={`group flex items-center gap-2 px-3 py-3 rounded-lg cursor-pointer text-base sm:text-sm min-h-[44px] transition-all duration-200 ${
        c.id === activeId
          ? "bg-primary/15 text-primary neon-border shadow-sm"
          : "text-sidebar-foreground hover:bg-sidebar-accent/80"
      }`}
      onClick={() => onSelect(c.id)}
    >
      <MessageSquare className="w-4 h-4 shrink-0 opacity-50" />
      <span className="truncate flex-1">{c.title}</span>
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={(e) => {
            e.stopPropagation();
            onTogglePin(c.id);
          }}
          title={c.pinned ? "Desfixar" : "Fixar"}
        >
          {c.pinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-destructive/70 hover:text-destructive"
              onClick={(e) => e.stopPropagation()}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent onClick={(e) => e.stopPropagation()}>
            <AlertDialogHeader>
              <AlertDialogTitle>Apagar conversa?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. A conversa "{c.title}" será removida permanentemente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => onDelete(c.id)}>Apagar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border flex items-center justify-between">
        <h2 className="text-sm font-semibold text-primary neon-text truncate">NeonChat</h2>
        <Button variant="ghost" size="icon" onClick={onCreate} className="h-8 w-8 shrink-0">
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1 scrollbar-thin">
        <div className="p-2 space-y-1">
          {pinned.length > 0 && (
            <>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground px-3 pt-2 pb-1 flex items-center gap-1">
                <Pin className="w-3 h-3" /> Fixadas
              </p>
              {pinned.map(renderItem)}
              {unpinned.length > 0 && (
                <div className="border-b border-border/50 mx-3 my-2" />
              )}
            </>
          )}
          {unpinned.map(renderItem)}
        </div>
      </ScrollArea>

      <div className="p-3 border-t border-border space-y-1 safe-bottom">
        <Button variant="ghost" size="sm" className="w-full justify-start text-sm min-h-[44px]" onClick={onExport}>
          <Download className="w-4 h-4 mr-2" />
          Exportar JSON
        </Button>
        <Button variant="ghost" size="sm" className="w-full justify-start text-sm min-h-[44px]" onClick={onClearAll}>
          <Trash2 className="w-4 h-4 mr-2" />
          Limpar histórico
        </Button>
        <Button variant="ghost" size="sm" className="w-full justify-start text-sm min-h-[44px] text-destructive" onClick={onLogout}>
          <LogOut className="w-4 h-4 mr-2" />
          Sair
        </Button>
      </div>
    </div>
  );
}
