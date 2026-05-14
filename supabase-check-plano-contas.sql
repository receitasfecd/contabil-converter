-- Ver estrutura da tabela plano_contas
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'plano_contas'
ORDER BY ordinal_position;
