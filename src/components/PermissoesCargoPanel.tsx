import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Shield, Eye, Pencil, Trash2 } from "lucide-react";

const CARGOS = [
  { value: "admin", label: "Admin" },
  { value: "gerente", label: "Gerente" },
  { value: "atendente", label: "Atendente" },
  { value: "financeiro", label: "Financeiro" },
  { value: "operacional", label: "Operacional" },
] as const;

type Cargo = (typeof CARGOS)[number]["value"];
type Acao = "visualizar" | "editar" | "excluir";

interface ModuleConfig {
  key: string;
  label: string;
  icon?: string;
}

const MODULES: ModuleConfig[] = [
  { key: "dashboard", label: "Dashboard" },
  { key: "agenda", label: "Agenda" },
  { key: "crm", label: "CRM WhatsApp" },
  { key: "kanban", label: "Pipeline Vendas" },
  { key: "chatbot", label: "Chatbot" },
  { key: "taxipet", label: "TaxiPet" },
  { key: "contratos", label: "Contratos" },
  { key: "notas_fiscais", label: "Notas Fiscais" },
  { key: "clientes", label: "Clientes" },
  { key: "pets", label: "Pets" },
  { key: "servicos", label: "Serviços" },
  { key: "produtos", label: "Produtos" },
  { key: "planos", label: "Planos & Pacotes" },
  { key: "financeiro", label: "Financeiro" },
  { key: "configuracoes", label: "Configurações" },
];

const ACOES: { key: Acao; label: string; icon: React.ReactNode }[] = [
  { key: "visualizar", label: "Ver", icon: <Eye className="h-3.5 w-3.5" /> },
  { key: "editar", label: "Editar", icon: <Pencil className="h-3.5 w-3.5" /> },
  { key: "excluir", label: "Excluir", icon: <Trash2 className="h-3.5 w-3.5" /> },
];

type PermissionsMap = Record<string, Record<Acao, boolean>>;

const DEFAULT_PERMISSIONS: Record<Cargo, PermissionsMap> = {
  admin: Object.fromEntries(
    MODULES.map((m) => [m.key, { visualizar: true, editar: true, excluir: true }])
  ) as PermissionsMap,
  gerente: Object.fromEntries(
    MODULES.map((m) => [
      m.key,
      {
        visualizar: true,
        editar: true,
        excluir: m.key !== "configuracoes",
      },
    ])
  ) as PermissionsMap,
  atendente: Object.fromEntries(
    MODULES.map((m) => [
      m.key,
      {
        visualizar: ["dashboard", "crm", "kanban", "agenda", "clientes", "pets", "chatbot"].includes(m.key),
        editar: ["crm", "kanban", "agenda", "clientes", "pets"].includes(m.key),
        excluir: false,
      },
    ])
  ) as PermissionsMap,
  financeiro: Object.fromEntries(
    MODULES.map((m) => [
      m.key,
      {
        visualizar: ["dashboard", "financeiro", "clientes", "planos"].includes(m.key),
        editar: ["financeiro"].includes(m.key),
        excluir: false,
      },
    ])
  ) as PermissionsMap,
  operacional: Object.fromEntries(
    MODULES.map((m) => [
      m.key,
      {
        visualizar: ["dashboard", "agenda", "pets", "clientes"].includes(m.key),
        editar: ["agenda", "pets"].includes(m.key),
        excluir: false,
      },
    ])
  ) as PermissionsMap,
};

export function PermissoesCargoPanel() {
  const [selectedCargo, setSelectedCargo] = useState<Cargo>("admin");
  const [permissions, setPermissions] = useState<Record<Cargo, PermissionsMap>>(DEFAULT_PERMISSIONS);

  const current = permissions[selectedCargo];

  const toggle = (moduleKey: string, acao: Acao) => {
    if (selectedCargo === "admin") return; // admin always has all permissions

    setPermissions((prev) => {
      const cargoPerms = { ...prev[selectedCargo] };
      const modulePerms = { ...cargoPerms[moduleKey] };
      modulePerms[acao] = !modulePerms[acao];

      // If disabling "visualizar", disable edit and delete too
      if (acao === "visualizar" && !modulePerms[acao]) {
        modulePerms.editar = false;
        modulePerms.excluir = false;
      }
      // If enabling "editar" or "excluir", enable visualizar
      if ((acao === "editar" || acao === "excluir") && modulePerms[acao]) {
        modulePerms.visualizar = true;
      }

      cargoPerms[moduleKey] = modulePerms;
      return { ...prev, [selectedCargo]: cargoPerms };
    });
  };

  const cargoInfo = CARGOS.find((c) => c.value === selectedCargo)!;
  const isAdmin = selectedCargo === "admin";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              Permissões por Cargo
            </CardTitle>
            <CardDescription>Defina o que cada cargo pode acessar no sistema</CardDescription>
          </div>
          <Select value={selectedCargo} onValueChange={(v) => setSelectedCargo(v as Cargo)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CARGOS.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {isAdmin && (
          <Badge variant="secondary" className="w-fit text-xs mt-2">
            Admin possui acesso total — não editável
          </Badge>
        )}
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left py-2.5 px-4 font-medium text-muted-foreground">Módulo</th>
                {ACOES.map((a) => (
                  <th key={a.key} className="text-center py-2.5 px-3 font-medium text-muted-foreground">
                    <div className="flex items-center justify-center gap-1">
                      {a.icon}
                      <span className="hidden sm:inline">{a.label}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MODULES.map((mod, i) => (
                <tr
                  key={mod.key}
                  className={`border-b border-border last:border-0 ${i % 2 === 0 ? "" : "bg-muted/20"}`}
                >
                  <td className="py-2.5 px-4 font-medium text-foreground">{mod.label}</td>
                  {ACOES.map((a) => {
                    const checked = current[mod.key]?.[a.key] ?? false;
                    return (
                      <td key={a.key} className="text-center py-2.5 px-3">
                        <div className="flex justify-center">
                          <Checkbox
                            checked={checked}
                            disabled={isAdmin}
                            onCheckedChange={() => toggle(mod.key, a.key)}
                          />
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
