## Faturamento da Mensalidade do Sistema

Criar fluxo de cobrança mensal do SaaS — onde o Super Admin configura uma conta Asaas central e cada empresa paga sua mensalidade via PIX/boleto, semelhante ao já existente para clientes finais.

### 1. Banco de dados (migration)

**Nova tabela `sistema_asaas_config`** (singleton — config global do Super Admin)
- `api_key` (criptografada via secret), `ambiente` (sandbox/production), `pix_habilitado`, `boleto_habilitado`

**Alterações em `empresa_modulos`**
- `dia_vencimento_fatura` (int 1–28, default 10) — dia do mês escolhido pela empresa
- `valor_mensal` já existe

**Nova tabela `faturas_sistema`**
- `empresa_id`, `competencia` (date — primeiro dia do mês de referência), `vencimento` (date), `valor` (numeric)
- `status` ('pendente' | 'pago' | 'vencido' | 'cancelado')
- `asaas_charge_id`, `asaas_invoice_url`, `pix_qr_code`, `pix_copia_cola`, `linha_digitavel_boleto`
- `data_pagamento`, `forma_pagamento`
- Unique (empresa_id, competencia)

**RLS**: admin da empresa lê apenas suas faturas; super admin lê tudo.

### 2. Edge Functions

- **`gerar-faturas-sistema`** (cron — dia 01 às 06:00 BRT): para cada empresa com `valor_mensal > 0`, cria fatura do mês com vencimento = dia escolhido; chama Asaas para gerar cobrança PIX+Boleto; salva QR code e URL.
- **`asaas-sistema-webhook`** (verify_jwt=false): recebe `PAYMENT_RECEIVED`/`PAYMENT_CONFIRMED` e atualiza `faturas_sistema.status = 'pago'`.
- **`gerar-fatura-sistema-manual`**: super admin gera fatura avulsa para uma empresa.

### 3. Super Admin (página `/admin`)

Nova aba **"Cobrança SaaS"**:
- Form de configuração Asaas (API key, ambiente, métodos)
- Listagem de todas as faturas do sistema com filtro por empresa/status
- Botão para gerar fatura manual / cancelar / reenviar

### 4. Configurações da Empresa (`/configuracoes`)

Novo submenu **"Fatura"** (visível apenas para `cargo = 'admin'`):
- Card resumo: plano contratado, valor mensal, próximo vencimento
- Seletor de dia de vencimento (1–28)
- Lista de faturas (mês de referência, vencimento, valor, status)
- Para fatura pendente: botão "Pagar com PIX" (modal com QR code + copia-cola) e "Baixar boleto"

### 5. Secrets

- `ASAAS_SISTEMA_API_KEY` — chave do Asaas central do Super Admin (separada do `ASAAS_API_KEY` que é por empresa)
- `ASAAS_SISTEMA_WEBHOOK_TOKEN`

### Detalhes técnicos

- Cron via `pg_cron` + `pg_net` chamando a edge function (mesmo padrão de `gerar-faturas`).
- Idempotência: unique `(empresa_id, competencia)` impede duplicação se o cron rodar duas vezes.
- Vencimento calculado: se `dia_vencimento_fatura > último_dia_mês`, ajustar para último dia.
- Empresas com `data_fim` no passado ou `valor_mensal = 0` são puladas.
