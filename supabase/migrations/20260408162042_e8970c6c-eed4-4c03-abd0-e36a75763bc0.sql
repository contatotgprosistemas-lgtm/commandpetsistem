
-- Fix Banco Asaas balance: should be 770 (20+150+600), currently 620
UPDATE contas_bancarias 
SET saldo_atual = 770, updated_at = now()
WHERE id = '4c1484df-fa80-4977-b4de-4f62c8890486';

-- Fix Banco Itaú: subtract the 150 that was incorrectly credited there
UPDATE contas_bancarias
SET saldo_atual = saldo_atual - 150, updated_at = now()
WHERE id = '7ae15663-07a5-47ad-bec7-2b5fcb97aa2c';
