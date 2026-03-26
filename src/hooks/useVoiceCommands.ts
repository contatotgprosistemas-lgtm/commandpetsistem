import { useState, useCallback, useRef, useEffect } from "react";
import { toast } from "sonner";

export interface VoiceCommand {
  keywords: string[];
  action: (extractedText?: string) => void;
  description: string;
  extractSuffix?: boolean;
}

interface UseVoiceCommandsOptions {
  commands: VoiceCommand[];
  language?: string;
  wakeWord?: string;
  enableWakeWord?: boolean;
}

function normalize(text: string) {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

export function useVoiceCommands({
  commands,
  language = "pt-BR",
  wakeWord = "olá petcontrol",
  enableWakeWord = false,
}: UseVoiceCommandsOptions) {
  const [isListening, setIsListening] = useState(false);
  const [isWakeListening, setIsWakeListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [supported, setSupported] = useState(true);
  const commandRecRef = useRef<any>(null);
  const wakeRecRef = useRef<any>(null);
  const wakeEnabledRef = useRef(enableWakeWord);

  // Keep ref in sync
  useEffect(() => { wakeEnabledRef.current = enableWakeWord; }, [enableWakeWord]);

  const createRecognition = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return null;
    const rec = new SR();
    rec.lang = language;
    rec.maxAlternatives = 3;
    return rec;
  }, [language]);

  // Process commands
  const processCommand = useCallback((text: string) => {
    const norm = normalize(text);
    for (const cmd of commands) {
      for (const keyword of cmd.keywords) {
        const normKeyword = normalize(keyword);
        if (norm.includes(normKeyword)) {
          let extracted: string | undefined;
          if (cmd.extractSuffix) {
            const idx = norm.indexOf(normKeyword);
            extracted = text.slice(idx + keyword.length).trim();
            extracted = extracted.replace(/^(do|da|de|o|a|para)\s+/i, "").trim();
          }
          const label = extracted ? `${cmd.description}: "${extracted}"` : cmd.description;
          toast.success(`Comando reconhecido: ${label}`, { duration: 2500 });
          cmd.action(extracted || undefined);
          return;
        }
      }
    }
    toast.info(`Comando não reconhecido: "${text}"`, { duration: 3000 });
  }, [commands]);

  // Setup command recognition
  useEffect(() => {
    const rec = createRecognition();
    if (!rec) { setSupported(false); return; }
    rec.continuous = false;
    rec.interimResults = true;

    rec.onresult = (event: any) => {
      let finalT = "", interimT = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalT += t;
        else interimT += t;
      }
      setTranscript(finalT || interimT);
      if (finalT) processCommand(finalT.trim());
    };
    rec.onerror = (e: any) => {
      if (e.error !== "aborted" && e.error !== "no-speech")
        toast.error("Erro no reconhecimento: " + e.error);
      setIsListening(false);
    };
    rec.onend = () => {
      setIsListening(false);
      // Restart wake word listener if enabled
      if (wakeEnabledRef.current) startWakeListener();
    };
    commandRecRef.current = rec;
  }, [language, processCommand]);

  // Start command listening (after wake word or manual click)
  const startListening = useCallback(() => {
    if (!commandRecRef.current) {
      toast.error("Reconhecimento de voz não suportado.");
      return;
    }
    // Stop wake listener while command listening
    try { wakeRecRef.current?.abort(); } catch {}
    setTranscript("");
    setIsListening(true);
    try { commandRecRef.current.start(); } catch { setIsListening(false); }
  }, []);

  const stopListening = useCallback(() => {
    commandRecRef.current?.stop();
    setIsListening(false);
  }, []);

  // Wake word background listener
  const startWakeListener = useCallback(() => {
    if (!wakeEnabledRef.current) return;
    const rec = createRecognition();
    if (!rec) return;
    rec.continuous = true;
    rec.interimResults = true;

    const normalizedWake = normalize(wakeWord);

    rec.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = normalize(event.results[i][0].transcript);
        if (t.includes(normalizedWake)) {
          rec.abort();
          toast("🎤 Hey Pet! Ouvindo comando...", { duration: 2000 });
          setTimeout(() => startListening(), 300);
          return;
        }
      }
    };
    rec.onerror = (e: any) => {
      if (e.error === "no-speech" || e.error === "aborted") {
        // Restart silently
        if (wakeEnabledRef.current) setTimeout(() => startWakeListener(), 500);
      }
    };
    rec.onend = () => {
      // Auto-restart if still enabled
      if (wakeEnabledRef.current && !commandRecRef.current?.running) {
        setTimeout(() => startWakeListener(), 500);
      }
    };
    wakeRecRef.current = rec;
    setIsWakeListening(true);
    try { rec.start(); } catch {}
  }, [createRecognition, wakeWord, startListening]);

  const stopWakeListener = useCallback(() => {
    wakeEnabledRef.current = false;
    setIsWakeListening(false);
    try { wakeRecRef.current?.abort(); } catch {}
  }, []);

  // Auto-start wake listener
  useEffect(() => {
    if (enableWakeWord) {
      startWakeListener();
    }
    return () => {
      try { wakeRecRef.current?.abort(); } catch {}
    };
  }, [enableWakeWord]);

  return {
    isListening,
    isWakeListening,
    transcript,
    supported,
    startListening,
    stopListening,
    startWakeListener,
    stopWakeListener,
  };
}
