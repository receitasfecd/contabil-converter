-- ============================================
-- CORRIGIR POLÍTICAS RLS DAS TABELAS DE TRANSFERÊNCIAS
-- Mudar de organization_id para user_id
-- ============================================

-- 1. Remover políticas antigas de transferencias
DROP POLICY IF EXISTS "Users can view org transferencias" ON transferencias;
DROP POLICY IF EXISTS "Users can insert org transferencias" ON transferencias;
DROP POLICY IF EXISTS "Users can update org transferencias" ON transferencias;
DROP POLICY IF EXISTS "Users can delete org transferencias" ON transferencias;

DROP POLICY IF EXISTS "Users can view own transferencias" ON transferencias;
DROP POLICY IF EXISTS "Users can insert own transferencias" ON transferencias;
DROP POLICY IF EXISTS "Users can update own transferencias" ON transferencias;
DROP POLICY IF EXISTS "Users can delete own transferencias" ON transferencias;

-- 2. Criar novas políticas para transferencias baseadas em user_id
CREATE POLICY "Users can view own transferencias" ON transferencias FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transferencias" ON transferencias FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transferencias" ON transferencias FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own transferencias" ON transferencias FOR DELETE
USING (auth.uid() = user_id);

-- 3. Remover políticas antigas de transfer_pairs
DROP POLICY IF EXISTS "Users can view org transfer_pairs" ON transfer_pairs;
DROP POLICY IF EXISTS "Users can insert org transfer_pairs" ON transfer_pairs;
DROP POLICY IF EXISTS "Users can update org transfer_pairs" ON transfer_pairs;
DROP POLICY IF EXISTS "Users can delete org transfer_pairs" ON transfer_pairs;

DROP POLICY IF EXISTS "Users can view own transfer_pairs" ON transfer_pairs;
DROP POLICY IF EXISTS "Users can insert own transfer_pairs" ON transfer_pairs;
DROP POLICY IF EXISTS "Users can update own transfer_pairs" ON transfer_pairs;
DROP POLICY IF EXISTS "Users can delete own transfer_pairs" ON transfer_pairs;

-- 4. Criar novas políticas para transfer_pairs baseadas em user_id
CREATE POLICY "Users can view own transfer_pairs" ON transfer_pairs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transfer_pairs" ON transfer_pairs FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transfer_pairs" ON transfer_pairs FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own transfer_pairs" ON transfer_pairs FOR DELETE
USING (auth.uid() = user_id);

-- FIM
SELECT 'Políticas RLS de transferências corrigidas!' as status;
