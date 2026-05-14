-- ============================================
-- REVERTER PARA SISTEMA BASEADO EM USER_ID
-- Remove organization_id e volta para user_id
-- ============================================

-- 1. Remover políticas baseadas em organization_id
DROP POLICY IF EXISTS "Users can view org contas_bancarias" ON contas_bancarias;
DROP POLICY IF EXISTS "Users can insert org contas_bancarias" ON contas_bancarias;
DROP POLICY IF EXISTS "Users can update org contas_bancarias" ON contas_bancarias;
DROP POLICY IF EXISTS "Users can delete org contas_bancarias" ON contas_bancarias;

DROP POLICY IF EXISTS "Users can view org classificacoes" ON classificacoes_contabeis;
DROP POLICY IF EXISTS "Users can insert org classificacoes" ON classificacoes_contabeis;
DROP POLICY IF EXISTS "Users can update org classificacoes" ON classificacoes_contabeis;
DROP POLICY IF EXISTS "Users can delete org classificacoes" ON classificacoes_contabeis;

DROP POLICY IF EXISTS "Users can view org plano_contas" ON plano_contas;
DROP POLICY IF EXISTS "Users can insert org plano_contas" ON plano_contas;
DROP POLICY IF EXISTS "Users can update org plano_contas" ON plano_contas;
DROP POLICY IF EXISTS "Users can delete org plano_contas" ON plano_contas;

-- 2. Adicionar coluna user_id se não existir
ALTER TABLE contas_bancarias
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE classificacoes_contabeis
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE plano_contas
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 3. Criar políticas baseadas em user_id
CREATE POLICY "Users can view own contas_bancarias" ON contas_bancarias FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own contas_bancarias" ON contas_bancarias FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own contas_bancarias" ON contas_bancarias FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own contas_bancarias" ON contas_bancarias FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Users can view own classificacoes" ON classificacoes_contabeis FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own classificacoes" ON classificacoes_contabeis FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own classificacoes" ON classificacoes_contabeis FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own classificacoes" ON classificacoes_contabeis FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Users can view own plano_contas" ON plano_contas FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own plano_contas" ON plano_contas FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own plano_contas" ON plano_contas FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own plano_contas" ON plano_contas FOR DELETE
USING (auth.uid() = user_id);

-- 4. Criar índices
CREATE INDEX IF NOT EXISTS idx_contas_bancarias_user ON contas_bancarias(user_id);
CREATE INDEX IF NOT EXISTS idx_classificacoes_user ON classificacoes_contabeis(user_id);
CREATE INDEX IF NOT EXISTS idx_plano_contas_user ON plano_contas(user_id);

-- FIM
SELECT 'Sistema revertido para user_id com sucesso!' as status;
