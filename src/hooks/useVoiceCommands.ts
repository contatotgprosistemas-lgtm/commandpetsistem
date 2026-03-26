import { useState, useCallback, useRef, useEffect } from "react";
import { toast } from "sonner";

export interface VoiceCommand {
  keywords: string[];
  action: (extractedText?: string) => void;
  description: string;
  /** If true, text after the keyword is extracted and passed to action */
  extractSuffix?: boolean;
}

interface UseVoiceCommandsOptions {
  commands: VoiceCommand[];
  language?: string;
}

function normalize(text: string) {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

export function useVoiceCommands({ commands, language = "pt-BR" }: UseVoiceCommandsOptions) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [supported, setSupported] = useState(true);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = language;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 3;

    recognition.onresult = (event: any) => {
      let finalTranscript = "";
      let interimTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalTranscript += t;
        else interimTranscript += t;
      }
      setTranscript(finalTranscript || interimTranscript);
      if (finalTranscript) processCommand(finalTranscript.trim());
    };

    recognition.onerror = (event: any) => {
      if (event.error !== "aborted" && event.error !== "no-speech") {
        toast.error("Erro no reconhecimento de voz: " + event.error);
      }
      setIsListening(false);
    };

    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
  }, [language]);

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
            // Remove common filler words
            extracted = extracted.replace(/^(do|da|de|o|a|para)\s+/i, "").trim();
          }
          const label = extracted
            ? `${cmd.description}: "${extracted}"`
            : cmd.description;
          toast.success(`Comando reconhecido: ${label}`, { duration: 2500 });
          cmd.action(extracted || undefined);
          return;
        }
      }
    }
    toast.info(`Comando não reconhecido: "${text}"`, { duration: 3000 });
  }, [commands]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) {
      toast.error("Reconhecimento de voz não suportado neste navegador.");
      return;
    }
    setTranscript("");
    setIsListening(true);
    try { recognitionRef.current.start(); } catch { setIsListening(false); }
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  return { isListening, transcript, supported, startListening, stopListening };
}
