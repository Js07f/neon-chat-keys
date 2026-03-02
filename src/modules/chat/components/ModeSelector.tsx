import { DEFAULT_MODES, type ChatMode, type CustomMode } from "../types";

interface ModeSelectorProps {
  value: ChatMode;
  onChange: (mode: ChatMode) => void;
  customModes: CustomMode[];
}

export default function ModeSelector({ value, onChange, customModes }: ModeSelectorProps) {
  return (
    <div className="flex gap-1 sm:gap-1.5 flex-nowrap">
      {Object.entries(DEFAULT_MODES).map(([key, mode]) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-[11px] sm:text-xs font-medium transition-all whitespace-nowrap min-h-[36px] sm:min-h-[40px] ${
            value === key
              ? "bg-primary text-primary-foreground neon-glow"
              : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80"
          }`}
        >
          <span className="sm:hidden">{mode.icon}</span>
          <span className="hidden sm:inline">{mode.icon} {mode.label}</span>
        </button>
      ))}
      {customModes.map((cm) => (
        <button
          key={cm.id}
          onClick={() => onChange(cm.id)}
          className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-[11px] sm:text-xs font-medium transition-all whitespace-nowrap min-h-[36px] sm:min-h-[40px] ${
            value === cm.id
              ? "bg-primary text-primary-foreground neon-glow"
              : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80"
          }`}
        >
          <span className="sm:hidden">🧩</span>
          <span className="hidden sm:inline">🧩 {cm.name}</span>
        </button>
      ))}
    </div>
  );
}
