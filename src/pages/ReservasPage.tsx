import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format, startOfDay, addDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarCheck, Search, Filter, Clock, PawPrint, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

interface Reserva {
  id: string;
  data_hora: string;
  tipo_servico: string;
  status: string;
  notas: string | null;
  cliente: { nome: string } | null;
  pet: { nome: string; raca: string | null } | null;
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

export default function ReservasPage() {
  const { profile } = useAuth();
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todas");
  const [periodoFilter, setPeriodoFilter] = useState("hoje");

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
      .select("id, data_hora, tipo_servico, status, notas, cliente:clientes(nome), pet:pets(nome, raca)")
      .eq("empresa_id", profile.empresa_id)
      .gte("data_hora", fromDate.toISOString())
      .lt("data_hora", toDate.toISOString())
      .order("data_hora", { ascending: true });

    if (!error && data) {
      setReservas(data as unknown as Reserva[]);
    }
    setLoading(false);
  }

  const filtered = reservas.filter((r) => {
    if (statusFilter !== "todas" && r.status !== statusFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      const clienteNome = r.cliente?.nome?.toLowerCase() || "";
      const petNome = r.pet?.nome?.toLowerCase() || "";
      const servico = r.tipo_servico?.toLowerCase() || "";
      if (!clienteNome.includes(s) && !petNome.includes(s) && !servico.includes(s)) return false;
    }
    return true;
  });

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
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <Filter className="h-3.5 w-3.5 mr-1.5" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todos status</SelectItem>
            <SelectItem value="agendado">Agendado</SelectItem>
            <SelectItem value="confirmado">Confirmado</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="na_empresa">Na Empresa</SelectItem>
            <SelectItem value="concluido">Concluído</SelectItem>
            <SelectItem value="cancelado">Cancelado</SelectItem>
            <SelectItem value="falta">Falta</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <CalendarCheck className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhuma reserva encontrada para este período.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => (
            <Card key={r.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="flex flex-col items-center min-w-[60px] text-center">
                  <span className="text-xs text-muted-foreground">
                    {format(parseISO(r.data_hora), "dd MMM", { locale: ptBR })}
                  </span>
                  <span className="text-lg font-bold text-foreground">
                    {format(parseISO(r.data_hora), "HH:mm")}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm text-foreground truncate">
                      {r.tipo_servico}
                    </span>
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${statusColors[r.status] || ""}`}>
                      {statusLabels[r.status] || r.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" /> {r.cliente?.nome || "—"}
                    </span>
                    <span className="flex items-center gap-1">
                      <PawPrint className="h-3 w-3" /> {r.pet?.nome || "—"}
                      {r.pet?.raca && ` (${r.pet.raca})`}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
