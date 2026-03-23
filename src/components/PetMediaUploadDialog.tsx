import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Camera, Loader2, Upload, Image, Video } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

interface PetMediaUploadDialogProps {
  onSuccess?: () => void;
}

export function PetMediaUploadDialog({ onSuccess }: PetMediaUploadDialogProps) {
  const { profile } = useAuth();
  const empresaId = profile?.empresa_id;
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedPetId, setSelectedPetId] = useState("");
  const [caption, setCaption] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: pets } = useQuery({
    queryKey: ["pets-for-media", empresaId],
    queryFn: async () => {
      const { data } = await supabase
        .from("pets")
        .select("id, nome, cliente_id, cliente:clientes(id, nome)")
        .order("nome");
      return data ?? [];
    },
    enabled: !!empresaId && open,
  });

  const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleUpload = async () => {
    if (!selectedPetId || files.length === 0 || !empresaId) return;

    const pet = pets?.find((p) => p.id === selectedPetId);
    if (!pet) return;

    setUploading(true);
    let successCount = 0;

    for (const file of files) {
      const isVideo = file.type.startsWith("video/");
      const mediaType = isVideo ? "video" : "image";
      const ext = file.name.split(".").pop() || "bin";
      const fileName = `${empresaId}/${selectedPetId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

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
        cliente_id: pet.cliente_id,
        pet_id: selectedPetId,
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
      toast.success(`${successCount} arquivo(s) enviado(s) com sucesso!`);
      onSuccess?.();
      setOpen(false);
      setFiles([]);
      setCaption("");
      setSelectedPetId("");
    }
    setUploading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Camera className="h-4 w-4" />
          Enviar Fotos/Vídeos
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enviar Fotos e Vídeos</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Pet</Label>
            <Select value={selectedPetId} onValueChange={setSelectedPetId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o pet" />
              </SelectTrigger>
              <SelectContent>
                {pets?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nome} — {(p.cliente as any)?.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Arquivos</Label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
            >
              {files.length > 0 ? (
                <div className="space-y-1">
                  {files.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 justify-center text-sm text-foreground">
                      {f.type.startsWith("video/") ? (
                        <Video className="h-4 w-4 text-primary" />
                      ) : (
                        <Image className="h-4 w-4 text-primary" />
                      )}
                      {f.name}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Upload className="h-8 w-8" />
                  <span className="text-sm">Clique para selecionar fotos ou vídeos</span>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              onChange={handleFilesChange}
            />
          </div>

          <div className="space-y-2">
            <Label>Legenda (opcional)</Label>
            <Textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Dia de banho! 🛁"
              rows={2}
            />
          </div>

          <Button
            onClick={handleUpload}
            disabled={uploading || !selectedPetId || files.length === 0}
            className="w-full"
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              "Enviar"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
