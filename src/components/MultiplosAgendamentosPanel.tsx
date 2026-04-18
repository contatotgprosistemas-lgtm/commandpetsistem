import { useMemo, useState } from "react";
import { addDays, format, differenceInCalendarDays, eachDayOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Plus, Trash2, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface Estadia {
  id: string;
  data_entrada: string; // yyyy-MM-dd
  hora_entrada: string; // HH:mm
  data_saida: string;
  hora_saida: string;
}

const DIAS_SEMANA = [
  { v: 0, label: "Dom" },
  { v: 1, label: "Seg" },
  { v: 2, label: "Ter" },
  { v: 3, label: "Qua" },
  { v: 4, label: "Qui" },
  { v: 5, label: "Sex" },
  { v: 6, label: "Sáb" },
];

interface Props {
  estadias: Estadia[];
  onChange: (e: Estadia[]) => void;
  valorPorDiaria: number;
  qtdPets: number;
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function DateField({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const date = value ? new Date(value + "T00:00:00") : undefined;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn("w-full justify-start text-left font-normal h-9 text-xs", !value && "text-muted-foreground")}>
          <CalendarIcon className="mr-2 h-3.5 w-3.5" />
          {date ? format(date, "dd/MM/yyyy") : placeholder || "Selecione"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={date} onSelect={d => onChange(d ? format(d, "yyyy-MM-dd") : "")} initialFocus locale={ptBR} className="p-3 pointer-events-auto" />
      </PopoverContent>
    </Popover>
  );
}

export function MultiplosAgendamentosPanel({ estadias, onChange, valorPorDiaria, qtdPets }: Props) {
  const [periodoIni, setPeriodoIni] = useState("");
  const [periodoFim, setPeriodoFim] = useState("");
  const [diasSemana, setDiasSemana] = useState<number[]>([6, 0]); // sáb e dom default
  const [horaEntrada, setHoraEntrada] = useState("09:00");
  const [horaSaida, setHoraSaida] = useState("18:00");
  const [pernoite, setPernoite] = useState(true); // saída no dia seguinte da entrada

  function toggleDia(d: number) {
    setDiasSemana(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
  }

  function gerar() {
    if (!periodoIni || !periodoFim || diasSemana.length === 0) return;
    const start = new Date(periodoIni + "T00:00:00");
    const end = new Date(periodoFim + "T00:00:00");
    if (end < start) return;

    const dias = eachDayOfInterval({ start, end }).filter(d => diasSemana.includes(d.getDay()));
    const novas: Estadia[] = dias.map(d => {
      const entrada = format(d, "yyyy-MM-dd");
      const saida = pernoite ? format(addDays(d, 1), "yyyy-MM-dd") : entrada;
      return { id: uid(), data_entrada: entrada, hora_entrada: horaEntrada, data_saida: saida, hora_saida: horaSaida };
    });

    // Mescla evitando duplicatas (mesma data_entrada + hora_entrada)
    const existentes = new Set(estadias.map(e => `${e.data_entrada}T${e.hora_entrada}`));
    const merged = [...estadias, ...novas.filter(n => !existentes.has(`${n.data_entrada}T${n.hora_entrada}`))];
    merged.sort((a, b) => `${a.data_entrada}T${a.hora_entrada}`.localeCompare(`${b.data_entrada}T${b.hora_entrada}`));
    onChange(merged);
  }

  function adicionarManual() {
    onChange([...estadias, { id: uid(), data_entrada: "", hora_entrada: "09:00", data_saida: "", hora_saida: "18:00" }]);
  }

  function atualizar(id: string, campo: keyof Estadia, valor: string) {
    onChange(estadias.map(e => e.id === id ? { ...e, [campo]: valor } : e));
  }

  function remover(id: string) {
    onChange(estadias.filter(e => e.id !== id));
  }

  function limparTudo() {
    onChange([]);
  }

  const totalDiarias = useMemo(() => {
    return estadias.reduce((sum, e) => {
      if (!e.data_entrada || !e.data_saida) return sum;
      const diff = differenceInCalendarDays(new Date(e.data_saida + "T00:00:00"), new Date(e.data_entrada + "T00:00:00"));
      return sum + Math.max(diff, 1); // mínimo 1 diária por estadia
    }, 0);
  }, [estadias]);

  const totalEstimado = totalDiarias * valorPorDiaria * Math.max(qtdPets, 1);

  return (
    <div className="space-y-4">
      {/* Gerador por recorrência */}
      <div className="rounded-lg border border-border p-3 space-y-3 bg-muted/20">
        <div className="flex items-center gap-2">
          <Wand2 className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Gerar por recorrência</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div>
            <Label className="text-xs">De</Label>
            <DateField value={periodoIni} onChange={setPeriodoIni} placeholder="Início" />
          </div>
          <div>
            <Label className="text-xs">Até</Label>
            <DateField value={periodoFim} onChange={setPeriodoFim} placeholder="Fim" />
          </div>
          <div>
            <Label className="text-xs">Hora entrada</Label>
            <Input type="time" value={horaEntrada} onChange={e => setHoraEntrada(e.target.value)} className="h-9 text-xs" />
          </div>
          <div>
            <Label className="text-xs">Hora saída</Label>
            <Input type="time" value={horaSaida} onChange={e => setHoraSaida(e.target.value)} className="h-9 text-xs" />
          </div>
        </div>

        <div>
          <Label className="text-xs mb-1 block">Dias da semana</Label>
          <div className="flex flex-wrap gap-1.5">
            {DIAS_SEMANA.map(d => (
              <button
                key={d.v}
                type="button"
                onClick={() => toggleDia(d.v)}
                className={cn(
                  "px-2.5 py-1 rounded-md text-xs font-medium border transition-colors",
                  diasSemana.includes(d.v)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-border text-muted-foreground hover:text-foreground"
                )}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <Checkbox checked={pernoite} onCheckedChange={v => setPernoite(!!v)} />
          <span className="text-xs">Pernoite (saída no dia seguinte da entrada)</span>
        </label>

        <div className="flex gap-2">
          <Button type="button" size="sm" onClick={gerar} disabled={!periodoIni || !periodoFim || diasSemana.length === 0}>
            Gerar estadias
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={adicionarManual}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar manualmente
          </Button>
          {estadias.length > 0 && (
            <Button type="button" size="sm" variant="ghost" className="text-destructive hover:text-destructive ml-auto" onClick={limparTudo}>
              Limpar tudo
            </Button>
          )}
        </div>
      </div>

      {/* Lista de estadias */}
      {estadias.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">Nenhuma estadia gerada ainda. Use o gerador acima ou adicione manualmente.</p>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium">Estadias ({estadias.length})</Label>
            <Badge variant="secondary" className="text-xs">
              {totalDiarias} diária{totalDiarias > 1 ? "s" : ""} · ~R$ {totalEstimado.toFixed(2)}
            </Badge>
          </div>

          <div className="space-y-1.5 max-h-64 overflow-y-auto rounded-md border border-border p-2">
            {estadias.map((e, idx) => (
              <div key={e.id} className="grid grid-cols-[auto_1fr_auto_1fr_auto_auto] gap-1.5 items-center text-xs">
                <span className="text-muted-foreground w-6 text-center">{idx + 1}</span>
                <DateField value={e.data_entrada} onChange={v => atualizar(e.id, "data_entrada", v)} placeholder="Entrada" />
                <Input type="time" value={e.hora_entrada} onChange={ev => atualizar(e.id, "hora_entrada", ev.target.value)} className="h-9 w-24 text-xs" />
                <DateField value={e.data_saida} onChange={v => atualizar(e.id, "data_saida", v)} placeholder="Saída" />
                <Input type="time" value={e.hora_saida} onChange={ev => atualizar(e.id, "hora_saida", ev.target.value)} className="h-9 w-24 text-xs" />
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => remover(e.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
