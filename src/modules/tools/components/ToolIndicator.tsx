import { Wrench, Search, Calculator, Loader2, Check } from "lucide-react";
import type { ToolEvent } from "@/modules/chat/hooks/useChatStream";

interface ToolIndicatorProps {
  events: ToolEvent[];
}

const TOOL_META: Record<string, { label: string; icon: React.ReactNode }> = {
  web_search: { label: "Buscando na web", icon: <Search className="w-3.5 h-3.5" /> },
  math: { label: "Calculando", icon: <Calculator className="w-3.5 h-3.5" /> },
};

export default function ToolIndicator({ events }: ToolIndicatorProps) {
  if (events.length === 0) return null;

  // Group events by tool
  const tools: Record<string, { started: boolean; done: boolean; input?: any; output?: string }> = {};
  for (const ev of events) {
    if (!tools[ev.tool]) tools[ev.tool] = { started: false, done: false };
    if (ev.type === "tool_start") {
      tools[ev.tool].started = true;
      tools[ev.tool].input = ev.input;
    }
    if (ev.type === "tool_end") {
      tools[ev.tool].done = true;
      tools[ev.tool].output = ev.output;
    }
  }

  return (
    <div className="flex flex-col gap-1.5 mb-2">
      {Object.entries(tools).map(([name, state]) => {
        const meta = TOOL_META[name] || { label: name, icon: <Wrench className="w-3.5 h-3.5" /> };
        return (
          <div
            key={name}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/5 border border-primary/10 text-xs text-muted-foreground"
          >
            <span className="text-primary">{meta.icon}</span>
            <span className="font-medium">{meta.label}</span>
            {state.input?.query && (
              <span className="text-[10px] opacity-70 truncate max-w-[200px]">
                "{state.input.query}"
              </span>
            )}
            {state.input?.expression && (
              <span className="text-[10px] opacity-70 font-mono">
                {state.input.expression}
              </span>
            )}
            {state.done ? (
              <Check className="w-3 h-3 text-primary ml-auto" />
            ) : (
              <Loader2 className="w-3 h-3 animate-spin ml-auto" />
            )}
          </div>
        );
      })}
    </div>
  );
}
