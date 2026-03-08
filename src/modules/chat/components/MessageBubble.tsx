import { Bot, User, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";
import type { ChatMessage } from "@/lib/storage";
import { useState } from "react";
import CodeBlock from "./CodeBlock";
import { format } from "date-fns";

interface MessageBubbleProps {
  message: ChatMessage;
  streamPhase?: "analyzing" | "generating" | "streaming" | "tool_calling" | null;
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
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-md object-cover cursor-pointer neon-border hover:scale-105 transition-transform max-w-full"
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
    tool_calling: "Executando ferramentas...",
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

function Timestamp({ time }: { time: string }) {
  try {
    return (
      <span className="text-[10px] text-muted-foreground/60 mt-1 block select-none">
        {format(new Date(time), "HH:mm")}
      </span>
    );
  } catch {
    return null;
  }
}

function renderContentWithImages(content: string) {
  // Check for IMAGE_URL: pattern from image generation tool
  const imageUrlRegex = /IMAGE_URL:(https?:\/\/[^\s\n]+)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;
  let key = 0;

  while ((match = imageUrlRegex.exec(content)) !== null) {
    // Add text before image
    const textBefore = content.slice(lastIndex, match.index);
    if (textBefore.trim()) {
      parts.push(
        <ReactMarkdown key={key++} rehypePlugins={[rehypeHighlight]} components={{ code: CodeBlock as any }}>
          {textBefore}
        </ReactMarkdown>
      );
    }
    // Add image
    parts.push(
      <div key={key++} className="my-3">
        <img
          src={match[1]}
          alt="Imagem gerada"
          className="max-w-full h-auto rounded-xl neon-border shadow-lg shadow-primary/10 cursor-pointer hover:scale-[1.02] transition-transform"
          loading="lazy"
          onClick={() => window.open(match![1], "_blank")}
        />
      </div>
    );
    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  const remaining = content.slice(lastIndex);
  if (remaining.trim()) {
    parts.push(
      <ReactMarkdown key={key++} rehypePlugins={[rehypeHighlight]} components={{ code: CodeBlock as any }}>
        {remaining}
      </ReactMarkdown>
    );
  }

  // No IMAGE_URL found, render normally
  if (parts.length === 0) {
    return (
      <ReactMarkdown rehypePlugins={[rehypeHighlight]} components={{ code: CodeBlock as any }}>
        {content}
      </ReactMarkdown>
    );
  }

  return <>{parts}</>;
}

export default function MessageBubble({ message, streamPhase, isLast }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const showPhase = isLast && !isUser && streamPhase && streamPhase !== "streaming";
  const isEmpty = !message.content && !showPhase;

  return (
    <div className={`flex gap-2 sm:gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center shrink-0 mt-1 ring-1 ring-primary/20 animate-glow-pulse">
          <Bot className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-primary" />
        </div>
      )}
      <div className={`max-w-[85%] sm:max-w-[75%]`}>
        <div
          className={`rounded-2xl px-3.5 py-2.5 sm:px-4 sm:py-3 text-sm leading-relaxed transition-all ${
            isUser
              ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground rounded-br-md shadow-lg shadow-primary/10"
              : "bg-secondary/80 text-foreground neon-border rounded-bl-md backdrop-blur-sm"
          }`}
        >
          {message.images && message.images.length > 0 && (
            <ImageGallery images={message.images} />
          )}
          {showPhase && <StreamingIndicator phase={streamPhase!} />}
          {isEmpty && !showPhase ? (
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
          ) : isUser ? (
            <span className="whitespace-pre-wrap break-words">{message.content}</span>
          ) : message.content ? (
            <div className="prose prose-invert prose-sm max-w-none [&_p]:my-1 [&_pre]:bg-transparent [&_pre]:p-0 [&_pre]:overflow-x-auto [&_pre]:max-w-[calc(100vw-6rem)] sm:[&_pre]:max-w-none [&_code]:font-mono [&_code]:text-xs sm:[&_code]:text-sm [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-md break-words">
              {renderContentWithImages(message.content)}
            </div>
          ) : null}
        </div>
        <div className={`${isUser ? "text-right" : "text-left"} px-1`}>
          <Timestamp time={message.timestamp} />
        </div>
      </div>
      {isUser && (
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-accent/30 to-accent/10 flex items-center justify-center shrink-0 mt-1 ring-1 ring-accent/20">
          <User className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-accent" />
        </div>
      )}
    </div>
  );
}
