import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ParsedContact {
  nome: string;
  cpf?: string;
  whatsapp?: string;
  email?: string;
  cep?: string;
  endereco?: string;
  data_nascimento?: string;
  como_conheceu?: string;
  notas?: string;
}

async function buscarCep(cep: string): Promise<string | null> {
  const clean = cep.replace(/\D/g, "");
  if (clean.length !== 8) return null;
  try {
    const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
    const data = await res.json();
    if (!data.erro) {
      return `${data.logradouro}, ${data.bairro}, ${data.localidade} - ${data.uf}`;
    }
  } catch {}
  return null;
}

export function ImportContatosDialog({ onSuccess }: { onSuccess?: () => void }) {
  const [open, setOpen] = useState(false);
  const [parsed, setParsed] = useState<ParsedContact[]>([]);
  const [importing, setImporting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setParsed([]);
    setErrors([]);
  };

  const parseCSVText = (text: string) => {
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) {
      setErrors(["Arquivo vazio ou sem dados."]);
      return;
    }

    const sep = lines[0].includes(";") ? ";" : ",";
    const headers = lines[0].split(sep).map(h => h.trim().toLowerCase().replace(/"/g, "").normalize("NFD").replace(/[\u0300-\u036f]/g, ""));

    const nameIdx = headers.findIndex(h => ["nome", "name", "contato"].includes(h));
    const cpfIdx = headers.findIndex(h => ["cpf", "documento", "doc"].includes(h));
    const whatsIdx = headers.findIndex(h => ["whatsapp", "whattsapp", "whatsap", "whatssapp", "wpp", "zap", "telefone", "phone", "tel", "fone"].includes(h));
    const emailIdx = headers.findIndex(h => ["email", "e-mail"].includes(h));
    const cepIdx = headers.findIndex(h => ["cep", "zip", "zipcode", "codigo_postal"].includes(h));
    const addrIdx = headers.findIndex(h => ["endereco", "endereço", "address"].includes(h));
    const nascIdx = headers.findIndex(h => ["data_nascimento", "nascimento", "aniversario", "aniversário"].includes(h));
    const comoIdx = headers.findIndex(h => ["como_conheceu", "origem", "indicacao", "indicação"].includes(h));
    const notasIdx = headers.findIndex(h => ["notas", "observacoes", "observações", "obs"].includes(h));

    if (nameIdx === -1) {
      setErrors(["Coluna 'nome' não encontrada. Use: nome;cpf;whatsapp;email;cep;endereco"]);
      return;
    }

    const contacts: ParsedContact[] = [];
    const errs: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(sep).map(c => c.trim().replace(/^"|"$/g, ""));
      const nome = cols[nameIdx]?.trim();
      if (!nome || nome.length < 2) {
        errs.push(`Linha ${i + 1}: nome inválido`);
        continue;
      }
      contacts.push({
        nome,
        cpf: cpfIdx >= 0 ? cols[cpfIdx] || undefined : undefined,
        whatsapp: whatsIdx >= 0 ? cols[whatsIdx] || undefined : undefined,
        email: emailIdx >= 0 ? cols[emailIdx] || undefined : undefined,
        cep: cepIdx >= 0 ? cols[cepIdx] || undefined : undefined,
        endereco: addrIdx >= 0 ? cols[addrIdx] || undefined : undefined,
        data_nascimento: nascIdx >= 0 ? cols[nascIdx] || undefined : undefined,
        como_conheceu: comoIdx >= 0 ? cols[comoIdx] || undefined : undefined,
        notas: notasIdx >= 0 ? cols[notasIdx] || undefined : undefined,
      });
    }

    setParsed(contacts);
    if (errs.length) setErrors(errs);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    resetState();

    // Try UTF-8 first; if garbled (replacement char), fall back to Latin-1
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      if (!text) return;

      if (text.includes("\uFFFD")) {
        // Contains replacement characters → re-read as Latin-1
        const reader2 = new FileReader();
        reader2.onload = (ev2) => {
          const text2 = ev2.target?.result as string;
          if (text2) parseCSVText(text2);
        };
        reader2.readAsText(file, "ISO-8859-1");
      } else {
        parseCSVText(text);
      }
    };
    reader.readAsText(file, "UTF-8");
  };

  function formatDate(val: string | undefined): string | null {
    if (!val) return null;
    const s = val.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
      const [d, m, y] = s.split("/");
      return `${y}-${m}-${d}`;
    }
    return null;
  }

  const handleImport = async () => {
    if (!parsed.length) return;
    setImporting(true);

    try {
      const { data: prof } = await supabase.from("profiles").select("empresa_id").single();
      if (!prof?.empresa_id) throw new Error("Empresa não encontrada");

      // Resolve CEPs to addresses in parallel (batch of 10 to avoid rate-limiting)
      const cepsToResolve = new Map<string, string | null>();
      const uniqueCeps = [...new Set(
        parsed.filter(c => c.cep && !c.endereco).map(c => c.cep!.replace(/\D/g, "")).filter(c => c.length === 8)
      )];

      for (let i = 0; i < uniqueCeps.length; i += 10) {
        const batch = uniqueCeps.slice(i, i + 10);
        const results = await Promise.all(batch.map(cep => buscarCep(cep)));
        batch.forEach((cep, idx) => cepsToResolve.set(cep, results[idx]));
      }

      const rows = parsed.map(c => {
        let endereco = c.endereco || null;
        if (!endereco && c.cep) {
          const cleanCep = c.cep.replace(/\D/g, "");
          const resolved = cepsToResolve.get(cleanCep);
          if (resolved) endereco = resolved;
        }

        return {
          empresa_id: prof.empresa_id!,
          nome: c.nome,
          cpf: c.cpf || null,
          whatsapp: c.whatsapp || null,
          email: c.email || null,
          cep: c.cep || null,
          endereco,
          data_nascimento: formatDate(c.data_nascimento),
          como_conheceu: c.como_conheceu || null,
          notas: c.notas || null,
        };
      });

      for (let i = 0; i < rows.length; i += 100) {
        const batch = rows.slice(i, i + 100);
        const { error } = await supabase.from("clientes").insert(batch);
        if (error) throw error;
      }

      toast.success(`${parsed.length} contatos importados com sucesso!`);
      setOpen(false);
      resetState();
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
          <DialogTitle>Importar Contatos</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-muted/50 rounded-md p-3 text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">Formato esperado (CSV):</p>
            <p className="font-mono break-all text-[10px] leading-relaxed">nome;cpf;whatsapp;email;cep;endereco;data_nascimento;como_conheceu;notas</p>
            <p>Separador: <strong>;</strong> ou <strong>,</strong> — Codificação: UTF-8</p>
            <p className="text-muted-foreground">Apenas a coluna <strong>nome</strong> é obrigatória. Se informar o <strong>CEP</strong>, o endereço será preenchido automaticamente.</p>
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
              {errors.map((err, i) => (
                <p key={i} className="text-xs text-destructive flex items-start gap-1.5">
                  <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
                  {err}
                </p>
              ))}
            </div>
          )}

          {parsed.length > 0 && (
            <>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <span className="text-foreground font-medium">{parsed.length} contatos encontrados</span>
              </div>
              <ScrollArea className="h-48 border border-border rounded-md">
                <div className="p-2 space-y-1">
                  {parsed.slice(0, 50).map((c, i) => (
                    <div key={i} className="flex items-center justify-between text-xs px-2 py-1.5 rounded hover:bg-muted/50">
                      <span className="font-medium text-foreground">{c.nome}</span>
                      <span className="text-muted-foreground font-mono">{c.whatsapp || c.cep || "—"}</span>
                    </div>
                  ))}
                  {parsed.length > 50 && (
                    <p className="text-xs text-muted-foreground text-center py-2">
                      ... e mais {parsed.length - 50} contatos
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
              {importing ? "Importando..." : `Importar ${parsed.length} contatos`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
