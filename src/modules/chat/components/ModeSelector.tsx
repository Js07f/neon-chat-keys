import { DEFAULT_MODES, type ChatMode, type CustomMode } from "../types";

interface ModeSelectorProps {
  value: ChatMode;
  onChange: (mode: ChatMode) => void;
  customModes: CustomMode[];
}

export default function ModeSelector({ value, onChange, customModes }: ModeSelectorProps) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {Object.entries(DEFAULT_MODES).map(([key, mode]) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-medium transition-all min-h-[36px] sm:min-h-0 ${
            value === key
              ? "bg-primary text-primary-foreground neon-glow"
              : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80"
          }`}
        >
          {mode.icon} {mode.label}
        </button>
      ))}
      {customModes.map((cm) => (
        <button
          key={cm.id}
          onClick={() => onChange(cm.id)}
          className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-medium transition-all min-h-[36px] sm:min-h-0 ${
            value === cm.id
              ? "bg-primary text-primary-foreground neon-glow"
              : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80"
          }`}
        >
          🧩 {cm.name}
        </button>
      ))}
    </div>
  );
}
