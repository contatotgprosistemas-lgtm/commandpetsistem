import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Image, FileText, Camera, X, Loader2 } from "lucide-react";

interface MediaUploadMenuProps {
  onMediaUploaded: (url: string, type: "image" | "document", fileName?: string) => void;
  disabled?: boolean;
}

export function MediaUploadMenu({ onMediaUploaded, disabled }: MediaUploadMenuProps) {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const uploadFile = async (file: File, type: "image" | "document") => {
    setUploading(true);
    setOpen(false);

    // Get empresa_id for tenant-scoped storage path
    const { data: profile } = await supabase.from("profiles").select("empresa_id").single();
    const empresaId = profile?.empresa_id || "unknown";

    const ext = file.name.split(".").pop() || "bin";
    const fileName = `${empresaId}/${type}_${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("chat-media")
      .upload(fileName, file, { contentType: file.type });

    if (error) {
      toast({ title: "Erro ao enviar arquivo", description: error.message, variant: "destructive" });
      setUploading(false);
      return;
    }

    // Store the file path for signed URL resolution later
    const { data: signedData } = await supabase.storage
      .from("chat-media")
      .createSignedUrl(fileName, 3600);

    setUploading(false);
    onMediaUploaded(signedData?.signedUrl || fileName, type, file.name);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: "image" | "document") => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file, type);
    e.target.value = "";
  };

  if (uploading) {
    return (
      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        disabled={disabled}
        className="h-10 w-10 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground shrink-0 transition-colors disabled:opacity-50"
      >
        {open ? <X className="h-5 w-5" /> : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        )}
      </button>

      {open && (
        <div className="absolute bottom-12 left-0 bg-popover border border-border rounded-xl shadow-lg p-2 flex flex-col gap-1 min-w-[180px] z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <button
            onClick={() => imageInputRef.current?.click()}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted text-sm text-foreground transition-colors"
          >
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Image className="h-4 w-4 text-primary" />
            </div>
            Foto / Imagem
          </button>
          <button
            onClick={() => cameraInputRef.current?.click()}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted text-sm text-foreground transition-colors"
          >
            <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center">
              <Camera className="h-4 w-4 text-accent-foreground" />
            </div>
            Câmera
          </button>
          <button
            onClick={() => docInputRef.current?.click()}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted text-sm text-foreground transition-colors"
          >
            <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center">
              <FileText className="h-4 w-4 text-secondary-foreground" />
            </div>
            Documento
          </button>
        </div>
      )}

      <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, "image")} />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleFileChange(e, "image")} />
      <input ref={docInputRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip" className="hidden" onChange={(e) => handleFileChange(e, "document")} />
    </div>
  );
}
