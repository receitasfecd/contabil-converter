-- ============================================
-- CORRIGIR POLÍTICAS RLS DA TABELA imported_accounts
-- Mudar de organization_id para user_id
-- ============================================

-- 1. Remover políticas antigas baseadas em organization_id
DROP POLICY IF EXISTS "Users can view org imported_accounts" ON imported_accounts;
DROP POLICY IF EXISTS "Users can insert org imported_accounts" ON imported_accounts;
DROP POLICY IF EXISTS "Users can update org imported_accounts" ON imported_accounts;
DROP POLICY IF EXISTS "Users can delete org imported_accounts" ON imported_accounts;

-- 2. Criar novas políticas baseadas em user_id
CREATE POLICY "Users can view own imported_accounts" ON imported_accounts FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own imported_accounts" ON imported_accounts FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own imported_accounts" ON imported_accounts FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own imported_accounts" ON imported_accounts FOR DELETE
USING (auth.uid() = user_id);

-- 3. Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_imported_accounts_user ON imported_accounts(user_id);

-- FIM
SELECT 'Políticas RLS de imported_accounts corrigidas!' as status;
