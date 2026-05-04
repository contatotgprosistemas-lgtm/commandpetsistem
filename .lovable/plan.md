## 1. Sidebar — esconder menus no perfil Super Admin

`src/components/AppSidebar.tsx`: quando `isSuperAdmin` for true, esconder os itens **Dashboard**, **Operacional** (e seus submenus) e **Finanças** (e seus submenus). Manter apenas: **Leads do Site**, **Super Admin**, **Configurações** e o botão sair. (Comportamento dos demais perfis fica inalterado.)

## 2. Regras de aprovação no Painel Super Admin

Hoje a aba "Pendentes" lista qualquer `profile` com `aprovado=false`. Vamos restringir para listar **apenas usuários criados pelo botão "Criar conta"** (signup público da landing/SignupPage), que são os únicos que abrem uma nova `empresa`.

Mecanismo:
- Adicionar coluna `profiles.signup_source TEXT` (`'self_signup' | 'admin_invite' | null`).
- Atualizar `public.handle_new_user()` para gravar `signup_source = 'self_signup'` quando o cadastro vier com `empresa` no metadata (caso atual de criação por signup público); demais entradas ficam `null`.
- Atualizar a edge function `criar-acesso-operacional` para garantir que funcionários criados por admins entrem com `signup_source = 'admin_invite'` (já entram em `operational_users`, mas se gerar profile, marcar como invite).
- Em `SuperAdminPage.tsx`, a aba "Pendentes" passa a filtrar por `signup_source === 'self_signup' && !aprovado`.

Aba "Portal do Cliente" continua isolada (já separa por user_roles=cliente).

Adicionar nova aba **"Funcionários (operacional)"** agrupada por empresa, lendo `operational_users` com `empresas.nome_empresa`. Apenas leitura (sem aprovação) — só para gestão/visualização. A aba **Portal do Cliente** passa a exibir agrupado por empresa.

## 3. Módulos do sistema por empresa

Criar tabela `public.empresa_modulos`:
- `empresa_id uuid PK FK empresas`
- `modulo_banho_tosa boolean default false`
- `modulo_hotel_creche boolean default false`
- `modulo_ponto boolean default false`
- `valor_mensal numeric` (calculado/registrado)
- `data_inicio date`, `data_fim date null`, `observacao text`
- timestamps

RLS:
- Super admin: full read/write.
- Admin/gerente da empresa: read-only do próprio empresa_id.

Função helper `public.get_empresa_modulos(p_empresa_id uuid)` retorna jsonb com flags (definer, search_path public, REVOKE EXECUTE de anon).

Mapeamento de módulos → rotas (frontend, em `src/lib/modulos.ts`):
- `banho_tosa`: `/banho-tosa`, `/esteira-banho`, `/agenda`, `/planos-pacotes`
- `hotel_creche`: `/reservas`, `/agenda`, `/planos-pacotes`
- `compartilhado` (qualquer m1 ou m2): `/clientes`, `/pets`, `/servicos`, `/produtos`, `/`(dashboard)
- `m1 || m2`: `/taxipet`, `/financeiro`, `/contratos`, `/notas-fiscais`
- `ponto`: `/ponto`

Hook `useEmpresaModulos()` carrega as flags da empresa atual (cache via React Query). `AppSidebar` filtra cada item conforme as flags. `ProtectedRoute` redireciona quando rota não está autorizada para os módulos contratados.

Super admin sempre tem acesso (passa direto).

## 4. Tela de gestão de contratações (Super Admin)

Nova aba **"Empresas & Módulos"** dentro de `SuperAdminPage.tsx`:
- Lista todas as empresas (`empresas`) com colunas: Empresa, Módulos contratados (chips), Valor mensal, Início, Ações.
- Botão **Editar** abre dialog com checkboxes (Banho e Tosa R$ 97, Hotel e Creche R$ 127, Ponto R$ 89). Quando os 3 estiverem marcados, valor é fixado em **R$ 247 (Combo Completo)**, caso contrário soma dos selecionados. Permite override manual do valor e data de início.
- Salva em `empresa_modulos` (upsert).

Tabela de preços (constante em `src/lib/modulos.ts`):
```ts
export const MODULO_PRECOS = {
  banho_tosa: 97,
  hotel_creche: 127,
  ponto: 89,
  combo_completo: 247,
};
```

## Detalhes técnicos

- Migrations:
  1. `ALTER TABLE profiles ADD COLUMN signup_source text;`
  2. `CREATE TABLE empresa_modulos (...)` + RLS + triggers updated_at.
  3. Reescreve `handle_new_user` para popular `signup_source`.
  4. Backfill: `UPDATE profiles SET signup_source='self_signup' WHERE empresa_id IS NOT NULL AND cargo='admin'` (heurística para usuários antigos que viraram admin via signup).
- Atualiza `criar-acesso-operacional` se gravar profile (provavelmente não grava — confirmar antes; caso só insira em operational_users, nada a fazer).
- Sidebar: dois ramos — `isSuperAdmin` mostra só admin/leads/config; demais perfis filtram itens via `useEmpresaModulos`.
- Rotas guarda: novo wrapper `<ModuleGuard required="banho_tosa" />` em `App.tsx` ou checagem em `ProtectedRoute`.

## Itens fora de escopo desta entrega
- Cobrança automática mensal das mensalidades (apenas registra valor, não gera fatura automática neste passo).
- Período de teste / trial.