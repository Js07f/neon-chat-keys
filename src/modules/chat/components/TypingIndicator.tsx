import { Bot } from "lucide-react";

export default function TypingIndicator() {
  return (
    <div className="flex gap-2 sm:gap-3 justify-start">
      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0 mt-1">
        <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
      </div>
      <div className="rounded-xl px-4 py-3 bg-secondary neon-border inline-flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-2 h-2 rounded-full bg-primary/60 animate-typing-bounce"
            style={{ animationDelay: `${i * 0.2}s` }}
          />
        ))}
      </div>
    </div>
  );
}
