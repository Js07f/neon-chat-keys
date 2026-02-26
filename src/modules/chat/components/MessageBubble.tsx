import { Bot, User, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";
import type { ChatMessage } from "@/lib/storage";
import { useState } from "react";
import CodeBlock from "./CodeBlock";

interface MessageBubbleProps {
  message: ChatMessage;
  streamPhase?: "analyzing" | "generating" | "streaming" | null;
  isLast?: boolean;
}

function ImageGallery({ images }: { images: string[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <>
      <div className="flex gap-1.5 flex-wrap mt-2">
        {images.map((url, i) => (
          <img
            key={i}
            src={url}
            alt={`Imagem ${i + 1}`}
            loading="lazy"
            className="w-20 h-20 rounded-md object-cover cursor-pointer neon-border hover:scale-105 transition-transform"
            onClick={() => setExpanded(url)}
          />
        ))}
      </div>
      {expanded && (
        <div
          className="fixed inset-0 z-50 bg-background/90 flex items-center justify-center p-4"
          onClick={() => setExpanded(null)}
        >
          <img
            src={expanded}
            alt="Expandida"
            className="max-w-full max-h-full rounded-xl neon-border"
          />
        </div>
      )}
    </>
  );
}

function StreamingIndicator({ phase }: { phase: string }) {
  const labels: Record<string, string> = {
    analyzing: "Analisando imagens...",
    generating: "Gerando resposta...",
    streaming: "",
  };
  const label = labels[phase];
  if (!label) return null;

  return (
    <div className="flex items-center gap-2 text-primary text-xs">
      <Loader2 className="w-3 h-3 animate-spin" />
      <span className="neon-text">{label}</span>
    </div>
  );
}

export default function MessageBubble({ message, streamPhase, isLast }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const showPhase = isLast && !isUser && streamPhase && streamPhase !== "streaming";
  const isEmpty = !message.content && !showPhase;

  return (
    <div className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0 mt-1">
          <Bot className="w-4 h-4 text-primary" />
        </div>
      )}
      <div
        className={`max-w-[75%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-secondary text-foreground neon-border"
        }`}
      >
        {message.images && message.images.length > 0 && (
          <ImageGallery images={message.images} />
        )}
        {showPhase && <StreamingIndicator phase={streamPhase!} />}
        {isEmpty && !showPhase ? (
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
        ) : isUser ? (
          <span className="whitespace-pre-wrap">{message.content}</span>
        ) : message.content ? (
          <div className="prose prose-invert prose-sm max-w-none [&_p]:my-1 [&_pre]:bg-transparent [&_pre]:p-0 [&_code]:font-mono">
            <ReactMarkdown
              rehypePlugins={[rehypeHighlight]}
              components={{ code: CodeBlock as any }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        ) : null}
      </div>
      {isUser && (
        <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center shrink-0 mt-1">
          <User className="w-4 h-4 text-accent" />
        </div>
      )}
    </div>
  );
}
