import { Settings, Building2, Users, Bell, Shield } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="p-6 space-y-6 max-w-[800px]">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Configurações</h1>
        <p className="text-sm text-muted-foreground">Gerencie as configurações da sua empresa</p>
      </div>

      <div className="space-y-3">
        {[
          { icon: Building2, title: "Dados da Empresa", desc: "Nome, CNPJ, endereço e informações de contato" },
          { icon: Users, title: "Usuários e Permissões", desc: "Gerencie sua equipe e níveis de acesso" },
          { icon: Bell, title: "Notificações", desc: "Configure alertas e notificações do sistema" },
          { icon: Shield, title: "Segurança", desc: "Senha, autenticação e logs de acesso" },
          { icon: Settings, title: "Integrações", desc: "WhatsApp, pagamentos e outros serviços" },
        ].map((item, i) => (
          <div key={i} className="bg-card rounded-lg shadow-card p-4 flex items-center gap-4 hover:shadow-card-hover hover:-translate-y-px transition-all cursor-pointer">
            <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <item.icon className="h-5 w-5" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{item.title}</p>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
