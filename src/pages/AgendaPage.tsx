import { Calendar, Clock, PawPrint, Plus } from "lucide-react";
import { StatusTag } from "@/components/StatusTag";

const timeSlots = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"];

const appointments = [
  { time: "08:00", pet: "Rex", service: "Banho e Tosa", tutor: "João Santos", status: "in-bath" as const },
  { time: "09:00", pet: "Luna", service: "Banho", tutor: "Ana Paula", status: "ready" as const },
  { time: "09:30", pet: "Thor", service: "Tosa", tutor: "Pedro Alves", status: "in-bath" as const },
  { time: "10:00", pet: "Mel", service: "Banho", tutor: "Fernanda Costa", status: "waiting" as const },
  { time: "11:00", pet: "Nina", service: "Daycare", tutor: "Juliana Reis", status: "daycare" as const },
  { time: "14:00", pet: "Max", service: "Banho e Tosa", tutor: "Roberto Dias", status: "waiting" as const },
  { time: "15:00", pet: "Bella", service: "Banho", tutor: "Patricia Souza", status: "waiting" as const },
];

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
          <button className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2">
            <Plus className="h-4 w-4" strokeWidth={1.5} />
            Novo Agendamento
          </button>
        </div>
      </div>

      {/* Day View */}
      <div className="bg-card rounded-lg shadow-card">
        <div className="divide-y divide-border">
          {timeSlots.map(slot => {
            const slotAppointments = appointments.filter(a => a.time.startsWith(slot.split(":")[0]));
            return (
              <div key={slot} className="flex min-h-[64px]">
                <div className="w-20 py-3 px-4 border-r border-border flex items-start">
                  <span className="font-mono-tabular text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {slot}
                  </span>
                </div>
                <div className="flex-1 p-2 flex flex-wrap gap-2">
                  {slotAppointments.map((apt, i) => (
                    <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-md bg-primary/5 hover:bg-primary/10 transition-colors cursor-pointer">
                      <PawPrint className="h-4 w-4 text-primary shrink-0" strokeWidth={1.5} />
                      <div>
                        <p className="text-sm font-medium text-foreground">{apt.pet} — {apt.service}</p>
                        <p className="text-xs text-muted-foreground">{apt.tutor}</p>
                      </div>
                      <StatusTag status={apt.status} />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
