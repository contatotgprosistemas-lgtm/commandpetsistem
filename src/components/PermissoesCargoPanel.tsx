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
  { value: "banhista", label: "Banhista" },
] as const;

type Cargo = (typeof CARGOS)[number]["value"];
type Acao = "visualizar" | "editar" | "excluir";

interface ModuleConfig {
  key: string;
  label: string;
  group?: string;
}

const MODULES: ModuleConfig[] = [
  // Geral
  { key: "dashboard", label: "Dashboard" },
  // Operacional
  { key: "agenda", label: "Agenda", group: "Operacional" },
  { key: "reservas", label: "Reservas", group: "Operacional" },
  { key: "banho_tosa", label: "Banho e Tosa", group: "Operacional" },
  { key: "esteira_banho", label: "Esteira de Banho", group: "Operacional" },
  { key: "clientes", label: "Clientes", group: "Operacional" },
  { key: "pets", label: "Pets", group: "Operacional" },
  { key: "servicos", label: "Serviços", group: "Operacional" },
  { key: "produtos", label: "Produtos", group: "Operacional" },
  { key: "planos", label: "Planos e Pacotes", group: "Operacional" },
  { key: "taxipet", label: "TaxiPet", group: "Operacional" },
  // Finanças
  { key: "financeiro", label: "Financeiro", group: "Finanças" },
  { key: "contratos", label: "Contratos", group: "Finanças" },
  // Sistema
  { key: "configuracoes", label: "Configurações", group: "Sistema" },
];

const ACOES: { key: Acao; label: string; icon: React.ReactNode }[] = [
  { key: "visualizar", label: "Ver", icon: <Eye className="h-3.5 w-3.5" /> },
  { key: "editar", label: "Editar", icon: <Pencil className="h-3.5 w-3.5" /> },
  { key: "excluir", label: "Excluir", icon: <Trash2 className="h-3.5 w-3.5" /> },
];

type PermissionsMap = Record<string, Record<Acao, boolean>>;

const allTrue = { visualizar: true, editar: true, excluir: true };
const allFalse = { visualizar: false, editar: false, excluir: false };
const viewOnly = { visualizar: true, editar: false, excluir: false };
const viewEdit = { visualizar: true, editar: true, excluir: false };

function buildPerms(fn: (key: string) => Record<Acao, boolean>): PermissionsMap {
  return Object.fromEntries(MODULES.map((m) => [m.key, fn(m.key)])) as PermissionsMap;
}

const DEFAULT_PERMISSIONS: Record<Cargo, PermissionsMap> = {
  admin: buildPerms(() => allTrue),
  gerente: buildPerms((k) => (k === "configuracoes" ? viewEdit : allTrue)),
  atendente: buildPerms((k) => {
    const canView = ["dashboard", "crm", "kanban", "chatbot", "agenda", "reservas", "clientes", "pets", "banho_tosa", "esteira_banho"];
    const canEdit = ["crm", "kanban", "agenda", "reservas", "clientes", "pets", "banho_tosa", "esteira_banho"];
    if (canEdit.includes(k)) return viewEdit;
    if (canView.includes(k)) return viewOnly;
    return allFalse;
  }),
  financeiro: buildPerms((k) => {
    const full = ["financeiro", "contratos", "notas_fiscais"];
    const view = ["dashboard", "clientes", "planos"];
    if (full.includes(k)) return viewEdit;
    if (view.includes(k)) return viewOnly;
    return allFalse;
  }),
  operacional: buildPerms((k) => {
    const canEdit = ["agenda", "pets", "banho_tosa", "esteira_banho", "ponto"];
    const canView = ["dashboard", "clientes", "reservas"];
    if (canEdit.includes(k)) return viewEdit;
    if (canView.includes(k)) return viewOnly;
    return allFalse;
  }),
  banhista: buildPerms((k) => {
    const canEdit = ["agenda", "banho_tosa", "esteira_banho"];
    const canView = ["dashboard", "pets"];
    if (canEdit.includes(k)) return viewEdit;
    if (canView.includes(k)) return viewOnly;
    return allFalse;
  }),
};

export function PermissoesCargoPanel() {
  const [selectedCargo, setSelectedCargo] = useState<Cargo>("admin");
  const [permissions, setPermissions] = useState<Record<Cargo, PermissionsMap>>(DEFAULT_PERMISSIONS);

  const current = permissions[selectedCargo];

  const toggle = (moduleKey: string, acao: Acao) => {
    if (selectedCargo === "admin") return;

    setPermissions((prev) => {
      const cargoPerms = { ...prev[selectedCargo] };
      const modulePerms = { ...cargoPerms[moduleKey] };
      modulePerms[acao] = !modulePerms[acao];

      if (acao === "visualizar" && !modulePerms[acao]) {
        modulePerms.editar = false;
        modulePerms.excluir = false;
      }
      if ((acao === "editar" || acao === "excluir") && modulePerms[acao]) {
        modulePerms.visualizar = true;
      }

      cargoPerms[moduleKey] = modulePerms;
      return { ...prev, [selectedCargo]: cargoPerms };
    });
  };

  const isAdmin = selectedCargo === "admin";

  // Group modules
  const groups: { label: string | null; modules: ModuleConfig[] }[] = [];
  let currentGroup: string | null | undefined = undefined;
  MODULES.forEach((mod) => {
    const g = mod.group ?? null;
    if (g !== currentGroup) {
      groups.push({ label: g, modules: [mod] });
      currentGroup = g;
    } else {
      groups[groups.length - 1].modules.push(mod);
    }
  });

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
              {groups.map((group) => (
                <>
                  {group.label && (
                    <tr key={`group-${group.label}`} className="bg-muted/50">
                      <td colSpan={4} className="py-2 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {group.label}
                      </td>
                    </tr>
                  )}
                  {group.modules.map((mod, i) => {
                    const checked = current[mod.key] ?? allFalse;
                    return (
                      <tr
                        key={mod.key}
                        className={`border-b border-border last:border-0 ${i % 2 === 0 ? "" : "bg-muted/20"}`}
                      >
                        <td className="py-2.5 px-4 font-medium text-foreground pl-6">{mod.label}</td>
                        {ACOES.map((a) => (
                          <td key={a.key} className="text-center py-2.5 px-3">
                            <div className="flex justify-center">
                              <Checkbox
                                checked={checked[a.key] ?? false}
                                disabled={isAdmin}
                                onCheckedChange={() => toggle(mod.key, a.key)}
                              />
                            </div>
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
