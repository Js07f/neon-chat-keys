import { useState } from "react";
import { Brain, Pin, PinOff, Trash2, Edit2, Check, X, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetDescription,
} from "@/components/ui/sheet";
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
import type { UserMemory } from "@/modules/chat/hooks/useMemory";

const CATEGORY_LABELS: Record<string, { label: string; emoji: string }> = {
  projeto: { label: "Projeto", emoji: "🏗️" },
  stack_tecnologica: { label: "Stack", emoji: "⚙️" },
  objetivo: { label: "Objetivo", emoji: "🎯" },
  estilo_aprendizado: { label: "Aprendizado", emoji: "📖" },
  preferencia_resposta: { label: "Preferência", emoji: "💬" },
  perfil_tecnico: { label: "Perfil Técnico", emoji: "🧠" },
  geral: { label: "Geral", emoji: "📌" },
};

interface Props {
  memories: UserMemory[];
  loading: boolean;
  onUpdate: (id: string, updates: Partial<Pick<UserMemory, "content" | "category" | "importance_score" | "pinned">>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onClearAll: () => Promise<void>;
}

function ImportanceDots({ score }: { score: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className={`w-1.5 h-1.5 rounded-full ${
            i <= score ? "bg-primary neon-glow" : "bg-muted"
          }`}
        />
      ))}
    </div>
  );
}

export default function MemoryDashboard({ memories, loading, onUpdate, onDelete, onClearAll }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  const startEdit = (mem: UserMemory) => {
    setEditingId(mem.id);
    setEditContent(mem.content);
  };

  const saveEdit = async (id: string) => {
    if (editContent.trim()) {
      await onUpdate(id, { content: editContent.trim() });
    }
    setEditingId(null);
  };

  const pinnedMemories = memories.filter((m) => m.pinned);
  const otherMemories = memories.filter((m) => !m.pinned);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 relative">
          <Brain className="w-4 h-4" />
          {memories.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-primary rounded-full text-[9px] flex items-center justify-center text-primary-foreground font-bold">
              {memories.length}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px] bg-card border-border">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-primary">
            <Brain className="w-5 h-5" />
            Memória Estratégica
          </SheetTitle>
          <SheetDescription className="text-muted-foreground text-xs">
            Fatos que a IA lembra sobre você ({memories.length}/100)
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 flex justify-end">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-xs text-destructive" disabled={memories.length === 0}>
                <Trash2 className="w-3 h-3 mr-1" />
                Limpar tudo
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                  Limpar todas as memórias?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Essa ação é irreversível. A IA perderá todo o contexto aprendido.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={onClearAll} className="bg-destructive text-destructive-foreground">
                  Confirmar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <ScrollArea className="h-[calc(100vh-200px)] mt-2 pr-2">
          {loading ? (
            <div className="text-center text-muted-foreground py-8 text-sm">Carregando...</div>
          ) : memories.length === 0 ? (
            <div className="text-center text-muted-foreground py-12 space-y-2">
              <Brain className="w-10 h-10 mx-auto opacity-30" />
              <p className="text-sm">Nenhuma memória ainda</p>
              <p className="text-xs">Converse com a IA e ela aprenderá sobre você automaticamente</p>
            </div>
          ) : (
            <div className="space-y-2">
              {[...pinnedMemories, ...otherMemories].map((mem) => {
                const cat = CATEGORY_LABELS[mem.category] || CATEGORY_LABELS.geral;
                const isEditing = editingId === mem.id;

                return (
                  <div
                    key={mem.id}
                    className={`p-3 rounded-lg border transition-colors ${
                      mem.pinned
                        ? "border-primary/30 bg-primary/5"
                        : "border-border bg-secondary/30"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          {cat.emoji} {cat.label}
                        </Badge>
                        <ImportanceDots score={mem.importance_score} />
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        {isEditing ? (
                          <>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => saveEdit(mem.id)}>
                              <Check className="w-3 h-3 text-primary" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingId(null)}>
                              <X className="w-3 h-3" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onUpdate(mem.id, { pinned: !mem.pinned })}>
                              {mem.pinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
                            </Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => startEdit(mem)}>
                              <Edit2 className="w-3 h-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => onDelete(mem.id)}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                    {isEditing ? (
                      <Textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="text-xs min-h-[60px] bg-background/50"
                        autoFocus
                      />
                    ) : (
                      <p className="text-xs text-foreground/80 leading-relaxed">{mem.content}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-1.5">
                      {new Date(mem.last_updated).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
