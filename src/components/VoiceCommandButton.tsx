import { Mic, MicOff, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface VoiceCommandButtonProps {
  isListening: boolean;
  isWakeListening: boolean;
  transcript: string;
  supported: boolean;
  onStart: () => void;
  onStop: () => void;
  onToggleWake: (enabled: boolean) => void;
}

export function VoiceCommandButton({
  isListening, isWakeListening, transcript, supported, onStart, onStop, onToggleWake,
}: VoiceCommandButtonProps) {
  if (!supported) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2 md:bottom-8 md:right-8">
      {/* Transcript bubble */}
      {isListening && transcript && (
        <div className="bg-card border border-border rounded-xl px-4 py-2 shadow-lg max-w-[260px] animate-in fade-in slide-in-from-bottom-2 duration-200">
          <p className="text-sm text-foreground italic">"{transcript}"</p>
        </div>
      )}

      {/* Listening indicator */}
      {isListening && (
        <div className="bg-card border border-border rounded-xl px-4 py-2 shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-destructive" />
            </span>
            <p className="text-xs text-muted-foreground">Ouvindo... Fale um comando</p>
          </div>
        </div>
      )}

      {/* Wake word indicator */}
      {isWakeListening && !isListening && (
        <div className="bg-card border border-border rounded-xl px-3 py-1.5 shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-50" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
            </span>
            <p className="text-[10px] text-muted-foreground">Diga <strong>"Olá Sistema"</strong></p>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        {/* Wake word toggle */}
        <Button
          variant="outline"
          size="icon"
          className={cn(
            "h-10 w-10 rounded-full shadow-lg transition-all",
            isWakeListening
              ? "bg-primary/10 border-primary text-primary"
              : "bg-card text-muted-foreground"
          )}
          onClick={() => onToggleWake(!isWakeListening)}
          title={isWakeListening ? 'Desativar "Olá PetControl"' : 'Ativar "Olá PetControl"'}
        >
          <Radio className="h-4 w-4" />
        </Button>

        {/* Main mic button */}
        <Button
          size="icon"
          className={cn(
            "h-14 w-14 rounded-full shadow-xl transition-all duration-200",
            isListening
              ? "bg-destructive hover:bg-destructive/90 animate-pulse"
              : "bg-primary hover:bg-primary/90"
          )}
          onClick={isListening ? onStop : onStart}
        >
          {isListening ? (
            <MicOff className="h-6 w-6 text-destructive-foreground" />
          ) : (
            <Mic className="h-6 w-6 text-primary-foreground" />
          )}
        </Button>
      </div>
    </div>
  );
}
