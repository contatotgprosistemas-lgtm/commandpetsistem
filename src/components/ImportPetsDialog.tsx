import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ParsedPet {
  nome: string;
  especie?: string;
  raca?: string;
  sexo?: string;
  peso?: string;
  idade?: string;
  tutor_nome?: string;
  pelagem?: string;
  data_nascimento?: string;
  comportamento?: string;
  medicacoes?: string;
  restricoes_alimentares?: string;
  cor?: string;
  porte?: string;
}

export function ImportPetsDialog({ onSuccess }: { onSuccess?: () => void }) {
  const [open, setOpen] = useState(false);
  const [parsed, setParsed] = useState<ParsedPet[]>([]);
  const [importing, setImporting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setParsed([]);
    setErrors([]);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    resetState();

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) {
        setErrors(["Arquivo vazio ou sem dados."]);
        return;
      }

      const sep = lines[0].includes(";") ? ";" : ",";
      const headers = lines[0].split(sep).map(h => h.trim().toLowerCase().replace(/"/g, ""));

      const nameIdx = headers.findIndex(h => ["nome", "name", "pet"].includes(h));
      const speciesIdx = headers.findIndex(h => ["especie", "espécie", "species", "tipo"].includes(h));
      const breedIdx = headers.findIndex(h => ["raca", "raça", "breed"].includes(h));
      const sexIdx = headers.findIndex(h => ["sexo", "sex", "genero", "gênero"].includes(h));
      const weightIdx = headers.findIndex(h => ["peso", "weight", "kg"].includes(h));
      const ageIdx = headers.findIndex(h => ["idade", "age"].includes(h));
      const tutorIdx = headers.findIndex(h => ["tutor", "dono", "proprietario", "proprietário", "cliente", "owner"].includes(h));
      const pelagemIdx = headers.findIndex(h => ["pelagem", "pelo", "coat"].includes(h));
      const nascIdx = headers.findIndex(h => ["data_nascimento", "nascimento", "aniversario"].includes(h));
      const compIdx = headers.findIndex(h => ["comportamento", "temperamento"].includes(h));
      const medIdx = headers.findIndex(h => ["medicacoes", "medicações", "remedios", "remédios"].includes(h));
      const restIdx = headers.findIndex(h => ["restricoes_alimentares", "restrições", "restricoes", "alimentacao"].includes(h));
      const corIdx = headers.findIndex(h => ["cor", "color"].includes(h));
      const porteIdx = headers.findIndex(h => ["porte", "size", "tamanho"].includes(h));

      if (nameIdx === -1) {
        setErrors(["Coluna 'nome' não encontrada. Use: nome, especie, raca, cor, sexo, peso, idade, tutor, pelagem, data_nascimento, comportamento, medicacoes, restricoes_alimentares"]);
        return;
      }

      const pets: ParsedPet[] = [];
      const errs: string[] = [];

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(sep).map(c => c.trim().replace(/^"|"$/g, ""));
        const nome = cols[nameIdx]?.trim();
        if (!nome || nome.length < 1) {
          errs.push(`Linha ${i + 1}: nome inválido`);
          continue;
        }
        pets.push({
          nome,
          especie: speciesIdx >= 0 ? cols[speciesIdx] || undefined : undefined,
          raca: breedIdx >= 0 ? cols[breedIdx] || undefined : undefined,
          sexo: sexIdx >= 0 ? cols[sexIdx] || undefined : undefined,
          peso: weightIdx >= 0 ? cols[weightIdx] || undefined : undefined,
          idade: ageIdx >= 0 ? cols[ageIdx] || undefined : undefined,
          tutor_nome: tutorIdx >= 0 ? cols[tutorIdx] || undefined : undefined,
          pelagem: pelagemIdx >= 0 ? cols[pelagemIdx] || undefined : undefined,
          data_nascimento: nascIdx >= 0 ? cols[nascIdx] || undefined : undefined,
          comportamento: compIdx >= 0 ? cols[compIdx] || undefined : undefined,
          medicacoes: medIdx >= 0 ? cols[medIdx] || undefined : undefined,
          restricoes_alimentares: restIdx >= 0 ? cols[restIdx] || undefined : undefined,
          cor: corIdx >= 0 ? cols[corIdx] || undefined : undefined,
          porte: porteIdx >= 0 ? cols[porteIdx] || undefined : undefined,
        });
      }

      setParsed(pets);
      if (errs.length) setErrors(errs);
    };
    reader.readAsText(file, "UTF-8");
  };

  const handleImport = async () => {
    if (!parsed.length) return;
    setImporting(true);

    try {
      const { data: prof } = await supabase.from("profiles").select("empresa_id").single();
      if (!prof?.empresa_id) throw new Error("Empresa não encontrada");

      // Load clients to match tutor names
      const { data: clientes } = await supabase.from("clientes").select("id, nome");
      const clienteMap = new Map(
        (clientes || []).map(c => [c.nome.toLowerCase().trim(), c.id])
      );

      const errs: string[] = [];
      const rows: Array<{
        empresa_id: string;
        nome: string;
        especie: string;
        raca: string | null;
        cor: string | null;
        sexo: string | null;
        peso: number | null;
        idade: string | null;
        cliente_id: string;
        pelagem: string | null;
        data_nascimento: string | null;
        comportamento: string | null;
        medicacoes: string | null;
        restricoes_alimentares: string | null;
        porte: string | null;
      }> = [];


      for (let i = 0; i < parsed.length; i++) {
        const pet = parsed[i];
        let clienteId: string | undefined;

        if (pet.tutor_nome) {
          clienteId = clienteMap.get(pet.tutor_nome.toLowerCase().trim());
          if (!clienteId) {
            errs.push(`Pet "${pet.nome}": tutor "${pet.tutor_nome}" não encontrado`);
            continue;
          }
        } else {
          errs.push(`Pet "${pet.nome}": tutor não informado`);
          continue;
        }

        rows.push({
          empresa_id: prof.empresa_id!,
          nome: pet.nome,
          especie: pet.especie || "Cachorro",
          raca: pet.raca || null,
          sexo: pet.sexo || null,
          peso: pet.peso ? parseFloat(pet.peso) || null : null,
          idade: pet.idade || null,
          cliente_id: clienteId,
          pelagem: pet.pelagem || null,
          data_nascimento: pet.data_nascimento || null,
          comportamento: pet.comportamento || null,
          medicacoes: pet.medicacoes || null,
          restricoes_alimentares: pet.restricoes_alimentares || null,
          cor: pet.cor || null,
          porte: pet.porte || null,
        });
      }

      if (errs.length && !rows.length) {
        setErrors(errs);
        setImporting(false);
        return;
      }

      // Insert in batches of 100
      for (let i = 0; i < rows.length; i += 100) {
        const batch = rows.slice(i, i + 100);
        const { error } = await supabase.from("pets").insert(batch);
        if (error) throw error;
      }

      if (errs.length) {
        toast.warning(`${rows.length} pets importados. ${errs.length} ignorados.`);
        setErrors(errs);
      } else {
        toast.success(`${rows.length} pets importados com sucesso!`);
        setOpen(false);
        resetState();
      }
      onSuccess?.();
    } catch (err: any) {
      toast.error("Erro na importação: " + err.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetState(); }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-2">
          <Upload className="h-4 w-4" strokeWidth={1.5} />
          Importar CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Importar Pets</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-muted/50 rounded-md p-3 text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">Formato esperado (CSV):</p>
            <p className="font-mono break-all text-[10px] leading-relaxed">nome;especie;raca;cor;porte;sexo;peso;idade;tutor;pelagem;data_nascimento;comportamento;medicacoes;restricoes_alimentares</p>
            <p>Separador: <strong>;</strong> ou <strong>,</strong> — Codificação: UTF-8</p>
            <p className="text-warning">O nome do tutor deve corresponder a um contato já cadastrado.</p>
          </div>

          <div>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.txt"
              onChange={handleFile}
              className="hidden"
            />
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => fileRef.current?.click()}
            >
              <FileSpreadsheet className="h-4 w-4" />
              Selecionar arquivo CSV
            </Button>
          </div>

          {errors.length > 0 && (
            <div className="bg-destructive/10 rounded-md p-3 space-y-1">
              {errors.slice(0, 10).map((err, i) => (
                <p key={i} className="text-xs text-destructive flex items-start gap-1.5">
                  <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
                  {err}
                </p>
              ))}
              {errors.length > 10 && (
                <p className="text-xs text-destructive">... e mais {errors.length - 10} erros</p>
              )}
            </div>
          )}

          {parsed.length > 0 && (
            <>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <span className="text-foreground font-medium">{parsed.length} pets encontrados</span>
              </div>
              <ScrollArea className="h-48 border border-border rounded-md">
                <div className="p-2 space-y-1">
                  {parsed.slice(0, 50).map((p, i) => (
                    <div key={i} className="flex items-center justify-between text-xs px-2 py-1.5 rounded hover:bg-muted/50">
                      <span className="font-medium text-foreground">{p.nome}</span>
                      <span className="text-muted-foreground">{p.raca || p.especie || "—"} · {p.tutor_nome || "sem tutor"}</span>
                    </div>
                  ))}
                  {parsed.length > 50 && (
                    <p className="text-xs text-muted-foreground text-center py-2">
                      ... e mais {parsed.length - 50} pets
                    </p>
                  )}
                </div>
              </ScrollArea>
            </>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button
              disabled={!parsed.length || importing}
              onClick={handleImport}
            >
              {importing ? "Importando..." : `Importar ${parsed.length} pets`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
