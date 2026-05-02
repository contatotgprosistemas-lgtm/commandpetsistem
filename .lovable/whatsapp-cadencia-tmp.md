---
name: WhatsApp Cadência Anti-Banimento
description: Cadência conservadora aplicada em notificar-fatura-whatsapp para evitar bloqueios do WhatsApp por flood
type: feature
---
notificar-fatura-whatsapp aplica internamente:
- Janela de envio: 09h-18h BRT (fora disso retorna `outside_send_window`)
- Limite diário: 100 mensagens/empresa/dia
- Cadência serializada por slot: cada nova mensagem aguarda `slot * (30-60s aleatório)` baseado em logs do dia
- Variação de saudação automática (5 templates rotativos) para mensagens iniciadas com "Olá/Oi"
- Envio em background via EdgeRuntime.waitUntil — retorna 200 imediatamente após criar lock
- gerar-faturas chama em fire-and-forget (não aguarda resposta)
- processar-lembretes-fatura tem cadência local conservadora (45s, máx 2/min) + janela 09-18h
