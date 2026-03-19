import { Calendar, Clock } from "lucide-react";
import { NovoAgendamentoDialog } from "@/components/NovoAgendamentoDialog";

const timeSlots = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"];

export default function AgendaPage() {
  const today = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="p-6 space-y-6 max-w-[1400px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Agenda</h1>
          <p className="text-sm text-muted-foreground capitalize">{today}</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="h-9 px-3 rounded-md bg-card shadow-card text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2">
            <Calendar className="h-4 w-4" strokeWidth={1.5} />
            Hoje
          </button>
          <NovoAgendamentoDialog />
        </div>
      </div>

      <div className="bg-card rounded-lg shadow-card">
        <div className="divide-y divide-border">
          {timeSlots.map(slot => (
            <div key={slot} className="flex min-h-[64px]">
              <div className="w-20 py-3 px-4 border-r border-border flex items-start">
                <span className="font-mono-tabular text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {slot}
                </span>
              </div>
              <div className="flex-1 p-2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
