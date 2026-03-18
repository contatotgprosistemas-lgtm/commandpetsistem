import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Mic, Square, Loader2 } from "lucide-react";

interface AudioRecorderProps {
  onSend: (url: string) => void;
  disabled?: boolean;
}

export function AudioRecorder({ onSend, disabled }: AudioRecorderProps) {
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [duration, setDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      setDuration(0);

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (timerRef.current) clearInterval(timerRef.current);

        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        if (blob.size < 1000) return; // too short

        setUploading(true);
        const fileName = `audio_${Date.now()}.webm`;
        const { error } = await supabase.storage
          .from("chat-media")
          .upload(fileName, blob, { contentType: "audio/webm" });

        if (error) {
          toast({ title: "Erro ao enviar áudio", variant: "destructive" });
          setUploading(false);
          return;
        }

        const { data: urlData } = supabase.storage
          .from("chat-media")
          .getPublicUrl(fileName);

        setUploading(false);
        setDuration(0);
        onSend(urlData.publicUrl);
      };

      mediaRecorder.start();
      setRecording(true);
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    } catch {
      toast({ title: "Permissão de microfone negada", variant: "destructive" });
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  const formatDuration = (s: number) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  if (uploading) {
    return (
      <button disabled className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </button>
    );
  }

  if (recording) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-destructive/10">
          <div className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
          <span className="text-xs font-mono text-destructive">{formatDuration(duration)}</span>
        </div>
        <button
          onClick={stopRecording}
          className="h-10 w-10 rounded-full bg-destructive flex items-center justify-center text-destructive-foreground shrink-0 transition-colors hover:bg-destructive/90"
        >
          <Square className="h-4 w-4" fill="currentColor" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={startRecording}
      disabled={disabled}
      className="h-10 w-10 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground shrink-0 transition-colors disabled:opacity-50"
    >
      <Mic className="h-5 w-5" />
    </button>
  );
}
