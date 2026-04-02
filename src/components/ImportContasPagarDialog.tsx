import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, Download, Loader2, FileSpreadsheet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import * as XLSX from "xlsx";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ImportContasPagarDialog({ open, onOpenChange, onSuccess }: Props) {
  const { profile } = useAuth();
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<any[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  function downloadTemplate() {
    const ws = XLSX.utils.aoa_to_sheet([
      ["descricao", "valor", "vencimento", "fornecedor", "categoria", "parcelas"],
      ["Aluguel", 2500.00, "2025-01-10", "Imobiliária XYZ", "Despesas Fixas", 1],
      ["Ração Premium", 450.00, "2025-01-15", "PetFood Ltda", "Insumos", 3],
    ]);
    ws["!cols"] = [{ wch: 20 }, { wch: 12 }, { wch: 14 }, { wch: 20 }, { wch: 16 }, { wch: 10 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Contas a Pagar");
    XLSX.writeFile(wb, "modelo_contas_pagar.xlsx");
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target?.result, { type: "binary" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(ws);
      setPreview(rows);
    };
    reader.readAsBinaryString(file);
  }

  async function handleImport() {
    if (!profile?.empresa_id || preview.length === 0) return;
    setImporting(true);
    try {
      const records = preview.map((row) => ({
        empresa_id: profile.empresa_id!,
        descricao: String(row.descricao || ""),
        valor: Number(row.valor) || 0,
        vencimento: formatDate(row.vencimento),
        fornecedor: String(row.fornecedor || "—"),
        categoria: row.categoria || null,
        status: "pendente",
      }));

      const { error } = await supabase.from("contas_pagar").insert(records);
      if (error) throw error;
      toast.success(`${records.length} conta(s) a pagar importada(s)`);
      setPreview([]);
      if (fileRef.current) fileRef.current.value = "";
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      toast.error("Erro ao importar: " + err.message);
    } finally {
      setImporting(false);
    }
  }

  function formatDate(val: any): string {
    if (!val) return new Date().toISOString().split("T")[0];
    if (typeof val === "number") {
      const d = XLSX.SSF.parse_date_code(val);
      return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
    }
    const s = String(val);
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
      const [d, m, y] = s.split("/");
      return `${y}-${m}-${d}`;
    }
    return new Date().toISOString().split("T")[0];
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Importar Contas a Pagar</DialogTitle>
          <DialogDescription>Importe contas a pagar via arquivo Excel (.xlsx)</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Button variant="outline" className="gap-2" onClick={downloadTemplate}>
            <Download className="h-4 w-4" /> Baixar Modelo Excel
          </Button>

          <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
            <FileSpreadsheet className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground mb-2">Selecione o arquivo Excel</p>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleFile} className="text-sm" />
          </div>

          {preview.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">{preview.length} registro(s) encontrado(s)</p>
              <div className="max-h-48 overflow-auto border rounded-lg">
                <table className="w-full text-xs">
                  <thead className="bg-muted">
                    <tr>
                      <th className="p-2 text-left">Descrição</th>
                      <th className="p-2 text-right">Valor</th>
                      <th className="p-2 text-left">Vencimento</th>
                      <th className="p-2 text-left">Fornecedor</th>
                      <th className="p-2 text-left">Categoria</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.slice(0, 10).map((r, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-2">{r.descricao}</td>
                        <td className="p-2 text-right">{Number(r.valor).toFixed(2)}</td>
                        <td className="p-2">{String(r.vencimento)}</td>
                        <td className="p-2">{r.fornecedor}</td>
                        <td className="p-2">{r.categoria || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {preview.length > 10 && <p className="text-xs text-muted-foreground">...e mais {preview.length - 10}</p>}

              <Button onClick={handleImport} disabled={importing} className="w-full gap-2">
                {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Importar {preview.length} registro(s)
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
