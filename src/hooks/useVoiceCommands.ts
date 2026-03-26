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
  wakeWord = "olá sistema",
  enableWakeWord = false,
}: UseVoiceCommandsOptions) {
  const [isListening, setIsListening] = useState(false);
  const [isWakeListening, setIsWakeListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [supported, setSupported] = useState(true);

  const commandRecRef = useRef<any>(null);
  const wakeRecRef = useRef<any>(null);
  const wakeEnabledRef = useRef(enableWakeWord);
  const startWakeRef = useRef<() => void>(() => {});
  const commandsRef = useRef(commands);

  // Keep refs in sync
  useEffect(() => { wakeEnabledRef.current = enableWakeWord; }, [enableWakeWord]);
  useEffect(() => { commandsRef.current = commands; }, [commands]);

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
    for (const cmd of commandsRef.current) {
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
  }, []);

  // Start command listening
  const startListening = useCallback(() => {
    if (!commandRecRef.current) {
      toast.error("Reconhecimento de voz não suportado.");
      return;
    }
    try { wakeRecRef.current?.abort(); } catch {}
    setTranscript("");
    setIsListening(true);
    try { commandRecRef.current.start(); } catch { setIsListening(false); }
  }, []);

  const stopListening = useCallback(() => {
    commandRecRef.current?.stop();
    setIsListening(false);
  }, []);

  const stopWakeListener = useCallback(() => {
    wakeEnabledRef.current = false;
    setIsWakeListening(false);
    try { wakeRecRef.current?.abort(); } catch {}
  }, []);

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
      if (wakeEnabledRef.current) {
        setTimeout(() => startWakeRef.current(), 300);
      }
    };
    commandRecRef.current = rec;
  }, [language, createRecognition, processCommand]);

  // Setup wake word listener function via ref to avoid circular deps
  useEffect(() => {
    const normalizedWake = normalize(wakeWord);

    const doStartWake = () => {
      if (!wakeEnabledRef.current) return;
      const rec = createRecognition();
      if (!rec) return;
      rec.continuous = true;
      rec.interimResults = true;

      rec.onresult = (event: any) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const t = normalize(event.results[i][0].transcript);
          if (t.includes(normalizedWake)) {
            rec.abort();
            toast("🎤 Olá Sistema! Ouvindo comando...", { duration: 2000 });
            setTimeout(() => startListening(), 300);
            return;
          }
        }
      };
      rec.onerror = (e: any) => {
        if (e.error === "no-speech" || e.error === "aborted") {
          if (wakeEnabledRef.current) setTimeout(() => doStartWake(), 500);
        }
      };
      rec.onend = () => {
        if (wakeEnabledRef.current) setTimeout(() => doStartWake(), 500);
      };
      wakeRecRef.current = rec;
      setIsWakeListening(true);
      try { rec.start(); } catch {}
    };

    startWakeRef.current = doStartWake;
  }, [createRecognition, wakeWord, startListening]);

  // Auto-start/stop wake listener when toggle changes
  useEffect(() => {
    if (enableWakeWord) {
      startWakeRef.current();
    } else {
      try { wakeRecRef.current?.abort(); } catch {}
      setIsWakeListening(false);
    }
    return () => { try { wakeRecRef.current?.abort(); } catch {} };
  }, [enableWakeWord]);

  const startWakeListener = useCallback(() => {
    startWakeRef.current();
  }, []);

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
