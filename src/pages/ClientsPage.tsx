import { Search, Phone, Mail } from "lucide-react";
import { NovoClienteDialog } from "@/components/NovoClienteDialog";

const clients = [
  { name: "João Santos", phone: "+55 11 99999-1234", email: "joao@email.com", pets: 2, tags: ["VIP", "Hotel"], lastVisit: "15/03/2026" },
  { name: "Maria Silva", phone: "+55 11 99999-5678", email: "maria@email.com", pets: 1, tags: ["Frequente"], lastVisit: "14/03/2026" },
  { name: "Ana Paula", phone: "+55 11 99999-9012", email: "ana@email.com", pets: 1, tags: ["Novo"], lastVisit: "13/03/2026" },
  { name: "Carlos Lima", phone: "+55 11 99999-3456", email: "carlos@email.com", pets: 3, tags: ["VIP", "Daycare"], lastVisit: "12/03/2026" },
  { name: "Fernanda Costa", phone: "+55 11 99999-7890", email: "fernanda@email.com", pets: 1, tags: [], lastVisit: "10/03/2026" },
  { name: "Pedro Alves", phone: "+55 11 99999-2345", email: "pedro@email.com", pets: 2, tags: ["Frequente"], lastVisit: "09/03/2026" },
  { name: "Juliana Reis", phone: "+55 11 99999-6789", email: "juliana@email.com", pets: 1, tags: ["Hotel"], lastVisit: "08/03/2026" },
  { name: "Roberto Dias", phone: "+55 11 99999-0123", email: "roberto@email.com", pets: 1, tags: ["Novo"], lastVisit: "05/03/2026" },
];

const tagColors: Record<string, string> = {
  VIP: "bg-accent/10 text-accent",
  Frequente: "bg-primary/10 text-primary",
  Novo: "bg-success/10 text-success",
  Hotel: "bg-warning/10 text-warning",
  Daycare: "bg-primary/10 text-primary",
};

export default function ClientsPage() {
  return (
    <div className="p-6 space-y-6 max-w-[1400px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Clientes</h1>
          <p className="text-sm text-muted-foreground">{clients.length} clientes cadastrados</p>
        </div>
        <NovoClienteDialog />
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
        <input placeholder="Buscar clientes..." className="w-full h-9 pl-9 pr-3 text-sm bg-card rounded-md shadow-card outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground" />
      </div>

      <div className="bg-card rounded-lg shadow-card">
        <div className="grid grid-cols-[1fr_150px_180px_60px_120px_100px] px-5 py-3 border-b border-border text-xs font-medium text-muted-foreground uppercase tracking-wider">
          <span>Nome</span>
          <span>Telefone</span>
          <span>Email</span>
          <span>Pets</span>
          <span>Tags</span>
          <span>Última visita</span>
        </div>
        <div className="divide-y divide-border">
          {clients.map((c, i) => (
            <div key={i} className="grid grid-cols-[1fr_150px_180px_60px_120px_100px] px-5 py-3 items-center hover:bg-muted/50 transition-colors cursor-pointer">
              <span className="text-sm font-medium text-foreground">{c.name}</span>
              <span className="font-mono-tabular text-sm text-muted-foreground flex items-center gap-1.5">
                <Phone className="h-3 w-3" strokeWidth={1.5} />
                {c.phone.slice(-9)}
              </span>
              <span className="text-sm text-muted-foreground flex items-center gap-1.5 truncate">
                <Mail className="h-3 w-3 shrink-0" strokeWidth={1.5} />
                {c.email}
              </span>
              <span className="font-mono-tabular text-sm text-muted-foreground">{c.pets}</span>
              <div className="flex gap-1 flex-wrap">
                {c.tags.map(tag => (
                  <span key={tag} className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${tagColors[tag] || "bg-muted text-muted-foreground"}`}>
                    {tag}
                  </span>
                ))}
              </div>
              <span className="font-mono-tabular text-xs text-muted-foreground">{c.lastVisit}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
