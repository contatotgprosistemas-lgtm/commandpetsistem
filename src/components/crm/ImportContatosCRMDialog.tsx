import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentEmpresa } from "@/lib/useCurrentEmpresa";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Upload, FileSpreadsheet, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

type Row = Record<string, string>;

function parseCSV(text: string): Row[] {
  // Simple CSV parser supporting quoted fields and ; or , separators.
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];
  const sep = (lines[0].match(/;/g)?.length ?? 0) > (lines[0].match(/,/g)?.length ?? 0) ? ";" : ",";
  const splitLine = (line: string): string[] => {
    const out: string[] = [];
    let cur = "", inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (ch === sep && !inQuotes) {
        out.push(cur); cur = "";
      } else cur += ch;
    }
    out.push(cur);
    return out;
  };
  const headers = splitLine(lines[0]).map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const cols = splitLine(line);
    const row: Row = {};
    headers.forEach((h, i) => { row[h] = (cols[i] ?? "").trim(); });
    return row;
  });
}

const FIELD_MAP: Record<string, string> = {
  nome: "nome", name: "nome", "nome completo": "nome",
  whatsapp: "whatsapp", celular: "whatsapp", telefone: "telefone", phone: "telefone",
  email: "email", "e-mail": "email",
  empresa: "empresa", company: "empresa",
  origem: "origem", source: "origem",
  cidade: "cidade", city: "cidade",
  estado: "estado", uf: "estado",
  observacoes: "observacoes", "observações": "observacoes", notes: "observacoes",
};

export function ImportContatosCRMDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const qc = useQueryClient();
  const { data: empresaId } = useCurrentEmpresa();
  const [rows, setRows] = useState<Row[]>([]);
  const [fileName, setFileName] = useState("");
  const [result, setResult] = useState<{ ok: number; fail: number } | null>(null);

  const handleFile = async (file: File) => {
    setFileName(file.name);
    setResult(null);
    const text = await file.text();
    setRows(parseCSV(text));
  };

  const importar = useMutation({
    mutationFn: async () => {
      if (!empresaId) throw new Error("Empresa não identificada");
      let ok = 0, fail = 0;
      const batch: any[] = [];
      for (const r of rows) {
        const c: any = { empresa_id: empresaId, origem: "import_csv" };
        for (const [k, v] of Object.entries(r)) {
          const target = FIELD_MAP[k.toLowerCase()];
          if (target && v) c[target] = target === "estado" ? v.toUpperCase().slice(0, 2) : v;
        }
        if (c.whatsapp) c.whatsapp = String(c.whatsapp).replace(/\D/g, "");
        if (c.telefone) c.telefone = String(c.telefone).replace(/\D/g, "");
        if (!c.nome) { fail++; continue; }
        batch.push(c);
      }
      // upsert em lotes de 200
      for (let i = 0; i < batch.length; i += 200) {
        const chunk = batch.slice(i, i + 200);
        const { error } = await supabase.from("crm_contatos").insert(chunk);
        if (error) fail += chunk.length;
        else ok += chunk.length;
      }
      return { ok, fail };
    },
    onSuccess: (r) => {
      setResult(r);
      qc.invalidateQueries({ queryKey: ["crm-contatos"] });
      if (r.ok > 0) toast.success(`${r.ok} contato(s) importado(s)`);
      if (r.fail > 0) toast.warning(`${r.fail} linha(s) com erro/sem nome`);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const reset = () => { setRows([]); setFileName(""); setResult(null); };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Importar contatos (CSV)</DialogTitle>
          <DialogDescription>
            Arquivo .csv com cabeçalho. Colunas reconhecidas: <strong>nome</strong>, whatsapp, telefone, email, empresa, origem, cidade, estado, observacoes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <label className="block border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-muted/30 transition">
            <input type="file" accept=".csv,text/csv" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            <FileSpreadsheet className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm font-medium">{fileName || "Clique para selecionar um arquivo .csv"}</p>
            <p className="text-xs text-muted-foreground mt-1">Separadores , ou ; suportados</p>
          </label>

          {rows.length > 0 && (
            <div className="rounded-lg border bg-muted/30 p-3 text-xs">
              <div className="font-medium mb-1">Pré-visualização: {rows.length} linha(s)</div>
              <div className="max-h-32 overflow-y-auto space-y-0.5">
                {rows.slice(0, 5).map((r, i) => (
                  <div key={i} className="truncate text-muted-foreground">
                    {Object.values(r).slice(0, 4).join(" · ")}
                  </div>
                ))}
                {rows.length > 5 && <div className="text-muted-foreground italic">… +{rows.length - 5}</div>}
              </div>
            </div>
          )}

          {result && (
            <div className={`rounded-lg border p-3 text-sm flex items-start gap-2 ${result.fail > 0 ? "border-amber-500/40 bg-amber-500/5" : "border-success/40 bg-success/5"}`}>
              {result.fail > 0 ? <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5" /> : <CheckCircle2 className="h-4 w-4 text-success mt-0.5" />}
              <div>
                <div className="font-medium">Importação concluída</div>
                <div className="text-xs text-muted-foreground">{result.ok} importados · {result.fail} com erro</div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
          <Button onClick={() => importar.mutate()} disabled={rows.length === 0 || importar.isPending}>
            {importar.isPending ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Upload className="h-4 w-4 mr-1.5" />}
            Importar {rows.length > 0 && `(${rows.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}