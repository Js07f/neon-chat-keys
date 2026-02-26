import { useState } from "react";
import { Check, Copy } from "lucide-react";

interface CodeBlockProps {
  className?: string;
  children?: React.ReactNode;
  [key: string]: unknown;
}

export default function CodeBlock({ className, children, ...props }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const code = String(children).replace(/\n$/, "");
  const isInline = !className && !code.includes("\n");

  if (isInline) {
    return (
      <code className="bg-background/60 text-primary px-1.5 py-0.5 rounded text-xs font-mono" {...props}>
        {children}
      </code>
    );
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const language = className?.replace("hljs language-", "")?.replace("language-", "") || "";

  return (
    <div className="relative group my-2 rounded-lg overflow-hidden border border-border">
      <div className="flex items-center justify-between bg-background/80 px-3 py-1.5 text-xs text-muted-foreground">
        <span className="font-mono">{language || "code"}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3" />
              <span>Copiado!</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Copiar</span>
            </>
          )}
        </button>
      </div>
      <pre className="!mt-0 !rounded-t-none p-4 overflow-x-auto text-sm !bg-background/50">
        <code className={className} {...props}>
          {children}
        </code>
      </pre>
    </div>
  );
}
