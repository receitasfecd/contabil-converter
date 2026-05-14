-- ============================================
-- DIAGNÓSTICO: Ver estrutura das tabelas de mapeamento
-- ============================================

-- Ver colunas da tabela contas_bancarias
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'contas_bancarias'
ORDER BY ordinal_position;

-- Ver colunas da tabela classificacoes_contabeis
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'classificacoes_contabeis'
ORDER BY ordinal_position;

-- Ver colunas da tabela plano_contas
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'plano_contas'
ORDER BY ordinal_position;
