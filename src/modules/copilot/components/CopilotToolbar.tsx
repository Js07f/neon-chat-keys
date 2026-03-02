import { Mic, MicOff, Monitor, MonitorOff, Camera, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface CopilotToolbarProps {
  isListening: boolean;
  isSpeechSupported: boolean;
  isSharing: boolean;
  overlayVisible: boolean;
  onToggleMic: () => void;
  onToggleScreen: () => void;
  onCaptureFrame: () => void;
  onToggleOverlay: () => void;
  disabled?: boolean;
}

export default function CopilotToolbar({
  isListening,
  isSpeechSupported,
  isSharing,
  overlayVisible,
  onToggleMic,
  onToggleScreen,
  onCaptureFrame,
  onToggleOverlay,
  disabled,
}: CopilotToolbarProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center gap-1">
        {isSpeechSupported && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={isListening ? "default" : "ghost"}
                size="icon"
                className={`h-9 w-9 shrink-0 ${isListening ? "bg-red-500/80 hover:bg-red-500 text-white animate-pulse" : ""}`}
                onClick={onToggleMic}
                disabled={disabled}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{isListening ? "Parar transcrição" : "Iniciar transcrição de voz"}</TooltipContent>
          </Tooltip>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={isSharing ? "default" : "ghost"}
              size="icon"
              className={`h-9 w-9 shrink-0 ${isSharing ? "bg-green-500/80 hover:bg-green-500 text-white" : ""}`}
              onClick={onToggleScreen}
              disabled={disabled}
            >
              {isSharing ? <MonitorOff className="w-4 h-4" /> : <Monitor className="w-4 h-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{isSharing ? "Parar compartilhamento" : "Compartilhar tela"}</TooltipContent>
        </Tooltip>

        {isSharing && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={onCaptureFrame} disabled={disabled}>
                <Camera className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Capturar tela e enviar para análise</TooltipContent>
          </Tooltip>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={overlayVisible ? "default" : "ghost"}
              size="icon"
              className={`h-9 w-9 shrink-0 ${overlayVisible ? "bg-primary/80" : ""}`}
              onClick={onToggleOverlay}
            >
              <Eye className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{overlayVisible ? "Ocultar overlay" : "Mostrar overlay"}</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
