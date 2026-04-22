import { CheckCheck, FileText, Play, Pause } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { resolveMediaUrl } from "@/lib/storage";

interface ChatBubbleProps {
  conteudo: string;
  remetente: string;
  tipo: string;
  created_at: string;
  formatTime: (date: string) => string;
}

export function ChatBubble({ conteudo, remetente, tipo, created_at, formatTime }: ChatBubbleProps) {
  const isAgent = remetente === "agente";
  const isImage = tipo === "imagem" || (tipo === "midia" && /\.(jpg|jpeg|png|gif|webp)/i.test(conteudo)) || conteudo.startsWith("data:image/");
  const isAudio = tipo === "audio" || conteudo.startsWith("data:audio/") || conteudo.endsWith(".webm") || conteudo.endsWith(".ogg") || conteudo.endsWith(".mp3");
  const isDocument = tipo === "documento" || (tipo === "midia" && /\.(pdf|doc|docx|xls|xlsx|csv|txt|zip)/i.test(conteudo));
  const isMedia = isImage || isAudio || isDocument;

  // Resolve signed URLs for private bucket media
  const [resolvedUrl, setResolvedUrl] = useState(conteudo);
  useEffect(() => {
    if (isMedia && conteudo) {
      resolveMediaUrl(conteudo).then(setResolvedUrl);
    } else {
      setResolvedUrl(conteudo);
    }
  }, [conteudo, isMedia]);

  return (
    <div className={`flex ${isAgent ? "justify-end" : "justify-start"} mb-1`}>
      <div
        className={`relative max-w-[75%] rounded-lg text-sm ${
          isAgent
            ? "bg-[hsl(var(--chat-bubble-out,142_70%_85%))] text-foreground shadow-sm rounded-br-sm"
            : "bg-card text-foreground shadow-sm rounded-bl-sm"
        }`}
      >
        {/* Image message */}
        {isImage && (
          <div className="p-1">
            <img
              src={resolvedUrl}
              alt="Imagem"
              className="rounded-md max-w-[300px] max-h-[300px] object-cover cursor-pointer"
              onClick={() => window.open(resolvedUrl, "_blank")}
            />
          </div>
        )}

        {/* Audio message */}
        {isAudio && (
          <div className="px-3 py-2">
            <AudioPlayer src={resolvedUrl} isAgent={isAgent} />
          </div>
        )}

        {/* Document message */}
        {isDocument && (
          <a
            href={resolvedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-2 px-3 py-2 ${
              isAgent ? "hover:text-primary-foreground/80" : "hover:text-foreground/80"
            }`}
          >
            <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${
              isAgent ? "bg-primary-foreground/10" : "bg-muted"
            }`}>
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">
                {resolvedUrl.split("/").pop()?.split("?")[0] || "Documento"}
              </p>
              <p className={`text-[10px] ${isAgent ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                Documento
              </p>
            </div>
          </a>
        )}

        {/* Text message */}
        {!isMedia && (
          <div className="px-3 py-1.5">
            <p className="whitespace-pre-wrap break-words">{conteudo}</p>
          </div>
        )}

        {/* Timestamp */}
        <div className={`flex items-center gap-1 justify-end px-3 pb-1 ${
          isAgent ? "text-foreground/50" : "text-muted-foreground"
        }`}>
          <span className="font-mono text-[10px]">{formatTime(created_at)}</span>
          {isAgent && <CheckCheck className="h-3 w-3 text-sky-500" />}
        </div>
      </div>
    </div>
  );
}

function AudioPlayer({ src, isAgent }: { src: string; isAgent: boolean }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
    } else {
      audio.play();
    }
    setPlaying(!playing);
  };

  const formatDur = (s: number) => {
    if (!s || isNaN(s)) return "0:00";
    return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex items-center gap-2 min-w-[200px]">
      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={() => {
          const a = audioRef.current;
          if (a) setProgress(a.duration ? (a.currentTime / a.duration) * 100 : 0);
        }}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
        onEnded={() => { setPlaying(false); setProgress(0); }}
      />
      <button
        onClick={toggle}
        className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
          isAgent ? "bg-foreground/10 hover:bg-foreground/20" : "bg-muted hover:bg-muted/80"
        }`}
      >
        {playing ? <Pause className="h-3.5 w-3.5" fill="currentColor" /> : <Play className="h-3.5 w-3.5 ml-0.5" fill="currentColor" />}
      </button>
      <div className="flex-1 flex flex-col gap-1">
        <div className={`h-1 rounded-full overflow-hidden ${isAgent ? "bg-foreground/15" : "bg-muted"}`}>
          <div
            className={`h-full rounded-full transition-all ${isAgent ? "bg-foreground/50" : "bg-foreground/40"}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className={`text-[10px] font-mono ${isAgent ? "text-foreground/60" : "text-muted-foreground"}`}>
          {formatDur(playing ? (audioRef.current?.currentTime || 0) : duration)}
        </span>
      </div>
    </div>
  );
}
