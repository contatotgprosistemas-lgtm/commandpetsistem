
## Plano de Implementação — Módulo NF-e

### Fase 1: Banco de Dados (Migration)
Criar todas as tabelas necessárias com RLS multi-tenant:
- `fiscal_settings` — configuração fiscal por empresa
- `nfe_documents` — notas fiscais
- `nfe_items` — itens das notas
- `nfe_events` — histórico/auditoria
- `nfe_webhook_logs` — logs de webhook
- `nfe_rejections` — rejeições

> A tabela `notas_fiscais` existente será mantida separada (dados legados). O novo módulo usará tabelas próprias.

### Fase 2: Edge Function `focus-nfe-v2`
Backend completo com endpoints:
- **Emissão** de NF-e (POST assíncrono)
- **Consulta** de status por referência
- **Cancelamento**
- **Download** XML/DANFE
- **Teste de conexão** com a Focus
- **Webhook** para receber retorno automático

Autenticação via Basic Auth conforme documentação Focus.

### Fase 3: Frontend — Páginas e Componentes

**Página principal `/notas-fiscais`** com abas:
1. **Dashboard** — cards de resumo + gráficos
2. **Emissão** — formulário completo com itens, destinatário, tributos
3. **Notas** — listagem com filtros, status badges, ações
4. **Rejeições** — notas rejeitadas com correção rápida
5. **Configuração** — dados fiscais da empresa
6. **Relatórios** — filtros + exportação CSV/Excel/PDF

**Componentes**:
- Formulário de emissão com itens dinâmicos
- Timeline de eventos da nota
- Modal de detalhes da nota
- Badges de status
- Painel de rejeição com ação de correção

### Fase 4: Integração
- Rota no App.tsx + sidebar
- Permissões no PermissoesCargoPanel
- Webhook edge function separada

### Observações
- O token Focus já existe como secret (`FOCUS_NFE_API_TOKEN`)
- Multi-tenant via `empresa_id` + RLS
- Suporte homologação/produção via `fiscal_settings.ambiente`
- Interface moderna com shadcn/ui
