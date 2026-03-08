import { useState } from "react";
import { Smile } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

const EMOJI_GROUPS = [
  { label: "Smileys", emojis: ["😀","😂","🥰","😎","🤔","😅","🙃","🤩","😤","🥳","😢","🤯","💀","👻","🤖"] },
  { label: "Gestos", emojis: ["👍","👎","👏","🙌","🤝","✌️","🤞","💪","🫡","🫶"] },
  { label: "Objetos", emojis: ["🔥","⚡","💡","🎯","🚀","💎","🏆","🎮","💻","📱"] },
  { label: "Corações", emojis: ["❤️","💜","💙","💚","🖤","💛","🤍","💗"] },
];

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  disabled?: boolean;
}

export default function EmojiPicker({ onSelect, disabled }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0 text-muted-foreground hover:text-foreground" disabled={disabled}>
          <Smile className="w-5 h-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2 bg-card border-border" align="start" side="top">
        {EMOJI_GROUPS.map((group) => (
          <div key={group.label} className="mb-2">
            <p className="text-[10px] text-muted-foreground font-medium px-1 mb-1">{group.label}</p>
            <div className="flex flex-wrap gap-0.5">
              {group.emojis.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => { onSelect(emoji); setOpen(false); }}
                  className="w-8 h-8 flex items-center justify-center rounded hover:bg-secondary/80 transition-colors text-lg"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        ))}
      </PopoverContent>
    </Popover>
  );
}
