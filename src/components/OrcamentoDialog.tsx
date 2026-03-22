import React, { useState, useEffect, useMemo } from "react";
import { Calculator, RotateCcw, X, Send, FileText, Download } from "lucide-react";
import jsPDF from "jspdf";
import { differenceInCalendarDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface ServicoItem {
  id: string;
  descricao: string;
  valor: number;
  tipo: string;
}

function DateField({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  const dateValue = value ? new Date(value + "T00:00:00") : undefined;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn("w-full justify-start text-left font-normal h-10", !value && "text-muted-foreground")}>
          <CalendarIcon className="mr-2 h-4 w-4" />
          {dateValue ? format(dateValue, "dd/MM/yyyy") : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={dateValue}
          onSelect={(d) => onChange(d ? format(d, "yyyy-MM-dd") : "")}
          initialFocus
          locale={ptBR}
          className={cn("p-3 pointer-events-auto")}
        />
      </PopoverContent>
    </Popover>
  );
}

export function OrcamentoDialog() {
  const [open, setOpen] = useState(false);
  const [servicos, setServicos] = useState<ServicoItem[]>([]);
  const [selectedServico, setSelectedServico] = useState("");
  const [dataEntrada, setDataEntrada] = useState("");
  const [dataSaida, setDataSaida] = useState("");
  const [cliente, setCliente] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [desconto, setDesconto] = useState("");
  const [descontoAplicado, setDescontoAplicado] = useState(0);
  const [telefone, setTelefone] = useState("");

  useEffect(() => {
    if (open) {
      supabase.from("servicos").select("id, descricao, valor, tipo").eq("ativo", true).order("descricao")
        .then(({ data }) => { if (data) setServicos(data as ServicoItem[]); });
    }
  }, [open]);

  const servicoObj = useMemo(() => servicos.find(s => s.descricao === selectedServico), [servicos, selectedServico]);

  const diarias = useMemo(() => {
    if (!dataEntrada || !dataSaida) return 0;
    const diff = differenceInCalendarDays(new Date(dataSaida + "T00:00:00"), new Date(dataEntrada + "T00:00:00"));
    return diff > 0 ? diff : 0;
  }, [dataEntrada, dataSaida]);

  const isHotel = useMemo(() => {
    if (!servicoObj) return false;
    const d = servicoObj.descricao.toLowerCase();
    const t = servicoObj.tipo.toLowerCase();
    return d.includes("hotel") || d.includes("hospedagem") || d.includes("diária") || t.includes("hotel") || t.includes("hospedagem");
  }, [servicoObj]);

  const valorBase = useMemo(() => {
    if (!servicoObj) return 0;
    return isHotel && diarias > 0 ? servicoObj.valor * diarias : servicoObj.valor;
  }, [servicoObj, isHotel, diarias]);

  const valorFinal = Math.max(0, valorBase - descontoAplicado);

  function aplicarDesconto() {
    const val = parseFloat(desconto);
    if (!isNaN(val) && val > 0) {
      setDescontoAplicado(val);
      toast({ title: `Desconto de R$ ${val.toFixed(2)} aplicado` });
    }
  }

  function zerar() {
    setSelectedServico("");
    setDataEntrada("");
    setDataSaida("");
    setCliente("");
    setObservacoes("");
    setDesconto("");
    setDescontoAplicado(0);
    setTelefone("");
  }

  function enviarWhatsApp() {
    if (!telefone) {
      toast({ title: "Informe o número do celular", variant: "destructive" });
      return;
    }
    const num = telefone.replace(/\D/g, "");
    const msg = [
      `*Orçamento*`,
      `Serviço: ${selectedServico || "—"}`,
      isHotel && diarias > 0 ? `Diárias: ${diarias}` : null,
      `Entrada: ${dataEntrada ? format(new Date(dataEntrada + "T00:00:00"), "dd/MM/yyyy") : "—"}`,
      `Saída: ${dataSaida ? format(new Date(dataSaida + "T00:00:00"), "dd/MM/yyyy") : "—"}`,
      cliente ? `Cliente: ${cliente}` : null,
      descontoAplicado > 0 ? `Desconto: R$ ${descontoAplicado.toFixed(2)}` : null,
      `*Total: R$ ${valorFinal.toFixed(2)}*`,
      observacoes ? `Obs: ${observacoes}` : null,
    ].filter(Boolean).join("\n");

    window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`, "_blank");
  }

  function gerarPDF() {
    const doc = new jsPDF();
    const pw = doc.internal.pageSize.getWidth();
    let y = 20;

    // Header
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("ORÇAMENTO", pw / 2, y, { align: "center" });
    y += 12;

    doc.setDrawColor(59, 130, 246);
    doc.setLineWidth(0.5);
    doc.line(20, y, pw - 20, y);
    y += 10;

    // Details
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");

    const addLine = (label: string, value: string) => {
      doc.setFont("helvetica", "bold");
      doc.text(label, 20, y);
      doc.setFont("helvetica", "normal");
      doc.text(value, 70, y);
      y += 8;
    };

    if (selectedServico) addLine("Serviço:", selectedServico);
    if (dataEntrada) addLine("Entrada:", format(new Date(dataEntrada + "T00:00:00"), "dd/MM/yyyy"));
    if (dataSaida) addLine("Saída:", format(new Date(dataSaida + "T00:00:00"), "dd/MM/yyyy"));
    if (isHotel && diarias > 0) addLine("Diárias:", String(diarias));
    if (cliente) addLine("Cliente:", cliente);
    
    y += 4;
    doc.line(20, y, pw - 20, y);
    y += 10;

    if (descontoAplicado > 0) {
      addLine("Subtotal:", `R$ ${valorBase.toFixed(2)}`);
      addLine("Desconto:", `- R$ ${descontoAplicado.toFixed(2)}`);
    }

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("TOTAL:", 20, y);
    doc.text(`R$ ${valorFinal.toFixed(2)}`, 70, y);
    y += 12;

    if (observacoes) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("Observações:", 20, y);
      y += 6;
      const lines = doc.splitTextToSize(observacoes, pw - 40);
      doc.text(lines, 20, y);
      y += lines.length * 5;
    }

    // Footer
    y += 10;
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Gerado em ${format(new Date(), "dd/MM/yyyy HH:mm")}`, pw / 2, y, { align: "center" });

    doc.save(`orcamento_${format(new Date(), "yyyyMMdd_HHmm")}.pdf`);
    toast({ title: "PDF gerado com sucesso!" });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Calculator className="h-4 w-4" strokeWidth={1.5} />
          Orçar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Orçamento</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Row 1: Serviço + Entrada + Saída */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Serviço</Label>
              <Select onValueChange={setSelectedServico} value={selectedServico}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {servicos.map(s => (
                    <SelectItem key={s.id} value={s.descricao}>{s.descricao}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Entrada</Label>
              <DateField value={dataEntrada} onChange={setDataEntrada} placeholder="Data entrada" />
            </div>
            <div className="space-y-1.5">
              <Label>
                Saída
                {isHotel && diarias > 0 && (
                  <span className="text-primary font-semibold ml-1">» {diarias} dia{diarias > 1 ? "s" : ""}</span>
                )}
              </Label>
              <DateField value={dataSaida} onChange={setDataSaida} placeholder="Data saída" />
            </div>
          </div>

          {/* Row 2: Cliente + Observações */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Cliente</Label>
              <Input value={cliente} onChange={e => setCliente(e.target.value)} placeholder="Nome do cliente" />
            </div>
            <div className="space-y-1.5">
              <Label>Observações</Label>
              <Textarea rows={2} value={observacoes} onChange={e => setObservacoes(e.target.value)} placeholder="Observações..." />
            </div>
          </div>

          {/* Orçamento total */}
          <div className="flex items-center gap-4 py-3 px-4 rounded-lg bg-muted/40 border border-border">
            <span className="text-sm font-medium text-foreground">Orçamento:</span>
            <span className="text-xl font-bold text-foreground tabular-nums">
              R$ {valorFinal.toFixed(2)}
            </span>
            {descontoAplicado > 0 && (
              <span className="text-xs text-muted-foreground line-through">
                R$ {valorBase.toFixed(2)}
              </span>
            )}
          </div>

          {/* Desconto + WhatsApp */}
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Desconto R$</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="Desconto R$"
                value={desconto}
                onChange={e => setDesconto(e.target.value)}
                className="w-32"
              />
            </div>
            <Button size="sm" variant="outline" className="gap-1 bg-amber-400 hover:bg-amber-500 text-amber-950 border-amber-400" onClick={aplicarDesconto}>
              Aplicar
            </Button>

            <div className="space-y-1.5 ml-auto">
              <Label className="text-xs">Celular</Label>
              <Input
                placeholder="Informe o número do cel"
                value={telefone}
                onChange={e => setTelefone(e.target.value)}
                className="w-48"
              />
            </div>
            <Button size="sm" className="gap-1 bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-500" onClick={enviarWhatsApp}>
              <Send className="h-3.5 w-3.5" />
              Enviar
            </Button>
            <Button size="sm" variant="outline" className="gap-1" onClick={gerarPDF}>
              <Download className="h-3.5 w-3.5" />
              Gerar PDF
            </Button>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button size="sm" variant="outline" className="gap-1 bg-emerald-400 hover:bg-emerald-500 text-emerald-950 border-emerald-400" onClick={zerar}>
              <RotateCcw className="h-3.5 w-3.5" />
              Zerar
            </Button>
            <Button size="sm" variant="outline" className="gap-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground border-destructive" onClick={() => setOpen(false)}>
              <X className="h-3.5 w-3.5" />
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
