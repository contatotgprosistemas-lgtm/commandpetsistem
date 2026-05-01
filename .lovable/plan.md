# Plano: Roteirização TaxiPet + Gestão de Combustível

## 1. Roteirização (Maps / Waze) no Painel Operacional

### Fluxo
No `TaxiPetOperational.tsx` adicionar **2 botões** no topo do painel:
- **🗺️ Roteirizar Coletas** (corridas "buscar")
- **🗺️ Roteirizar Entregas** (corridas "levar")

Ao clicar, abre um **dialog de roteirização** com:

1. **Lista ordenada por horário** (drag-and-drop para reordenar manualmente, já temos `@dnd-kit` no projeto)
2. Para cada parada: horário · pet · cliente · endereço · checkbox para incluir/excluir
3. Seletor de **ponto de partida**:
   - "Endereço da empresa" (padrão, pega do `empresas`)
   - "Localização atual" (geolocation API)
   - Endereço customizado
4. Seletor de **ponto de chegada** (opcional — útil em "Levar" para retornar à empresa)
5. Seletor de **veículo** (para vincular gasto de combustível)
6. Seletor de **motorista**
7. Botões finais:
   - **Abrir no Google Maps** → URL `https://www.google.com/maps/dir/?api=1&origin=...&destination=...&waypoints=...`
   - **Abrir no Waze** → Waze não suporta múltiplos waypoints nativamente; abre sequencialmente (primeira parada agora, demais salvas em "Roteiros recentes" via deeplinks `waze://?ll=...&navigate=yes`). Mostrar aviso e oferecer fallback "Maps".
8. Ao confirmar, salva um registro em `taxipet_roteirizacoes` (ver schema abaixo) com a sequência usada → permite calcular consumo depois.

### Componente novo
`src/components/taxipet/RoteirizacaoDialog.tsx` — recebe `legType: "buscar" | "levar"` e a lista de paradas do dia.

## 2. Gestão de Combustível e Custo por Rota

### Novos campos em `vehicles`
- `consumo_km_litro` (numeric) — ex: 12.5 km/L
- `tipo_combustivel` (text) — gasolina, etanol, diesel, flex
- `placa_observacao` já existe como `notes`

### Nova tabela `combustivel_precos` (preço de combustível por empresa, atualizável)
- `empresa_id`, `tipo_combustivel`, `preco_litro`, `data_referencia`
- Permite histórico de preços (não sobrescreve)

### Nova tabela `taxipet_roteirizacoes`
Salva cada rota gerada:
- `empresa_id`, `data`, `tipo` (buscar/levar)
- `vehicle_id`, `driver_id`
- `origem_endereco`, `destino_endereco`
- `paradas` (jsonb — array com {booking_id, ordem, endereco, lat, lng})
- `km_estimado` (preenchido manualmente OU via API depois)
- `km_real` (motorista informa ao finalizar)
- `litros_consumidos` (calculado: km_real / consumo_km_litro)
- `custo_combustivel` (calculado: litros × preço atual do combustível do veículo)
- `receita_total` (soma do `final_price` das corridas dessa rota)
- `lucro_estimado` (receita − custo)
- `status` (planejada / em_andamento / concluida)

### Nova tela: aba "Combustível & Custos" no menu TaxiPet
Em `src/pages/TaxiPetPage.tsx` adicionar aba ao lado de "Painel Operacional":
- **Cards do mês**: Total km rodados · Litros consumidos · Custo combustível · Receita TaxiPet · **Margem (%)**
- **Tabela de roteirizações**: data · tipo · veículo · motorista · km · litros · custo · receita · lucro
- **Configuração de preços**: input rápido para atualizar `preco_litro` por tipo de combustível
- **Alerta inteligente**: se margem do mês < 30%, mostra aviso "Considere reajustar preços ou rever rotas"

### Fluxo de finalização da rota
Ao motorista terminar:
1. No painel operacional, botão "Finalizar rota" no card da roteirização ativa
2. Dialog pede: km final do velocímetro (ou km rodados direto)
3. Sistema calcula litros e custo automaticamente, salva em `taxipet_roteirizacoes`
4. Cards de gestão atualizam em tempo real

## 3. Ideias extras incluídas

1. **Estimativa prévia de km via Google Distance Matrix** — opcional, exige API key. Por padrão, motorista informa km real ao final. Deixar pronto para ativar depois.
2. **Análise por motorista**: ranking de eficiência (km/L real vs esperado) — detecta desvio de combustível.
3. **Custo médio por corrida** = `custo_rota / nº paradas` — ajuda a precificar novos clientes.
4. **Exportar histórico do mês em CSV** para contabilidade.
5. **Lançamento automático em Finanças**: quando rota finaliza com custo > 0, criar `contas_pagar` na categoria "Combustível" vinculado ao veículo. (Opcional — pergunto antes de implementar.)

## Arquivos afetados

```text
src/components/taxipet/TaxiPetOperational.tsx       (botões Roteirizar)
src/components/taxipet/RoteirizacaoDialog.tsx       (NOVO)
src/components/taxipet/CombustivelTab.tsx           (NOVO — aba gestão)
src/components/taxipet/FinalizarRotaDialog.tsx      (NOVO — km final)
src/pages/TaxiPetPage.tsx                           (nova aba)
supabase migration                                   (3 alterações de schema)
```

## Detalhes técnicos

- **URL Google Maps com waypoints**:
  `https://www.google.com/maps/dir/?api=1&origin=ENC&destination=ENC&waypoints=ENC|ENC|ENC&travelmode=driving`
  Limite de 9 waypoints — se exceder, dividir em 2 abas.
- **Waze multi-stop**: não nativo. Abrir 1ª parada e deixar lista lateral com botões "Próxima parada" para o motorista clicar manualmente.
- **Cálculo de combustível**:
  `litros = km_real / vehicle.consumo_km_litro`
  `custo = litros × combustivel_precos.preco_litro` (último preço para o tipo do veículo)
- **RLS**: todas as novas tabelas com `tenant isolation` por `empresa_id`.

## Pergunta antes de codar

Antes de implementar, só preciso confirmar:
1. **Lançar custo de combustível automaticamente em Contas a Pagar?** (sim / não / só com confirmação manual)
2. **Quer integração com Google Distance Matrix** (estimativa automática de km — exige adicionar API key) ou motorista informa km manualmente?

Se preferir, posso assumir os defaults sensatos (não lança em contas a pagar automaticamente; km manual) e seguir direto.