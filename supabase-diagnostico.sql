-- ============================================
-- DIAGNÓSTICO: Verificar estado atual das tabelas
-- Execute este script PRIMEIRO para ver o que já existe
-- ============================================

-- Verificar se as tabelas existem
SELECT
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('organizations', 'organization_members', 'imported_accounts')
ORDER BY table_name;

-- Verificar colunas da tabela organization_members (se existir)
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'organization_members'
ORDER BY ordinal_position;

-- Verificar políticas existentes
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename IN ('organizations', 'organization_members', 'imported_accounts')
ORDER BY tablename, policyname;
