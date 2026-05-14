-- ============================================
-- ADICIONAR COLUNA BANCO (versão simples)
-- ============================================

-- Adicionar coluna banco se não existir
ALTER TABLE contas_bancarias
ADD COLUMN IF NOT EXISTS banco TEXT;

-- Atualizar registros existentes com valor padrão
UPDATE contas_bancarias
SET banco = 'BANCO DO BRASIL'
WHERE banco IS NULL;

-- Verificar resultado
SELECT id, banco, numero_conta, codigo_contabil
FROM contas_bancarias
LIMIT 5;
