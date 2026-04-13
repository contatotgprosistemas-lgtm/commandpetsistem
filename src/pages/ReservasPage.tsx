import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useEmpresaLogo } from "@/hooks/useEmpresaLogo";
import { format, startOfDay, addDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarCheck, Search, Filter, PawPrint, User, Hotel, Scissors, TreePine, HelpCircle, Pencil, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { SignedImage } from "@/components/SignedImage";
import { EditarAgendamentoDialog } from "@/components/EditarAgendamentoDialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

interface Reserva {
  id: string;
  data_hora: string;
  tipo_servico: string;
  status: string;
  baia: string | null;
  notas: string | null;
  valor: number | null;
  duracao_min: number | null;
  data_saida_provavel: string | null;
  hora_saida_provavel: string | null;
  forma_pagamento: string | null;
  empresa_id: string;
  cliente_id: string;
  pet_id: string;
  subscription_id: string | null;
  cliente: { id: string; nome: string; whatsapp: string | null; foto_url: string | null } | null;
  pet: { id: string; nome: string; raca: string | null; especie: string; foto_url: string | null } | null;
}

const statusColors: Record<string, string> = {
  agendado: "bg-blue-100 text-blue-800",
  confirmado: "bg-emerald-100 text-emerald-800",
  pendente: "bg-yellow-100 text-yellow-800",
  na_empresa: "bg-violet-100 text-violet-800",
  concluido: "bg-green-100 text-green-800",
  cancelado: "bg-red-100 text-red-800",
  falta: "bg-orange-100 text-orange-800",
};

const statusLabels: Record<string, string> = {
  agendado: "Agendado",
  confirmado: "Confirmado",
  pendente: "Pendente",
  na_empresa: "Na Empresa",
  concluido: "Concluído",
  cancelado: "Cancelado",
  falta: "Falta",
};

interface ServiceGroup {
  label: string;
  icon: typeof Hotel;
  color: string;
  borderColor: string;
  keywords: string[];
}

const serviceGroups: ServiceGroup[] = [
  {
    label: "HOTEL",
    icon: Hotel,
    color: "text-lime-600",
    borderColor: "border-lime-500",
    keywords: ["hotel", "hospedagem", "diaria", "diária", "pernoite"],
  },
  {
    label: "ESCOLA / DAYCARE",
    icon: TreePine,
    color: "text-violet-600",
    borderColor: "border-violet-500",
    keywords: ["escola", "daycare", "creche", "day_care"],
  },
  {
    label: "BANHO E TOSA",
    icon: Scissors,
    color: "text-amber-600",
    borderColor: "border-amber-500",
    keywords: ["banho", "tosa", "grooming", "estética", "estetica"],
  },
];

function getGroup(tipoServico: string): ServiceGroup {
  const t = tipoServico.toLowerCase();
  for (const g of serviceGroups) {
    if (g.keywords.some((k) => t.includes(k))) return g;
  }
  return {
    label: "OUTROS",
    icon: HelpCircle,
    color: "text-muted-foreground",
    borderColor: "border-muted",
    keywords: [],
  };
}

export default function ReservasPage() {
  const { profile } = useAuth();
  const { logoUrl } = useEmpresaLogo();
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [servicoFilter, setServicoFilter] = useState("todos");
  const [periodoFilter, setPeriodoFilter] = useState("hoje");
  const [editingReserva, setEditingReserva] = useState<Reserva | null>(null);
  const [deletingReserva, setDeletingReserva] = useState<Reserva | null>(null);

  useEffect(() => {
    if (profile?.empresa_id) fetchReservas();
  }, [profile?.empresa_id, periodoFilter]);

  async function fetchReservas() {
    if (!profile?.empresa_id) return;
    setLoading(true);

    const today = startOfDay(new Date());
    let fromDate = today;
    let toDate = addDays(today, 1);

    if (periodoFilter === "amanha") {
      fromDate = addDays(today, 1);
      toDate = addDays(today, 2);
    } else if (periodoFilter === "semana") {
      toDate = addDays(today, 7);
    } else if (periodoFilter === "mes") {
      toDate = addDays(today, 30);
    }

    const { data, error } = await supabase
      .from("agendamentos")
      .select("id, data_hora, tipo_servico, status, baia, notas, valor, duracao_min, data_saida_provavel, hora_saida_provavel, forma_pagamento, empresa_id, cliente_id, pet_id, subscription_id, cliente:clientes(id, nome, whatsapp, foto_url), pet:pets(id, nome, raca, especie, foto_url)")
      .eq("empresa_id", profile.empresa_id)
      .gte("data_hora", fromDate.toISOString())
      .lt("data_hora", toDate.toISOString())
      .order("data_hora", { ascending: true });

    if (!error && data) {
      setReservas(data as unknown as Reserva[]);
    }
    setLoading(false);
  }

  async function handleDelete(reserva: Reserva) {
    await supabase.from("historico_servicos").delete().eq("agendamento_id", reserva.id);
    await supabase.from("checklist_registros").delete().eq("agendamento_id", reserva.id);
    await supabase.from("manejo_registros").delete().eq("agendamento_id", reserva.id);

    const petName = reserva.pet?.nome || "";
    const searchDesc = `${reserva.tipo_servico} — ${petName}`;
    await supabase
      .from("contas_receber")
      .delete()
      .eq("cliente_id", reserva.cliente_id)
      .eq("descricao", searchDesc);

    const { error } = await supabase.from("agendamentos").delete().eq("id", reserva.id);
    if (error) {
      toast.error("Erro ao excluir: " + error.message);
      return;
    }
    toast.success("Reserva e faturas relacionadas excluídas com sucesso.");
    setDeletingReserva(null);
    fetchReservas();
  }

  const filtered = reservas.filter((r) => {
    if (servicoFilter !== "todos") {
      const g = getGroup(r.tipo_servico);
      if (g.label !== servicoFilter) return false;
    }
    if (search) {
      const s = search.toLowerCase();
      const clienteNome = r.cliente?.nome?.toLowerCase() || "";
      const petNome = r.pet?.nome?.toLowerCase() || "";
      const servico = r.tipo_servico?.toLowerCase() || "";
      if (!clienteNome.includes(s) && !petNome.includes(s) && !servico.includes(s)) return false;
    }
    return true;
  });

  const grouped = useMemo(() => {
    const map = new Map<string, { group: ServiceGroup; items: Reserva[] }>();
    for (const r of filtered) {
      const g = getGroup(r.tipo_servico);
      if (!map.has(g.label)) map.set(g.label, { group: g, items: [] });
      map.get(g.label)!.items.push(r);
    }
    for (const entry of map.values()) {
      entry.items.sort((a, b) => (a.pet?.nome || "").localeCompare(b.pet?.nome || ""));
    }
    const order = serviceGroups.map((g) => g.label);
    return Array.from(map.entries()).sort(
      (a, b) => (order.indexOf(a[0]) === -1 ? 99 : order.indexOf(a[0])) - (order.indexOf(b[0]) === -1 ? 99 : order.indexOf(b[0]))
    );
  }, [filtered]);

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center gap-3">
        <CalendarCheck className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reservas</h1>
          <p className="text-sm text-muted-foreground">Visualize todas as reservas e agendamentos</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente, pet ou serviço..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={periodoFilter} onValueChange={setPeriodoFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="hoje">Hoje</SelectItem>
            <SelectItem value="amanha">Amanhã</SelectItem>
            <SelectItem value="semana">Próx. 7 dias</SelectItem>
            <SelectItem value="mes">Próx. 30 dias</SelectItem>
          </SelectContent>
        </Select>
        <Select value={servicoFilter} onValueChange={setServicoFilter}>
          <SelectTrigger className="w-[160px]">
            <Filter className="h-3.5 w-3.5 mr-1.5" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos serviços</SelectItem>
            <SelectItem value="HOTEL">Hotel</SelectItem>
            <SelectItem value="ESCOLA / DAYCARE">Escola / Daycare</SelectItem>
            <SelectItem value="BANHO E TOSA">Banho e Tosa</SelectItem>
            <SelectItem value="OUTROS">Outros</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      ) : grouped.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <CalendarCheck className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhuma reserva encontrada para este período.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(([label, { group, items }]) => {
            const Icon = group.icon;
            return (
              <div key={label}>
                <div className={`flex items-center gap-2 mb-3 pb-2 border-b-2 ${group.borderColor}`}>
                  <Icon className={`h-5 w-5 ${group.color}`} />
                  <span className={`text-sm font-bold tracking-wide ${group.color}`}>
                    {label}
                  </span>
                  <Badge variant="secondary" className="ml-auto text-[10px]">
                    {items.length}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                  {items.map((r) => (
                    <Card key={r.id} className="overflow-hidden hover:shadow-md transition-shadow group relative">
                      {/* Action buttons overlay */}
                      <div className="absolute top-1.5 left-1.5 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="secondary"
                          size="icon"
                          className="h-7 w-7 bg-card/90 hover:bg-card shadow-sm"
                          title="Editar"
                          onClick={(e) => { e.stopPropagation(); setEditingReserva(r); }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="secondary"
                          size="icon"
                          className="h-7 w-7 bg-card/90 hover:bg-destructive hover:text-destructive-foreground shadow-sm"
                          title="Excluir"
                          onClick={(e) => { e.stopPropagation(); setDeletingReserva(r); }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      <div className="aspect-square bg-muted relative overflow-hidden cursor-pointer" onClick={() => setEditingReserva(r)}>
                        {r.pet?.foto_url ? (
                          <SignedImage
                            src={r.pet.foto_url}
                            alt={r.pet?.nome || "Pet"}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-muted">
                             <img src={logoUrl} alt="Logo" className="w-3/5 h-3/5 object-contain opacity-40" />
                           </div>
                        )}
                        <Badge
                          className={`absolute top-1.5 right-1.5 text-[9px] px-1.5 py-0 ${statusColors[r.status] || ""}`}
                        >
                          {statusLabels[r.status] || r.status}
                        </Badge>
                      </div>
                      <CardContent className="p-2.5 text-center space-y-0.5">
                        <p className="font-semibold text-sm text-foreground truncate">
                          {r.pet?.nome || "—"}
                        </p>
                        {r.pet?.raca && (
                          <p className="text-[10px] text-muted-foreground">({r.pet.raca})</p>
                        )}
                        <p className="text-xs text-muted-foreground truncate flex items-center justify-center gap-1">
                          <User className="h-3 w-3 shrink-0" />
                          {r.cliente?.nome || "—"}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          ({r.tipo_servico})
                        </p>
                        {r.baia && (
                          <p className="text-[10px] text-muted-foreground">{r.baia}</p>
                        )}
                        <p className="text-[10px] text-muted-foreground">
                          {format(parseISO(r.data_hora), "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit dialog */}
      <EditarAgendamentoDialog
        agendamento={editingReserva as any}
        open={!!editingReserva}
        onOpenChange={(o) => { if (!o) setEditingReserva(null); }}
        onSuccess={() => { setEditingReserva(null); fetchReservas(); }}
      />

      {/* Delete confirmation dialog */}
      <Dialog open={!!deletingReserva} onOpenChange={(o) => { if (!o) setDeletingReserva(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir reserva?</DialogTitle>
            <DialogDescription>
              Esta ação não poderá ser desfeita. A exclusão também irá apagar faturas e registros de serviço relacionados a este agendamento de <strong>{deletingReserva?.pet?.nome}</strong>.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingReserva(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => deletingReserva && handleDelete(deletingReserva)}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
