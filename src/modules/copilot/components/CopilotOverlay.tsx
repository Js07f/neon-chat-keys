import { useState } from "react";
import { X, GripVertical, Minimize2, Maximize2, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import ReactMarkdown from "react-markdown";

interface OverlayInsight {
  id: string;
  content: string;
  timestamp: string;
  type: "info" | "warning" | "suggestion";
}

interface CopilotOverlayProps {
  visible: boolean;
  insights: OverlayInsight[];
  onClose: () => void;
  onClear: () => void;
}

const typeStyles: Record<string, string> = {
  info: "border-l-primary/60",
  warning: "border-l-yellow-500/60",
  suggestion: "border-l-green-500/60",
};

const typeLabels: Record<string, string> = {
  info: "💡 Insight",
  warning: "⚠️ Atenção",
  suggestion: "✅ Sugestão",
};

export default function CopilotOverlay({ visible, insights, onClose, onClear }: CopilotOverlayProps) {
  const [minimized, setMinimized] = useState(false);

  if (!visible) return null;

  return (
    <div
      className="fixed top-16 right-4 z-50 w-80 max-h-[60vh] bg-background/95 backdrop-blur-xl border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden"
      style={{ boxShadow: "0 0 30px hsl(var(--primary) / 0.15)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
          <Bot className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold text-foreground">Copilot Overlay</span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setMinimized(!minimized)}>
            {minimized ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
            <X className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {!minimized && (
        <>
          <ScrollArea className="flex-1 max-h-[45vh]">
            <div className="p-3 space-y-2">
              {insights.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">
                  Nenhum insight ainda. Compartilhe sua tela e fale para receber análises.
                </p>
              ) : (
                insights.map((insight) => (
                  <div
                    key={insight.id}
                    className={`border-l-2 ${typeStyles[insight.type]} bg-muted/20 rounded-r-lg p-2.5 space-y-1`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-medium text-muted-foreground">
                        {typeLabels[insight.type]}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(insight.timestamp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <div className="text-xs prose prose-sm prose-invert max-w-none">
                      <ReactMarkdown>{insight.content}</ReactMarkdown>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
          {insights.length > 0 && (
            <div className="border-t border-border px-3 py-1.5">
              <Button variant="ghost" size="sm" className="w-full text-xs h-7" onClick={onClear}>
                Limpar insights
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export type { OverlayInsight };
