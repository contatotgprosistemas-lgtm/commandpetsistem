import { useState, useRef } from "react";
import { Camera, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PhotoUploadProps {
  value?: string | null;
  onChange: (url: string | null) => void;
  folder?: string;
  bucket?: "profile-photos" | "pet-media";
  size?: "sm" | "md";
  /** Use anon client for public forms (no auth) */
  publicUpload?: boolean;
  /** Override empresa_id (when profiles table is not accessible, e.g. operational users) */
  empresaId?: string;
}

export function PhotoUpload({ value, onChange, folder = "clientes", bucket = "profile-photos", size = "md", publicUpload, empresaId }: PhotoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const dimensions = size === "sm" ? "h-20 w-20" : "h-24 w-24";

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Selecione uma imagem válida");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem deve ter no máximo 5MB");
      return;
    }

    setUploading(true);
    try {
      // Get empresa_id for tenant-scoped storage path
      let resolvedEmpresaId = empresaId;
      if (!resolvedEmpresaId) {
        // Use RPC that resolves empresa from either profiles or operational_users
        const { data: empId } = await supabase.rpc("get_user_empresa_id" as any);
        if (empId) {
          resolvedEmpresaId = empId as string;
        } else {
          const { data: profile } = await supabase.from("profiles").select("empresa_id").maybeSingle();
          resolvedEmpresaId = profile?.empresa_id ?? undefined;
        }
      }
      if (!resolvedEmpresaId) {
        throw new Error("Não foi possível identificar a empresa do usuário. Recarregue a página e tente novamente.");
      }
      const ext = file.name.split(".").pop() || "jpg";
      const fileName = `${resolvedEmpresaId}/${folder}/${crypto.randomUUID()}.${ext}`;

      const { error } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, { upsert: true, contentType: file.type });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      onChange(urlData.publicUrl);
    } catch (err: any) {
      toast.error("Erro ao enviar foto: " + err.message);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function handleRemove() {
    onChange(null);
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`${dimensions} rounded-full bg-muted border-2 border-dashed border-border flex items-center justify-center overflow-hidden relative cursor-pointer hover:border-primary/50 transition-colors`}
        onClick={() => !uploading && inputRef.current?.click()}
      >
        {uploading ? (
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        ) : value ? (
          <>
            <img src={value} alt="Foto" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleRemove(); }}
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-sm"
            >
              <X className="h-3 w-3" />
            </button>
          </>
        ) : (
          <Camera className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        className="hidden"
      />
      <span className="text-xs text-muted-foreground">
        {value ? "Alterar foto" : "Adicionar foto"}
      </span>
    </div>
  );
}
