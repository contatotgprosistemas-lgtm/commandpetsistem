## Objetivo

Enviar notificações automáticas de cobrança via WhatsApp em 4 momentos do ciclo da fatura, com mensagens editáveis e cadência (espaçamento) para reduzir risco de bloqueio do número.

## Os 4 momentos (eventos)

1. **Geração** — no dia em que a fatura é criada (já existe hoje, vamos manter e tratar como um dos 4 templates)
2. **Pré-vencimento** — 3 dias antes do vencimento (lembrete amigável)
3. **Vencimento** — no dia do vencimento (aviso firme)
4. **Atraso** — 2 dias após o vencimento (cobrança de fatura em atraso)

Apenas faturas com `status = 'pendente'` recebem os lembretes 2/3/4. Se já foi paga, o disparo é pulado.

## O que vai mudar

### 1. Banco de dados (migração)

**Estender `invoice_notification_config`** (hoje guarda 1 mensagem). Adicionar colunas para os 4 templates e configuração de cadência:

- `enabled_geracao` (bool, default true) + `mensagem_geracao` (text)
- `enabled_pre_vencimento` (bool, default true) + `mensagem_pre_vencimento` (text) + `dias_antes` (int, default 3)
- `enabled_vencimento` (bool, default true) + `mensagem_vencimento` (text)
- `enabled_atraso` (bool, default true) + `mensagem_atraso` (text) + `dias_apos` (int, default 2)
- `intervalo_entre_envios_seg` (int, default 8) — pausa entre cada mensagem dentro de um lote
- `max_envios_por_minuto` (int, default 6) — teto adicional por empresa

Manter a coluna `mensagem`/`enabled` antigas como fallback de compatibilidade.

**Estender `invoice_notification_log`**: adicionar coluna `tipo` (text: `geracao | pre_vencimento | vencimento | atraso`) com índice em `(empresa_id, conta_receber_id, tipo, status)` para garantir idempotência (não enviar 2x o mesmo evento para a mesma fatura).

### 2. Edge function nova: `processar-lembretes-fatura`

Roda via cron 1x/dia (ex.: 09:00 BRT). Para cada empresa com config ativa:

1. Busca faturas em `contas_receber` com `status = 'pendente'` que se enquadrem em cada janela:
   - **pré-vencimento**: `vencimento = hoje + dias_antes`
   - **vencimento**: `vencimento = hoje`
   - **atraso**: `vencimento = hoje - dias_apos`
2. Para cada fatura, verifica em `invoice_notification_log` se já existe envio com `status='enviado'` para aquele `tipo` — se sim, pula.
3. Envia a mensagem com **cadência**: aguarda `intervalo_entre_envios_seg` entre cada disparo (ex.: 8s) e respeita `max_envios_por_minuto`.
4. Reaproveita toda a infra do `notificar-fatura-whatsapp` (canal, contato, conversa, log) — vamos refatorar essa função para receber um parâmetro `tipo` e a `mensagem` correta, mantendo o fluxo atual.

### 3. Cron job

Agendar via `pg_cron` + `pg_net` (chamando a função do Supabase com header `apikey`). Frequência: diária às 09:00 BRT (12:00 UTC).

### 4. UI — `FaturaWhatsappCard.tsx`

Reformular o card em **abas** (Tabs) ou seções colapsáveis, uma por evento:
- Geração de fatura
- 3 dias antes do vencimento (campo numérico ajustável)
- No dia do vencimento
- X dias após vencimento (campo numérico ajustável)

Cada seção tem:
- Switch de ativo/inativo
- Textarea com a mensagem
- Lista de variáveis disponíveis: `{nome}`, `{primeiro_nome}`, `{descricao}`, `{valor}`, `{vencimento}`, `{dias_atraso}` (novo, útil no template de atraso)

Adicionar uma seção **"Cadência de envio"** com 2 campos:
- Intervalo entre mensagens (segundos)
- Máximo por minuto

Manter a tab/seção de **"Últimos envios"** mostrando o `tipo` em cada linha (badge: Geração / Pré-vencimento / Vencimento / Atraso).

### 5. Mensagens padrão (sugestão)

- **Geração**: já existe, manter como está.
- **Pré-vencimento**: "Olá {primeiro_nome}! 👋 Passando para lembrar que sua fatura *{descricao}* de *R$ {valor}* vence em *{vencimento}* (em 3 dias). 🐾"
- **Vencimento**: "Olá {primeiro_nome}! Sua fatura *{descricao}* de *R$ {valor}* vence *hoje ({vencimento})*. Qualquer dúvida estamos por aqui. 🐾"
- **Atraso**: "Olá {primeiro_nome}, identificamos que sua fatura *{descricao}* de *R$ {valor}*, com vencimento em {vencimento}, está em atraso há {dias_atraso} dias. Por favor, regularize quando possível. 🐾"

## Cuidado anti-bloqueio

- Cadência configurável (default 8s entre envios) já evita rajadas.
- Idempotência via log impede reenvios duplicados.
- Templates personalizados com `{primeiro_nome}` (já implementado) mantêm variabilidade.
- Manter o aviso amarelo no card sobre boas práticas.

## Arquivos afetados

```text
supabase/migrations/<novo>.sql           # extensão das tabelas
supabase/functions/processar-lembretes-fatura/index.ts   # NOVO
supabase/functions/notificar-fatura-whatsapp/index.ts    # aceita "tipo" e usa template correto
supabase/config.toml                     # registrar nova function (verify_jwt = false p/ cron)
src/components/FaturaWhatsappCard.tsx    # UI com 4 templates + cadência
```

Cron job inserido via tool `insert` (não migration), conforme guideline.

## O que NÃO muda

- O fluxo atual de envio na geração da fatura segue funcionando — ele apenas passa a usar `mensagem_geracao` (ou `mensagem` antiga como fallback) e gravar `tipo='geracao'` no log.
- Nenhuma mudança em CRM, contas_receber ou no faturamento em si.

Posso seguir com a implementação?