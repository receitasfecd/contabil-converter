-- ============================================
-- DIAGNÓSTICO SIMPLES: Ver estrutura das tabelas
-- ============================================

-- 1. Listar todas as tabelas públicas
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
