import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Camera, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  petId: string;
  petName: string;
  clienteId: string;
  empresaId: string;
}

export function OperacionalGaleriaDialog({ open, onOpenChange, petId, petName, clienteId, empresaId }: Props) {
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFiles(Array.from(e.target.files));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    setUploading(true);
    let successCount = 0;

    for (const file of files) {
      const isVideo = file.type.startsWith("video/");
      const mediaType = isVideo ? "video" : "image";
      const ext = file.name.split(".").pop() || "bin";
      const fileName = `${empresaId}/${petId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from("pet-media")
        .upload(fileName, file, { contentType: file.type });

      if (uploadErr) {
        toast.error(`Erro ao enviar ${file.name}: ${uploadErr.message}`);
        continue;
      }

      const { data: urlData } = supabase.storage.from("pet-media").getPublicUrl(fileName);

      const { error: insertErr } = await supabase.from("pet_media").insert({
        empresa_id: empresaId,
        cliente_id: clienteId,
        pet_id: petId,
        media_url: urlData.publicUrl,
        media_type: mediaType,
        caption: caption || null,
      });

      if (insertErr) {
        toast.error(`Erro ao salvar registro: ${insertErr.message}`);
      } else {
        successCount++;
      }
    }

    if (successCount > 0) {
      toast.success(`${successCount} arquivo(s) enviado(s)!`);

      // Notify the client
      await supabase.from("customer_notifications").insert({
        empresa_id: empresaId,
        cliente_id: clienteId,
        title: `Novas fotos — ${petName}`,
        message: `${successCount} nova(s) foto(s)/vídeo(s) de ${petName} foram adicionadas à galeria.`,
        type: "sistema",
      });

      onOpenChange(false);
      setFiles([]);
      setCaption("");
    }
    setUploading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Galeria — {petName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Fotos/Vídeos</Label>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*"
              className="hidden"
              onChange={handleFilesChange}
            />
            <Button
              type="button"
              variant="outline"
              className="w-full h-24 border-dashed gap-2 text-muted-foreground"
              onClick={() => fileInputRef.current?.click()}
            >
              <Camera className="h-6 w-6" />
              {files.length > 0 ? `${files.length} arquivo(s) selecionado(s)` : "Selecionar arquivos"}
            </Button>
          </div>
          <div className="space-y-2">
            <Label>Legenda (opcional)</Label>
            <Textarea value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Ex: Brincando no parquinho" />
          </div>
          <Button onClick={handleUpload} disabled={uploading || files.length === 0} className="w-full gap-2">
            {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
            Enviar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}