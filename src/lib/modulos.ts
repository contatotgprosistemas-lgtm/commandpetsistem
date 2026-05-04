export const MODULO_PRECOS = {
  banho_tosa: 97,
  hotel_creche: 127,
  ponto: 89,
  combo_completo: 247,
} as const;

export type ModuloFlags = {
  banho_tosa: boolean;
  hotel_creche: boolean;
  ponto: boolean;
};

export function calcularValorMensal(flags: ModuloFlags): number {
  if (flags.banho_tosa && flags.hotel_creche && flags.ponto) {
    return MODULO_PRECOS.combo_completo;
  }
  let total = 0;
  if (flags.banho_tosa) total += MODULO_PRECOS.banho_tosa;
  if (flags.hotel_creche) total += MODULO_PRECOS.hotel_creche;
  if (flags.ponto) total += MODULO_PRECOS.ponto;
  return total;
}

// Maps each route to the modules required to access it.
// A route is allowed if ANY of the listed modules is active.
// `null` = always available (no module required).
export const ROUTE_MODULES: Record<string, Array<keyof ModuloFlags> | null> = {
  "/": null, // dashboard always available when at least one module is active
  "/agenda": ["banho_tosa", "hotel_creche"],
  "/reservas": ["hotel_creche"],
  "/banho-tosa": ["banho_tosa"],
  "/esteira-banho": ["banho_tosa"],
  "/clientes": ["banho_tosa", "hotel_creche"],
  "/pets": ["banho_tosa", "hotel_creche"],
  "/servicos": ["banho_tosa", "hotel_creche"],
  "/produtos": ["banho_tosa", "hotel_creche"],
  "/planos-pacotes": ["banho_tosa", "hotel_creche"],
  "/taxipet": ["banho_tosa", "hotel_creche"],
  "/ponto": ["ponto"],
  "/financeiro": ["banho_tosa", "hotel_creche"],
  "/contratos": ["banho_tosa", "hotel_creche"],
  "/notas-fiscais": ["banho_tosa", "hotel_creche"],
  "/leads": null,
  "/admin": null,
  "/configuracoes": null,
  "/movimentacao": ["banho_tosa", "hotel_creche"],
  "/dre": ["banho_tosa", "hotel_creche"],
  "/fluxo-caixa": ["banho_tosa", "hotel_creche"],
  "/plano-contas": ["banho_tosa", "hotel_creche"],
  "/finance-config": ["banho_tosa", "hotel_creche"],
};

export function isRouteAllowed(path: string, flags: ModuloFlags): boolean {
  const required = ROUTE_MODULES[path];
  if (required === undefined) return true; // unknown route = allow
  if (required === null) return true;
  return required.some((m) => flags[m]);
}