interface VoiceIndicatorProps {
  isListening: boolean;
  interimTranscript: string;
}

export default function VoiceIndicator({ isListening, interimTranscript }: VoiceIndicatorProps) {
  if (!isListening) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-lg">
      <div className="flex items-center gap-1">
        <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
        <span className="text-[11px] font-medium text-red-400">REC</span>
      </div>
      {interimTranscript && (
        <span className="text-xs text-muted-foreground truncate max-w-[200px] italic">
          {interimTranscript}
        </span>
      )}
    </div>
  );
}
