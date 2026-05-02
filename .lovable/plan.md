# Uma mensagem por cliente nas notificações de fatura

## Problema

Quando um cliente tem mais de uma fatura no mesmo dia (parcelas semanais, múltiplos pets, ciclos de plano), o sistema dispara **uma mensagem WhatsApp por fatura**, gerando 2-4 mensagens iguais para o mesmo contato. Isso aconteceu hoje, com vários clientes recebendo notificações duplicadas.

A dedup atual em `notificar-fatura-whatsapp` (janela 18h por contato+tipo) não funciona porque os disparos acontecem em paralelo dentro do mesmo segundo, e todas as chamadas leem o log antes da primeira inserir.

## Objetivo

Garantir que cada cliente receba **no máximo 1 mensagem por tipo de notificação por dia**, independentemente de quantas faturas tenha.

## Mudanças

### 1. `supabase/functions/gerar-faturas/index.ts`

- Após criar/atualizar todas as faturas, agrupar por `cliente_id` em uma única lista.
- Para cada cliente, escolher **uma fatura representativa** (a de maior valor ou a primeira) e disparar `notificar-fatura-whatsapp` apenas uma vez.
- Se o cliente tiver várias faturas, a mensagem usa um descritor genérico do tipo "Suas faturas mensais foram geradas" e o valor total somado.

### 2. `supabase/functions/processar-lembretes-fatura/index.ts`

- Dentro de cada bucket (pre_vencimento, vencimento, atraso), agrupar as faturas por `cliente_id` antes do loop de envio.
- Disparar **uma chamada** por cliente, com a fatura de maior valor como referência. Demais faturas ficam registradas no log via inserção em massa após o sucesso.

### 3. `supabase/functions/notificar-fatura-whatsapp/index.ts`

- Trocar a dedup probabilística (janela 18h) por uma trava determinística:
  - Inserir o registro em `invoice_notification_log` com `status='enviando'` **antes** do envio à Evolution.
  - Usar uma constraint única (`empresa_id, cliente_id, tipo, dia`) para que tentativas paralelas falhem no insert (vencendo a corrida).
  - Em caso de conflito do insert, retornar `skipped: already_processing`.
  - Após sucesso/falha, atualizar o status do registro para `enviado` ou `falha`.

### 4. Migração de schema

Adicionar índice único parcial em `invoice_notification_log`:

```sql
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoice_notif_unique_daily
  ON public.invoice_notification_log (empresa_id, cliente_id, tipo, (enviado_em::date))
  WHERE status IN ('enviado','enviando');
```

Isso impede 2 envios do mesmo tipo para o mesmo cliente no mesmo dia, em qualquer caminho (gerar-faturas, lembretes, reenvios manuais).

## Detalhes técnicos

- O índice único usa `enviado_em::date` para garantir 1 por dia BRT.
- Mensagem agregada: quando o cliente tem N>1 faturas geradas, usar template `"Olá {nome}! Foram geradas suas faturas do mês no valor total de R$ {valor_total} (próximo vencimento em {vencimento})."` em vez do template padrão `mensagem_geracao` que assume uma única fatura. O template específico fica em `cfg.mensagem_geracao_multiplas` (opcional, com fallback).
- A `reenviar-notif-geracao` continua funcionando porque também passa pelo `notificar-fatura-whatsapp` que terá a trava única.
- Logs do tipo `geracao` sempre vinculam a uma das faturas (a de maior valor) — as outras ficam sem log de "envio" mas com referência cruzada via `metadata.faturas_relacionadas` (campo JSON novo, opcional).

## Não muda

- Templates personalizados existentes seguem funcionando para clientes com 1 fatura.
- A dedup por fatura+tipo continua existindo (impede reenvio da mesma fatura).
- Cron `gerar-faturas` e `processar-lembretes-fatura` mantêm o mesmo schedule.

## Validação após deploy

1. Olhar `invoice_notification_log` agrupado por `cliente_id+tipo+dia` — deve ter sempre 1 linha por (cliente, tipo, dia).
2. Verificar conversa do CRM do cliente que recebeu duplicado hoje (Plano Escola Premium 2x Semana 1/4–4/4) na próxima geração — deve receber só 1 mensagem.
